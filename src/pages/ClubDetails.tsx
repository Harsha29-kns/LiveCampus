import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, User, Calendar, ArrowLeft, Edit, Mail, Share2 } from 'lucide-react';
import { useClubStore } from '../stores/clubStore';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Event } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Import the spinner component

const ClubDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClubById, fetchClubs } = useClubStore();
  const { events, fetchEvents } = useEventStore();
  const { user } = useAuthStore();
  const [club, setClub] = useState<any>(null);
  const [clubEvents, setClubEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect for fetching initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        let currentClub = getClubById(id || '');
        if (!currentClub) {
          await fetchClubs();
          currentClub = getClubById(id || '');
        }

        if (currentClub) {
          setClub(currentClub);
        } else {
          toast.error('Club not found');
          navigate('/clubs');
          return;
        }

        if (events.length === 0) {
          await fetchEvents();
        }
      } catch (error) {
        toast.error("Failed to load club details.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, navigate, fetchClubs, getClubById, fetchEvents, events.length]);

  // Effect for filtering events once data is loaded
  useEffect(() => {
    if (club && events.length > 0) {
      const now = new Date();
      const upcomingEvents = events.filter(
        (event) =>
          event.organizerId === club.id &&
          event.organizerType === 'club' &&
          parseISO(event.endDate) >= now
      );
      setClubEvents(upcomingEvents);
    }
  }, [club, events]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: club.name,
        text: club.description,
        url: window.location.href,
      })
        .then(() => toast.success('Shared successfully'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success('Link copied to clipboard'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading club details..." />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Club Not Found</h2>
        <p className="text-neutral-500">The club you are looking for may have been removed.</p>
        <Button onClick={() => navigate('/clubs')} className="mt-4">Back to Clubs</Button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isPresident = user?.id === club.presidentId;
  const isFacultyAdvisor = user?.id === club.facultyAdvisorId;
  const canEdit = isAdmin || isPresident || isFacultyAdvisor;

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center mb-4">
            <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft size={16} />}
                onClick={() => navigate('/clubs')}
            >
                Back to Clubs
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Club Header */}
                <Card>
                    <CardBody>
                        <div className="flex flex-col md:flex-row md:items-center">
                            {club.logo ? (
                                <img
                                    src={club.logo}
                                    alt={club.name}
                                    className="w-24 h-24 rounded-full object-cover mr-6"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mr-6">
                                    <span className="text-3xl font-bold text-primary-700">
                                        {club.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900 mb-1">{club.name}</h1>
                                <p className="text-neutral-500 flex items-center">
                                    <Users size={16} className="mr-1" />
                                    {club.memberCount} members
                                </p>
                                {club.tags && club.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {club.tags.map((tag, index) => (
                                            <Badge key={index} variant="neutral" size="sm">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {canEdit && (
                                <div className="mt-4 md:mt-0 md:ml-auto flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<Edit size={16} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/clubs/${club.id}/edit`);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
                {/* Club Description */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold text-neutral-900">About This Club</h2>
                    </CardHeader>
                    <CardBody>
                        <p className="text-neutral-700 whitespace-pre-line">
                            {club.description}
                        </p>
                    </CardBody>
                </Card>
                {/* Club Events */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-xl font-semibold text-neutral-900">Upcoming Events</h2>
                        {canEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Calendar size={16} />}
                                onClick={() => navigate('/events/create')}
                            >
                                Create Event
                            </Button>
                        )}
                    </CardHeader>
                    <CardBody>
                        {clubEvents.length > 0 ? (
                            <div className="space-y-4">
                                {clubEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                                        onClick={() => navigate(`/events/${event.id}`)}
                                    >
                                        <div className="sm:w-32 text-center sm:text-left mb-2 sm:mb-0">
                                            <div className="text-lg font-semibold text-primary-700">
                                                {format(parseISO(event.startDate), 'MMM d')}
                                            </div>
                                            <div className="text-sm text-neutral-500">
                                                {format(parseISO(event.startDate), 'h:mm a')}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-medium text-neutral-900">{event.title}</h3>
                                            <p className="text-sm text-neutral-500">{event.location}</p>
                                        </div>
                                        <div className="mt-2 sm:mt-0 text-sm text-neutral-500">
                                            {event.registeredCount} registered
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-neutral-700">No upcoming events</h3>
                                <p className="text-neutral-500 mb-4">This club hasn't scheduled any events yet.</p>
                                {canEdit && (
                                    <Button
                                        onClick={() => navigate('/events/create')}
                                        variant="outline"
                                    >
                                        Create Event
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
            <div className="space-y-6">
                {/* Club Details */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold text-neutral-900">Club Details</h2>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <div className="flex items-start">
                            <User className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="font-medium text-neutral-900">President</h3>
                                <p className="text-neutral-700">{club.president}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <User className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="font-medium text-neutral-900">Vice-President</h3>
                                <p className="text-neutral-700">{club.vicePresident}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <User className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="font-medium text-neutral-900">Faculty Advisor</h3>
                                <p className="text-neutral-700">{club.facultyAdvisor}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <User className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="font-medium text-neutral-900">Phone No</h3>
                                <p className="text-neutral-700">{club.phoneNo}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Users className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="font-medium text-neutral-900">Membership</h3>
                                <p className="text-neutral-700">{club.memberCount} active members</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Contact Button */}
                <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<Mail size={16} />}
                    onClick={() => toast.success('Contact feature coming soon!')}
                >
                    Contact Club
                </Button>
                {/* Share Button */}
                <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<Share2 size={16} />}
                    onClick={handleShare}
                >
                    Share Club
                </Button>
            </div>
        </div>
    </div>
  );
};

export default ClubDetails;