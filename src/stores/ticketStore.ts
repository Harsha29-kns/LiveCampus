import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { Ticket, TicketMessage, Event, User } from '../types';
import toast from 'react-hot-toast';

interface TicketState {
    tickets: Ticket[];
    currentTicket: Ticket | null;
    messages: TicketMessage[];
    isLoading: boolean;

    // Student Functions
    fetchMyTickets: (studentId: string) => Promise<void>;
    createTicket: (ticket: Partial<Ticket>, initialMessage: string) => Promise<string | null>;

    // Club Functions
    fetchClubTickets: (clubId: string) => Promise<void>;

    // Shared Functions
    fetchTicketById: (ticketId: string) => Promise<Ticket | null>;
    fetchTicketMessages: (ticketId: string) => Promise<void>;
    sendMessage: (ticketId: string, message: Partial<TicketMessage>) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: Ticket['status']) => Promise<void>;
    markAsRead: (ticketId: string, role: 'student' | 'club') => Promise<void>;

    // Subscriptions
    subscribeToMyTickets: (studentId: string, callback?: (tickets: Ticket[]) => void) => Unsubscribe;
    subscribeToClubTickets: (clubId: string, callback?: (tickets: Ticket[]) => void) => Unsubscribe;
    subscribeToTicket: (ticketId: string, callback?: (ticket: Ticket) => void) => Unsubscribe;
    subscribeToMessages: (ticketId: string, callback?: (messages: TicketMessage[]) => void) => Unsubscribe;
}

export const useTicketStore = create<TicketState>((set, get) => ({
    tickets: [],
    currentTicket: null,
    messages: [],
    isLoading: false,

    fetchMyTickets: async (studentId) => {
        set({ isLoading: true });
        try {
            const q = query(
                collection(db, 'tickets'),
                where('studentId', '==', studentId)
            );
            const snapshot = await getDocs(q);

            // Populate event and user details
            const tickets = await Promise.all(
                snapshot.docs.map(async (ticketDoc) => {
                    const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;

                    // Fetch event title
                    if (ticketData.eventId) {
                        const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                        if (eventDoc.exists()) {
                            ticketData.eventTitle = (eventDoc.data() as Event).title;
                        }
                    }

                    // Fetch club name
                    if (ticketData.clubId) {
                        const clubDoc = await getDoc(doc(db, 'clubs', ticketData.clubId));
                        if (clubDoc.exists()) {
                            ticketData.clubName = clubDoc.data().name;
                        }
                    }

                    return ticketData;
                })
            );

            // Sort by updatedAt in-memory
            tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            set({ tickets, isLoading: false });
        } catch (error) {
            console.error('Failed to load tickets:', error);
            toast.error('Failed to load tickets');
            set({ isLoading: false });
        }
    },

    createTicket: async (ticketData, initialMessage) => {
        try {
            // Create ticket
            const ticketRef = await addDoc(collection(db, 'tickets'), {
                ...ticketData,
                status: 'open',
                unreadByStudent: false,
                unreadByClub: true,
                lastMessage: initialMessage.substring(0, 100),
                lastMessageBy: 'student',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Add initial message
            await addDoc(collection(db, 'ticketMessages'), {
                ticketId: ticketRef.id,
                senderId: ticketData.studentId,
                senderRole: 'student',
                senderName: ticketData.studentName,
                message: initialMessage,
                read: false,
                createdAt: new Date().toISOString(),
            });

            toast.success('Ticket created successfully');
            return ticketRef.id;
        } catch (error) {
            console.error('Failed to create ticket:', error);
            toast.error('Failed to create ticket');
            return null;
        }
    },

    fetchClubTickets: async (clubId) => {
        set({ isLoading: true });
        try {
            const q = query(
                collection(db, 'tickets'),
                where('clubId', '==', clubId)
            );
            const snapshot = await getDocs(q);

            // Populate event and student details
            const tickets = await Promise.all(
                snapshot.docs.map(async (ticketDoc) => {
                    const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;

                    // Fetch event title
                    if (ticketData.eventId) {
                        const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                        if (eventDoc.exists()) {
                            ticketData.eventTitle = (eventDoc.data() as Event).title;
                        }
                    }

                    // Fetch student name
                    if (ticketData.studentId) {
                        const studentDoc = await getDoc(doc(db, 'users', ticketData.studentId));
                        if (studentDoc.exists()) {
                            ticketData.studentName = (studentDoc.data() as User).name;
                        }
                    }

                    return ticketData;
                })
            );

            // Sort by updatedAt in-memory
            tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            set({ tickets, isLoading: false });
        } catch (error) {
            console.error('Failed to load tickets:', error);
            toast.error('Failed to load tickets');
            set({ isLoading: false });
        }
    },

    fetchTicketById: async (ticketId) => {
        try {
            const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
            if (ticketDoc.exists()) {
                const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;

                // Populate event title
                if (ticketData.eventId) {
                    const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                    if (eventDoc.exists()) {
                        ticketData.eventTitle = (eventDoc.data() as Event).title;
                    }
                }

                set({ currentTicket: ticketData });
                return ticketData;
            }
            return null;
        } catch (error) {
            console.error('Failed to load ticket:', error);
            return null;
        }
    },

    fetchTicketMessages: async (ticketId) => {
        try {
            const q = query(
                collection(db, 'ticketMessages'),
                where('ticketId', '==', ticketId)
            );
            const snapshot = await getDocs(q);
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketMessage));

            // Sort by createdAt in-memory
            messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            set({ messages });
        } catch (error) {
            console.error('Failed to load messages:', error);
            toast.error('Failed to load messages');
        }
    },

    sendMessage: async (ticketId, messageData) => {
        try {
            // Add message
            await addDoc(collection(db, 'ticketMessages'), {
                ...messageData,
                ticketId,
                read: false,
                createdAt: new Date().toISOString(),
            });

            // Update ticket's updatedAt and unread status
            const updateData: any = {
                updatedAt: new Date().toISOString(),
                lastMessage: messageData.message!.substring(0, 100),
                lastMessageBy: messageData.senderRole,
            };

            if (messageData.senderRole === 'club') {
                updateData.unreadByStudent = true;
                updateData.unreadByClub = false;
            } else {
                updateData.unreadByStudent = false;
                updateData.unreadByClub = true;
            }

            await updateDoc(doc(db, 'tickets', ticketId), updateData);

            // Refresh messages
            get().fetchTicketMessages(ticketId);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        }
    },

    updateTicketStatus: async (ticketId, status) => {
        try {
            await updateDoc(doc(db, 'tickets', ticketId), {
                status,
                updatedAt: new Date().toISOString()
            });

            // Update current ticket if it's the one being updated
            const currentTicket = get().currentTicket;
            if (currentTicket && currentTicket.id === ticketId) {
                set({ currentTicket: { ...currentTicket, status } });
            }

            toast.success(`Ticket marked as ${status}`);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status');
        }
    },

    markAsRead: async (ticketId, role) => {
        try {
            const field = role === 'student' ? 'unreadByStudent' : 'unreadByClub';
            await updateDoc(doc(db, 'tickets', ticketId), { [field]: false });

            // Update current ticket
            const currentTicket = get().currentTicket;
            if (currentTicket && currentTicket.id === ticketId) {
                set({ currentTicket: { ...currentTicket, [field]: false } });
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },
    subscribeToMyTickets: (studentId, callback) => {
        const q = query(
            collection(db, 'tickets'),
            where('studentId', '==', studentId)
        );
        return onSnapshot(q, async (snapshot) => {
            const tickets = await Promise.all(
                snapshot.docs.map(async (ticketDoc) => {
                    const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
                    // Note: In a real app, you might want to cache these or use a separate listener for related data
                    // to avoid excessive reads. For now, we'll keep the existing pattern but be aware of read costs.
                    if (ticketData.eventId) {
                        const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                        if (eventDoc.exists()) ticketData.eventTitle = (eventDoc.data() as Event).title;
                    }
                    if (ticketData.clubId) {
                        const clubDoc = await getDoc(doc(db, 'clubs', ticketData.clubId));
                        if (clubDoc.exists()) ticketData.clubName = clubDoc.data().name;
                    }
                    return ticketData;
                })
            );
            tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            set({ tickets, isLoading: false });
            if (callback) callback(tickets);
        });
    },

    subscribeToClubTickets: (clubId, callback) => {
        const q = query(
            collection(db, 'tickets'),
            where('clubId', '==', clubId)
        );
        return onSnapshot(q, async (snapshot) => {
            const tickets = await Promise.all(
                snapshot.docs.map(async (ticketDoc) => {
                    const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
                    if (ticketData.eventId) {
                        const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                        if (eventDoc.exists()) ticketData.eventTitle = (eventDoc.data() as Event).title;
                    }
                    if (ticketData.studentId) {
                        const studentDoc = await getDoc(doc(db, 'users', ticketData.studentId));
                        if (studentDoc.exists()) ticketData.studentName = (studentDoc.data() as User).name;
                    }
                    return ticketData;
                })
            );
            tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            set({ tickets, isLoading: false });
            if (callback) callback(tickets);
        });
    },

    subscribeToTicket: (ticketId, callback) => {
        return onSnapshot(doc(db, 'tickets', ticketId), async (ticketDoc) => {
            if (ticketDoc.exists()) {
                const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
                if (ticketData.eventId) {
                    const eventDoc = await getDoc(doc(db, 'events', ticketData.eventId));
                    if (eventDoc.exists()) ticketData.eventTitle = (eventDoc.data() as Event).title;
                }
                set({ currentTicket: ticketData });
                if (callback) callback(ticketData);
            }
        });
    },

    subscribeToMessages: (ticketId, callback) => {
        const q = query(
            collection(db, 'ticketMessages'),
            where('ticketId', '==', ticketId)
        );
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketMessage));
            messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            set({ messages });
            if (callback) callback(messages);
        });
    },
}));
