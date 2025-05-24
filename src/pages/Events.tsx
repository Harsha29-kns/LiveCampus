import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Search, Filter, Plus, X, ChevronDown } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { Event } from '../types';

const Events: React.FC = () => {
  const { events, fetchEvents, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState({
    status: new URLSearchParams(location.search).get('filter') || 'all',
    organizer: 'all',
    timeframe: 'upcoming',
  });

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (events.length > 0) {
      let filtered = [...events];
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(event => 
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      // Apply status filter
      if (filters.status !== 'all') {
        filtered = filtered.filter(event => event.status === filters.status);
      }
      
      // Apply organizer filter
      if (filters.organizer !== 'all') {
        filtered = filtered.filter(event => event.organizerType === filters.organizer);
      }
      
      // Apply timeframe filter
      const now = new Date();
      if (filters.timeframe === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.startDate) > now);
      } else if (filters.timeframe === 'past') {
        filtered = filtered.filter(event => new Date(event.endDate) < now);
      } else if (filters.timeframe === 'today') {
        const today = new Date(now.setHours(0, 0, 0, 0));
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        filtered = filtered.filter(event => {
          const eventStart = new Date(event.startDate);
          return eventStart >= today && eventStart < tomorrow;
        });
      }
      
      // If filtering by pending and user is not admin, show only their events
      if (
        filters.status === 'pending' &&
        user &&
        (user.role === 'club' || user.role === 'faculty')
      ) {
        filtered = filtered.filter(
          event =>
            event.status === 'pending' &&
            event.organizerId === user.id &&
            event.organizerType === user.role
        );
      }

      // Sort by date (upcoming first)
      filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      setFilteredEvents(filtered);
    }
  }, [events, searchTerm, filters, user]);

  const clearFilters = () => {
    setFilters({
      status: 'all',
      organizer: 'all',
      timeframe: 'upcoming',
    });
    setSearchTerm('');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const visibleEvents = filteredEvents.filter(event => event.status !== 'rejected');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Events</h1>
        <div className="mt-2 sm:mt-0">
          {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
            <Button 
              onClick={() => navigate('/events/create')}
              leftIcon={<Plus size={16} />}
            >
              Create Event
            </Button>
          )}
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-grow">
            <Input
              placeholder="Search events..."
              leftIcon={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Filter size={16} />}
              rightIcon={<ChevronDown size={16} />}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              Filters
            </Button>
            {(searchTerm || filters.status !== 'all' || filters.organizer !== 'all' || filters.timeframe !== 'upcoming') && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X size={16} />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {filterOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Organizer
              </label>
              <select
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={filters.organizer}
                onChange={(e) => setFilters({...filters, organizer: e.target.value})}
              >
                <option value="all">All Organizers</option>
                <option value="admin">Administration</option>
                <option value="faculty">Faculty</option>
                <option value="club">Clubs</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Timeframe
              </label>
              <select
                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={filters.timeframe}
                onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
              >
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="past">Past</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Events List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardBody className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-48 h-32 bg-neutral-200 rounded-md"></div>
                <div className="flex-grow">
                  <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
                </div>
              </CardBody>
            </Card>
          ))
        ) : visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <Card 
              key={event.id} 
              className="transition-transform hover:-translate-y-1 hover:shadow-md"
              hoverable
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <CardBody className="flex flex-col md:flex-row gap-4">
                {event.image ? (
                  <div className="w-full md:w-48 h-32 rounded-md overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-48 h-32 bg-primary-100 rounded-md flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary-500" />
                  </div>
                )}
                
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <h3 className="text-lg font-semibold text-neutral-900">{event.title}</h3>
                    <div className="mt-1 md:mt-0">
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-neutral-500 mt-1">
                    {format(parseISO(event.startDate), 'MMM d, yyyy • h:mm a')} • {event.location}
                  </p>
                  
                  <p className="text-sm text-neutral-700 mt-2 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-between mt-3">
                    <div className="flex items-center">
                      <span className="text-xs text-neutral-500 mr-2">Organized by:</span>
                      <Badge variant="neutral" size="sm">
                        {event.organizerName}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center mt-2 md:mt-0">
                      <span className="text-xs text-neutral-500 mr-2">
                        {event.registeredCount} registered
                      </span>
                      {event.capacity && (
                        <span className="text-xs text-neutral-500">
                          / {event.capacity} capacity
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <Card>
            <CardBody className="text-center py-8">
              <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-700">No events found</h3>
              <p className="text-neutral-500 mb-4">
                {searchTerm || filters.status !== 'all' || filters.organizer !== 'all' || filters.timeframe !== 'upcoming' ? (
                  <>
                    No events match your current filters. Try adjusting your search criteria.
                    <br />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  'There are no events scheduled at this time.'
                )}
              </p>
              {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
                <Button 
                  onClick={() => navigate('/events/create')}
                >
                  Create Event
                </Button>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Events;