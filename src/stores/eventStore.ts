import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Event } from '../types';
import toast from 'react-hot-toast';

interface EventState {
  events: Event[];
  isLoading: boolean;
  fetchEvents: () => Promise<Event[]>;
  getEventById: (id: string) => Event | undefined;
  createEvent: (eventData: Partial<Event>) => Promise<Event | null>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  approveEvent: (id: string) => Promise<Event | null>;
  rejectEvent: (id: string) => Promise<Event | null>;
  registerForEvent: (eventId: string, userId: string, registrationData?: Partial<Event>) => Promise<boolean>;
  cancelRegistration: (eventId: string, userId: string) => Promise<boolean>;
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
      // Optional: return unsubscribe function if you want to clean up
      return [];
    } catch (error) {
      toast.error('Failed to load events');
      set({ isLoading: false });
      return [];
    }
  },

  getEventById: (id) => get().events.find(event => event.id === id),

  createEvent: async (eventData) => {
    set({ isLoading: true });
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        ...eventData,
        registeredCount: 0,
        status: eventData?.organizerType === 'admin' ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event created! Awaiting approval.');
      set({ isLoading: false });
      return { id: docRef.id, ...eventData } as Event;
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Failed to create event');
      set({ isLoading: false });
      return null;
    }
  },

  updateEvent: async (id, eventData) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        ...eventData,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event updated!');
      set({ isLoading: false });
      return get().getEventById(id);
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

  approveEvent: async (id) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event approved!');
      set({ isLoading: false });
      return get().getEventById(id);
    } catch (error) {
      toast.error('Failed to approve event');
      set({ isLoading: false });
      return null;
    }
  },

  rejectEvent: async (id) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event rejected and deleted');
      set({ isLoading: false });
      return null;
    } catch (error) {
      toast.error('Failed to reject and delete event');
      set({ isLoading: false });
      return null;
    }
  },

  registerForEvent: async (eventId, userId, registrationData) => {
    set({ isLoading: true });
    try {
      // Add registration document with extra fields if provided
      await addDoc(collection(db, 'eventRegistrations'), {
        eventId,
        userId,
        status: 'registered',
        registeredAt: new Date().toISOString(),
        ...(registrationData || {}) // <-- add extra fields here
      });
      // Increment registeredCount
      const event = get().getEventById(eventId);
      if (event) {
        await updateDoc(doc(db, 'events', eventId), {
          registeredCount: (event.registeredCount || 0) + 1,
        });
      }
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
      // Find registration doc and delete it
      const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (registration) => {
        await deleteDoc(doc(db, 'eventRegistrations', registration.id));
      });
      // Decrement registeredCount
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
}));