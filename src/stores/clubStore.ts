import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Club } from '../types';
import toast from 'react-hot-toast';

interface ClubState {
  clubs: Club[];
  isLoading: boolean;
  fetchClubs: () => Promise<Club[]>;
  getClubById: (id: string) => Club | undefined;
  createClub: (clubData: Partial<Club>) => Promise<Club | null>;
  updateClub: (id: string, clubData: Partial<Club>) => Promise<Club | null>;
  deleteClub: (id: string) => Promise<boolean>;
  joinClub: (clubId: string, userId: string) => Promise<boolean>;
  leaveClub: (clubId: string, userId: string) => Promise<boolean>;
  fetchUsers: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export const useClubStore = create<ClubState>((set, get) => ({
  clubs: [],
  isLoading: false,

  fetchClubs: async () => {
    set({ isLoading: true });
    try {
      onSnapshot(collection(db, 'clubs'), (snapshot) => {
        const clubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        set({ clubs, isLoading: false });
      });
      return [];
    } catch (error) {
      toast.error('Failed to load clubs');
      set({ isLoading: false });
      return [];
    }
  },

  getClubById: (id) => get().clubs.find(club => club.id === id),

  createClub: async (clubData) => {
    set({ isLoading: true });
    try {
      const docRef = await addDoc(collection(db, 'clubs'), {
        ...clubData,
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Club created!');
      set({ isLoading: false });
      return { id: docRef.id, ...clubData } as Club;
    } catch (error) {
      toast.error('Failed to create club');
      set({ isLoading: false });
      return null;
    }
  },

  updateClub: async (id, clubData) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'clubs', id), {
        ...clubData,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Club updated!');
      set({ isLoading: false });
      return get().getClubById(id);
    } catch (error) {
      toast.error('Failed to update club');
      set({ isLoading: false });
      return null;
    }
  },

  deleteClub: async (id) => {
    set({ isLoading: true });
    try {
      await deleteDoc(doc(db, 'clubs', id));
      toast.success('Club deleted!');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to delete club');
      set({ isLoading: false });
      return false;
    }
  },

  joinClub: async (clubId, userId) => {
    set({ isLoading: true });
    try {
      // You can also create a "clubMembers" collection for more advanced logic
      const club = get().getClubById(clubId);
      if (club) {
        await updateDoc(doc(db, 'clubs', clubId), {
          memberCount: (club.memberCount || 0) + 1,
        });
      }
      toast.success('Joined club!');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to join club');
      set({ isLoading: false });
      return false;
    }
  },

  leaveClub: async (clubId, userId) => {
    set({ isLoading: true });
    try {
      const club = get().getClubById(clubId);
      if (club && club.memberCount > 1) {
        await updateDoc(doc(db, 'clubs', clubId), {
          memberCount: club.memberCount - 1,
        });
        toast.success('Left club!');
        set({ isLoading: false });
        return true;
      } else {
        toast.error('You are the last member. Delete the club instead.');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      toast.error('Failed to leave club');
      set({ isLoading: false });
      return false;
    }
  },

  fetchUsers: async () => {
    // Fetch all users from Firestore (requires admin privileges)
    // Implement this logic
  },

  deleteUser: async (userId: string) => {
    // Delete user from Firestore (requires admin privileges)
    // Implement this logic
  },
}));