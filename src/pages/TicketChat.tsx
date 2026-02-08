import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTicketStore } from '../stores/ticketStore';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const TicketChat: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const { user } = useAuthStore();
    const { currentTicket, messages, subscribeToTicket, subscribeToMessages, sendMessage, markAsRead, updateTicketStatus } = useTicketStore();
    const navigate = useNavigate();

    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ticketId) {
            const unsubscribeTicket = subscribeToTicket(ticketId);
            const unsubscribeMessages = subscribeToMessages(ticketId);

            // Mark as read when viewing
            if (user) {
                const role = user.role === 'student' ? 'student' : 'club';
                markAsRead(ticketId, role);
            }

            return () => {
                unsubscribeTicket();
                unsubscribeMessages();
            };
        }
    }, [ticketId, user, subscribeToTicket, subscribeToMessages, markAsRead]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!messageText.trim() || !ticketId || !user) return;

        setIsSending(true);

        await sendMessage(ticketId, {
            senderId: user.id,
            senderRole: user.role === 'student' ? 'student' : 'club',
            senderName: user.name,
            message: messageText,
        });

        setMessageText('');
        setIsSending(false);
    };

    const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
        if (!ticketId) return;
        await updateTicketStatus(ticketId, status);
    };

    if (!currentTicket) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading ticket..." />
            </div>
        );
    }

    const isStudent = user?.role === 'student';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        leftIcon={<ArrowLeft size={18} />}
                        onClick={() => navigate(isStudent ? '/tickets' : '/club/tickets')}
                    >
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-800">{currentTicket.subject}</h1>
                        <p className="text-sm text-neutral-500">Event: {currentTicket.eventTitle}</p>
                    </div>
                </div>

                {/* Status Controls (Club only) */}
                {!isStudent && (
                    <div className="flex items-center gap-2">
                        {currentTicket.status !== 'resolved' && (
                            <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<CheckCircle size={16} />}
                                onClick={() => handleStatusChange('resolved')}
                            >
                                Mark Resolved
                            </Button>
                        )}
                        {currentTicket.status === 'open' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<Clock size={16} />}
                                onClick={() => handleStatusChange('in_progress')}
                            >
                                In Progress
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-xs text-neutral-500">Status</span>
                                <div className="mt-1">
                                    {currentTicket.status === 'open' && (
                                        <Badge variant="error"><AlertCircle size={12} className="mr-1" />Open</Badge>
                                    )}
                                    {currentTicket.status === 'in_progress' && (
                                        <Badge variant="warning"><Clock size={12} className="mr-1" />In Progress</Badge>
                                    )}
                                    {currentTicket.status === 'resolved' && (
                                        <Badge variant="success"><CheckCircle size={12} className="mr-1" />Resolved</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-neutral-200" />
                            <div>
                                <span className="text-xs text-neutral-500">Category</span>
                                <div className="mt-1 text-sm font-medium capitalize">{currentTicket.category}</div>
                            </div>
                            <div className="h-8 w-px bg-neutral-200" />
                            <div>
                                <span className="text-xs text-neutral-500">Created</span>
                                <div className="mt-1 text-sm font-medium">
                                    {new Date(currentTicket.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-neutral-500">{isStudent ? 'Support from' : 'Student'}</span>
                            <div className="mt-1 text-sm font-medium">
                                {isStudent ? currentTicket.clubName : currentTicket.studentName}
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Chat Messages */}
            <Card className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
                <CardBody className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                        const isOwnMessage = msg.senderId === user?.id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-neutral-600">
                                            {msg.senderName}
                                        </span>
                                        <span className="text-xs text-neutral-400">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div
                                        className={`px-4 py-3 rounded-2xl ${isOwnMessage
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </CardBody>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="border-t p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isSending}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            leftIcon={<Send size={18} />}
                            disabled={isSending || !messageText.trim()}
                        >
                            {isSending ? 'Sending...' : 'Send'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default TicketChat;
