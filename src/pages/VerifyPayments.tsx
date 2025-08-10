import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

const VerifyPayments: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null); // For loading state on buttons

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) return;
            setIsLoading(true);
            try {
                const eventDoc = await getDoc(doc(db, 'events', eventId));
                if (eventDoc.exists()) {
                    setEvent({ id: eventDoc.id, ...eventDoc.data() });
                } else {
                    toast.error("Event not found.");
                    navigate('/events');
                    return;
                }

                const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
                const snap = await getDocs(q);
                const regsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRegistrations(regsData);
            } catch (error) {
                toast.error("Failed to fetch registration data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [eventId, navigate]);

    const handleVerifyPayment = async (registration: any) => {
        setActionId(registration.id);
        try {
            await updateDoc(doc(db, 'eventRegistrations', registration.id), {
                paymentVerified: true
            });
            
            setRegistrations(regs =>
                regs.map(r => r.id === registration.id ? { ...r, paymentVerified: true } : r)
            );
            toast.success('Payment verified!');

            const userDoc = await getDoc(doc(db, 'users', registration.userId));
            if (userDoc.exists()) {
                const student = userDoc.data();
                await fetch('/api/send-payment-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: student.email, name: student.name, eventName: event?.title }),
                });
                toast.success('Verification email sent!');
            }
        } catch (error) {
            toast.error('An error occurred during verification.');
        } finally {
            setActionId(null);
        }
    };

    const handleRejectPayment = async (registration: any) => {
        const rejectionReason = prompt("Please provide a reason for rejection (this will be sent to the student):");
        if (rejectionReason === null) return; // User cancelled the prompt
        
        setActionId(registration.id);
        try {
            await updateDoc(doc(db, 'eventRegistrations', registration.id), {
                paymentVerified: 'rejected'
            });
            
            setRegistrations(regs =>
                regs.map(r => r.id === registration.id ? { ...r, paymentVerified: 'rejected' } : r)
            );
            toast.error('Payment rejected.');

            const userDoc = await getDoc(doc(db, 'users', registration.userId));
            if (userDoc.exists()) {
                const student = userDoc.data();
                await fetch('/api/send-payment-rejection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: student.email, name: student.name, eventName: event?.title, rejectionReason }),
                });
                toast.success('Rejection email sent to student.');
            }
        } catch (error) {
            toast.error('An error occurred during rejection.');
        } finally {
            setActionId(null);
        }
    };
    
    const getStatusComponent = (reg: any) => {
        if (reg.paymentVerified === true) {
            return <Badge variant="success"><CheckCircle size={14} className="mr-1" /> Verified</Badge>;
        }
        if (reg.paymentVerified === 'rejected') {
            return <Badge variant="error"><XCircle size={14} className="mr-1" /> Rejected</Badge>;
        }
        return <Badge variant="warning"><Clock size={14} className="mr-1" /> Pending</Badge>;
    };


    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading Registrations..." /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)} className="mb-4">
                <ArrowLeft size={16} className="mr-1" /> Back to Event
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Verify Payments</h1>
            <p className="text-gray-600 mb-6">Event: {event?.title}</p>
            
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="divide-y divide-gray-200">
                    {registrations.length > 0 ? registrations.map(reg => (
                        <div key={reg.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-gray-800">{reg.name}</p>
                                <p className="text-sm text-gray-500">Reg No: {reg.regNo}</p>
                                <p className="text-sm text-gray-500">Transaction ID: {reg.transactionId}</p>
                                <a href={reg.transactionImage} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                    View Transaction Proof
                                </a>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {getStatusComponent(reg)}
                                {reg.paymentVerified !== true && reg.paymentVerified !== 'rejected' && (
                                    <>
                                        <Button size="sm" onClick={() => handleVerifyPayment(reg)} isLoading={actionId === reg.id} disabled={!!actionId}>
                                            Verify
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleRejectPayment(reg)} isLoading={actionId === reg.id} disabled={!!actionId}>
                                            Reject
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 p-8">No paid registrations found for this event.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyPayments;