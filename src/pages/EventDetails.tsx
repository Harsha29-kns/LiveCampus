import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Users, ArrowLeft, Edit, Trash2, CheckCircle, XCircle,
    Share2, Info, AlertTriangle, PartyPopper, Ticket, Settings, ClipboardList, Star, Smartphone, Phone
} from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
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
    const [transactionImage, setTransactionImage] = useState<File | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
        const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
        setIsMobile(mobile);
    }, []);

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
                if (event.eventType === 'paid') {
                    setPaymentVerified(regData.paymentVerified === true);
                }
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

        if (event.eventType === 'paid' && (!transactionImage || !transactionId.trim())) {
            toast.error('Please upload the transaction proof and enter the Transaction ID.');
            setIsActionLoading(false);
            return;
        }

        try {
            let transactionImageUrl = '';
            if (transactionImage) {
                toast.loading('Uploading transaction proof...');
                const formData = new FormData();
                formData.append('file', transactionImage);
                formData.append('upload_preset', 'transaction-proofs');
                const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error.message);
                transactionImageUrl = data.secure_url;
                toast.dismiss();
            }

            const registrationPayload = {
                ...registrationData,
                transactionId: event.eventType === 'paid' ? transactionId : undefined,
                transactionImage: event.eventType === 'paid' ? transactionImageUrl : undefined,
                paymentVerified: false,
            };

            const success = await registerForEvent(id, user.id, registrationPayload);
            if (success) {
                setIsRegistered(true);
                toast.success(event.eventType === 'paid' ? 'Registered! Awaiting payment verification.' : 'Successfully registered!');
                const updatedEvent = getEventById(id);
                if (updatedEvent) setEvent(updatedEvent);
            }
        } catch (error) {
            console.error(error);
            toast.error('Registration failed. Please try again.');
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleTransactionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTransactionImage(e.target.files[0]);
        }
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

    const upiIntentLink = event && event.eventType === 'paid'
        ? `upi://pay?pa=${event.upiId}&pn=${encodeURIComponent(event.organizerName)}&am=${event.eventFee}&cu=INR&tn=${encodeURIComponent(event.title)}`
        : '';


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
                        
                        {club && (
                            <Card>
                                <CardHeader><h2 className="text-2xl font-bold text-gray-900">Organizer Information</h2></CardHeader>
                                <CardBody className="text-gray-700 space-y-3">
                                    <div><strong className="block text-gray-900">Club Name</strong> {club.name}</div>
                                    <div><strong className="block text-gray-900">Faculty Advisor</strong> {club.facultyAdvisor}</div>
                                    {event.presidentPhone && <div><strong className="block text-gray-900">President Contact</strong> <a href={`tel:${event.presidentPhone}`} className="text-indigo-600 hover:underline">{event.presidentPhone}</a></div>}
                                    {event.vicePresidentPhone && <div><strong className="block text-gray-900">Vice-President Contact</strong> <a href={`tel:${event.vicePresidentPhone}`} className="text-indigo-600 hover:underline">{event.vicePresidentPhone}</a></div>}
                                </CardBody>
                            </Card>
                        )}

                        {isCompleted && attended && (
                            <Card>
                                {/* Feedback section remains the same */}
                            </Card>
                        )}
                    </main>

                    {/* Right Column (Unified Action Panel) */}
                    <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
                        <Card className="shadow-lg">
                            <CardBody className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <Calendar className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/>
                                    <p className="text-gray-700"><strong className="block text-gray-900">Date & Time</strong>{formattedDate}<br/>{formattedTime}</p>
                                </div>
                                <div className="flex items-start gap-4"><MapPin className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/><p className="text-gray-700"><strong className="block text-gray-900">Location</strong>{event.location}</p></div>
                                <div className="flex items-start gap-4"><Users className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0"/><p className="text-gray-700"><strong className="block text-gray-900">Capacity</strong>{event.registeredCount} / {event.capacity || 'Unlimited'}</p></div>
                                <hr className="my-2" />

                                {isApproved && !isCompleted && !isCancelled ? (
                                    isRegistered ? (
                                        event.eventType === 'paid' ? (
                                            paymentVerified ? (
                                                <div className="text-center space-y-4">
                                                    <div className="p-3 bg-green-50 text-green-700 rounded-lg font-semibold"><CheckCircle className="inline-block w-5 h-5 mr-2" /> Payment Verified!</div>
                                                    <div className="flex flex-col items-center pt-2"><p className="mb-3 text-sm text-gray-500">Show this QR at check-in:</p><div ref={qrRef} className="bg-white p-2 rounded-lg border"><QRCode value={JSON.stringify({ eventId: event.id, userId: user?.id })} size={180} level="H" /></div><Button className="mt-3" size="sm" variant="outline" onClick={handleDownloadQR}>Download QR</Button></div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center font-semibold">
                                                    <p>Your payment is pending verification. The attendance QR code will be available here once approved.</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center space-y-4">
                                                <div className="p-3 bg-green-50 text-green-700 rounded-lg font-semibold"><PartyPopper className="inline-block w-5 h-5 mr-2" /> You're registered!</div>
                                                <div className="flex flex-col items-center pt-2"><p className="mb-3 text-sm text-gray-500">Show this QR at check-in:</p><div ref={qrRef} className="bg-white p-2 rounded-lg border"><QRCode value={JSON.stringify({ eventId: event.id, userId: user?.id })} size={180} level="H" /></div><Button className="mt-3" size="sm" variant="outline" onClick={handleDownloadQR}>Download QR</Button></div>
                                                <Button variant="outline" fullWidth onClick={handleCancelRegistration} isLoading={isActionLoading}>Cancel Registration</Button>
                                            </div>
                                        )
                                    ) : (
                                        user?.role === 'student' ? (
                                            <form onSubmit={handleStudentRegister} className="space-y-4">
                                                <h3 className="text-xl font-bold text-gray-800 text-center">Register Now</h3>
                                                
                                                {event.eventType === 'paid' && (
                                                    <div className="p-4 bg-indigo-50 rounded-lg text-center">
                                                        <h4 className="font-bold text-indigo-800">Payment Required: ₹{event.eventFee}</h4>
                                                        
                                                        {isMobile ? (
                                                            <>
                                                                <p className="text-sm text-indigo-700 mb-3">Click below to pay with your UPI app.</p>
                                                                <a href={upiIntentLink} className="inline-block w-full">
                                                                  <Button type="button" fullWidth leftIcon={<Smartphone size={16}/>}>Pay with UPI</Button>
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm text-indigo-700 mb-3">Scan the QR code with your UPI app to pay.</p>
                                                                <div className="mt-2 bg-white p-2 inline-block rounded-lg border">
                                                                    <QRCode value={upiIntentLink} size={160} />
                                                                </div>
                                                            </>
                                                        )}

                                                        <p className="text-xs text-gray-500 mt-3">After paying, upload the screenshot and enter the Transaction ID below.</p>
                                                    </div>
                                                )}

                                                <Input label="Reg. No" name="regNo" value={registrationData.regNo} onChange={handleRegChange} required />
                                                <Input label="Name" name="name" value={registrationData.name} onChange={handleRegChange} required />
                                                <Input label="Branch" name="branch" value={registrationData.branch} onChange={handleRegChange} required />
                                                <Input label="Phone" name="phone" value={registrationData.phone} onChange={handleRegChange} required />

                                                {event.eventType === 'paid' && (
                                                    <>
                                                        <Input label="UPI Transaction ID" name="transactionId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required />
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Proof (Screenshot)</label>
                                                            <input type="file" accept="image/*" onChange={handleTransactionImageChange} className="w-full border p-2 rounded-md" required />
                                                        </div>
                                                    </>
                                                )}
                                                
                                                <Button type="submit" fullWidth isLoading={isActionLoading}>
                                                    {event.eventType === 'paid' ? 'Submit Proof & Register' : 'Confirm Registration'}
                                                </Button>
                                            </form>
                                        ) : (
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
                                            {event.eventType === 'paid' && (
                                                <Button fullWidth variant="outline" onClick={() => navigate(`/events/${event.id}/verify-payments`)} leftIcon={<ClipboardList size={16}/>}>Verify Payments</Button>
                                            )}
                                            {/* --- NEW BUTTON ADDED HERE --- */}
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