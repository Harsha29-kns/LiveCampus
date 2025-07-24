import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const MarksDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (user?.role === 'club') {
      const myClubEvents = events.filter(event => event.clubId === user.clubId);
      setMyEvents(myClubEvents);
    }
  }, [events, user]);

  return (
    <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Enter Marks for Events</h2>
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
                    onClick={() => navigate(`/events/${event.id}/marks`)}
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