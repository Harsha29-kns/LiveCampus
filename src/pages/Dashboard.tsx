import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, Bell, ChevronRight, PlusCircle, Star, UserCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useClubStore } from '../stores/clubStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const { clubs, fetchClubs } = useClubStore();
  const [isLoading, setIsLoading] = useState(true);
  const [myRegistrationsCount, setMyRegistrationsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchClubs()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchEvents, fetchClubs]);

  // Stats
  const totalEvents = events.length;
  const totalClubs = clubs.length;
  const upcomingEventsCount = events.filter(
    event => new Date(event.endDate) > new Date() && event.status === 'approved'
  ).length;
  const pendingEventsCount = events.filter(event => event.status === 'pending').length;

  // Upcoming Events
  const upcomingEvents =
    user?.role === 'admin'
      ? events.filter(
          event =>
            new Date(event.endDate) > new Date() &&
            event.status === 'approved'
        )
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3)
      : user?.role === 'club'
      ? events.filter(
          event =>
            event.organizerType === 'club' &&
            event.organizerId === user.clubId &&
            new Date(event.endDate) > new Date() &&
            event.status === 'approved'
        )
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3)
      : events.filter(
          event =>
            new Date(event.endDate) > new Date() &&
            event.status === 'approved'
        )
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 3);

  // Pending Events (Admin)
  const pendingEvents = events.filter(event => event.status === 'pending').slice(0, 3);

  // Popular Clubs
  const popularClubs = [...clubs].sort((a, b) => b.memberCount - a.memberCount).slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary-800 mb-1">Welcome{user?.name ? `, ${user.name}` : ''}!</h1>
          <p className="text-neutral-600 text-lg">
            {user?.role === 'admin' && 'Admin Dashboard: Manage events, clubs, and approvals.'}
            {user?.role === 'club' && 'Club Dashboard: Track your club’s events and members.'}
            {user?.role === 'faculty' && 'Faculty Dashboard: Oversee and support student activities.'}
            {user?.role === 'student' && 'Student Dashboard: Discover and join campus events!'}
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
          <Button
            onClick={() => navigate('/events/create')}
            leftIcon={<PlusCircle size={18} />}
            className="mt-4 sm:mt-0"
          >
            Create Event
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg">
          <CardBody>
            <div className="flex items-center">
              <Calendar size={28} className="mr-4" />
              <div>
                <div className="text-lg font-semibold">Total Events</div>
                <div className="text-2xl font-bold">{totalEvents}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg">
          <CardBody>
            <div className="flex items-center">
              <Users size={28} className="mr-4" />
              <div>
                <div className="text-lg font-semibold">Active Clubs</div>
                <div className="text-2xl font-bold">{totalClubs}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg">
          <CardBody>
            <div className="flex items-center">
              <Clock size={28} className="mr-4" />
              <div>
                <div className="text-lg font-semibold">Upcoming Events</div>
                <div className="text-2xl font-bold">{upcomingEventsCount}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white shadow-lg cursor-pointer"
            onClick={() => navigate('/events?filter=pending')}
          >
            <CardBody>
              <div className="flex items-center">
                <Bell size={28} className="mr-4" />
                <div>
                  <div className="text-lg font-semibold">Pending Approvals</div>
                  <div className="text-2xl font-bold">{pendingEventsCount}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        {user?.role === 'student' && (
          <Card className="bg-gradient-to-br from-pink-500 to-pink-700 text-white shadow-lg">
            <CardBody>
              <div className="flex items-center">
                <UserCheck size={28} className="mr-4" />
                <div>
                  <div className="text-lg font-semibold">My Registrations</div>
                  <div className="text-2xl font-bold">{myRegistrationsCount}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-primary-800">Upcoming Events</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/events')}
            rightIcon={<ChevronRight size={16} />}
          >
            View All
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-48" />
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map(event => (
              <Card
                key={event.id}
                className="hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {event.image && (
                  <div className="h-40 w-full overflow-hidden rounded-t-lg">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardBody>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1">{event.title}</h3>
                  <div className="text-sm text-neutral-500 mb-2">
                    {format(parseISO(event.startDate), 'MMM d, yyyy • h:mm a')}
                  </div>
                  <div className="text-sm text-neutral-700 line-clamp-2 mb-2">{event.description}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" size="sm">{event.organizerType}</Badge>
                    <span className="text-xs text-neutral-500">{event.registeredCount} registered</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-8">
              <Calendar className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-neutral-700">No upcoming events</h3>
              <p className="text-neutral-500 mb-4">Check back later for new events or create one yourself!</p>
              {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
                <Button onClick={() => navigate('/events/create')} variant="outline">
                  Create Event
                </Button>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Pending Approvals (Admin Only) */}
      {user?.role === 'admin' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-primary-800">Pending Approvals</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/events?filter=pending')}
              rightIcon={<ChevronRight size={16} />}
            >
              View All
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse h-20" />
              ))}
            </div>
          ) : pendingEvents.length > 0 ? (
            <div className="space-y-3">
              {pendingEvents.map(event => (
                <Card key={event.id}>
                  <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">{event.title}</h3>
                      <p className="text-sm text-neutral-500">
                        Submitted by {event.organizerName} • {format(parseISO(event.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center mt-3 sm:mt-0">
                      <Badge variant="warning" className="mr-3">Pending</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardBody className="text-center py-6">
                <h3 className="text-lg font-medium text-neutral-700">No pending approvals</h3>
                <p className="text-neutral-500">All event requests have been processed.</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Popular Clubs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-primary-800">Popular Clubs</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/clubs')}
            rightIcon={<ChevronRight size={16} />}
          >
            View All
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse h-32" />
            ))}
          </div>
        ) : popularClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {popularClubs.map(club => (
              <Card
                key={club.id}
                className="hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/clubs/${club.id}`)}
              >
                <CardBody className="flex flex-col items-center text-center p-6">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-16 h-16 rounded-full object-cover mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                      <span className="text-xl font-bold text-primary-700">
                        {club.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-neutral-900">{club.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Star size={16} className="text-yellow-400" />
                    <span className="text-sm text-neutral-500">{club.memberCount} members</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-6">
              <h3 className="text-lg font-medium text-neutral-700">No clubs found</h3>
              <p className="text-neutral-500">Be the first to create a club!</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;