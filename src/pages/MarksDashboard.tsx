import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Event } from '../types';

const MarksDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const { events, fetchEvents, isLoading: isEventsLoading } = useEventStore();
    const navigate = useNavigate();

    const [myEvents, setMyEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [marksData, setMarksData] = useState<Record<string, string | number>>({});
    const [isDataLoading, setIsDataLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (user?.role === 'club' && events.length > 0) {
            const myClubEvents = events
                .filter(event => event.clubId === user.clubId && event.status !== 'rejected')
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setMyEvents(myClubEvents);
        }
    }, [events, user]);

    useEffect(() => {
        if (!isEventsLoading) {
            setIsDataLoading(false);
        }
    }, [isEventsLoading]);


    const handleSelectEvent = async (event: Event) => {
        setIsDataLoading(true);
        setSelectedEvent(event);
        try {
            const regsQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', event.id));
            const regsSnap = await getDocs(regsQuery);
            const regs = regsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRegistrations(regs);

            const marksObj: Record<string, string | number> = {};
            regs.forEach(reg => {
                marksObj[reg.id] = reg.marks ?? '';
            });
            setMarksData(marksObj);

        } catch (error) {
            toast.error("Failed to load registrations for this event.");
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleMarksChange = (regId: string, value: string) => {
        setMarksData(prev => ({ ...prev, [regId]: value }));
    };

    const handleSaveMarks = async () => {
        await Promise.all(
            registrations.map(reg => {
                const marks = marksData[reg.id];
                return updateDoc(doc(db, 'eventRegistrations', reg.id), { marks });
            })
        );
        toast.success('Marks saved!');
    };

    const handleDownloadExcel = () => {
        if (!selectedEvent) return;
        const data = registrations.map((reg, idx) => ({
            'S.No': idx + 1,
            'Reg. No': reg.regNo || '',
            'Name': reg.name || '',
            'Status': reg.status === 'attended' ? 'Present' : 'Absent',
            'Marks': marksData[reg.id] ?? '',
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance & Marks');
        XLSX.writeFile(workbook, `${selectedEvent.title || 'event'}-attendance-marks.xlsx`);
    };


    if (isDataLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <LoadingSpinner size="lg" text="Loading data..." />
            </div>
        );
    }

    if (selectedEvent) {
        return (
            <div className="max-w-4xl mx-auto mt-8 p-4 bg-white rounded shadow">
                <Button onClick={() => setSelectedEvent(null)} variant="outline" className="mb-4">
                    &larr; Back to Events
                </Button>
                <h2 className="text-2xl font-bold mb-1">Marks for: {selectedEvent.title}</h2>
                <p className="text-sm text-gray-500 mb-4">Date: {selectedEvent.startDate?.slice(0, 10)}</p>

                {registrations.length === 0 ? (
                    <p>No students registered for this event.</p>
                ) : (
                    <>
                        <table className="min-w-full border mb-4">
                            <thead>
                                <tr>
                                    <th className="border px-2 py-1">S.No</th>
                                    <th className="border px-2 py-1">Reg. No</th>
                                    <th className="border px-2 py-1">Name</th>
                                    <th className="border px-2 py-1">Status</th>
                                    <th className="border px-2 py-1">Marks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.map((reg, idx) => (
                                    <tr key={reg.id}>
                                        <td className="border px-2 py-1">{idx + 1}</td>
                                        <td className="border px-2 py-1">{reg.regNo}</td>
                                        <td className="border px-2 py-1">{reg.name}</td>
                                        <td className="border px-2 py-1">
                                            {reg.status === 'attended' ? 'Present' : 'Absent'}
                                        </td>
                                        <td className="border px-2 py-1">
                                            <input
                                                type="number"
                                                value={marksData[reg.id] || ''}
                                                onChange={(e) => handleMarksChange(reg.id, e.target.value)}
                                                className="w-24 border rounded px-2 py-1"
                                                placeholder="N/A"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex gap-2">
                            <Button onClick={handleSaveMarks}>Save Marks</Button>
                            <Button onClick={handleDownloadExcel} variant="outline">Download Excel</Button>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Select an Event to Enter Marks</h2>
            {myEvents.length === 0 ? (
                <p>No events found for your club.</p>
            ) : (
                <table className="min-w-full border mb-4">
                    <thead>
                        <tr>
                            <th className="border px-2 py-1">Event</th>
                            <th className="border px-2 py-1">Date</th>
                            <th className="border px-2 py-1">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myEvents.map(event => (
                            <tr key={event.id}>
                                <td className="border px-2 py-1">{event.title}</td>
                                <td className="border px-2 py-1">{event.startDate?.slice(0, 10)}</td>
                                <td className="border px-2 py-1">
                                    <Button
                                        size="sm"
                                        onClick={() => handleSelectEvent(event)}
                                    >
                                        Enter Marks
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default MarksDashboard;