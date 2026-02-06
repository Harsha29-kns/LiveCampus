import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, X, ChevronDown, Globe } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { Event } from '../types';

const PublicEvents: React.FC = () => {
    const { events, fetchEvents, isLoading } = useEventStore();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [filters, setFilters] = useState({
        timeframe: 'upcoming',
        category: 'all',
    });

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (events.length > 0) {
            let filtered = [...events];

            // STRICT RULE: Only Approved Events
            filtered = filtered.filter(event => event.status === 'approved');

            // Apply search filter
            if (searchTerm) {
                filtered = filtered.filter(event =>
                    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    event.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
                );
            }

            // Apply category filter
            if (filters.category !== 'all') {
                filtered = filtered.filter(event => event.category === filters.category);
            }

            // Apply timeframe filter
            const now = new Date();
            if (filters.timeframe === 'upcoming') {
                filtered = filtered.filter(event => new Date(event.endDate) > now);
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

            // Sort by date (upcoming first)
            filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

            setFilteredEvents(filtered);
        }
    }, [events, searchTerm, filters]);

    const clearFilters = () => {
        setFilters({
            timeframe: 'upcoming',
            category: 'all',
        });
        setSearchTerm('');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                        <Globe className="text-primary-600" /> Public Events Feed
                    </h1>
                    <p className="text-neutral-500 mt-1">Discover what's happening across the campus.</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-grow">
                        <Input
                            placeholder="Search events, clubs, or locations..."
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
                        {(searchTerm || filters.category !== 'all' || filters.timeframe !== 'upcoming') && (
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
                                Timeframe
                            </label>
                            <select
                                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                value={filters.timeframe}
                                onChange={(e) => setFilters({ ...filters, timeframe: e.target.value })}
                            >
                                <option value="upcoming">Upcoming</option>
                                <option value="today">Today</option>
                                <option value="past">Past</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Category
                            </label>
                            <select
                                className="w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            >
                                <option value="all">All Categories</option>
                                <option value="hackathon">Hackathon</option>
                                <option value="gateexam">Gate Exam</option>
                                <option value="sports">Sports</option>
                                <option value="algorithms">Algorithms</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Events List */}
            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="animate-pulse">
                            <CardBody className="flex flex-col md:flex-row gap-4">
                                <div className="w-full md:w-48 h-32 bg-neutral-200 rounded-md"></div>
                                <div className="flex-grow">
                                    <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3"></div>
                                    <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                                </div>
                            </CardBody>
                        </Card>
                    ))
                ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => (
                        <Card
                            key={event.id}
                            className="transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer"
                            hoverable
                            onClick={() => navigate(`/events/${event.id}`)}
                        >
                            <CardBody className="flex flex-col md:flex-row gap-4">
                                {event.image ? (
                                    <div className="w-full md:w-48 h-32 rounded-md overflow-hidden flex-shrink-0">
                                        <img
                                            src={event.image}
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full md:w-48 h-32 bg-primary-100 rounded-md flex items-center justify-center flex-shrink-0">
                                        <Calendar className="h-12 w-12 text-primary-500" />
                                    </div>
                                )}

                                <div className="flex-grow">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600">
                                            {event.title}
                                        </h3>
                                        {event.category && (
                                            <Badge variant="neutral" size="sm" className="mt-1 md:mt-0">
                                                {event.category === 'other' ? (event.customCategory || 'Event') : event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                                        <span className="font-medium text-neutral-900">{format(parseISO(event.startDate), 'MMM d, h:mm a')}</span>
                                        <span>•</span>
                                        <span>{event.location}</span>
                                    </div>

                                    <p className="text-sm text-neutral-700 mt-2 line-clamp-2">
                                        {event.description}
                                    </p>

                                    <div className="flex items-center mt-3 pt-3 border-t border-neutral-100">
                                        <span className="text-xs text-neutral-500 mr-2">Organized by:</span>
                                        <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                                            {event.organizerName}
                                        </span>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardBody className="text-center py-12">
                            <div className="bg-neutral-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="h-8 w-8 text-neutral-400" />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-700">No events found</h3>
                            <p className="text-neutral-500 mt-1">
                                {searchTerm || filters.category !== 'all' || filters.timeframe !== 'upcoming'
                                    ? "No events match your current filters."
                                    : "There are no upcoming public events at the moment."}
                            </p>
                            {(searchTerm || filters.category !== 'all' || filters.timeframe !== 'upcoming') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PublicEvents;
