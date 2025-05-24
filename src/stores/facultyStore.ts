import { create } from 'zustand';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Faculty {
  id: string;
  name: string;
  email: string;
}

interface FacultyState {
  faculty: Faculty[];
  fetchFaculty: () => Promise<void>;
  addFaculty: (data: Omit<Faculty, 'id'>) => Promise<void>;
  deleteFaculty: (id: string) => Promise<void>;
}

export const useFacultyStore = create<FacultyState>((set) => ({
  faculty: [],
  fetchFaculty: async () => {
    const snapshot = await getDocs(collection(db, 'faculty'));
    set({ faculty: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Faculty)) });
  },
  addFaculty: async (data) => {
    await addDoc(collection(db, 'faculty'), data);
  },
  deleteFaculty: async (id) => {
    await deleteDoc(doc(db, 'faculty', id));
  },
}));