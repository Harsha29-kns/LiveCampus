import { create } from 'zustand';
import { collection, getDocs, addDoc, query, where, setDoc, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import bcrypt from 'bcryptjs';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean | 'change-password'>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  fetchUsers: () => Promise<any[]>;
  deleteUser: (userId: string) => Promise<void>;
  addUser: (name: string, email: string, password: string, role: string) => Promise<void>;
  updatePassword: (userId: string, newPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

const getInitialState = () => {
  try {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      return { user, isAuthenticated: true };
    }
  } catch (error) {
    console.error("Could not parse user from localStorage", error);
  }
  return { user: null, isAuthenticated: false };
};


export const useAuthStore = create<AuthState>((set, get) => ({
  user: getInitialState().user,
  isAuthenticated: getInitialState().isAuthenticated,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        
        if (user.role !== 'admin' && user.status !== 'approved') {
          toast.error('Your account is pending approval by admin.');
          set({ isLoading: false });
          return false;
        }

      
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          
          const userId = userDoc.id;
          const userDocData = await getDoc(doc(db, 'users', userId));
          const userData = userDocData.data();
          let club = null;
          if (userData.clubId) {
            const clubDoc = await getDoc(doc(db, 'clubs', userData.clubId));
            club = clubDoc.exists() ? clubDoc.data() : null;
          }
          set({
            user: {
              ...userData,
              id: userId,
              clubId: userData.clubId || null,
              club,
            },
            isAuthenticated: true,
            isLoading: false
          });
          localStorage.setItem('user', JSON.stringify(user));
          toast.success(`Welcome back, ${user.name}!`);
          // @ts-ignore
          const isDefault = await bcrypt.compare('defaultpassword', user.password);
          if (isDefault) {
            set({ isLoading: false });
            return 'change-password';
          }
          return true;
        } else {
          toast.error('Invalid email or password');
          set({ isLoading: false });
          return false;
        }
      } else {
        toast.error('Invalid email or password');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      toast.error('Login error');
      set({ isLoading: false });
      return false;
    }
  },

  register: async (name, email, password, role) => {
    set({ isLoading: true });
    try {
      
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        toast.error('Email already in use');
        set({ isLoading: false });
        return false;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        name,
        email,
        password: hashedPassword,
        role,
        status: (role === 'club' || role === 'faculty') ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'users'), newUser);

      
      if (newUser.status === 'approved') {
        const userToStore = { id: docRef.id, ...newUser } as User;
        set({ user: userToStore, isAuthenticated: true, isLoading: false });
        localStorage.setItem('user', JSON.stringify(userToStore));
        toast.success('Registration successful!');
        return true;
      } else {
        set({ isLoading: false });
        toast.success('Registration successful! Awaiting admin approval.');
        return false;
      }
    } catch (error) {
      toast.error('Registration error');
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
  },

  checkAuth: async () => {
    const userString = localStorage.getItem('user');
    if (userString) {
      let user = JSON.parse(userString);
      
      if (user.role === 'club' && user.clubId && !user.club) {
        const clubDoc = await getDoc(doc(db, 'clubs', user.clubId));
        if (clubDoc.exists()) {
          user = { ...user, club: clubDoc.data() };
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      set({ user, isAuthenticated: true });
    }
  },

  updateProfile: async (userData) => {
    set({ isLoading: true });
    const { user } = get();
    if (!user) {
      toast.error('Not authenticated');
      set({ isLoading: false });
      return false;
    }
    try {
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date().toISOString(),
      });

      
      const updatedUser = { ...user, ...userData, updatedAt: new Date().toISOString() };
      set({ user: updatedUser, isLoading: false });
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Profile updated!');
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Update profile error');
      set({ isLoading: false });
      return false;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      
      const q = query(collection(db, 'users'), where('email', '==', gUser.email));
      const snapshot = await getDocs(q);

      let userData;
      if (snapshot.empty) {
        
        userData = {
          id: gUser.uid,
          name: gUser.displayName,
          email: gUser.email,
          role: 'student',
          status: 'approved', // <-- fix here
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', gUser.uid), userData);
        set({ user: null, isAuthenticated: false, isLoading: false });
        toast.success('Registration successful! Please log in.');
        return false;
      } else {
        userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        if (userData.status === 'approved') {
          set({ user: userData as User, isAuthenticated: true, isLoading: false });
          localStorage.setItem('user', JSON.stringify(userData));
          toast.success(`Welcome, ${userData.name}!`);
          return true;
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
          toast.error('Your account is pending approval.');
          return false;
        }
      }
    } catch (error) {
      toast.error('Google sign-in failed');
      set({ isLoading: false });
      return false;
    }
  },

  fetchUsers: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  deleteUser: async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User deleted!');
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error('Failed to delete user');
    }
  },

  addUser: async (name: string, email: string, password: string, role: string) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        name,
        email,
        password: hashedPassword,
        role,
        status: (role === 'club' || role === 'faculty') ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'users'), newUser);
    } catch (error) {
      console.error("Error adding user:", error);
    }
  },

  updatePassword: async (userId: string, newPassword: string) => {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await updateDoc(doc(db, 'users', userId), {
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      });
    } catch(error) {
      console.error("Error updating password:", error);
    }
  },

  setUser: (user) => set({ user }),
}));
