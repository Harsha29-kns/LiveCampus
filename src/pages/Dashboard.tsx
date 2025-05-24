import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, TrendingUp, Bell, ChevronRight, Filter } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useClubStore } from '../stores/clubStore';
import { Card, CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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

  useEffect(() => {
    const fetchMyRegistrations = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'eventRegistrations'),
        where('userId', '==', user.id)
      );
      const snapshot = await getDocs(q);
      setMyRegistrationsCount(snapshot.size);
    };
    fetchMyRegistrations();
  }, [user]);

  // Filter upcoming events (events that haven't ended yet)
  const upcomingEvents = events
    .filter(event => new Date(event.endDate) > new Date() && event.status === 'approved')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Filter pending events (for admins)
  const pendingEvents = events
    .filter(event => event.status === 'pending')
    .slice(0, 3);

  // Get stats
  const totalEvents = events.length;
  const totalClubs = clubs.length;
  const upcomingEventsCount = events.filter(
    event => new Date(event.endDate) > new Date() && event.status === 'approved'
  ).length;
  const pendingEventsCount = events.filter(event => event.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <div className="mt-2 sm:mt-0">
          {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
            <Button 
              onClick={() => navigate('/events/create')}
              leftIcon={<Calendar size={16} />}
            >
              Create Event
            </Button>
          )}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <CardBody>
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-white/20">
                <Calendar size={24} className="text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/80">Total Events</p>
                <h3 className="text-2xl font-bold">{totalEvents}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary-500 to-secondary-600 text-white">
          <CardBody>
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-white/20">
                <Users size={24} className="text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/80">Active Clubs</p>
                <h3 className="text-2xl font-bold">{totalClubs}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <CardBody>
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-white/20">
                <Clock size={24} className="text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/80">Upcoming Events</p>
                <h3 className="text-2xl font-bold">{upcomingEventsCount}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
          <Card
            className="bg-gradient-to-br from-neutral-700 to-neutral-800 text-white cursor-pointer"
            onClick={() => navigate('/events?filter=pending')}
          >
            <CardBody>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <Bell size={24} className="text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-white/80">Pending Approvals</p>
                  <h3 className="text-2xl font-bold">{pendingEventsCount}</h3>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        
        {user?.role !== 'admin' && (
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardBody>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-white/80">My Registrations</p>
                  <h3 className="text-2xl font-bold">{myRegistrationsCount}</h3>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      
      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900">Upcoming Events</h2>
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
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-neutral-200 rounded-t-lg"></div>
                <CardBody>
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-5/6"></div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <Card 
                key={event.id} 
                className="transition-transform hover:-translate-y-1 hover:shadow-md"
                hoverable
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {event.image && (
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardBody>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-neutral-500 mb-3">
                    {format(parseISO(event.startDate), 'MMM d, yyyy • h:mm a')}
                  </p>
                  <p className="text-sm text-neutral-700 line-clamp-2 mb-3">
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" size="sm">
                      {event.organizerType}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      {event.registeredCount} registered
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody className="text-center py-8">
              <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-700">No upcoming events</h3>
              <p className="text-neutral-500 mb-4">Check back later for new events or create one yourself!</p>
              {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
                <Button 
                  onClick={() => navigate('/events/create')}
                  variant="outline"
                >
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Pending Approvals</h2>
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
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardBody>
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-neutral-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-5/6"></div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : pendingEvents.length > 0 ? (
            <div className="space-y-3">
              {pendingEvents.map((event) => (
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900">Popular Clubs</h2>
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
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardBody className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-neutral-200 rounded-full mb-4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {clubs.slice(0, 4).map((club) => (
              <Card 
                key={club.id} 
                className="transition-transform hover:-translate-y-1 hover:shadow-md"
                hoverable
                onClick={() => navigate(`/clubs/${club.id}`)}
              >
                <CardBody className="flex flex-col items-center text-center p-6">
                  {club.logo ? (
                    <img 
                      src={club.logo} 
                      alt={club.name} 
                      className="w-16 h-16 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                      <span className="text-xl font-bold text-primary-700">
                        {club.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-neutral-900">{club.name}</h3>
                  <p className="text-sm text-neutral-500">{club.memberCount} members</p>
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