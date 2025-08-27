import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, Bell, ChevronRight, PlusCircle, Star, UserCheck, BarChart2, Activity } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useClubStore } from '../stores/clubStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { format, parseISO, isToday } from 'date-fns';
import { Event } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Import the loading spinner

const Dashboard: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const { events, fetchEvents, isLoading: isEventsLoading } = useEventStore(); // Get event loading state
  const { clubs, fetchClubs, isLoading: isClubsLoading } = useClubStore(); // Get club loading state
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const navigate = useNavigate();

  // Combined loading state to wait for both events and clubs
  const isDataLoading = isEventsLoading || isClubsLoading;

  useEffect(() => {
    // Fetch both clubs and events when the component mounts
    fetchClubs();
    fetchEvents();
  }, [fetchClubs, fetchEvents]);

  useEffect(() => {
    const loadRegisteredEvents = async () => {
      if (user?.role === 'student' && user.id && events.length > 0) {
        const registrationsQuery = query(
          collection(db, 'eventRegistrations'),
          where('userId', '==', user.id)
        );
        const registrationSnapshots = await getDocs(registrationsQuery);
        const eventIds = registrationSnapshots.docs.map(doc => doc.data().eventId);
        
        if (eventIds.length > 0) {
          const userRegisteredEvents = events.filter(event => eventIds.includes(event.id));
          setRegisteredEvents(userRegisteredEvents);
        } else {
          setRegisteredEvents([]);
        }
      }
    };

    if (user?.role === 'student') {
      loadRegisteredEvents();
    }
  }, [user, events]);

  // --- STATS CALCULATION ---
  const approvedEvents = events.filter(e => e.status === 'approved');
  const upcomingEvents = approvedEvents.filter(e => new Date(e.endDate) > new Date());
  const pendingEventsCount = events.filter(event => event.status === 'pending').length;
  const myClub = user?.role === 'club' ? clubs.find(c => c.id === user.clubId) : null;
  const myOrganizedEvents = user ? events.filter(e => e.organizerId === (user.role === 'club' ? user.clubId : user.id)) : [];
  const totalRegistrations = myOrganizedEvents.reduce((total, event) => total + (event.registeredCount || 0), 0);
  const eventsTodayCount = approvedEvents.filter(e => isToday(parseISO(e.startDate))).length;

  const StatCard = ({ title, value, icon, colorClass, onClick }: { title: string, value: string | number, icon: React.ReactNode, colorClass: string, onClick?: () => void }) => (
    <Card className={`text-white shadow-lg hover:shadow-xl transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardBody className={`flex items-center p-4 ${colorClass}`}>
        <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">{icon}</div>
        <div>
          <div className="text-sm font-medium uppercase opacity-80">{title}</div>
          <div className="text-3xl font-bold">{value}</div>
        </div>
      </CardBody>
    </Card>
  );

  const QuickActionButton = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
    <Button variant="outline" onClick={onClick} className="w-full justify-start text-left py-3">
      <span className="mr-3">{icon}</span>
      {label}
    </Button>
  );

  const EventListItem = ({ event, isRegistered = false }: { event: Event, isRegistered?: boolean }) => (
    <div
      key={event.id}
      className="flex items-center p-3 rounded-lg hover:bg-neutral-50 cursor-pointer"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="w-16 text-center mr-4">
        <div className="text-lg font-bold text-primary-600">{format(parseISO(event.startDate), 'd')}</div>
        <div className="text-sm text-neutral-500 uppercase">{format(parseISO(event.startDate), 'MMM')}</div>
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold text-neutral-800">{event.title}</h4>
        <p className="text-sm text-neutral-500">{event.location}</p>
      </div>
      {isRegistered && <Badge variant="success" size="sm">Registered</Badge>}
      <ChevronRight className="w-5 h-5 text-neutral-400 ml-2" />
    </div>
  );

  const myClubEvents = user?.role === 'club' ? events.filter(event => event.organizerId === user.clubId) : [];

  const isClubProfileIncomplete =
    user?.role === 'club' &&
    (
      !user.club ||
      !user.club.name ||
      !user.club.facultyAdvisor ||
      !user.club.president ||
      !user.club.vicePresident
    );

  // Use the combined loading state to show the spinner
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-neutral-800">Welcome, {user?.name}!</h1>
        <p className="text-neutral-500 mt-1">Here's your campus summary for today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Upcoming Events" value={upcomingEvents.length} icon={<Calendar size={24} />} colorClass="bg-gradient-to-br from-blue-500 to-blue-600" onClick={() => navigate('/events')} />
        <StatCard title="Active Clubs" value={clubs.length} icon={<Users size={24} />} colorClass="bg-gradient-to-br from-green-500 to-green-600" onClick={() => navigate('/clubs')} />
        
        {user?.role === 'student' && <StatCard title="My Registrations" value={registeredEvents.length} icon={<UserCheck size={24} />} colorClass="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => navigate('/profile')} />}
        
        {(user?.role === 'faculty' || user?.role === 'club') && <StatCard title="My Events" value={myOrganizedEvents.length} icon={<Activity size={24} />} colorClass="bg-gradient-to-br from-purple-500 to-purple-600" />}
        
        {user?.role === 'admin' && <StatCard title="Events Today" value={eventsTodayCount} icon={<Clock size={24} />} colorClass="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => navigate('/events')} />}

        {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && <StatCard title="Pending Events" value={pendingEventsCount} icon={<Bell size={24} />} colorClass="bg-gradient-to-br from-yellow-500 to-yellow-600" onClick={() => navigate('/events')} />}
        
        {(user?.role === 'faculty' || user?.role === 'club') && <StatCard title="Total Registrations" value={totalRegistrations} icon={<BarChart2 size={24} />} colorClass="bg-gradient-to-br from-indigo-500 to-indigo-600" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {user?.role === 'student' && registeredEvents.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-neutral-800">My Upcoming Registered Events</h2>
              </CardHeader>
              <CardBody className="divide-y divide-neutral-100">
                {registeredEvents.filter(e => new Date(e.endDate) > new Date()).slice(0, 4).map(event => (
                  <EventListItem key={event.id} event={event} isRegistered />
                ))}
              </CardBody>
            </Card>
          )}

          {user?.role === 'club' && myClub && (
             <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-neutral-800">My Club: {myClub.name}</h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-center">
                    {myClub.logo ? <img src={myClub.logo} alt={myClub.name} className="w-16 h-16 rounded-full object-cover mr-4" /> : <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mr-4"><Users size={24} className="text-primary-600"/></div>}
                    <div>
                        <p className="text-neutral-600"><span className="font-semibold">Members:</span> {myClub.memberCount}</p>
                        <p className="text-neutral-600"><span className="font-semibold">Faculty Advisor:</span> {myClub.facultyAdvisor}</p>
                    </div>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-neutral-800">What's Happening Soon</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/events')} rightIcon={<ChevronRight size={16} />}>View All</Button>
            </CardHeader>
            <CardBody className="divide-y divide-neutral-100">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 5).map(event => <EventListItem key={event.id} event={event} />)
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-neutral-700">No upcoming events</h3>
                  <p className="text-neutral-500">Check back later for new events!</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-neutral-800">Quick Actions</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && <QuickActionButton label="Create New Event" icon={<PlusCircle size={18} />} onClick={() => navigate('/events/create')} />}
              <QuickActionButton label="Browse All Events" icon={<Calendar size={18} />} onClick={() => navigate('/events')} />
              <QuickActionButton label="Explore Clubs" icon={<Users size={18} />} onClick={() => navigate('/clubs')} />
              <QuickActionButton label="View My Profile" icon={<UserCheck size={18} />} onClick={() => navigate('/profile')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-neutral-800">Popular Clubs</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {clubs.sort((a, b) => b.memberCount - a.memberCount).slice(0, 4).map(club => (
                <div key={club.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 cursor-pointer" onClick={() => navigate(`/clubs/${club.id}`)}>
                   <div className="flex items-center">
                    {club.logo ? <img src={club.logo} alt={club.name} className="w-8 h-8 rounded-full object-cover mr-3" /> : <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center mr-3"><Star size={14} className="text-secondary-600"/></div>}
                    <span className="font-medium text-neutral-700">{club.name}</span>
                  </div>
                  
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {user?.role === 'club' && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-neutral-800">My Club Events</h2>
          </CardHeader>
          <CardBody className="divide-y divide-neutral-100">
            {myClubEvents.length > 0 ? (
              myClubEvents.map(event => (
                <div key={event.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-neutral-800">{event.title}</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/events/${event.id}`)}>Manage/View Participants</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-neutral-700">No events found for your club</h3>
                <p className="text-neutral-500">Create an event to get started!</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {isClubProfileIncomplete && !showProfileForm && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <span>
              Your club profile is incomplete. Please&nbsp;
              <button
                className="underline text-primary-700 font-semibold"
                onClick={() => setShowProfileForm(true)}
              >
                complete your club profile
              </button>
              .
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;