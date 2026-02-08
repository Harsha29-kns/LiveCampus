import { create } from 'zustand';
import { collection, getDocs, addDoc, query, where, setDoc, doc, deleteDoc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, UserRole, ClubFacultyCSVRow } from '../types';
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
  bulkCreateFacultyClubAccounts: (csvData: ClubFacultyCSVRow[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  linkFacultyToClub: (facultyId: string, clubId: string) => Promise<boolean>;
  unlinkFacultyFromClub: (facultyId: string, clubId: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
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
          let club: User['club'] = undefined;
          if (userData.clubId) {
            const clubDoc = await getDoc(doc(db, 'clubs', userData.clubId));
            club = clubDoc.exists() ? (clubDoc.data() as any) : undefined;
          }
          set({
            user: {
              ...(userData as any),
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
      // Prevent faculty self-registration
      if (role === 'club' || role === 'faculty') {
        toast.error(`${role.charAt(0).toUpperCase() + role.slice(1)} accounts must be created by admin`);
        set({ isLoading: false });
        return false;
      }


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
    } catch (error) {
      console.error("Error updating password:", error);
    }
  },

  setUser: (user) => set({ user }),

  bulkCreateFacultyClubAccounts: async (csvData: ClubFacultyCSVRow[]) => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      try {
        // Check if club exists, create if not
        const clubQuery = query(collection(db, 'clubs'), where('name', '==', row.clubName));
        const clubSnapshot = await getDocs(clubQuery);

        let clubId: string;
        if (clubSnapshot.empty) {
          // Create new club
          const newClub = {
            name: row.clubName,
            description: `${row.clubName} - Auto-created`,
            president: row.facultyName,
            presidentId: '',
            facultyAdvisor: row.facultyName,
            facultyAdvisorId: '',
            facultyMembers: [],
            memberCount: 0,
            points: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const clubDocRef = await addDoc(collection(db, 'clubs'), newClub);
          clubId = clubDocRef.id;
        } else {
          clubId = clubSnapshot.docs[0].id;
        }

        // Create Club User Account (Login)
        const clubEmail = row.clubEmail;
        const clubUserQuery = query(collection(db, 'users'), where('email', '==', clubEmail));
        const clubUserSnap = await getDocs(clubUserQuery);

        if (clubUserSnap.empty) {
          const clubHashedPassword = await bcrypt.hash('defaultpassword', 10);
          const newClubUser = {
            name: row.clubName,
            email: clubEmail,
            password: clubHashedPassword,
            role: 'club' as UserRole,
            clubId: clubId,
            status: 'approved',
            mustChangePassword: true, // Force password change on first login
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const clubDocRef = await addDoc(collection(db, 'users'), newClubUser);
          const clubUserId = clubDocRef.id;

          // Send credentials email to club
          try {
            await fetch('https://live-campus.vercel.app/api/send-club-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: clubEmail,
                name: row.clubName,
                password: 'defaultpassword'
              }),
            });

            // Create in-app notification for club
            await addDoc(collection(db, 'notifications'), {
              userId: clubUserId,
              title: 'Welcome to LiveCampus!',
              message: `Your ${row.clubName} account has been created. Please login and complete your profile. Default password has been sent to your email.`,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString()
            });
          } catch (emailError) {
            console.error('Failed to send club credentials email:', emailError);
          }
        }

        // Check if faculty user exists
        const userQuery = query(collection(db, 'users'), where('email', '==', row.facultyEmail));
        const userSnapshot = await getDocs(userQuery);

        let facultyUserId: string;
        if (userSnapshot.empty) {
          // Create new faculty user
          const hashedPassword = await bcrypt.hash('defaultpassword', 10);
          const newFaculty = {
            name: row.facultyName,
            email: row.facultyEmail,
            password: hashedPassword,
            role: 'faculty' as UserRole,
            status: 'approved',
            linkedClubIds: [clubId],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const facultyDocRef = await addDoc(collection(db, 'users'), newFaculty);
          facultyUserId = facultyDocRef.id;

          // Send credentials email
          try {
            await fetch('https://live-campus.vercel.app/api/send-faculty-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: row.facultyEmail,
                name: row.facultyName,
                facultyId: row.facultyId,
                password: 'defaultpassword'
              }),
            });

            // Create in-app notification for faculty
            await addDoc(collection(db, 'notifications'), {
              userId: facultyUserId,
              title: 'Welcome to LiveCampus!',
              message: 'Your faculty account has been created. Please login and change your default password. Check your email for login credentials.',
              type: 'info',
              read: false,
              createdAt: new Date().toISOString()
            });
          } catch (emailError) {
            console.error('Failed to send credentials email:', emailError);
          }
        } else {
          facultyUserId = userSnapshot.docs[0].id;
          // Add club to existing faculty's linkedClubIds
          await updateDoc(doc(db, 'users', facultyUserId), {
            linkedClubIds: arrayUnion(clubId),
            updatedAt: new Date().toISOString(),
          });
        }

        // Add faculty to club's facultyMembers
        await updateDoc(doc(db, 'clubs', clubId), {
          facultyMembers: arrayUnion(facultyUserId),
          facultyAdvisorId: facultyUserId,
          updatedAt: new Date().toISOString(),
        });

        success++;
      } catch (error) {
        failed++;
        errors.push(`${row.clubName} - ${row.facultyName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (success > 0) {
      toast.success(`Successfully created/linked ${success} faculty-club associations`);
    }
    if (failed > 0) {
      toast.error(`Failed to create ${failed} associations`);
    }

    return { success, failed, errors };
  },

  linkFacultyToClub: async (facultyId: string, clubId: string) => {
    try {
      // Add club to faculty's linkedClubIds
      await updateDoc(doc(db, 'users', facultyId), {
        linkedClubIds: arrayUnion(clubId),
        updatedAt: new Date().toISOString(),
      });

      // Add faculty to club's facultyMembers
      await updateDoc(doc(db, 'clubs', clubId), {
        facultyMembers: arrayUnion(facultyId),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Faculty linked to club successfully');
      return true;
    } catch (error) {
      console.error('Error linking faculty to club:', error);
      toast.error('Failed to link faculty to club');
      return false;
    }
  },

  unlinkFacultyFromClub: async (facultyId: string, clubId: string) => {
    try {
      // Remove club from faculty's linkedClubIds
      await updateDoc(doc(db, 'users', facultyId), {
        linkedClubIds: arrayRemove(clubId),
        updatedAt: new Date().toISOString(),
      });

      // Remove faculty from club's facultyMembers
      await updateDoc(doc(db, 'clubs', clubId), {
        facultyMembers: arrayRemove(facultyId),
        updatedAt: new Date().toISOString(),
      });

      toast.success('Faculty unlinked from club successfully');
      return true;
    } catch (error) {
      console.error('Error unlinking faculty from club:', error);
      toast.error('Failed to unlink faculty from club');
      return false;
    }
  },

  changePassword: async (newPassword: string) => {
    set({ isLoading: true });
    const { user } = get();
    if (!user) {
      toast.error('Not authenticated');
      set({ isLoading: false });
      return false;
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const userRef = doc(db, 'users', user.id);

      await updateDoc(userRef, {
        password: hashedPassword,
        mustChangePassword: false, // Clear the flag
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      const updatedUser = { ...user, mustChangePassword: false, updatedAt: new Date().toISOString() };
      set({ user: updatedUser, isLoading: false });
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Password changed successfully!');
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
      set({ isLoading: false });
      return false;
    }
  },
}));
