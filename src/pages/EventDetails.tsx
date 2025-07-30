import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Users, ArrowLeft, Edit, Trash2, CheckCircle, XCircle,
    Share2, Info, AlertTriangle, PartyPopper, Ticket, Settings, ClipboardList, Star
} from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
// CORRECTED: Fixed the import path for the Button component
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { format, parseISO, isPast, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// New component for star ratings
const StarRating = ({ rating, setRating, disabled = false }: { rating: number, setRating: (rating: number) => void, disabled?: boolean }) => (
    <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setRating(star)}
            />
        ))}
    </div>
);


const EventDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getEventById, fetchEvents, approveEvent, rejectEvent, deleteEvent, registerForEvent, cancelRegistration, submitFeedback } = useEventStore();
    const { user } = useAuthStore();
    const [event, setEvent] = useState(getEventById(id || ''));
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [registrationData, setRegistrationData] = useState({
        regNo: '', name: user?.name || '', branch: '', department: user?.department || '', phone: '',
    });
    const [regErrors, setRegErrors] = useState<Record<string, string>>({});
    const [club, setClub] = useState<any>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [attended, setAttended] = useState(false);
    const [feedback, setFeedback] = useState({
        overallExperience: 0,
        eventOrganization: 0,
        activitiesEnjoyment: 0,
        recommendationLikelihood: 0,
        comment: ''
    });
    const [hasGivenFeedback, setHasGivenFeedback] = useState(false);


    useEffect(() => {
        const loadEvent = async () => {
            setIsLoading(true);
            try {
                let fetchedEvent = getEventById(id || '');
                if (!fetchedEvent) {
                    await fetchEvents();
                    fetchedEvent = getEventById(id || '');
                }

                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                    if (user && fetchedEvent.feedback?.some(f => f.userId === user.id)) {
                        setHasGivenFeedback(true);
                    }
                } else {
                    toast.error('Event not found');
                    navigate('/events');
                }
            } catch (error) {
                toast.error("Could not load event details.");
            } finally {
                setIsLoading(false);
            }
        };
        loadEvent();
    }, [id, getEventById, fetchEvents, navigate, user]);

    useEffect(() => {
        const checkRegistration = async () => {
            if (!id || !user || !event) return;
            const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', id), where('userId', '==', user.id));
            const snapshot = await getDocs(q);
            setIsRegistered(!snapshot.empty);
            if (!snapshot.empty) {
                const regData = snapshot.docs[0].data();
                setRegistrationData(regData);
                setAttended(regData.status === 'attended');
            }
        };
        checkRegistration();
    }, [id, user, event]);

    useEffect(() => {
        if (event?.organizerType === 'club' && event.organizerId) {
            getDoc(doc(db, 'clubs', event.organizerId)).then(snapshot => {
                if (snapshot.exists()) setClub(snapshot.data());
            });
        }
    }, [event]);

    const handleApprove = async () => {
        if (!id || !event || new Date(event.startDate) < new Date()) {
            toast.error('Cannot approve a past event.');
            return;
        }
        setIsActionLoading(true);
        const updatedEvent = await approveEvent(id);
        if (updatedEvent) {
            setEvent(updatedEvent);
            toast.success('Event approved successfully');
        }
        setIsActionLoading(false);
    };

    const handleReject = async () => {
        if (!id) return;
        setIsActionLoading(true);
        const updatedEvent = await rejectEvent(id);
        if (updatedEvent) {
            setEvent(updatedEvent);
        }
        setIsActionLoading(false);
    };

    const handleDelete = async () => {
        if (!id) return;
        setIsActionLoading(true);
        const success = await deleteEvent(id);
        if (success) {
            navigate('/events');
        }
        setIsActionLoading(false);
    };

    const handleCancelRegistration = async () => {
        if (!id || !user) return;
        setIsActionLoading(true);
        const success = await cancelRegistration(id, user.id);
        if (success) {
            setIsRegistered(false);
            const updatedEvent = getEventById(id);
            if (updatedEvent) setEvent(updatedEvent);
        }
        setIsActionLoading(false);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: event.title, text: event.description, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied!'));
        }
    };
    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegistrationData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const validateReg = () => { return true; };
    const handleStudentRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateReg() || !id || !user) return;
        setIsActionLoading(true);
        const success = await registerForEvent(id, user.id, registrationData);
        if (success) {
            setIsRegistered(true);
            toast.success('Successfully registered!');
            const updatedEvent = getEventById(id);
            if (updatedEvent) setEvent(updatedEvent);
        }
        setIsActionLoading(false);
    };
    const handleDownloadQR = async () => {
        if (!qrRef.current) return;
        const dataUrl = await toPng(qrRef.current);
        const link = document.createElement('a');
        link.download = `event-qr-${event.id}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleFeedbackSubmit = async () => {
        if (Object.values(feedback).some(v => typeof v === 'number' && v === 0)) {
            toast.error("Please provide a rating for all questions.");
            return;
        }
        if (!id || !user) return;
        setIsActionLoading(true);
        const success = await submitFeedback(id, user.id, feedback);
        if (success) {
            setHasGivenFeedback(true);
        }
        setIsActionLoading(false);
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner size="lg" text="Loading Event..." />
            </div>
        );
    }

    if (!event) {
        return null;
    }
    
    // Date formatting logic
    const startDate = parseISO(event.startDate);
    const endDate = parseISO(event.endDate);
    const isSameDayEvent = isSameDay(startDate, endDate);
    const formattedDate = isSameDayEvent
        ? format(startDate, 'E, d LLL yyyy')
        : `${format(startDate, 'E, d LLL yyyy')} - ${format(endDate, 'E, d LLL yyyy')}`;
    const formattedTime = `${format(startDate, 'p')} - ${format(endDate, 'p')}`;


    const isAdmin = user?.role === 'admin';
    const isOrganizer = user?.id === event.createdBy || isAdmin || (user?.role === event.organizerType && user?.id === event.organizerId);
    const isPending = event.status === 'pending';
    const isApproved = event.status === 'approved';
    const isRejected = event.status === 'rejected';
    const isCancelled = event.status === 'cancelled';
    const isCompleted = isPast(endDate);
    const isFull = event.capacity ? event.registeredCount >= event.capacity : false;


    return (
        <div className="bg-gray-50 min-h-screen animate-fade-in">
            {/* Hero Section */}
            <div className="relative h-72 md:h-96 w-full">
                <img src={event.image || `https://source.unsplash.com/1600x900/?${event.tags?.[0] || 'event'}`} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end text-white p-4 md:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="absolute top-4 left-4 md:top-6 md:left-6"><Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/events')}>Back to Events</Button></div>
                        {isOrganizer && isApproved && !isCompleted && (<div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2"><Button variant="ghost" size="sm" leftIcon={<Edit size={16} />} onClick={() => navigate(`/events/edit/${event.id}`)}>Edit</Button><Button variant="danger" size="sm" leftIcon={<Trash2 size={16} />} onClick={handleDelete} isLoading={isActionLoading}>Delete</Button></div>)}
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">{event.title}</h1>
                        <p className="mt-2 text-lg md:text-xl text-gray-200 drop-shadow-md">Organized by {event.organizerName}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
                    {/* Left Column (Content) */}
                    <main className="lg:col-span-2 space-y-8 mb-8 lg:mb-0">
                        {isPending && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-md flex items-center gap-3"><AlertTriangle/><div><p className="font-bold">Pending Approval</p><p>This event is awaiting administrator review.</p></div></div>}
                        {isCancelled && <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-800 p-4 rounded-r-md flex items-center gap-3"><Info/><div><p className="font-bold">Event Cancelled</p></div></div>}
                        {isRejected && <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-md flex items-center gap-3"><XCircle/><div><p className="font-bold">Event Rejected</p></div></div>}
                        {isCompleted && <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-md flex items-center gap-3"><CheckCircle/><div><p className="font-bold">Event Completed</p></div></div>}
                        
                        {isAdmin && isPending && (<Card className="border-yellow-300 bg-yellow-50"><CardHeader><h3 className="text-lg font-bold text-yellow-900">Admin Approval Required</h3></CardHeader><CardBody className="flex items-center gap-4"><p className="text-sm text-yellow-800 flex-grow">Review the details and take action.</p><Button size="sm" leftIcon={<CheckCircle size={16}/>} onClick={handleApprove} isLoading={isActionLoading}>Approve</Button><Button size="sm" variant="danger" leftIcon={<XCircle size={16}/>} onClick={handleReject} isLoading={isActionLoading}>Reject</Button></CardBody></Card>)}

                        <Card><CardHeader><h2 className="text-2xl font-bold text-gray-900">About This Event</h2></CardHeader><CardBody><p className="text-gray-700 text-lg whitespace-pre-line leading-relaxed">{event.description}</p>{event.tags?.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{event.tags.map(tag => <Badge key={tag} variant="neutral">{tag}</Badge>)}</div>}</CardBody></Card>
                        {club && <Card><CardHeader><h2 className="text-2xl font-bold text-gray-900">About the Organizer</h2></CardHeader><CardBody className="text-gray-700 space-y-2"><div><strong>Club:</strong> {club.name}</div></CardBody></Card>}
                        
                        {isCompleted && attended && (
                            <Card>
                                <CardHeader><h2 className="text-2xl font-bold text-gray-900">Event Feedback</h2></CardHeader>
                                <CardBody>
                                    {hasGivenFeedback ? (
                                        <div className="text-center p-6 bg-green-50 rounded-lg">
                                            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                            <p className="mt-4 font-semibold text-green-800">You have already submitted feedback for this event. Thank you!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="block font-medium text-gray-800">How would you rate your overall experience?</label>
                                                <StarRating rating={feedback.overallExperience} setRating={(r) => setFeedback({ ...feedback, overallExperience: r })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block font-medium text-gray-800">How well was the event organized?</label>
                                                <StarRating rating={feedback.eventOrganization} setRating={(r) => setFeedback({ ...feedback, eventOrganization: r })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block font-medium text-gray-800">How much did you enjoy the activities?</label>
                                                <StarRating rating={feedback.activitiesEnjoyment} setRating={(r) => setFeedback({ ...feedback, activitiesEnjoyment: r })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block font-medium text-gray-800">How likely are you to recommend similar events?</label>
                                                <StarRating rating={feedback.recommendationLikelihood} setRating={(r) => setFeedback({ ...feedback, recommendationLikelihood: r })} />
                                            </div>
                                            <div>
                                                <label htmlFor="comment" className="block font-medium text-gray-800">Additional Comments (optional)</label>
                                                <textarea
                                                    id="comment"
                                                    rows={4}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={feedback.comment}
                                                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                                                />
                                            </div>
                                            <Button onClick={handleFeedbackSubmit} isLoading={isActionLoading}>Submit Feedback</Button>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        )}
                    </main>

                    {/* Right Column (Unified Action Panel) */}
                    <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
                        <Card className="shadow-lg">
                            <CardBody className="space-y-4">
                                {/* CORRECTED: Key Details Section with End Time */}
                                <div className="flex items-start gap-4">
                                    <Calendar className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/>
                                    <p className="text-gray-700">
                                        <strong className="block text-gray-900">Date & Time</strong>
                                        {formattedDate}
                                        <br/>
                                        {formattedTime}
                                    </p>
                                </div>
                                <div className="flex items-start gap-4"><MapPin className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/><p className="text-gray-700"><strong className="block text-gray-900">Location</strong>{event.location}</p></div>
                                <div className="flex items-start gap-4"><Users className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/><p className="text-gray-700"><strong className="block text-gray-900">Capacity</strong>{event.registeredCount} / {event.capacity || 'Unlimited'}</p></div>
                                
                                <hr className="my-2" />

                                {/* Attendee & Organizer Actions */}
                                {isApproved && !isCompleted && !isCancelled ? (
                                    isRegistered ? (
                                        <div className="text-center space-y-4">
                                            <div className="p-3 bg-green-50 text-green-700 rounded-lg font-semibold"><PartyPopper className="inline-block w-5 h-5 mr-2" /> You're registered!</div>
                                            <div className="flex flex-col items-center pt-2"><p className="mb-3 text-sm text-gray-500">Show this QR at check-in:</p><div ref={qrRef} className="bg-white p-2 rounded-lg border"><QRCode value={JSON.stringify({ eventId: event.id, userId: user?.id, regNo: registrationData.regNo })} size={180} level="H" /></div><Button className="mt-3" size="sm" variant="outline" onClick={handleDownloadQR}>Download QR</Button></div>
                                            <Button variant="outline" fullWidth onClick={handleCancelRegistration} isLoading={isActionLoading}>Cancel Registration</Button>
                                        </div>
                                    ) : isFull ? (
                                        <div className="bg-yellow-50 text-yellow-700 rounded-lg p-4 text-center"><h3 className="font-bold mb-1">Event Full</h3><p className="text-sm">Registration has reached capacity.</p></div>
                                    ) : (
                                        user?.role === 'student' ? (
                                            <form onSubmit={handleStudentRegister} className="space-y-4">
                                                <h3 className="text-xl font-bold text-gray-800 text-center">Register Now</h3>
                                                <Input label="Reg. No" name="regNo" value={registrationData.regNo} onChange={handleRegChange} error={regErrors.regNo} required />
                                                <Input label="Name" name="name" value={registrationData.name} onChange={handleRegChange} error={regErrors.name} required />
                                                <Input label="Branch" name="branch" value={registrationData.branch} onChange={handleRegChange} error={regErrors.branch} required />
                                                <Input label="Phone" name="phone" value={registrationData.phone} onChange={handleRegChange} error={regErrors.phone} required />
                                                <Button type="submit" fullWidth isLoading={isActionLoading}>Confirm Registration</Button>
                                            </form>
                                        ) : (
                                           // CLEANUP: Removed redundant isOrganizer check
                                           <div className="bg-blue-50 text-blue-700 rounded-lg p-4 text-center">
                                                <h3 className="font-bold mb-1">Registration is Open</h3>
                                                <p className="text-sm">Log in as a student to register.</p>
                                            </div>
                                        )
                                    )
                                ) : null}

                                {isOrganizer && isApproved && (
                                    <div className="pt-4 border-t">
                                        <h3 className="font-bold text-lg text-center mb-2">Event Dashboard</h3>
                                        <div className="space-y-2">
                                            <Button fullWidth onClick={() => navigate(`/events/${event.id}/attendance`)} leftIcon={<Settings size={16}/>}>Manage Attendance</Button>
                                            <Button fullWidth variant="outline" onClick={() => navigate(`/events/${event.id}/marks`)} leftIcon={<ClipboardList size={16}/>}>Enter Marks</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <Button fullWidth variant="ghost" onClick={handleShare} leftIcon={<Share2 size={16}/>}>Share this Event</Button>
                                </div>
                            </CardBody>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default EventDetails;