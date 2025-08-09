import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Club } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

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
  // --- NEW FUNCTION SIGNATURE ---
  createClubProfileForUser: (clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt' | 'memberCount' | 'points'>) => Promise<boolean>;
  fetchUsers: () => Promise<void>; // Kept existing signatures
  deleteUser: (userId: string) => Promise<void>; // Kept existing signatures
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

  // --- NEW FUNCTION IMPLEMENTATION ---
  createClubProfileForUser: async (clubData) => {
    const { user, setUser } = useAuthStore.getState();
    if (!user || user.role !== 'club') {
        toast.error("You must be logged in as a club to create a profile.");
        return false;
    }
    set({ isLoading: true });
    try {
        const docRef = await addDoc(collection(db, 'clubs'), {
            ...clubData,
            memberCount: 1, // Start with the creator as the first member
            points: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        
        // Link the new club ID to the user's profile
        await updateDoc(doc(db, 'users', user.id), { clubId: docRef.id });
        
        // Update the auth store with the new club info
        const newClubData = { id: docRef.id, ...clubData };
        const updatedUser = { ...user, clubId: docRef.id, club: newClubData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        toast.success('Club profile created successfully!');
        set({ isLoading: false });
        get().fetchClubs(); // Refresh the clubs list
        return true;
    } catch (error) {
        console.error("Error creating club profile:", error);
        toast.error("Failed to create club profile.");
        set({ isLoading: false });
        return false;
    }
  },

  createClub: async (clubData) => {
    set({ isLoading: true });
    try {
      const { name, description, president, vicePresident, facultyAdvisor, phoneNo } = clubData;
      const docRef = await addDoc(collection(db, 'clubs'), {
        name,
        description,
        president,
        vicePresident,
        facultyAdvisor,
        phoneNo,
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { user } = useAuthStore.getState();
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          clubId: docRef.id,
          clubRole: 'president',
        });
      }

      toast.success('Club created!');
      set({ isLoading: false });
      return { id: docRef.id, ...clubData };
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
    // This logic should be in authStore, but keeping the function signature for compatibility
  },

  deleteUser: async (userId: string) => {
    // This logic should be in authStore, but keeping the function signature for compatibility
  },
}));