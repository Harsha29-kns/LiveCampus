import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Event, User } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

// Define the detailed feedback type
interface DetailedFeedback {
  overallExperience: number;
  eventOrganization: number;
  activitiesEnjoyment: number;
  recommendationLikelihood: number;
  comment?: string;
}

interface EventState {
  events: Event[];
  isLoading: boolean;
  fetchEvents: () => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  createEvent: (eventData: Partial<Event>) => Promise<Event | null>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  approveEvent: (id: string) => Promise<Event | null>;
  rejectEvent: (id: string, reason: string) => Promise<Event | null>;
  facultyApproveEvent: (id: string, facultyId: string, notes?: string) => Promise<boolean>;
  facultyRejectEvent: (id: string, facultyId: string, notes: string) => Promise<boolean>;
  fetchEventsForFacultyApproval: (clubIds: string[]) => Promise<Event[]>;
  registerForEvent: (eventId: string, userId: string, registrationData?: Partial<Event>) => Promise<boolean>;
  cancelRegistration: (eventId: string, userId: string) => Promise<boolean>;
  fetchRegisteredEvents: (userId: string) => Promise<Event[]>;
  submitFeedback: (eventId: string, userId: string, feedback: DetailedFeedback) => Promise<boolean>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  isLoading: false,

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        set({ events, isLoading: false });
      });
    } catch (error) {
      toast.error('Failed to load events');
      set({ isLoading: false });
    }
  },

  getEventById: (id) => get().events.find(event => event.id === id),

  createEvent: async (eventData) => {
    set({ isLoading: true });
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error("You must be logged in to create an event.");
      set({ isLoading: false });
      return null;
    }

    try {
      const cleanEventData = Object.fromEntries(Object.entries(eventData).filter(([, value]) => value !== undefined));

      if (user.role === 'club' && user.clubId) {
        // Check if club has faculty linked
        const clubRef = doc(db, 'clubs', user.clubId);
        const clubSnap = await getDoc(clubRef);
        if (clubSnap.exists()) {
          const clubData = clubSnap.data();
          if (!clubData.facultyMembers || clubData.facultyMembers.length === 0) {
            toast.error("Your club must have at least one faculty member linked to create events.");
            set({ isLoading: false });
            return null;
          }
        } else {
          // Should ideally not happen if user has clubId but club doesn't exist
          toast.error("Club not found.");
          set({ isLoading: false });
          return null;
        }
      }

      // The `cleanEventData` object will now include `certificateTemplateUrl` if it was provided
      const docRef = await addDoc(collection(db, 'events'), {
        ...cleanEventData,
        registeredCount: 0,
        status: eventData?.organizerType === 'admin' ? 'approved' : 'pending',
        facultyApprovalStatus: eventData?.organizerType === 'club' ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Gamification: Award points to the organizer
      if (user.role === 'club' && user.clubId) {
        const clubRef = doc(db, 'clubs', user.clubId);
        const clubSnap = await getDoc(clubRef);
        if (clubSnap.exists()) {
          const currentPoints = clubSnap.data().points || 0;
          await updateDoc(clubRef, { points: currentPoints + 5 });
        }
      } else { // faculty or admin
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentPoints = userSnap.data().points || 0;
          await updateDoc(userRef, { points: currentPoints + 5 });
        }
      }


      if (eventData?.organizerType === 'admin') {
        toast.success('Event created and approved!');
        const { fetchUsers } = useAuthStore.getState();
        const allUsers = await fetchUsers();
        const students = allUsers.filter((u: User) => u.role === 'student');

        if (students.length > 0) {
          try {
            await fetch('https://live-campus.vercel.app/api/event-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: { id: docRef.id, ...eventData }, students }),
            });
            toast.success('Event notification sent to students!');
          } catch (emailError) {
            toast.error('Event created, but mail is not sent.');
            console.error('Email sending error:', emailError);
          }
        }
      } else {
        toast.success('Event created! Awaiting admin approval.');
      }

      set({ isLoading: false });
      return { id: docRef.id, ...eventData } as Event;
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Failed to create event');
      set({ isLoading: false });
      return null;
    }
  },

  approveEvent: async (id) => {
    set({ isLoading: true });
    try {
      const eventRef = doc(db, 'events', id);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        toast.error('Event not found.');
        set({ isLoading: false });
        return null;
      }

      const eventToApprove = { id: eventSnap.id, ...eventSnap.data() } as Event;

      if (eventToApprove.organizerType === 'club' && eventToApprove.facultyApprovalStatus !== 'approved') {
        toast.error('Event must be approved by faculty first');
        set({ isLoading: false });
        return null;
      }

      await updateDoc(eventRef, {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });

      // Consolidated toast logic
      let emailSuccess = true;
      if (eventToApprove.organizerType === 'club' || eventToApprove.organizerType === 'faculty') {
        const { fetchUsers } = useAuthStore.getState();
        const allUsers = await fetchUsers();
        const students = allUsers.filter((user: User) => user.role === 'student');

        if (students.length > 0) {
          try {
            await fetch('https://live-campus.vercel.app/api/event-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: eventToApprove, students }),
            });
          } catch (emailError) {
            emailSuccess = false;
            console.error('Email sending error:', emailError);
          }
        }
      }

      if (emailSuccess) {
        toast.success('Event approved and notifications sent!');
      } else {
        toast.error('Event approved, but failed to send notifications.');
      }

      const updatedEvent = get().getEventById(id);
      set({ isLoading: false });
      return updatedEvent ? { ...updatedEvent, status: 'approved' } : null;

    } catch (error) {
      toast.error('Failed to approve event');
      set({ isLoading: false });
      return null;
    }
  },

  updateEvent: async (id, eventData) => {
    set({ isLoading: true });
    try {

      const dataToUpdate = {
        ...eventData,
        updatedAt: new Date().toISOString(),
      };

      delete (dataToUpdate as Partial<Event>).organizerId;
      delete (dataToUpdate as Partial<Event>).organizerName;
      delete (dataToUpdate as Partial<Event>).organizerType;
      delete (dataToUpdate as Partial<Event>).createdBy;


      const cleanDataToUpdate = Object.fromEntries(Object.entries(dataToUpdate).filter(([, value]) => value !== undefined));

      // The `cleanDataToUpdate` object will now include `certificateTemplateUrl` if it was provided
      await updateDoc(doc(db, 'events', id), cleanDataToUpdate);
      toast.success('Event updated!');
      set({ isLoading: false });

      return get().getEventById(id) || null;
    } catch (error) {
      toast.error('Failed to update event');
      set({ isLoading: false });
      return null;
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true });
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted!');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to delete event');
      set({ isLoading: false });
      return false;
    }
  },

  rejectEvent: async (id, reason) => {
    set({ isLoading: true });
    try {
      const { user } = useAuthStore.getState();
      await updateDoc(doc(db, 'events', id), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: user?.id,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event rejected');
      set({ isLoading: false });
      const updatedEvent = get().getEventById(id);
      return updatedEvent ? { ...updatedEvent, status: 'rejected', rejectionReason: reason } : null;
    } catch (error) {
      toast.error('Failed to reject event');
      set({ isLoading: false });
      return null;
    }
  },

  facultyApproveEvent: async (id, facultyId, notes) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        facultyApprovalStatus: 'approved',
        facultyApprovedBy: facultyId,
        facultyApprovedAt: new Date().toISOString(),
        facultyApprovalNotes: notes || '',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event approved (Faculty)');

      // Send notif code could act here (to Admin) - future enhancement

      set({ isLoading: false });
      // No need to update local state fully if we rely on snapshot or fetch loop
      // But good to update local cache
      const evt = get().events.find(e => e.id === id);
      if (evt) {
        const updatedEvents = get().events.map(e => e.id === id ? { ...e, facultyApprovalStatus: 'approved' } : e);
        // @ts-ignore
        set({ events: updatedEvents });
      }
      return true;
    } catch (error) {
      console.error("Faculty approval error", error);
      toast.error("Failed to approve event");
      set({ isLoading: false });
      return false;
    }
  },

  facultyRejectEvent: async (id, facultyId, notes) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        facultyApprovalStatus: 'rejected',
        status: 'rejected', // Rejects the whole event
        facultyApprovedBy: facultyId,
        facultyApprovedAt: new Date().toISOString(),
        facultyApprovalNotes: notes,
        rejectionReason: notes, // Sync with generic reason field
        rejectedBy: facultyId,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event rejected (Faculty)');
      set({ isLoading: false });

      const evt = get().events.find(e => e.id === id);
      if (evt) {
        const updatedEvents = get().events.map(e => e.id === id ? { ...e, facultyApprovalStatus: 'rejected', status: 'rejected' } : e);
        // @ts-ignore
        set({ events: updatedEvents });
      }
      return true;
    } catch (error) {
      console.error("Faculty rejection error", error);
      toast.error("Failed to reject event");
      set({ isLoading: false });
      return false;
    }
  },

  fetchEventsForFacultyApproval: async (clubIds: string[]) => {
    if (!clubIds || clubIds.length === 0) return [];
    // This might be better handled by the main fetchEvents and filtering on client 
    // or a specific query if the list is large. For now, we can filter client side or query.
    // Firestore 'in' query supports up to 10 items.

    // Let's rely on client side filtering of the main events list for simplicity for now
    // assuming fetchEvents gets everything.
    // But fetchEvents retrieves ALL events.

    return get().events.filter(e =>
      e.organizerType === 'club' &&
      clubIds.includes(e.organizerId) &&
      e.facultyApprovalStatus === 'pending'
    );
  },

  registerForEvent: async (eventId, userId, registrationData) => {
    set({ isLoading: true });
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const eventRef = doc(db, 'events', eventId);
        const userDoc = await transaction.get(userRef);
        const eventDoc = await transaction.get(eventRef);

        if (!userDoc.exists() || !eventDoc.exists()) {
          throw new Error("User or Event not found!");
        }

        const regRef = doc(collection(db, 'eventRegistrations'));
        transaction.set(regRef, {
          eventId,
          userId,
          status: 'registered',
          registeredAt: new Date().toISOString(),
          ...(registrationData || {})
        });

        const currentRegCount = eventDoc.data().registeredCount || 0;
        transaction.update(eventRef, { registeredCount: currentRegCount + 1 });

        const currentPoints = userDoc.data().points || 0;
        transaction.update(userRef, { points: currentPoints + 1 });
      });

      toast.success('Registered for event!');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to register');
      set({ isLoading: false });
      return false;
    }
  },


  cancelRegistration: async (eventId, userId) => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (registration) => {
        await deleteDoc(doc(db, 'eventRegistrations', registration.id));
      });
      const event = get().getEventById(eventId);
      if (event && event.registeredCount > 0) {
        await updateDoc(doc(db, 'events', eventId), {
          registeredCount: event.registeredCount - 1,
        });
      }
      toast.success('Registration cancelled');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to cancel registration');
      set({ isLoading: false });
      return false;
    }
  },

  fetchRegisteredEvents: async (userId: string) => {
    set({ isLoading: true });
    try {
      const registrationsQuery = query(collection(db, 'eventRegistrations'), where('userId', '==', userId));
      const registrationSnapshots = await getDocs(registrationsQuery);
      const eventIds = registrationSnapshots.docs.map(doc => doc.data().eventId);

      if (eventIds.length === 0) {
        set({ isLoading: false });
        return [];
      }

      const events = get().events;
      const registeredEvents = events.filter(event => eventIds.includes(event.id));

      set({ isLoading: false });
      return registeredEvents;
    } catch (error) {
      toast.error('Failed to load registered events');
      set({ isLoading: false });
      return [];
    }
  },

  submitFeedback: async (eventId, userId, feedback) => {
    set({ isLoading: true });
    try {
      await runTransaction(db, async (transaction) => {
        const eventRef = doc(db, 'events', eventId);
        const userRef = doc(db, 'users', userId);
        const eventDoc = await transaction.get(eventRef);
        const userDoc = await transaction.get(userRef);

        if (!eventDoc.exists() || !userDoc.exists()) {
          throw new Error("Event or User not found!");
        }

        const eventData = eventDoc.data() as Event;
        const newFeedback = { userId, ...feedback, submittedAt: new Date().toISOString() };
        const updatedFeedback = [...((eventData as any).feedback || []), newFeedback];

        transaction.update(eventRef, { feedback: updatedFeedback });

        // Award user points for giving feedback
        const currentUserPoints = userDoc.data().points || 0;
        transaction.update(userRef, { points: currentUserPoints + 2 });

        // Award bonus to organizer if average rating is good
        const totalRatings = updatedFeedback.reduce((acc, f) => acc + f.overallExperience, 0);
        const avgRating = totalRatings / updatedFeedback.length;
        if (updatedFeedback.length >= 5 && avgRating >= 4.5) {
          if (eventData.organizerType === 'club') {
            const clubRef = doc(db, 'clubs', eventData.organizerId);
            const clubDoc = await transaction.get(clubRef);
            const currentClubPoints = clubDoc.data()?.points || 0;
            transaction.update(clubRef, { points: currentClubPoints + 2 });
          } else {
            const organizerRef = doc(db, 'users', eventData.organizerId);
            const organizerDoc = await transaction.get(organizerRef);
            const currentOrgPoints = organizerDoc.data()?.points || 0;
            transaction.update(organizerRef, { points: currentOrgPoints + 2 });
          }
        }
      });
      toast.success("Thank you for your feedback!");
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error("Failed to submit feedback.");
      set({ isLoading: false });
      return false;
    }
  },
}));
