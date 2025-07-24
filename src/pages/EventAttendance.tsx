import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import QrScanner from 'react-qr-scanner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { UserCheck, UserX, Users, QrCode, Search, ArrowLeft, Video, VideoOff } from 'lucide-react';

// --- A more stylish Toggle Switch to replace the checkbox ---
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
);

const EventAttendance: React.FC = () => {
    // --- All original state and hooks are preserved ---
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [event, setEvent] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- State for the improved QR Scanner ---
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) return;
            setIsLoading(true);
            try {
                // Fetch event details to show the title
                const eventDoc = await getDoc(doc(db, 'events', eventId));
                if (eventDoc.exists()) {
                    setEvent({ id: eventDoc.id, ...eventDoc.data() });
                }

                // Fetch registrations
                const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
                const snap = await getDocs(q);
                const regsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRegistrations(regsData);
            } catch (error) {
                toast.error("Failed to fetch event data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    // Effect to get camera devices when scanner is opened
    useEffect(() => {
        if (!showScanner) return;
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoInputs = devices.filter(d => d.kind === "videoinput");
            setVideoDevices(videoInputs);
            setSelectedDeviceId(videoInputs[0]?.deviceId);
        });
    }, [showScanner]);

    // --- All original handler logic is preserved ---
    const handleToggle = async (regId: string, present: boolean) => {
        const newStatus = present ? 'attended' : 'registered';
        const checkedInTime = present ? new Date().toISOString() : null;
        
        // Update Firestore
        await updateDoc(doc(db, 'eventRegistrations', regId), {
            status: newStatus,
            checkedInAt: checkedInTime,
        });
        
        // Update local state for instant UI feedback
        setRegistrations(regs =>
            regs.map(r => r.id === regId ? { ...r, status: newStatus, checkedInAt: checkedInTime } : r)
        );
    };

    const handleScan = async (data: any) => {
        if (data?.text) {
            try {
                const parsed = JSON.parse(data.text);
                if (parsed.eventId === eventId) {
                    const reg = registrations.find(r => r.userId === parsed.userId);
                    if (reg) {
                        if (reg.status !== 'attended') {
                            await handleToggle(reg.id, true);
                            toast.success(`Welcome, ${reg.name || reg.regNo}! Marked as present.`);
                        } else {
                            toast.success(`${reg.name || reg.regNo} is already marked as present.`);
                        }
                    } else {
                        toast.error('Registration not found for this user.');
                    }
                } else {
                    toast.error('QR code is for a different event.');
                }
            } catch {
                toast.error('Invalid QR code format.');
            }
        }
    };
    
    // --- Derived state for stats and filtering ---
    const filteredRegistrations = registrations.filter(reg =>
        reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.regNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const presentCount = registrations.filter(r => r.status === 'attended').length;
    const totalCount = registrations.length;
    const absentCount = totalCount - presentCount;

    if (isLoading) {
        return <div className="text-center p-12">Loading Attendance Data...</div>;
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* --- Header --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
                        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">{event?.title || 'Event Attendance'}</h1>
                    <p className="mt-1 text-gray-600">
                        Manage attendee check-ins manually or with the QR scanner.
                    </p>
                </div>
                <Button onClick={() => setShowScanner(true)} leftIcon={<QrCode size={18} />}>
                    Scan QR Code
                </Button>
            </div>

            {/* --- Stats Section --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full"><Users className="h-6 w-6 text-blue-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Registered</p>
                        <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full"><UserCheck className="h-6 w-6 text-green-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Present</p>
                        <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-full"><UserX className="h-6 w-6 text-red-600" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                    </div>
                </div>
            </div>

            {/* --- Attendance List --- */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b">
                    <Input
                        placeholder="Search by name or reg no..."
                        leftIcon={<Search size={18} />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="divide-y divide-gray-200">
                    {filteredRegistrations.length > 0 ? filteredRegistrations.map(reg => (
                        <div key={reg.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div>
                                <p className="font-semibold text-gray-800">{reg.name}</p>
                                <p className="text-sm text-gray-500">{reg.regNo} - {reg.branch}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant={reg.status === 'attended' ? 'success' : 'error'}>
                                    {reg.status === 'attended' ? 'Present' : 'Absent'}
                                </Badge>
                                <ToggleSwitch
                                    checked={reg.status === 'attended'}
                                    onChange={(checked) => handleToggle(reg.id, checked)}
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 p-8">No matching registrations found.</p>
                    )}
                </div>
            </div>

            {/* --- QR Scanner Modal --- */}
            {showScanner && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-4">Scan Attendance QR</h2>
                        
                        {/* Camera Selection */}
                        {videoDevices.length > 1 && (
                            <select onChange={e => setSelectedDeviceId(e.target.value)} className="w-full mb-4 p-2 border rounded-md bg-gray-50">
                                {videoDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                                ))}
                            </select>
                        )}
                        
                        <div className="rounded-lg overflow-hidden border-2 border-indigo-500">
                             {selectedDeviceId ? (
                                <QrScanner
                                    delay={300}
                                    onError={(err) => toast.error('QR scan error. Please check camera permissions.')}
                                    onScan={handleScan}
                                    constraints={{ video: { deviceId: { exact: selectedDeviceId } } }}
                                    style={{ width: "100%" }}
                                />
                            ) : (
                                <div className="bg-gray-100 h-64 flex flex-col items-center justify-center text-gray-600">
                                    <VideoOff size={48} className="mb-4" />
                                    <p>No camera detected.</p>
                                    <p className="text-sm">Please ensure you have a camera connected and have granted permissions.</p>
                                </div>
                            )}
                        </div>
                        
                        <Button variant="outline" onClick={() => setShowScanner(false)} className="mt-4 w-full">
                            Close Scanner
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventAttendance;