import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { Event } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const FacultyEventApproval: React.FC = () => {
    const { user } = useAuthStore();
    const { events, fetchEvents, facultyApproveEvent, facultyRejectEvent, isLoading } = useEventStore();
    const navigate = useNavigate();
    const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (!user || user.role !== 'faculty') {
            navigate('/');
            return;
        }
        fetchEvents();
    }, [user, navigate, fetchEvents]);

    useEffect(() => {
        if (user && user.linkedClubIds && events.length > 0) {
            const filtered = events.filter(event =>
                event.organizerType === 'club' &&
                user.linkedClubIds?.includes(event.organizerId) &&
                event.facultyApprovalStatus === 'pending'
            );
            setPendingEvents(filtered);
        }
    }, [events, user]);

    const handleApprove = async (eventId: string) => {
        if (!user?.id) return;
        setActionLoading(eventId);
        const success = await facultyApproveEvent(eventId, user.id, notes[eventId]);
        if (success) {
            // Remove from list
            setPendingEvents(prev => prev.filter(e => e.id !== eventId));
        }
        setActionLoading(null);
    };

    const handleReject = async (eventId: string) => {
        if (!user?.id) return;
        const note = notes[eventId];
        if (!note) {
            toast.error("Please provide a reason for rejection in the notes.");
            return;
        }

        if (!window.confirm("Are you sure you want to reject this event?")) return;

        setActionLoading(eventId);
        const success = await facultyRejectEvent(eventId, user.id, note);
        if (success) {
            setPendingEvents(prev => prev.filter(e => e.id !== eventId));
        }
        setActionLoading(null);
    };

    if (isLoading && pendingEvents.length === 0) {
        return <div className="flex justify-center p-10"><LoadingSpinner size="lg" text="Loading events..." /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Faculty Event Approval</h1>
                    <p className="text-gray-500 mt-1">Review and approve events from your assigned clubs.</p>
                </div>
                <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg font-medium">
                    Pending: {pendingEvents.length}
                </div>
            </div>

            {pendingEvents.length === 0 ? (
                <Card>
                    <CardBody className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">All Caught Up!</h3>
                        <p className="text-gray-500">There are no pending events requiring your approval at this time.</p>
                        <Button className="mt-6" variant="outline" onClick={() => navigate('/events')}>
                            View All Events
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {pendingEvents.map(event => (
                        <Card key={event.id} className="border-l-4 border-l-yellow-400">
                            <CardBody className="p-0">
                                <div className="p-6 md:flex md:justify-between md:gap-6">
                                    <div className="space-y-4 flex-grow">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Badge variant="warning" className="mb-2">Pending Approval</Badge>
                                                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                                                <p className="text-gray-600 font-medium">{event.organizerName}</p>
                                            </div>
                                            {event.image && (
                                                <img src={event.image} alt={event.title} className="w-24 h-24 object-cover rounded-lg shadow-sm hidden md:block" />
                                            )}
                                        </div>

                                        <p className="text-gray-700">{event.description}</p>

                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={16} />
                                                <span>{format(parseISO(event.startDate), 'PPP p')}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={16} />
                                                <span>{event.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 md:mt-0 md:w-80 flex-shrink-0 space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                                        <h3 className="font-semibold text-gray-900">Action Required</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Notes / Feedback
                                            </label>
                                            <textarea
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                rows={3}
                                                placeholder="Add notes (required for rejection)..."
                                                value={notes[event.id] || ''}
                                                onChange={(e) => setNotes(prev => ({ ...prev, [event.id]: e.target.value }))}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="primary"
                                                leftIcon={<CheckCircle size={16} />}
                                                onClick={() => handleApprove(event.id)}
                                                isLoading={actionLoading === event.id}
                                                disabled={!!actionLoading}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="danger"
                                                leftIcon={<XCircle size={16} />}
                                                onClick={() => handleReject(event.id)}
                                                isLoading={actionLoading === event.id}
                                                disabled={!!actionLoading}
                                            >
                                                Reject
                                            </Button>
                                        </div>

                                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                            <p><span className="font-bold">Next Step:</span> Admin Approval</p>
                                            <p>After you approve, the admin will do a final review.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FacultyEventApproval;
