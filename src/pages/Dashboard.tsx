
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, Bell, ChevronRight, PlusCircle, UserCheck, BarChart2, Activity, AlertCircle, TrendingUp, ArrowUpRight, Ticket } from 'lucide-react';
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
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { events, fetchEvents, isLoading: isEventsLoading } = useEventStore();
  const { clubs, fetchClubs, isLoading: isClubsLoading } = useClubStore();
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const navigate = useNavigate();

  const isDataLoading = isEventsLoading || isClubsLoading;

  useEffect(() => {
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

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // --- STATS CALCULATION ---
  const approvedEvents = events.filter(e => e.status === 'approved');
  const upcomingEvents = approvedEvents.filter(e => e.endDate && new Date(e.endDate) > new Date());
  const pendingEventsCount = events.filter(event => event.status === 'pending').length;
  const myClub = user?.role === 'club' ? clubs.find(c => c.id === user.clubId) : null;
  const myOrganizedEvents = user ? events.filter(e => e.organizerId === (user.role === 'club' ? user.clubId : user.id)) : [];
  const totalRegistrations = myOrganizedEvents.reduce((total, event) => total + (event.registeredCount || 0), 0);
  const eventsTodayCount = approvedEvents.filter(e => e.startDate && isToday(parseISO(e.startDate))).length;

  const StatCard = ({ title, value, icon, colorFrom, colorTo, onClick, delay = 0 }: { title: string, value: string | number, icon: React.ReactNode, colorFrom: string, colorTo: string, onClick?: () => void, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-6 shadow-lg text-white cursor-pointer group`}
      style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl w-fit mb-4 text-white shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </motion.div>
  );

  const QuickActionButton = ({ label, icon, onClick, delay = 0 }: { label: string, icon: React.ReactNode, onClick: () => void, delay?: number }) => (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      whileHover={{ scale: 1.03, backgroundColor: "rgb(248 250 252)" }}
      whileTap={{ scale: 0.98 }}
      className="flex flex-col items-center justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all text-center group h-full w-full"
    >
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">{label}</span>
      <span className="text-xs text-slate-400 mt-1">Click to view</span>
    </motion.button>
  );

  const EventListItem = ({ event, isRegistered = false }: { event: Event, isRegistered?: boolean }) => (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="flex-shrink-0 w-16 text-center mr-5 bg-indigo-50 rounded-lg py-2 group-hover:bg-indigo-100 transition-colors">
        <div className="text-xl font-bold text-indigo-700">{format(parseISO(event.startDate), 'd')}</div>
        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{format(parseISO(event.startDate), 'MMM')}</div>
      </div>
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{event.title}</h4>
        <div className="flex items-center text-sm text-slate-500 mt-1">
          <Clock size={14} className="mr-1" />
          <span className="mr-3">{format(parseISO(event.startDate), 'h:mm a')}</span>
          <span className="truncate">{event.location}</span>
        </div>
      </div>
      {isRegistered && <Badge variant="success" size="sm">Registered</Badge>}
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <ArrowUpRight size={16} className="text-slate-600" />
      </div>
    </motion.div>
  );



  const isClubProfileIncomplete =
    user?.role === 'club' &&
    (
      !user.club ||
      !user.club.name ||
      !user.club.facultyAdvisor ||
      !user.club.president ||
      !user.club.vicePresident
    );

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-slate-500 animate-pulse">Preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              {getTimeBasedGreeting()},
            </span>
            <br />
            {user?.name}!
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Here's what's happening on campus today.</p>
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-slate-400 text-right">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard delay={0.1} title="Upcoming Events" value={upcomingEvents.length} icon={<Calendar />} colorFrom="#3b82f6" colorTo="#2563eb" onClick={() => navigate('/events')} />
        <StatCard delay={0.2} title="Active Clubs" value={clubs.length} icon={<Users />} colorFrom="#10b981" colorTo="#059669" onClick={() => navigate('/clubs')} />

        {user?.role === 'student' && <StatCard delay={0.3} title="My Registrations" value={registeredEvents.length} icon={<UserCheck />} colorFrom="#8b5cf6" colorTo="#7c3aed" onClick={() => navigate('/profile')} />}

        {(user?.role === 'faculty' || user?.role === 'club') && <StatCard delay={0.3} title="My Events" value={myOrganizedEvents.length} icon={<Activity />} colorFrom="#8b5cf6" colorTo="#7c3aed" />}

        {user?.role === 'admin' && <StatCard delay={0.3} title="Events Today" value={eventsTodayCount} icon={<Clock />} colorFrom="#8b5cf6" colorTo="#7c3aed" onClick={() => navigate('/events')} />}

        {user?.role === 'faculty' && (
          <StatCard
            delay={0.4}
            title="Action Required"
            value={events.filter(e => e.organizerType === 'club' && user.linkedClubIds?.includes(e.organizerId) && e.facultyApprovalStatus === 'pending').length}
            icon={<AlertCircle />}
            colorFrom="#ef4444"
            colorTo="#dc2626"
            onClick={() => navigate('/faculty/approvals')}
          />
        )}

        {(user?.role === 'admin' || user?.role === 'club') && <StatCard delay={0.4} title="Pending" value={pendingEventsCount} icon={<Bell />} colorFrom="#f59e0b" colorTo="#d97706" onClick={() => navigate('/events')} />}

        {(user?.role === 'faculty' || user?.role === 'club') && <StatCard delay={0.4} title="Total Registrations" value={totalRegistrations} icon={<BarChart2 />} colorFrom="#6366f1" colorTo="#4f46e5" />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-8">
          {/* Quick Actions Mobile/Tablet (Visible on smaller screens, usually above content) */}
          <div className="xl:hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && <QuickActionButton label="New Event" icon={<PlusCircle size={20} />} onClick={() => navigate('/events/create')} />}
            <QuickActionButton label="Browse" icon={<Calendar size={20} />} onClick={() => navigate('/events')} />
            <QuickActionButton label="Clubs" icon={<Users size={20} />} onClick={() => navigate('/clubs')} />
            <QuickActionButton label="Profile" icon={<UserCheck size={20} />} onClick={() => navigate('/profile')} />
          </div>

          {user?.role === 'student' && registeredEvents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Ticket className="text-indigo-500" size={24} />
                    <h2 className="text-xl font-bold text-slate-800">My Upcoming Registrations</h2>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {registeredEvents.filter(e => new Date(e.endDate) > new Date()).slice(0, 4).map(event => (
                    <div key={event.id} className="border-b border-slate-50 last:border-0 p-2">
                      <EventListItem event={event} isRegistered />
                    </div>
                  ))}
                </CardBody>
              </Card>
            </motion.div>
          )}

          {user?.role === 'club' && myClub && (
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <CardBody className="p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {myClub.logo ?
                    <img src={myClub.logo} alt={myClub.name} className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-lg" />
                    : <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20"><Users size={32} /></div>
                  }
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold mb-2">{myClub.name}</h2>
                    <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-slate-300">
                      <span className="flex items-center gap-1"><Users size={14} /> {myClub.memberCount} Members</span>
                      <span className="flex items-center gap-1"><UserCheck size={14} /> Advisor: {myClub.facultyAdvisor}</span>
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    <Button variant="secondary" onClick={() => navigate('/club-profile')}>Manage Profile</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 flex justify-between items-center py-5">
                <div className="flex items-center gap-2">
                  <Calendar className="text-blue-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-800">Happening Soon</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/events')} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  View All <ChevronRight size={16} className="ml-1" />
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {upcomingEvents.length > 0 ? (
                  <div className="divide-y divide-slate-50 p-2">
                    {upcomingEvents.slice(0, 5).map(event => <EventListItem key={event.id} event={event} />)}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50/50">
                    <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-3">
                      <Calendar className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700">No upcoming events</h3>
                    <p className="text-slate-500 text-sm">Check back later for new events!</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar / Quick Actions Desktop */}
        <div className="space-y-8">
          {/* Desktop Quick Actions */}
          <div className="hidden xl:grid grid-cols-2 gap-4">
            {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && <QuickActionButton delay={0.4} label="Create Event" icon={<PlusCircle size={22} />} onClick={() => navigate('/events/create')} />}
            <QuickActionButton delay={0.5} label="Browse Events" icon={<Calendar size={22} />} onClick={() => navigate('/events')} />
            <QuickActionButton delay={0.6} label="View Clubs" icon={<Users size={22} />} onClick={() => navigate('/clubs')} />
            <QuickActionButton delay={0.7} label="My Profile" icon={<UserCheck size={22} />} onClick={() => navigate('/profile')} />
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 py-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-green-500" size={24} />
                  <h3 className="text-lg font-bold text-slate-800">Popular Clubs</h3>
                </div>
              </CardHeader>
              <CardBody className="p-2">
                {clubs.sort((a, b) => b.memberCount - a.memberCount).slice(0, 4).map((club, index) => (
                  <div
                    key={club.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group mb-1 last:mb-0"
                    onClick={() => navigate(`/clubs/${club.id}`)}
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        {club.logo ?
                          <img src={club.logo} alt={club.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-slate-200" />
                          : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 text-indigo-600 font-bold border border-indigo-200">{club.name[0]}</div>
                        }
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-900 border border-white">
                          #{index + 1}
                        </div>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors block">{club.name}</span>
                        <span className="text-xs text-slate-400">{club.memberCount} members</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
                  </div>
                ))}
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>

      {isClubProfileIncomplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="bg-white border-l-4 border-yellow-500 shadow-2xl rounded-r-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-500 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-slate-800">Profile Incomplete</h4>
              <p className="text-sm text-slate-600 mt-1 mb-2">Your club profile needs attention. Complete it to unlock all features.</p>
              <button
                className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full hover:bg-yellow-200 transition-colors"
                onClick={() => navigate('/club-profile')}
              >
                Complete Profile
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;