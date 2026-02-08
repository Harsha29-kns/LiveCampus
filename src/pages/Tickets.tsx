import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTicketStore } from '../stores/ticketStore';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Ticket } from '../types';

const Tickets: React.FC = () => {
    const { user } = useAuthStore();
    const { tickets, isLoading, subscribeToMyTickets } = useTicketStore();
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            const unsubscribe = subscribeToMyTickets(user.id);
            return () => unsubscribe();
        }
    }, [user, subscribeToMyTickets]);

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800">My Support Tickets</h1>
                    <p className="text-neutral-500 mt-1">Get help with your event-related issues</p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => navigate('/tickets/new')}
                >
                    Raise New Ticket
                </Button>
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

            {/* Ticket List */}
            {filteredTickets.length > 0 ? (
                <div className="grid gap-4">
                    {filteredTickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                            <CardBody className="p-5">
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
                                        {getCategoryIcon(ticket.category)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-semibold text-neutral-800">{ticket.subject}</h3>
                                                    {ticket.unreadByStudent && (
                                                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-neutral-500 mb-2">
                                                    Event: <span className="font-medium text-neutral-700">{ticket.eventTitle}</span>
                                                </p>
                                                {ticket.lastMessage && (
                                                    <p className="text-sm text-neutral-600 line-clamp-1">
                                                        {ticket.lastMessageBy === 'club' ? `${ticket.clubName}: ` : 'You: '}
                                                        {ticket.lastMessage}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status & Time */}
                                            <div className="flex flex-col items-end gap-2">
                                                {getStatusBadge(ticket.status)}
                                                <span className="text-xs text-neutral-400">
                                                    {new Date(ticket.updatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
                                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                <MessageSquare size={12} />
                                                {ticket.clubName}
                                            </span>
                                            <span className="text-xs text-neutral-400">
                                                Created {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardBody className="py-16 text-center">
                        <MessageSquare className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-700 mb-2">
                            {filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
                        </h3>
                        <p className="text-neutral-500 mb-6">
                            {filter === 'all'
                                ? 'Have an issue with an event? Raise a ticket to get help.'
                                : 'Try changing the filter to see more tickets.'}
                        </p>
                        {filter === 'all' && (
                            <Button
                                variant="primary"
                                leftIcon={<Plus size={18} />}
                                onClick={() => navigate('/tickets/new')}
                            >
                                Raise Your First Ticket
                            </Button>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default Tickets;
