import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';

import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Event } from '../types';
import { Search, Calendar, CheckCircle, Clock, ChevronRight, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import Input from '../components/ui/Input';
import { format, parseISO } from 'date-fns';

const MarksDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const { events, fetchEvents, isLoading: isEventsLoading } = useEventStore();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredEvents = myEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isEventsLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-slate-500 animate-pulse">Loading marks dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Marks Management
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Select an event to grade participants and export results.</p>
                </div>
                <div className="w-full md:w-72">
                    <Input
                        placeholder="Search events..."
                        leftIcon={<Search size={18} />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white shadow-sm border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {myEvents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                    <div className="p-4 bg-slate-50 rounded-full inline-flex mb-4">
                        <Award className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No events found</h3>
                    <p className="text-slate-500 mt-1">You haven't organized any approved events yet.</p>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-slate-500">No events match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEvents.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100 group cursor-pointer flex flex-col h-full"
                            onClick={() => handleSelectEvent(event)}
                        >
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${event.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {event.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${event.status === 'completed'
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}>
                                        {event.status}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                    {event.title}
                                </h3>

                                <div className="flex items-center text-slate-500 text-sm mb-4">
                                    <Calendar size={14} className="mr-1.5" />
                                    <span>{format(parseISO(event.startDate), 'MMMM do, yyyy')}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/50 transition-colors">
                                <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                                    Open Gradebook
                                </span>
                                <div className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all shadow-sm">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MarksDashboard;