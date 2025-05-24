import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Tag, ArrowLeft, Edit, Trash2, CheckCircle, XCircle, Share2, Download } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import QRCode from 'react-qr-code';
import QrScanner from 'react-qr-scanner';
import { toPng } from 'html-to-image';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEventById, fetchEvents, approveEvent, rejectEvent, deleteEvent, registerForEvent, cancelRegistration, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const [event, setEvent] = useState(getEventById(id || ''));
  const [isRegistered, setIsRegistered] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    regNo: '',
    name: user?.name || '',
    branch: '',
    department: user?.department || '',
    phone: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const qrRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!event) {
      fetchEvents().then(() => {
        const fetchedEvent = getEventById(id || '');
        if (fetchedEvent) {
          setEvent(fetchedEvent);
        } else {
          toast.error('Event not found');
          navigate('/events');
        }
      });
    }
  }, [id, event, fetchEvents, getEventById, navigate]);

  // In a real app, this would check if the user is registered for this event
  useEffect(() => {
    // Simulate a check if the user is registered
    setIsRegistered(Math.random() > 0.5);
  }, [id]);

  useEffect(() => {
    if (
      event &&
      (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club')
    ) {
      const fetchRegistrations = async () => {
        const q = query(
          collection(db, 'eventRegistrations'),
          where('eventId', '==', event.id)
        );
        const snapshot = await getDocs(q);
        setRegistrations(snapshot.docs.map(doc => doc.data()));
      };
      fetchRegistrations();
    }
  }, [event, user]);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!id || !user) return setIsRegistered(false);
      const q = query(
        collection(db, 'eventRegistrations'),
        where('eventId', '==', id),
        where('userId', '==', user.id)
      );
      const snapshot = await getDocs(q);
      setIsRegistered(!snapshot.empty);
      // Optionally, set registrationData from Firestore if you want to show the correct QR info
      if (!snapshot.empty) {
        setRegistrationData(snapshot.docs[0].data());
      }
    };
    checkRegistration();
  }, [id, user]);

  useEffect(() => {
    if (!showScanner) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);
      // Try to select the back camera by default
      const backCam = videoInputs.find((d) =>
        d.label.toLowerCase().includes("back")
      );
      setSelectedDeviceId(backCam?.deviceId || videoInputs[0]?.deviceId);
    });
  }, [showScanner]);

  if (!event) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!id) return;
    
    setIsActionLoading(true);
    const updatedEvent = await approveEvent(id);
    setIsActionLoading(false);
    
    if (updatedEvent) {
      setEvent(updatedEvent);
      toast.success('Event approved successfully');
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setIsActionLoading(true);
    await rejectEvent(id);
    setIsActionLoading(false);
    toast.success('Event rejected and deleted');
    navigate('/events'); // Redirect to events list
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      setIsActionLoading(true);
      const success = await deleteEvent(id);
      setIsActionLoading(false);
      
      if (success) {
        toast.success('Event deleted successfully');
        navigate('/events');
      }
    }
  };

  const handleRegister = async () => {
    if (!id || !user) return;
    
    setIsActionLoading(true);
    const success = await registerForEvent(id, user.id);
    setIsActionLoading(false);
    
    if (success) {
      setIsRegistered(true);
      toast.success('Successfully registered for event');
      // Refresh event to update registration count
      const updatedEvent = getEventById(id);
      if (updatedEvent) {
        setEvent(updatedEvent);
      }
    }
  };

  const handleCancelRegistration = async () => {
    if (!id || !user) return;
    
    setIsActionLoading(true);
    const success = await cancelRegistration(id, user.id);
    setIsActionLoading(false);
    
    if (success) {
      setIsRegistered(false);
      toast.success('Registration cancelled');
      // Refresh event to update registration count
      const updatedEvent = getEventById(id);
      if (updatedEvent) {
        setEvent(updatedEvent);
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      })
        .then(() => toast.success('Shared successfully'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success('Link copied to clipboard'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  const handleDownloadExcel = () => {
    if (!registrations.length) {
      toast.error('No registrations to download');
      return;
    }
    // Prepare data for Excel
    const data = registrations.map((reg, idx) => ({
      'S.No': idx + 1,
      'Reg. No': reg.regNo || '',
      'Name': reg.name || '',
      'Branch': reg.branch || '',
      'Department': reg.department || '',
      'Phone': reg.phone || '',
      'Registered At': reg.registeredAt
        ? format(new Date(reg.registeredAt), 'yyyy-MM-dd HH:mm')
        : '',
      'Status': reg.status || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    XLSX.writeFile(workbook, `${event.title || 'event'}-registrations.xlsx`);
  };

  const handleDownloadAttendanceExcel = () => {
    // Filter only attended registrations
    const attended = registrations.filter(reg => reg.status === 'attended');
    if (!attended.length) {
      toast.error('No attendance records to download');
      return;
    }
    const data = attended.map((reg, idx) => ({
      'S.No': idx + 1,
      'Reg. No': reg.regNo || '',
      'Name': reg.name || '',
      'Branch': reg.branch || '',
      'Department': reg.department || '',
      'Phone': reg.phone || '',
      'Checked In At': reg.checkedInAt
        ? format(new Date(reg.checkedInAt), 'yyyy-MM-dd HH:mm')
        : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `${event.title || 'event'}-attendance.xlsx`);
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

  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.id === event.createdBy || 
                      (user?.role === 'admin') || 
                      (user?.role === event.organizerType && user?.id === event.organizerId);
  const isPending = event.status === 'pending';
  const isApproved = event.status === 'approved';
  const isRejected = event.status === 'rejected';
  const isCancelled = event.status === 'cancelled';
  const isCompleted = event.status === 'completed';
  const isFull = event.capacity ? event.registeredCount >= event.capacity : false;
  const isPast = new Date(event.endDate) < new Date();

  const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({ ...prev, [name]: value }));
    if (regErrors[name]) {
      setRegErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateReg = () => {
    const errs: Record<string, string> = {};
    if (!registrationData.regNo.trim()) errs.regNo = 'Reg. No is required';
    if (!registrationData.name.trim()) errs.name = 'Name is required';
    if (!registrationData.branch.trim()) errs.branch = 'Branch is required';
    if (!registrationData.department.trim()) errs.department = 'Department is required';
    if (!registrationData.phone.trim()) errs.phone = 'Phone number is required';
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStudentRegister = async () => {
    if (!validateReg()) return;
    setIsActionLoading(true);
    // Pass registrationData to your backend or registration function
    const success = await registerForEvent(id, user.id, registrationData);
    setIsActionLoading(false);
    if (success) {
      setIsRegistered(true);
      toast.success('Successfully registered for event');
      // Refresh event to update registration count
      const updatedEvent = getEventById(id);
      if (updatedEvent) {
        setEvent(updatedEvent);
      }
    }
  };

  const handleScan = async (data: any) => {
    if (data && data.text) {
      try {
        const parsed = JSON.parse(data.text);
        if (parsed.eventId === event.id) {
          // Find the registration document for this user and event
          const q = query(
            collection(db, 'eventRegistrations'),
            where('eventId', '==', event.id),
            where('userId', '==', parsed.userId)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const regDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'eventRegistrations', regDoc.id), {
              status: 'attended',
              checkedInAt: new Date().toISOString(),
            });
            toast.success(`Attendance marked for Reg.No: ${parsed.regNo || parsed.userId}`);
            setShowScanner(false);
            // Optionally refresh registrations
            const refreshed = await getDocs(q);
            setRegistrations(refreshed.docs.map(doc => doc.data()));
          } else {
            toast.error('Registration not found');
          }
        } else {
          toast.error('QR code does not match this event');
        }
      } catch {
        toast.error('Invalid QR code');
      }
    }
  };

  const handleError = (err: any) => {
    toast.error('QR scan error');
  };

  const handleDownloadQR = async () => {
    if (qrRef.current) {
      const dataUrl = await toPng(qrRef.current);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `event-qr-${event.id}-${user.id}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/events')}
        >
          Back to Events
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <Card>
            <CardBody>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center mb-2">
                    <Badge variant={getStatusBadgeVariant(event.status)} className="mr-2">
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {event.organizerType.charAt(0).toUpperCase() + event.organizerType.slice(1)}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-2">{event.title}</h1>
                  <p className="text-neutral-500">
                    Organized by {event.organizerName}
                  </p>
                </div>
                
                {isOrganizer && isApproved && !isPast && (
                  <div className="mt-4 md:mt-0 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit size={16} />}
                      onClick={() => navigate(`/events/edit/${event.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={handleDelete}
                      isLoading={isActionLoading}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          
          {/* Event Image */}
          {event.image && (
            <div className="rounded-lg overflow-hidden shadow-sm">
              <img 
                src={event.image} 
                alt={event.title} 
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          
          {/* Event Description */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900">About This Event</h2>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-700 whitespace-pre-line">
                {event.description}
              </p>
              
              {event.tags && event.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          
          {/* Admin Actions for Pending Events */}
          {isAdmin && isPending && (
            <Card className="border border-yellow-200 bg-yellow-50">
              <CardBody>
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Admin Actions Required</h3>
                <p className="text-neutral-700 mb-4">
                  This event is pending approval. Please review the details and take appropriate action.
                </p>
                <div className="flex space-x-3">
                  <Button
                    leftIcon={<CheckCircle size={16} />}
                    onClick={handleApprove}
                    isLoading={isActionLoading}
                  >
                    Approve Event
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<XCircle size={16} />}
                    onClick={handleReject}
                    isLoading={isActionLoading}
                  >
                    Reject Event
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900">Event Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-neutral-900">Date & Time</h3>
                  <p className="text-neutral-700">
                    {format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-neutral-700">
                    {format(parseISO(event.startDate), 'h:mm a')} - {format(parseISO(event.endDate), 'h:mm a')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-neutral-900">Location</h3>
                  <p className="text-neutral-700">{event.location}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Users className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-neutral-900">Attendance</h3>
                  <p className="text-neutral-700">
                    {event.registeredCount} registered
                    {event.capacity && ` / ${event.capacity} capacity`}
                  </p>
                  {isFull && (
                    <Badge variant="error" size="sm" className="mt-1">
                      At Capacity
                    </Badge>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Registration Card */}
          {isApproved && !isPast && !isCancelled && (
            <Card>
              <CardBody>
                {isRegistered ? (
                  <>
                    <div className="bg-green-50 text-green-800 rounded-md p-3 mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>You're registered for this event!</span>
                    </div>
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={handleCancelRegistration}
                      isLoading={isActionLoading}
                    >
                      Cancel Registration
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Register for this Event</h3>
                    {isFull ? (
                      <div className="bg-yellow-50 text-yellow-800 rounded-md p-3 mb-4">
                        This event has reached its capacity. Please check back later as spots may open up.
                      </div>
                    ) : (
                      <p className="text-neutral-700 mb-4">
                        Secure your spot for this event by registering now.
                      </p>
                    )}
                    {user?.role === 'student' && (
                      <form
                        className="space-y-4"
                        onSubmit={e => {
                          e.preventDefault();
                          handleStudentRegister();
                        }}
                      >
                        <Input
                          label="Reg. No"
                          name="regNo"
                          value={registrationData.regNo}
                          onChange={handleRegChange}
                          error={regErrors.regNo}
                          required
                        />
                        <Input
                          label="Name"
                          name="name"
                          value={registrationData.name}
                          onChange={handleRegChange}
                          error={regErrors.name}
                          required
                        />
                        <Input
                          label="Branch"
                          name="branch"
                          value={registrationData.branch}
                          onChange={handleRegChange}
                          error={regErrors.branch}
                          required
                        />
                        <Input
                          label="Department"
                          name="department"
                          value={registrationData.department}
                          onChange={handleRegChange}
                          error={regErrors.department}
                          required
                        />
                        <Input
                          label="Phone Number"
                          name="phone"
                          value={registrationData.phone}
                          onChange={handleRegChange}
                          error={regErrors.phone}
                          required
                        />
                        <Button type="submit" fullWidth isLoading={isActionLoading}>
                          Register Now
                        </Button>
                      </form>
                    )}
                  </>
                )}
                
                {isRegistered && user?.role === 'student' && (
                  <div className="flex flex-col items-center mt-4">
                    <p className="mb-2 text-neutral-700">Show this QR code at the event for attendance:</p>
                    <div ref={qrRef} className="bg-white p-2 rounded">
                      <QRCode
                        value={JSON.stringify({
                          eventId: event.id,
                          userId: user.id,
                          regNo: registrationData.regNo,
                        })}
                        size={180}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <Button
                      className="mt-2"
                      variant="outline"
                      onClick={handleDownloadQR}
                    >
                      Download QR
                    </Button>
                    <p className="mt-2 text-xs text-neutral-500">This QR is unique to your registration.</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
          
          {/* Share Button */}
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Share2 size={16} />}
            onClick={handleShare}
          >
            Share Event
          </Button>
          
          {/* Download Excel Button */}
          {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
            <Button
              variant="outline"
              className="mb-4"
              onClick={handleDownloadExcel}
              leftIcon={<Download size={16} />}
            >
              Download Registrations (Excel)
            </Button>
          )}
          
          {/* Download Attendance Excel Button */}
          {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
            <Button
              variant="outline"
              className="mb-4"
              onClick={handleDownloadAttendanceExcel}
              leftIcon={<Download size={16} />}
            >
              Download Attendance (Excel)
            </Button>
          )}
          
          {/* Scan Attendance QR Button */}
          {(user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'club') && (
            <>
              <Button
                variant="outline"
                className="mb-4"
                onClick={() => setShowScanner(true)}
              >
                Scan Attendance QR
              </Button>
              {showScanner && (
                <div className="mb-4">
                  {/* Camera selection dropdown */}
                  {videoDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="mb-2 p-2 border rounded"
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <QrScanner
                    delay={300}
                    onError={handleError}
                    onScan={handleScan}
                    constraints={
                      selectedDeviceId
                        ? { video: { deviceId: { exact: selectedDeviceId } } }
                        : { video: true }
                    }
                    style={{ width: "100%" }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowScanner(false)}
                    className="mt-2"
                  >
                    Close Scanner
                  </Button>
                </div>
              )}
            </>
          )}
          
          {/* Event Status Messages */}
          {isPending && (
            <Card className="bg-yellow-50 border border-yellow-200">
              <CardBody>
                <h3 className="font-medium text-neutral-900 mb-1">Pending Approval</h3>
                <p className="text-neutral-700 text-sm">
                  This event is awaiting approval from administrators.
                </p>
              </CardBody>
            </Card>
          )}
          
          {isRejected && (
            <Card className="bg-red-50 border border-red-200">
              <CardBody>
                <h3 className="font-medium text-neutral-900 mb-1">Event Rejected</h3>
                <p className="text-neutral-700 text-sm">
                  This event has been rejected by administrators.
                </p>
              </CardBody>
            </Card>
          )}
          
          {isCancelled && (
            <Card className="bg-neutral-50 border border-neutral-200">
              <CardBody>
                <h3 className="font-medium text-neutral-900 mb-1">Event Cancelled</h3>
                <p className="text-neutral-700 text-sm">
                  This event has been cancelled by the organizer.
                </p>
              </CardBody>
            </Card>
          )}
          
          {isPast && (
            <Card className="bg-neutral-50 border border-neutral-200">
              <CardBody>
                <h3 className="font-medium text-neutral-900 mb-1">Event Completed</h3>
                <p className="text-neutral-700 text-sm">
                  This event has already taken place.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;