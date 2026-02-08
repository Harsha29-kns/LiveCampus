import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTicketStore } from '../stores/ticketStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Ticket } from '../types';

const ClubTickets: React.FC = () => {
    const { user } = useAuthStore();
    const { tickets, isLoading, subscribeToClubTickets } = useTicketStore();
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const navigate = useNavigate();

    useEffect(() => {
        if (user && user.clubId) {
            const unsubscribe = subscribeToClubTickets(user.clubId);
            return () => unsubscribe();
        }
    }, [user, subscribeToClubTickets]);

    const getStatusBadge = (status: Ticket['status']) => {
        switch (status) {
            case 'open':
                return <Badge variant="error" size="sm"><AlertCircle size={12} className="mr-1" />Open</Badge>;
            case 'in_progress':
                return <Badge variant="warning" size="sm"><Clock size={12} className="mr-1" />In Progress</Badge>;
            case 'resolved':
                return <Badge variant="success" size="sm"><CheckCircle size={12} className="mr-1" />Resolved</Badge>;
            case 'closed':
                return <Badge variant="secondary" size="sm"><XCircle size={12} className="mr-1" />Closed</Badge>;
        }
    };

    const getCategoryIcon = (category: Ticket['category']) => {
        switch (category) {
            case 'payment': return '💳';
            case 'registration': return '📝';
            case 'venue': return '📍';
            case 'certificate': return '🎓';
            default: return '❓';
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        if (filter === 'all') return true;
        if (filter === 'open') return ticket.status === 'open' || ticket.status === 'in_progress';
        if (filter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
        return true;
    });

    // Group tickets by event
    const ticketsByEvent = filteredTickets.reduce((acc, ticket) => {
        const eventTitle = ticket.eventTitle || 'Unknown Event';
        if (!acc[eventTitle]) {
            acc[eventTitle] = [];
        }
        acc[eventTitle].push(ticket);
        return acc;
    }, {} as Record<string, Ticket[]>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading tickets..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-800">Support Tickets</h1>
                <p className="text-neutral-500 mt-1">Manage student inquiries about your events</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <Button
                    variant={filter === 'all' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All ({tickets.length})
                </Button>
                <Button
                    variant={filter === 'open' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('open')}
                >
                    Open ({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})
                </Button>
                <Button
                    variant={filter === 'resolved' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('resolved')}
                >
                    Resolved ({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})
                </Button>
            </div>

            {/* Ticket List by Event */}
            {Object.keys(ticketsByEvent).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(ticketsByEvent).map(([eventTitle, eventTickets]) => (
                        <div key={eventTitle}>
                            <h3 className="text-lg font-semibold text-neutral-700 mb-3">
                                {eventTitle} <span className="text-neutral-400 font-normal">({eventTickets.length} tickets)</span>
                            </h3>
                            <div className="grid gap-3">
                                {eventTickets.map((ticket) => (
                                    <Card
                                        key={ticket.id}
                                        className="hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    >
                                        <CardBody className="p-4">
                                            <div className="flex items-start gap-3">
                                                {/* Icon */}
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
                                                    {getCategoryIcon(ticket.category)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-base font-semibold text-neutral-800">{ticket.subject}</h4>
                                                                {ticket.unreadByClub && (
                                                                    <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-neutral-500 mb-1">
                                                                Student: <span className="font-medium text-neutral-700">{ticket.studentName}</span>
                                                            </p>
                                                            {ticket.lastMessage && (
                                                                <p className="text-sm text-neutral-600 line-clamp-1">
                                                                    {ticket.lastMessageBy === 'student' ? `Student: ` : 'You: '}
                                                                    {ticket.lastMessage}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Status & Time */}
                                                        <div className="flex flex-col items-end gap-1">
                                                            {getStatusBadge(ticket.status)}
                                                            <span className="text-xs text-neutral-400">
                                                                {new Date(ticket.updatedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardBody className="py-16 text-center">
                        <MessageSquare className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-700 mb-2">
                            {filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
                        </h3>
                        <p className="text-neutral-500">
                            {filter === 'all'
                                ? 'Student support tickets will appear here when they need help.'
                                : 'Try changing the filter to see more tickets.'}
                        </p>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default ClubTickets;
