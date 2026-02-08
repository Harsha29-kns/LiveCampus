import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useTicketStore } from '../stores/ticketStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, Send } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';

const CreateTicket: React.FC = () => {
    const { user } = useAuthStore();
    const { events, fetchEvents } = useEventStore();
    const { createTicket } = useTicketStore();
    const navigate = useNavigate();

    const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        eventId: '',
        subject: '',
        category: 'other' as const,
        message: ''
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                await fetchEvents();

                if (user) {
                    console.log('Fetching registrations for user:', user.id);
                    // Fetch registered events
                    const q = query(
                        collection(db, 'eventRegistrations'),
                        where('userId', '==', user.id)
                    );
                    const snapshot = await getDocs(q);
                    console.log('Found registrations:', snapshot.docs.length);
                    const eventIds = snapshot.docs.map(doc => doc.data().eventId);
                    console.log('Registered event IDs:', eventIds);
                    setRegisteredEventIds(eventIds);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load registered events:', error);
                toast.error('Failed to load your registered events');
                setIsLoading(false);
            }
        };

        loadData();
    }, [user, fetchEvents]);

    const registeredEvents = events.filter(e => registeredEventIds.includes(e.id));
    const selectedEvent = events.find(e => e.id === formData.eventId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !selectedEvent) return;

        if (!formData.subject.trim()) {
            toast.error('Please enter a subject');
            return;
        }

        if (!formData.message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        setIsSubmitting(true);

        const ticketId = await createTicket(
            {
                eventId: formData.eventId,
                eventTitle: selectedEvent.title,
                studentId: user.id,
                studentName: user.name,
                clubId: selectedEvent.organizerId,
                subject: formData.subject,
                category: formData.category,
            },
            formData.message
        );

        setIsSubmitting(false);

        if (ticketId) {
            navigate(`/tickets/${ticketId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading events..." />
            </div>
        );
    }

    if (registeredEvents.length === 0) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    leftIcon={<ArrowLeft size={18} />}
                    onClick={() => navigate('/tickets')}
                >
                    Back to Tickets
                </Button>

                <Card>
                    <CardBody className="py-16 text-center">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-lg font-medium text-neutral-700 mb-2">No Registered Events</h3>
                        <p className="text-neutral-500 mb-6">
                            You need to register for an event before you can raise a support ticket.
                        </p>
                        <Button variant="primary" onClick={() => navigate('/events')}>
                            Browse Events
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button
                variant="ghost"
                leftIcon={<ArrowLeft size={18} />}
                onClick={() => navigate('/tickets')}
            >
                Back to Tickets
            </Button>

            <Card>
                <CardHeader>
                    <h2 className="text-2xl font-bold text-neutral-800">Raise a Support Ticket</h2>
                    <p className="text-neutral-500 mt-1">Get help with your event-related issues</p>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Select Event */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Select Event <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.eventId}
                                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Choose an event...</option>
                                {registeredEvents.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.title} - {new Date(event.startDate).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="payment">💳 Payment Issue</option>
                                <option value="registration">📝 Registration Issue</option>
                                <option value="venue">📍 Venue/Location Question</option>
                                <option value="certificate">🎓 Certificate Issue</option>
                                <option value="other">❓ Other</option>
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Brief description of the issue"
                                maxLength={100}
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-xs text-neutral-500 mt-1">{formData.subject.length}/100 characters</p>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Message <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={6}
                                placeholder="Describe your issue in detail..."
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/tickets')}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                leftIcon={<Send size={18} />}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Ticket'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
};

export default CreateTicket;
