import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Users, ArrowLeft, Edit, Trash2, CheckCircle, XCircle, Download,
    Share2, Info, AlertTriangle, PartyPopper, Ticket, Settings, ClipboardList, Star, Smartphone, Phone, Lock, Clock as ClockIcon, AlertCircle, Navigation
} from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { format, parseISO, isPast, isSameDay, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import NavigationView from '../components/ui/NavigationView';

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
    const { getEventById, fetchEvents, approveEvent, rejectEvent, facultyApproveEvent, facultyRejectEvent, deleteEvent, registerForEvent, cancelRegistration, submitFeedback } = useEventStore();
    const { user } = useAuthStore();
    const [event, setEvent] = useState(getEventById(id || ''));
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [registrationData, setRegistrationData] = useState<any>({
        regNo: '', name: user?.name || '', branch: '', department: user?.department || '', phone: '',
        // Team registration fields
        teamSize: 1,
        teamLead: {
            name: user?.name || '',
            regNo: '',
            phone: '',
            hostelName: '',
            roomNo: '',
            branch: '',
            department: user?.department || ''
        },
        teamMembers: [] as any[]
    });
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
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null);
    const [note, setNote] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);

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
                    const canView =
                        fetchedEvent.status === 'approved' ||
                        (user?.role === 'admin') ||
                        (user?.role === 'club' && user.clubId === fetchedEvent.organizerId) ||
                        (user?.role === 'faculty' && fetchedEvent.organizerType === 'club' && user.linkedClubIds?.includes(fetchedEvent.organizerId)) ||
                        (user?.id === fetchedEvent.createdBy);

                    if (!canView) {
                        toast.error('You do not have permission to view this event.');
                        navigate('/events');
                        return;
                    }

                    setEvent(fetchedEvent);
                    if (user && (fetchedEvent as any).feedback?.some((f: any) => f.userId === user.id)) {
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
                    if (regData.paymentVerified === true) {
                        setPaymentStatus('verified');
                    } else if (regData.paymentVerified === 'rejected') {
                        setPaymentStatus('rejected');
                    } else {
                        setPaymentStatus('pending');
                    }
                }
            } else {
                setPaymentStatus(null);
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
        if (!note.trim()) {
            toast.error("Please provide a rejection reason.");
            return;
        }
        setIsActionLoading(true);
        const updatedEvent = await rejectEvent(id, note);
        if (updatedEvent) {
            setEvent(updatedEvent);
        }
        setIsActionLoading(false);
    };

    const handleFacultyApprove = async () => {
        if (!id || !user?.id) return;
        setIsActionLoading(true);
        const success = await facultyApproveEvent(id, user.id, note);
        if (success) {
            // Notification Logic
            if (event?.organizerType === 'club' && event.organizerId) {
                try {
                    const clubSnap = await getDoc(doc(db, 'clubs', event.organizerId));
                    if (clubSnap.exists() && clubSnap.data().presidentId) {
                        const userSnap = await getDoc(doc(db, 'users', clubSnap.data().presidentId));
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            await fetch('https://live-campus.vercel.app/api/send-workflow-notification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'event_approved',
                                    recipient: { name: userData.name, email: userData.email },
                                    event: { ...event, id: id }
                                })
                            });
                        }
                    }
                } catch (e) { console.error("Notification failed", e); }
            }

            const updated = getEventById(id);
            if (updated) setEvent(updated);
        }
        setIsActionLoading(false);
    };

    const handleFacultyReject = async () => {
        if (!id || !user?.id) return;
        if (!note) {
            toast.error("Please provide a reason for rejection.");
            return;
        }
        setIsActionLoading(true);
        const success = await facultyRejectEvent(id, user.id, note);
        if (success) {
            // Notification Logic
            if (event?.organizerType === 'club' && event.organizerId) {
                try {
                    const clubSnap = await getDoc(doc(db, 'clubs', event.organizerId));
                    if (clubSnap.exists() && clubSnap.data().presidentId) {
                        const userSnap = await getDoc(doc(db, 'users', clubSnap.data().presidentId));
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            await fetch('https://live-campus.vercel.app/api/send-workflow-notification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'event_rejected',
                                    recipient: { name: userData.name, email: userData.email },
                                    event: { ...event, id: id },
                                    notes: note
                                })
                            });
                        }
                    }
                } catch (e) { console.error("Notification failed", e); }
            }

            const updated = getEventById(id);
            if (updated) setEvent(updated);
        }
        setIsActionLoading(false);
    };


    const handleDelete = async () => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
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
        if (navigator.share && event) {
            navigator.share({ title: event.title, text: event.description, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied!'));
        }
    };

    const handleDownloadTeamList = async () => {
        if (!id || !event) return;

        try {
            toast.loading('Generating team list...');
            const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', id));
            const snapshot = await getDocs(q);

            const registrations = snapshot.docs.map(doc => doc.data());

            // Generate CSV content
            let csvContent = '';

            if (event.isTeamEvent) {
                // Team event CSV with all team member columns
                csvContent = 'Team Lead Name,Reg No,Phone,Hostel,Room,Branch,';

                const maxMembers = event.maxTeamSize || 4;
                for (let i = 2; i <= maxMembers; i++) {
                    csvContent += `Member ${i} Name,Member ${i} Reg No,Member ${i} Phone,Member ${i} Hostel,Member ${i} Room,`;
                }
                csvContent += 'Team Size,Payment Status,Transaction ID\n';

                registrations.forEach((reg: any) => {
                    if (reg.teamLead) {
                        // Team registration
                        csvContent += `"${reg.teamLead.name || ''}","${reg.teamLead.regNo || ''}","${reg.teamLead.phone || ''}","${reg.teamLead.hostelName || ''}","${reg.teamLead.roomNo || ''}","${reg.teamLead.branch || ''}",`;

                        for (let i = 0; i < (maxMembers - 1); i++) {
                            const member = reg.teamMembers?.[i];
                            if (member) {
                                csvContent += `"${member.name || ''}","${member.regNo || ''}","${member.phone || ''}","${member.hostelName || ''}","${member.roomNo || ''}",`;
                            } else {
                                csvContent += ',,,,,';
                            }
                        }

                        csvContent += `${reg.teamSize || 1},`;
                    } else {
                        // Legacy individual registration in a team event
                        csvContent += `"${reg.name || ''}","${reg.regNo || ''}","${reg.phone || ''}","","","${reg.branch || ''}",`;
                        for (let i = 0; i < (maxMembers - 1); i++) {
                            csvContent += ',,,,,';
                        }
                        csvContent += '1,';
                    }

                    csvContent += `${reg.paymentVerified ? 'Verified' : (reg.transactionId ? 'Pending' : 'N/A')},"${reg.transactionId || ''}"\n`;
                });
            } else {
                // Individual event CSV 
                csvContent = 'Name,Reg No,Phone,Branch,Payment Status,Transaction ID\n';

                registrations.forEach((reg: any) => {
                    csvContent += `"${reg.name || ''}","${reg.regNo || ''}","${reg.phone || ''}","${reg.branch || ''}",`;
                    csvContent += `${reg.paymentVerified ? 'Verified' : (reg.transactionId ? 'Pending' : 'N/A')},"${reg.transactionId || ''}"\n`;
                });
            }

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = event.isTeamEvent
                ? `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-teams-${new Date().toISOString().split('T')[0]}.csv`
                : `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-registrations-${new Date().toISOString().split('T')[0]}.csv`;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success('Team list downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            toast.dismiss();
            toast.error('Failed to download team list');
        }
    };

    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegistrationData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Team registration handlers
    const handleTeamSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value);
        setRegistrationData((prev: any) => {
            const newMembers = Array.from({ length: newSize - 1 }, (_, i) =>
                prev.teamMembers[i] || { name: '', regNo: '', phone: '', hostelName: '', roomNo: '' }
            );
            return { ...prev, teamSize: newSize, teamMembers: newMembers };
        });
    };

    const handleTeamLeadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegistrationData((prev: any) => ({
            ...prev,
            teamLead: { ...prev.teamLead, [name]: value }
        }));
    };

    const handleTeamMemberChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegistrationData((prev: any) => {
            const newMembers = [...prev.teamMembers];
            newMembers[index] = { ...newMembers[index], [name]: value };
            return { ...prev, teamMembers: newMembers };
        });
    };

    const validateReg = () => { return true; };

    const handleStudentRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateReg() || !id || !user || !event) return;
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

            const registrationPayload: any = {
                userId: user.id,
                eventId: id,
            };

            // Add team registration data if it's a team event
            if (event.isTeamEvent) {
                registrationPayload.teamSize = registrationData.teamSize;
                registrationPayload.teamLead = {
                    ...registrationData.teamLead,
                    department: user.department
                };
                registrationPayload.teamMembers = registrationData.teamMembers;
            } else {
                // Individual registration (legacy format)
                registrationPayload.regNo = registrationData.regNo;
                registrationPayload.name = registrationData.name || user.name;
                registrationPayload.branch = registrationData.branch;
                registrationPayload.department = user.department;
                registrationPayload.phone = registrationData.phone;
            }

            if (event.eventType === 'paid') {
                registrationPayload.transactionId = transactionId;
                registrationPayload.transactionImage = transactionImageUrl;
                registrationPayload.paymentVerified = false;
            }

            const success = await registerForEvent(id, user.id, registrationPayload);
            if (success) {
                setIsRegistered(true);
                if (event.eventType === 'paid') {
                    setPaymentStatus('pending');
                }
                toast.success('Registration submitted!');
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
        try {
            const dataUrl = await toPng(qrRef.current);
            const link = document.createElement('a');
            link.download = `event-qr-${event?.id}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            toast.error("Failed to download QR code.");
        }
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.values(feedback).some(v => typeof v === 'number' && v === 0)) {
            toast.error("Please provide a rating for all questions.");
            return;
        }
        if (!id || !user) return;
        setIsActionLoading(true);
        const success = await submitFeedback(id, user.id, feedback as any);
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
    const isOrganizer = user?.id === event.createdBy || isAdmin || (user?.role === event.organizerType && (user.clubId ? user.clubId === event.organizerId : user.id === event.organizerId));
    const isPending = event.status === 'pending';
    const isApproved = event.status === 'approved';
    const isRejected = event.status === 'rejected';
    const isCancelled = event.status === 'cancelled';
    const isCompleted = isPast(endDate);

    // Check if user is the faculty linked to this club
    const isFacultyReviewer = user?.role === 'faculty' && event.organizerType === 'club' && user.linkedClubIds?.includes(event.organizerId) && event.facultyApprovalStatus === 'pending';

    const isRegistrationOpen = event.registrationStartDate ? isPast(parseISO(event.registrationStartDate)) : true;
    const isDeadlineExpired = event.registrationDeadline ? isPast(parseISO(event.registrationDeadline)) : false;
    const isCapacityFull = event.capacity ? event.registeredCount >= event.capacity : false;
    const canRegister = isRegistrationOpen && !isDeadlineExpired && !isCapacityFull;

    const upiIntentLink = event && event.eventType === 'paid'
        ? `upi://pay?pa=${event.upiId}&pn=${encodeURIComponent(event.organizerName)}&am=${event.eventFee}&cu=INR&tn=${encodeURIComponent(event.title)}`
        : '';

    return (
        <div className="bg-gray-50 min-h-screen animate-fade-in">
            <div className="relative h-72 md:h-96 w-full">
                <img src={event.image || `https://source.unsplash.com/1600x900/?${event.tags?.[0] || 'event'}`} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end text-white p-4 md:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="absolute top-4 left-4 md:top-6 md:left-6"><Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/events')}>Back to Events</Button></div>
                        {isOrganizer && isApproved && !isCompleted && (<div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2"><Button variant="ghost" size="sm" leftIcon={<Download size={16} />} onClick={handleDownloadTeamList}>Download List</Button><Button variant="ghost" size="sm" leftIcon={<Edit size={16} />} onClick={() => navigate(`/events/edit/${event.id}`)}>Edit</Button><Button variant="danger" size="sm" leftIcon={<Trash2 size={16} />} onClick={handleDelete} isLoading={isActionLoading}>Delete</Button></div>)}
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">{event.title}</h1>
                        <p className="mt-2 text-lg md:text-xl text-gray-200 drop-shadow-md">Organized by {event.organizerName}</p>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
                    <main className="lg:col-span-2 space-y-8 mb-8 lg:mb-0">
                        {isPending && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-md flex items-center gap-3"><AlertTriangle /><div><p className="font-bold">Pending Approval</p><p>This event is awaiting administrator review.</p></div></div>}
                        {isCancelled && <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-800 p-4 rounded-r-md flex items-center gap-3"><Info /><div><p className="font-bold">Event Cancelled</p></div></div>}
                        {isRejected && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-md">
                                <div className="flex items-center gap-3">
                                    <XCircle />
                                    <div>
                                        <p className="font-bold">Event Rejected</p>
                                        <p>This event was rejected.</p>
                                    </div>
                                </div>
                                {event.rejectionReason && (
                                    <div className="mt-2 pl-9">
                                        <p className="font-semibold text-sm">Reason:</p>
                                        <p className="text-sm bg-red-50 p-2 rounded mt-1 border border-red-200">
                                            {event.rejectionReason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        {isCompleted && <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-md flex items-center gap-3"><CheckCircle /><div><p className="font-bold">Event Completed</p></div></div>}

                        {isFacultyReviewer && (
                            <Card className="border-indigo-300 bg-indigo-50">
                                <CardHeader><h3 className="text-lg font-bold text-indigo-900">Faculty Approval Required</h3></CardHeader>
                                <CardBody className="space-y-3">
                                    <p className="text-sm text-indigo-800">Review this event from your club.</p>
                                    <textarea className="w-full p-2 border rounded" placeholder="Add notes (required for rejection)..." value={note} onChange={e => setNote(e.target.value)} />
                                    <div className="flex gap-2">
                                        <Button size="sm" leftIcon={<CheckCircle size={16} />} onClick={handleFacultyApprove} isLoading={isActionLoading}>Approve</Button>
                                        <Button size="sm" variant="danger" leftIcon={<XCircle size={16} />} onClick={handleFacultyReject} isLoading={isActionLoading}>Reject</Button>
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {isAdmin && isPending && (
                            event.organizerType === 'club' && event.facultyApprovalStatus === 'pending' ? (
                                <Card className="border-orange-300 bg-orange-50">
                                    <CardBody>
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="text-orange-600" />
                                            <div>
                                                <p className="font-bold text-orange-900">Waiting for Faculty Approval</p>
                                                <p className="text-sm text-orange-800">This event must be approved by the faculty advisor before you can review it.</p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            ) : (
                                <Card className="border-yellow-300 bg-yellow-50">
                                    <CardHeader><h3 className="text-lg font-bold text-yellow-900">Admin Approval Required</h3></CardHeader>
                                    <CardBody className="space-y-4">
                                        <p className="text-sm text-yellow-800">Review the details and take action.</p>

                                        <div>
                                            <label className="text-xs font-semibold text-yellow-900 uppercase">Rejection Reason / Notes</label>
                                            <textarea
                                                className="w-full p-2 border border-yellow-300 rounded bg-white text-sm"
                                                placeholder="Required if rejecting..."
                                                rows={2}
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button size="sm" leftIcon={<CheckCircle size={16} />} onClick={handleApprove} isLoading={isActionLoading}>Approve</Button>
                                            <Button size="sm" variant="danger" leftIcon={<XCircle size={16} />} onClick={handleReject} isLoading={isActionLoading}>Reject</Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            )
                        )}

                        <Card>
                            <CardHeader><h2 className="text-2xl font-bold text-gray-900">About This Event</h2></CardHeader>
                            <CardBody>
                                <div className="mb-4 flex flex-wrap gap-4">
                                    {event.category && (
                                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold border border-indigo-100">
                                            Category: {event.category === 'other' ? (event.customCategory || 'Other') : (event.category.charAt(0).toUpperCase() + event.category.slice(1))}
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-700 text-lg whitespace-pre-line leading-relaxed">{event.description}</p>

                                {event.category === 'hackathon' && event.resources && event.resources.length > 0 && (
                                    <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <ClipboardList size={18} /> Required Resources
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {event.resources.map(res => (
                                                <Badge key={res} variant="neutral" className="bg-white">{res}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Venue Navigation Section */}
                                {event.venueLocation && (
                                    <div className="mt-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <MapPin size={18} className="text-indigo-600" />
                                            Venue Information
                                        </h3>
                                        <div className="space-y-2 text-sm text-gray-700 mb-3">
                                            <p><strong>{event.venueLocation.name}</strong></p>
                                            {event.venueLocation.buildingName && (
                                                <p className="text-gray-600">{event.venueLocation.buildingName}</p>
                                            )}
                                            {(event.venueLocation.floorNumber || event.venueLocation.roomNumber) && (
                                                <p className="text-gray-600">
                                                    {event.venueLocation.floorNumber}
                                                    {event.venueLocation.floorNumber && event.venueLocation.roomNumber && ', '}
                                                    {event.venueLocation.roomNumber}
                                                </p>
                                            )}
                                            {event.venueLocation.instructions && (
                                                <p className="mt-2 text-indigo-700 italic">
                                                    <Info size={14} className="inline mr-1" />
                                                    {event.venueLocation.instructions}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<Navigation size={16} />}
                                            onClick={() => setIsNavigating(true)}
                                            fullWidth
                                        >
                                            Navigate to Venue
                                        </Button>
                                    </div>
                                )}

                                {event.tags?.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{event.tags.map(tag => <Badge key={tag} variant="neutral">{tag}</Badge>)}</div>}
                            </CardBody>
                        </Card>

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
                                <CardHeader><h2 className="text-2xl font-bold text-gray-900">Event Feedback</h2></CardHeader>
                                <CardBody>
                                    {hasGivenFeedback ? (
                                        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-3">
                                            <CheckCircle />
                                            <div>
                                                <p className="font-bold">Thank you!</p>
                                                <p>Your feedback has been submitted.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Experience</label>
                                                <StarRating rating={feedback.overallExperience} setRating={(r) => setFeedback({ ...feedback, overallExperience: r })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Organization</label>
                                                <StarRating rating={feedback.eventOrganization} setRating={(r) => setFeedback({ ...feedback, eventOrganization: r })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Activities Enjoyment</label>
                                                <StarRating rating={feedback.activitiesEnjoyment} setRating={(r) => setFeedback({ ...feedback, activitiesEnjoyment: r })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood to Recommend</label>
                                                <StarRating rating={feedback.recommendationLikelihood} setRating={(r) => setFeedback({ ...feedback, recommendationLikelihood: r })} />
                                            </div>
                                            <Input
                                                label="Comments (Optional)"
                                                value={feedback.comment}
                                                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                                                placeholder="Tell us what you thought..."
                                                fullWidth
                                            />
                                            <Button type="submit" isLoading={isActionLoading}>Submit Feedback</Button>
                                        </form>
                                    )}
                                </CardBody>
                            </Card>
                        )}
                    </main>

                    <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
                        <Card className="shadow-lg">
                            <CardBody className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <Calendar className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                                    <p className="text-gray-700"><strong className="block text-gray-900">Event Date & Time</strong>{formattedDate}<br />{formattedTime}</p>
                                </div>
                                <div className="flex items-start gap-4"><MapPin className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" /><p className="text-gray-700"><strong className="block text-gray-900">Location</strong>{event.location}</p></div>
                                <div className="flex items-start gap-4"><Users className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" /><p className="text-gray-700"><strong className="block text-gray-900">Capacity</strong>{event.registeredCount} / {event.capacity || 'Unlimited'}</p></div>

                                {event.registrationStartDate && (
                                    <div className="flex items-start gap-4 pt-4 border-t">
                                        <ClockIcon className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                                        <p className="text-gray-700"><strong className="block text-gray-900">Registration Window</strong>
                                            {format(parseISO(event.registrationStartDate), 'MMM d, h:mm a')}
                                            {event.registrationDeadline && ` - ${format(parseISO(event.registrationDeadline), 'MMM d, h:mm a')}`}
                                        </p>
                                    </div>
                                )}

                                {canRegister && event.registrationDeadline && (
                                    <div className="text-center text-xs text-gray-500 pt-2">
                                        Note: Registration closes in {formatDistanceToNow(parseISO(event.registrationDeadline))}.
                                    </div>
                                )}

                                <hr className="my-2" />

                                {isApproved && !isCompleted && !isCancelled ? (
                                    isRegistered ? (
                                        <>
                                            {paymentStatus === 'verified' && (
                                                <div className="text-center space-y-4">
                                                    <div className="p-3 bg-green-50 text-green-700 rounded-lg font-semibold"><CheckCircle className="inline-block w-5 h-5 mr-2" /> Payment Verified!</div>
                                                    <div className="flex flex-col items-center pt-2"><p className="mb-3 text-sm text-gray-500">Show this QR at check-in:</p><div ref={qrRef} className="bg-white p-2 rounded-lg border"><QRCode value={JSON.stringify({ eventId: event.id, userId: user?.id })} size={180} level="H" /></div><Button className="mt-3" size="sm" variant="outline" onClick={handleDownloadQR}>Download QR</Button></div>
                                                </div>
                                            )}
                                            {paymentStatus === 'pending' && (
                                                <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">
                                                    <p className="font-semibold">Your payment is under verification.</p>
                                                    <p className="text-sm mt-1">You will get an email from the club once it's approved. After that, you can download your QR code here.</p>
                                                </div>
                                            )}
                                            {paymentStatus === 'rejected' && (
                                                <div className="p-4 bg-red-100 text-red-800 rounded-lg text-center">
                                                    <p className="font-bold">Your payment was rejected by the organizer.</p>
                                                    <p className="text-sm mt-1">If you have any questions, please contact the event organizer directly.</p>
                                                </div>
                                            )}
                                            {event.eventType === 'free' && (
                                                <div className="text-center space-y-4">
                                                    <div className="p-3 bg-green-50 text-green-700 rounded-lg font-semibold"><PartyPopper className="inline-block w-5 h-5 mr-2" /> You're registered!</div>
                                                    <div className="flex flex-col items-center pt-2"><p className="mb-3 text-sm text-gray-500">Show this QR at check-in:</p><div ref={qrRef} className="bg-white p-2 rounded-lg border"><QRCode value={JSON.stringify({ eventId: event.id, userId: user?.id })} size={180} level="H" /></div><Button className="mt-3" size="sm" variant="outline" onClick={handleDownloadQR}>Download QR</Button></div>
                                                </div>
                                            )}
                                            {paymentStatus !== 'rejected' && (
                                                <Button variant="outline" fullWidth onClick={handleCancelRegistration} isLoading={isActionLoading}>Cancel Registration</Button>
                                            )}
                                        </>
                                    ) : !isRegistrationOpen && event.registrationStartDate ? (
                                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-center">
                                            <div className="flex justify-center items-center gap-2 font-bold">
                                                <ClockIcon size={18} />
                                                <span>Registrations Not Yet Open</span>
                                            </div>
                                            <p className="text-sm mt-1">
                                                Registrations will open on {format(parseISO(event.registrationStartDate), 'MMM d, yyyy \'at\' h:mm a')}.
                                            </p>
                                        </div>
                                    ) : !canRegister ? (
                                        <div className="p-4 bg-red-50 text-red-800 rounded-lg text-center">
                                            <div className="flex justify-center items-center gap-2 font-bold">
                                                <Lock size={18} />
                                                <span>Registrations Closed</span>
                                            </div>
                                            {isDeadlineExpired ? (
                                                <p className="text-sm mt-1">The registration deadline has passed.</p>
                                            ) : (
                                                <p className="text-sm mt-1">This event has reached its maximum capacity.</p>
                                            )}
                                        </div>
                                    ) : (
                                        user?.role === 'student' ? (
                                            <form onSubmit={handleStudentRegister} className="space-y-4">
                                                <h3 className="text-xl font-bold text-gray-800 text-center">Register Now</h3>
                                                {event.eventType === 'paid' && (
                                                    <div className="p-4 bg-indigo-50 rounded-lg text-center">
                                                        <h4 className="font-bold text-indigo-800">
                                                            {event.isTeamEvent && registrationData.teamSize > 1
                                                                ? `Payment Required: ${registrationData.teamSize} members × ₹${event.eventFee} = ₹${parseInt(event.eventFee || '0') * registrationData.teamSize}`
                                                                : `Payment Required: ₹${event.eventFee}`
                                                            }
                                                        </h4>
                                                        <div className="mt-2 bg-white p-2 inline-block rounded-lg border">
                                                            <QRCode value={event.isTeamEvent && registrationData.teamSize > 1
                                                                ? `upi://pay?pa=${event.upiId}&pn=EventPayment&am=${parseInt(event.eventFee || '0') * registrationData.teamSize}&cu=INR`
                                                                : upiIntentLink}
                                                                size={160} />
                                                        </div>
                                                        <p className="font-semibold text-gray-800 mt-2">{event.upiId}</p>
                                                        <p className="text-xs text-gray-500 mt-3">
                                                            Scan the QR code with your UPI app or copy the UPI ID.
                                                            After paying, upload the screenshot and enter the Transaction ID below.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Team-based registration for hackathons */}
                                                {event.isTeamEvent ? (
                                                    <>
                                                        {/* Team Size Selector */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Team Size
                                                            </label>
                                                            <select
                                                                value={registrationData.teamSize}
                                                                onChange={handleTeamSizeChange}
                                                                className="w-full p-2 border rounded-md shadow-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                                                required
                                                            >
                                                                {Array.from({ length: (event.maxTeamSize || 4) }, (_, i) => i + 1).map(size => (
                                                                    <option key={size} value={size}>
                                                                        {size} {size === 1 ? 'Member' : 'Members'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Team Lead Information */}
                                                        <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50">
                                                            <h4 className="font-bold text-gray-800 mb-3">Team Lead Information</h4>
                                                            <div className="space-y-3">
                                                                <Input
                                                                    label="Name"
                                                                    name="name"
                                                                    value={registrationData.teamLead.name}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                                <Input
                                                                    label="Registration Number"
                                                                    name="regNo"
                                                                    value={registrationData.teamLead.regNo}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                                <Input
                                                                    label="Phone Number"
                                                                    name="phone"
                                                                    value={registrationData.teamLead.phone}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                                <Input
                                                                    label="Branch"
                                                                    name="branch"
                                                                    value={registrationData.teamLead.branch}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                                <Input
                                                                    label="Hostel Name"
                                                                    name="hostelName"
                                                                    value={registrationData.teamLead.hostelName}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                                <Input
                                                                    label="Room Number"
                                                                    name="roomNo"
                                                                    value={registrationData.teamLead.roomNo}
                                                                    onChange={handleTeamLeadChange}
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Team Members */}
                                                        {registrationData.teamSize > 1 && registrationData.teamMembers.map((member: any, index: number) => (
                                                            <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                                                                <h4 className="font-bold text-gray-800 mb-3">Member {index + 2} Information</h4>
                                                                <div className="space-y-3">
                                                                    <Input
                                                                        label="Name"
                                                                        name="name"
                                                                        value={member.name}
                                                                        onChange={(e) => handleTeamMemberChange(index, e)}
                                                                        required
                                                                    />
                                                                    <Input
                                                                        label="Registration Number"
                                                                        name="regNo"
                                                                        value={member.regNo}
                                                                        onChange={(e) => handleTeamMemberChange(index, e)}
                                                                        required
                                                                    />
                                                                    <Input
                                                                        label="Phone Number"
                                                                        name="phone"
                                                                        value={member.phone}
                                                                        onChange={(e) => handleTeamMemberChange(index, e)}
                                                                        required
                                                                    />
                                                                    <Input
                                                                        label="Hostel Name"
                                                                        name="hostelName"
                                                                        value={member.hostelName}
                                                                        onChange={(e) => handleTeamMemberChange(index, e)}
                                                                        required
                                                                    />
                                                                    <Input
                                                                        label="Room Number"
                                                                        name="roomNo"
                                                                        value={member.roomNo}
                                                                        onChange={(e) => handleTeamMemberChange(index, e)}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Individual registration (existing form) */}
                                                        <Input label="Reg. No" name="regNo" value={registrationData.regNo} onChange={handleRegChange} required />
                                                        <Input label="Name" name="name" value={registrationData.name} onChange={handleRegChange} required />
                                                        <Input label="Branch" name="branch" value={registrationData.branch} onChange={handleRegChange} required />
                                                        <Input label="Phone" name="phone" value={registrationData.phone} onChange={handleRegChange} required />
                                                    </>
                                                )}
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
                                            <Button fullWidth onClick={() => navigate(`/events/${event.id}/attendance`)} leftIcon={<Settings size={16} />}>Manage Attendance</Button>
                                            {event.eventType === 'paid' && (
                                                <Button fullWidth variant="outline" onClick={() => navigate(`/events/${event.id}/verify-payments`)} leftIcon={<ClipboardList size={16} />}>Verify Payments</Button>
                                            )}
                                            <Button fullWidth variant="outline" onClick={() => navigate(`/events/${event.id}/marks`)} leftIcon={<ClipboardList size={16} />}>Enter Marks</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <Button fullWidth variant="ghost" onClick={handleShare} leftIcon={<Share2 size={16} />}>Share this Event</Button>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Navigation QR Code Card */}
                        {event.venueLocation && (
                            <Card>
                                <CardHeader>
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <Navigation size={24} className="text-indigo-600" />
                                        Navigate to Venue
                                    </h2>
                                </CardHeader>
                                <CardBody className="text-center space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Scan this QR code to open navigation directly
                                    </p>

                                    <div
                                        ref={qrRef}
                                        className="inline-block bg-white p-4 rounded-lg border-2 border-indigo-300"
                                    >
                                        <QRCode
                                            value={`${window.location.origin}/events/${event.id}/navigate`}
                                            size={200}
                                            level="H"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            fullWidth
                                            leftIcon={<Navigation size={16} />}
                                            onClick={() => setIsNavigating(true)}
                                        >
                                            Open Navigation
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            fullWidth
                                            leftIcon={<Share2 size={16} />}
                                            onClick={async () => {
                                                if (qrRef.current) {
                                                    try {
                                                        const dataUrl = await toPng(qrRef.current, {
                                                            quality: 1,
                                                            pixelRatio: 2,
                                                        });
                                                        const link = document.createElement('a');
                                                        link.download = `${event.title}-navigation-qr.png`;
                                                        link.href = dataUrl;
                                                        link.click();
                                                        toast.success('Navigation QR code downloaded!');
                                                    } catch (err) {
                                                        console.error('Failed to download QR code:', err);
                                                        toast.error('Failed to download QR code');
                                                    }
                                                }
                                            }}
                                        >
                                            Download QR Code
                                        </Button>
                                    </div>

                                    <p className="text-xs text-gray-500">
                                        Share this QR code on posters or flyers for easy navigation
                                    </p>
                                </CardBody>
                            </Card>
                        )}
                    </aside>
                </div >
            </div >

            {/* Navigation View Modal */}
            {isNavigating && event.venueLocation && (
                <NavigationView
                    destination={event.venueLocation.coordinates}
                    destinationName={event.venueLocation.name}
                    startingPoints={event.venueLocation.startingPoints}
                    instructions={event.venueLocation.instructions}
                    onClose={() => setIsNavigating(false)}
                />
            )}
        </div >
    );
};

export default EventDetails;