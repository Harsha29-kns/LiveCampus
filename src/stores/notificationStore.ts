import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Notification } from '../types';
import toast from 'react-hot-toast';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<Notification[]>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: (userId: string) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  deleteAllNotifications: (userId: string) => Promise<boolean>;
  addNotification: (notification: Partial<Notification>) => Promise<Notification | null>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId) => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        const unreadCount = notifications.filter(n => !n.read).length;
        set({ notifications, unreadCount, isLoading: false });
      });
      return [];
    } catch (error) {
      toast.error('Failed to load notifications');
      set({ isLoading: false });
      return [];
    }
  },

  markAsRead: async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      toast.success('Notification marked as read');
      return true;
    } catch (error) {
      toast.error('Failed to mark as read');
      return false;
    }
  },

  markAllAsRead: async (userId) => {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, 'notifications', docSnap.id), { read: true });
      }
      toast.success('All notifications marked as read');
      return true;
    } catch (error) {
      toast.error('Failed to mark all as read');
      return false;
    }
  },

  deleteNotification: async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete notification');
      return false;
    }
  },

  deleteAllNotifications: async (userId) => {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      toast.success('All notifications cleared');
      return true;
    } catch (error) {
      toast.error('Failed to clear notifications');
      return false;
    }
  },

  addNotification: async (notification) => {
    console.log('📝 addNotification called with:', notification);
    try {
      const notificationData = {
        ...notification,
        read: false,
        createdAt: new Date().toISOString(),
      };
      console.log('💾 Writing to Firestore:', notificationData);

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Firestore write successful. Doc ID:', docRef.id);

      // Remove the toast - too noisy when creating many notifications
      // toast.success('Notification added');
      return { id: docRef.id, ...notification } as Notification;
    } catch (error: any) {
      console.error('❌ addNotification failed:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code
      });
      toast.error('Failed to add notification');
      return null;
    }
  },
}));