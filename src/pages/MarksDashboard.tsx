import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Event } from '../types';

const MarksDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const { events, fetchEvents, isLoading: isEventsLoading } = useEventStore();
    const navigate = useNavigate();

    const [myEvents, setMyEvents] = useState<Event[]>([]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (user?.role === 'club' && events.length > 0) {
            const myClubEvents = events
                .filter(event => event.organizerId === user.clubId && (event.status === 'approved' || event.status === 'completed'))
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setMyEvents(myClubEvents);
        }
    }, [events, user]);




    const handleSelectEvent = (event: Event) => {
        navigate(`/events/${event.id}/marks`);
    };

    if (isEventsLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <LoadingSpinner size="lg" text="Loading events..." />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Marks Dashboard</h2>
            <p className="text-gray-600 mb-6">Select an event to manage marks and view grading reports.</p>

            {myEvents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">No events found for your club.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {myEvents.map(event => (
                                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(event.startDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSelectEvent(event)}
                                        >
                                            Manage Marks
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MarksDashboard;