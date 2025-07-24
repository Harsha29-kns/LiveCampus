import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Calendar, Download, Users, PlusCircle, ClipboardList, CalendarX } from 'lucide-react';
import Badge from '../components/ui/Badge';

// --- Helper function to determine event status based on current date ---
const getEventStatus = (startDateStr: string, endDateStr: string) => {
    const now = new Date();
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (endDate < now) {
        return { text: 'Completed', variant: 'neutral' as const };
    }
    if (startDate > now) {
        return { text: 'Upcoming', variant: 'info' as const };
    }
    return { text: 'Live', variant: 'success' as const };
};

// --- Skeleton Component for Loading State ---
const EventCardSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
            <div className="w-1/5 h-6 bg-gray-200 rounded-full"></div>
        </div>
        <div className="space-y-3 mb-6">
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full h-10 bg-gray-200 rounded-md"></div>
            <div className="w-full h-10 bg-gray-200 rounded-md"></div>
        </div>
    </div>
);

// --- Main Dashboard Component ---
const AttendanceDashboard: React.FC = () => {
    // --- All original state and hooks are preserved ---
    const { user } = useAuthStore();
    const { events, fetchEvents } = useEventStore();
    const navigate = useNavigate();
    const [myEvents, setMyEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- All original logic is preserved ---
    useEffect(() => {
        // Set loading to true whenever we fetch
        setIsLoading(true);
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (user?.role === 'club') {
            const myClubEvents = events
                .filter(event => event.clubId === user.clubId)
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()); // Sort by most recent
            setMyEvents(myClubEvents);
        }
        setIsLoading(false); // Set loading to false after processing
    }, [events, user]);

    const handleDownloadAttendance = async (eventId: string, eventTitle: string) => {
        // This function's core logic remains unchanged
        const regsQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const regsSnap = await getDocs(regsQuery);
        const regs = regsSnap.docs.map(doc => doc.data());
        if (!regs.length) {
            alert('No attendance records found for this event.');
            return;
        }
        const data = regs.map((reg: any, idx: number) => ({
            'S.No': idx + 1,
            'Reg. No': reg.regNo || '',
            'Name': reg.name || '',
            'Status': reg.status === 'attended' ? 'Present' : 'Absent',
            'Checked In At': reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleString() : 'N/A',
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
        XLSX.writeFile(workbook, `${eventTitle || 'event'}-attendance.xlsx`);
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* --- Header Section --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Club Event Management</h1>
                    <p className="mt-1 text-gray-600">
                        Manage attendance and download reports for your events.
                    </p>
                </div>
                <Button 
                    onClick={() => navigate('/events/create')}
                    leftIcon={<PlusCircle size={18} />}
                >
                    Create New Event
                </Button>
            </div>
            
            {/* --- Content Area --- */}
            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                {isLoading ? (
                    // --- Loading State ---
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EventCardSkeleton />
                        <EventCardSkeleton />
                        <EventCardSkeleton />
                        <EventCardSkeleton />
                    </div>
                ) : myEvents.length === 0 ? (
                    // --- Empty State ---
                    <div className="text-center py-16">
                        <CalendarX className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-xl font-semibold text-gray-800">No Club Events Found</h3>
                        <p className="mt-2 text-gray-500">Get started by creating a new event for your club.</p>
                        <Button 
                            className="mt-6"
                            onClick={() => navigate('/events/create')}
                            leftIcon={<PlusCircle size={18} />}
                        >
                            Create Your First Event
                        </Button>
                    </div>
                ) : (
                    // --- Events Grid ---
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myEvents.map(event => {
                            const status = getEventStatus(event.startDate, event.endDate);
                            return (
                                <div key={event.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col hover:shadow-lg transition-shadow duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-gray-800 pr-2">{event.title}</h3>
                                        <Badge variant={status.variant}>{status.text}</Badge>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 mb-6 flex-grow">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span>{new Date(event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-gray-400" />
                                            <span>{event.registeredCount || 0} Registered</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            fullWidth
                                            size="sm"
                                            onClick={() => navigate(`/events/${event.id}/attendance`)}
                                            leftIcon={<ClipboardList size={16} />}
                                        >
                                            Manage
                                        </Button>
                                        <Button
                                            fullWidth
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDownloadAttendance(event.id, event.title)}
                                            leftIcon={<Download size={16} />}
                                        >
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceDashboard;