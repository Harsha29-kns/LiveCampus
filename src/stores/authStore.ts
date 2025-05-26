import { create } from 'zustand';
import { collection, getDocs, addDoc, query, where, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import bcrypt from 'bcryptjs';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  fetchUsers: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addUser: (name: string, email: string, password: string, role: string) => Promise<void>;
  updatePassword: (userId: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        // Only block login if not admin and not approved
        if (user.role !== 'admin' && user.status !== 'approved') {
          toast.error('Your account is pending approval by admin.');
          set({ isLoading: false });
          return false;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          set({ user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome back, ${user.name}!`);
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
      // Check if user exists
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

      // Only log in if approved
      if (newUser.status === 'approved') {
        set({ user: { id: docRef.id, ...newUser } as User, isAuthenticated: true, isLoading: false });
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
    toast.success('Logged out successfully');
  },

  checkAuth: () => {
    // For demo: just check if user is in state
    const { user } = get();
    if (user) set({ isAuthenticated: true });
  },

  updateProfile: async (userData) => {
    set({ isLoading: true });
    try {
      // For demo: just update local state
      const { user } = get();
      if (!user) {
        toast.error('Not authenticated');
        set({ isLoading: false });
        return false;
      }
      set({ user: { ...user, ...userData, updatedAt: new Date().toISOString() }, isLoading: false });
      toast.success('Profile updated!');
      return true;
    } catch (error) {
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
      const user = result.user;

      // Check if user exists in Firestore
      const q = query(collection(db, 'users'), where('email', '==', user.email));
      const snapshot = await getDocs(q);

      let userData;
      if (snapshot.empty) {
        // If not, create a new user document
        userData = {
          name: user.displayName,
          email: user.email,
          role: 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid), userData);
        userData.id = user.uid;
      } else {
        userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }

      set({ user: userData as User, isAuthenticated: true, isLoading: false });
      toast.success(`Welcome, ${userData.name}!`);
      return true;
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
      // Set users in your store state if needed
      return users;
    } catch (error) {
      // Handle error
      return [];
    }
  },

  deleteUser: async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Optionally update your store state
    } catch (error) {
      // Handle error
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
        status: (role === 'club' || role === 'faculty') ? 'pending' : 'approved', // <-- Only pending for club/faculty
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'users'), newUser);
    } catch (error) {
      // Handle error
    }
  },

  updatePassword: async (userId: string, newPassword: string) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateDoc(doc(db, 'users', userId), {
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });
  },
}));