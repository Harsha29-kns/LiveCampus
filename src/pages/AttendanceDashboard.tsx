import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Event } from '../types';

const AttendanceDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { events, fetchEvents, isLoading } = useEventStore();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (user && events.length > 0) {
        let filteredEvents: Event[] = [];
        if (user.role === 'club' && user.clubId) {
            filteredEvents = events.filter(event => event.clubId === user.clubId && event.status === 'approved');
        } else if (user.role === 'faculty') {
            // Assuming faculty can see all approved events to manage attendance
            // This could be refined to only events they are associated with if such a link exists
            filteredEvents = events.filter(event => event.status === 'approved');
        }
        
        const sortedEvents = filteredEvents.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setMyEvents(sortedEvents);
    }
  }, [events, user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="lg" text="Loading events for attendance..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Attendance Dashboard</h2>
      
      {myEvents.length === 0 ? (
        <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700">No Approved Events Found</h3>
            <p className="mt-2 text-sm text-gray-500">
                You have no upcoming or past approved events to manage attendance for.
            </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-3 text-left text-sm font-semibold text-gray-600">Event Title</th>
                <th className="border px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="border px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {myEvents.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border px-4 py-3 font-medium text-gray-800">{event.title}</td>
                  <td className="border px-4 py-3 text-sm text-gray-600">{new Date(event.startDate).toLocaleDateString()}</td>
                  <td className="border px-4 py-3 text-center">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/events/${event.id}/attendance`)}
                    >
                      Manage Attendance
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

export default AttendanceDashboard;
