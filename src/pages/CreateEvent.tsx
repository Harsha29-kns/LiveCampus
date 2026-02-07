import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, ImageUp, Tag, Calendar, Clock, Save, DollarSign, Phone, Award, Settings, Info, Navigation } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { useClubStore } from '../stores/clubStore';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Event, CertificateLayout, VenueLocation } from '../types';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CertificateLayoutEditorModal from '../components/ui/CertificateLayoutEditor';
import VenueMapSelector from '../components/ui/VenueMapSelector';

const CreateEvent: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);
    const navigate = useNavigate();
    const { createEvent, getEventById, updateEvent, events, fetchEvents } = useEventStore();
    const { user } = useAuthStore();
    const { clubs, fetchClubs } = useClubStore();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    const [formData, setFormData] = React.useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        registrationStartDate: '',
        registrationDeadline: '',
        capacity: '',
        image: '',
        tags: '',
        eventType: 'free' as 'free' | 'paid',
        eventFee: '',
        upiId: '',
        presidentPhone: '',
        vicePresidentPhone: '',
        certificateTemplateUrl: '',
        certificateLayout: null as CertificateLayout | null,
        category: 'other' as 'hackathon' | 'gateexam' | 'sports' | 'algorithms' | 'other',
        customCategory: '',
        resources: [] as string[],
    });
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [certificateFile, setCertificateFile] = React.useState<File | null>(null);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [isLayoutModalOpen, setIsLayoutModalOpen] = React.useState(false);
    const [isVenueModalOpen, setIsVenueModalOpen] = React.useState(false);
    const [venueLocation, setVenueLocation] = React.useState<VenueLocation | null>(null);

    React.useEffect(() => {
        const loadEventData = async () => {
            if (clubs.length === 0) fetchClubs();

            if (isEditMode && id) {
                if (events.length === 0) {
                    await fetchEvents();
                }
                const event = getEventById(id);

                if (event) {
                    setFormData({
                        title: event.title || '',
                        description: event.description || '',
                        location: event.location || '',
                        startDate: event.startDate ? format(parseISO(event.startDate), 'yyyy-MM-dd') : '',
                        startTime: event.startDate ? format(parseISO(event.startDate), 'HH:mm') : '',
                        endDate: event.endDate ? format(parseISO(event.endDate), 'yyyy-MM-dd') : '',
                        endTime: event.endDate ? format(parseISO(event.endDate), 'HH:mm') : '',
                        registrationStartDate: event.registrationStartDate ? format(parseISO(event.registrationStartDate), "yyyy-MM-dd'T'HH:mm") : '',
                        registrationDeadline: event.registrationDeadline ? format(parseISO(event.registrationDeadline), "yyyy-MM-dd'T'HH:mm") : '',
                        capacity: event.capacity ? String(event.capacity) : '',
                        image: event.image || '',
                        tags: event.tags ? event.tags.join(', ') : '',
                        eventType: (event.eventType as 'free' | 'paid') || 'free',
                        eventFee: event.eventFee || '',
                        upiId: event.upiId || '',
                        presidentPhone: event.presidentPhone || '',
                        vicePresidentPhone: event.vicePresidentPhone || '',
                        certificateTemplateUrl: event.certificateTemplateUrl || '',
                        certificateLayout: event.certificateLayout || null,
                        category: event.category || 'other',
                        customCategory: event.customCategory || '',
                        resources: event.resources || [],
                    });
                    setVenueLocation(event.venueLocation || null);
                } else {
                    toast.error("Event not found for editing.");
                    navigate('/events');
                }
            }
            setIsLoading(false);
        };

        loadEventData();
    }, [isEditMode, id, getEventById, navigate, events, fetchEvents, clubs, fetchClubs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as any }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const currentResources = prev.resources || [];
            if (checked) {
                return { ...prev, resources: [...currentResources, value] };
            } else {
                return { ...prev, resources: currentResources.filter(r => r !== value) };
            }
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCertificateFile(e.target.files[0]);
        }
    };

    const handleSaveLayout = (layout: CertificateLayout) => {
        setFormData(prev => ({ ...prev, certificateLayout: layout }));
        setIsLayoutModalOpen(false);
        toast.success('Certificate layout saved!');
    };
    const uploadToCloudinary = async (file: File, preset: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error.message || 'Cloudinary upload failed');
        }
        return data.secure_url;
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.startTime) newErrors.startTime = 'Start time is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (!formData.endTime) newErrors.endTime = 'End time is required';

        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
        const regStartDate = formData.registrationStartDate ? new Date(formData.registrationStartDate) : null;
        const regDeadline = formData.registrationDeadline ? new Date(formData.registrationDeadline) : null;

        if (startDateTime >= endDateTime) {
            newErrors.endDate = 'End date/time must be after start date/time';
        }

        if (regStartDate && regStartDate > startDateTime) {
            newErrors.registrationStartDate = 'Registration start must be before the event begins.';
        }

        if (regDeadline && regDeadline > startDateTime) {
            newErrors.registrationDeadline = 'Deadline must be before the event begins.';
        }

        if (regStartDate && regDeadline && regStartDate >= regDeadline) {
            newErrors.registrationDeadline = 'Deadline must be after the registration start time.';
        }

        if (formData.capacity && (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)) {
            newErrors.capacity = 'Capacity must be a positive number';
        }

        if (formData.eventType === 'paid') {
            if (!formData.eventFee || isNaN(Number(formData.eventFee)) || Number(formData.eventFee) <= 0) {
                newErrors.eventFee = 'A valid event fee is required.';
            }
            if (!formData.upiId || !formData.upiId.includes('@')) {
                newErrors.upiId = 'A valid UPI ID is required (e.g., yourname@okhdfcbank).';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !user) {
            toast.error(user ? 'Please fix the errors in the form.' : 'You must be logged in.');
            return;
        }

        if (user.role === 'club' && !isEditMode) {
            const myClub = clubs.find(c => c.id === user.clubId);
            if (!myClub) {
                toast.error("Club information not found.");
                return;
            }
            if (!myClub.facultyMembers || myClub.facultyMembers.length === 0) {
                toast.error("Your club does not have a Faculty Advisor assigned. You cannot create events until one is linked.");
                return;
            }
        }

        setIsSubmitting(true);
        const uploadToastId = (imageFile || certificateFile) ? toast.loading('Uploading files...') : null;

        try {
            let imageUrl = formData.image || '';
            if (imageFile) {
                imageUrl = await uploadToCloudinary(imageFile, 'event-images');
            }

            let certificateUrl = formData.certificateTemplateUrl || '';
            if (certificateFile) {
                certificateUrl = await uploadToCloudinary(certificateFile, 'event-images');
            }

            if (uploadToastId) toast.dismiss(uploadToastId);

            const eventData: Partial<Event> = {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                startDate: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
                endDate: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
                registrationStartDate: formData.registrationStartDate ? new Date(formData.registrationStartDate).toISOString() : undefined,
                registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : undefined,
                capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
                image: imageUrl || undefined,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                eventType: formData.eventType,
                eventFee: formData.eventType === 'paid' ? formData.eventFee : undefined,
                upiId: formData.eventType === 'paid' ? formData.upiId : undefined,
                certificateTemplateUrl: certificateUrl || undefined,
                certificateLayout: formData.certificateLayout || undefined,
                category: formData.category,
                customCategory: formData.category === 'other' ? formData.customCategory : undefined,
                resources: formData.category === 'hackathon' ? formData.resources : undefined,
                venueLocation: venueLocation || undefined,
            };

            if (isEditMode && id) {
                await updateEvent(id, eventData);
                toast.success('Event updated successfully!');
            } else {
                const newEventData: Partial<Event> = {
                    ...eventData,
                    organizerId: user.role === 'club' ? user.clubId! : user.id,
                    organizerName: user.name,
                    organizerType: user.role as 'club' | 'faculty' | 'admin',
                    createdBy: user.id,
                };
                const createdEvent = await createEvent(newEventData);

                if (createdEvent && user.role === 'club' && user.clubId) {
                    const myClub = clubs.find(c => c.id === user.clubId);
                    if (myClub && myClub.facultyMembers) {
                        for (const facultyId of myClub.facultyMembers) {
                            try {
                                const facultyDoc = await getDoc(doc(db, 'users', facultyId));
                                if (facultyDoc.exists()) {
                                    const facultyData = facultyDoc.data();
                                    if (facultyData.email) {
                                        await fetch('https://live-campus.vercel.app/api/send-workflow-notification', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                type: 'faculty_approval_needed',
                                                recipient: { name: facultyData.name, email: facultyData.email },
                                                event: createdEvent
                                            })
                                        });
                                    }
                                }
                            } catch (err) {
                                console.error('Failed to notify faculty', err);
                            }
                        }
                    }
                }
            }
            navigate('/events');

        } catch (error: any) {
            if (uploadToastId) toast.dismiss(uploadToastId);
            console.error('Error creating/updating event:', error);
            toast.error(error.message || 'Failed to save the event. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading event details..." />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6 pb-24 animate-fade-in">
                {/* Header */}
                <div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/events')} type="button" className="-ml-2">
                        <ArrowLeft size={16} className="mr-1" />
                        Back to Events
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 mt-2">{isEditMode ? 'Edit Event' : 'Create New Event'}</h1>
                    <p className="text-gray-600 mt-1">Fill in the details below to {isEditMode ? 'update your' : 'schedule a new'} event.</p>
                </div>

                {user?.role === 'club' && !isEditMode && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md flex items-start gap-3">
                        <Info className="flex-shrink-0 text-blue-500 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-blue-900">Faculty Approval Required</h3>
                            <p className="text-sm text-blue-800 mt-1">
                                New events will be submitted for <strong>Faculty Approval</strong>.
                                Your assigned Faculty Advisor must approve the event before it proceeds to Admin review or becomes visible.
                            </p>
                        </div>
                    </div>
                )}

                {/* Main Form Layout */}
                <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Core Details</h2>
                            <div className="space-y-4">
                                <Input label="Event Title" name="title" placeholder="e.g., Annual Tech Fest" value={formData.title} onChange={handleChange} error={errors.title} required />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full p-2 border rounded-md shadow-sm border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="hackathon">Hackathon</option>
                                        <option value="gateexam">Gate Exam</option>
                                        <option value="sports">Sports</option>
                                        <option value="algorithms">Algorithms</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {formData.category === 'other' && (
                                    <Input
                                        label="Specify Category"
                                        name="customCategory"
                                        placeholder="e.g., Cultural"
                                        value={formData.customCategory}
                                        onChange={handleChange}
                                        required
                                    />
                                )}

                                {formData.category === 'hackathon' && (
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Required Resources</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Mic', 'Speaker', 'AC', 'Power Backup', 'Water Supply'].map((res) => (
                                                <label key={res} className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={res}
                                                        checked={formData.resources.includes(res)}
                                                        onChange={handleResourceChange}
                                                        className="rounded text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{res}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea name="description" rows={5} placeholder="Provide a detailed description of your event..." value={formData.description} onChange={handleChange as any} className={`w-full p-2 border rounded-md shadow-sm ${errors.description ? 'border-red-500' : 'border-gray-300'}`} required />
                                    {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                                </div>
                                <Input label="Location" name="location" leftIcon={<MapPin size={16} />} placeholder="e.g., College Auditorium" value={formData.location} onChange={handleChange} error={errors.location} required />

                                {/* Venue Navigation Selector */}
                                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <Navigation size={18} className="text-indigo-600" />
                                                Venue Navigation (Optional)
                                            </h4>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Add map-based navigation for students to find the venue
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={venueLocation ? "outline" : "primary"}
                                            onClick={() => setIsVenueModalOpen(true)}
                                        >
                                            {venueLocation ? 'Update Location' : 'Set on Map'}
                                        </Button>
                                    </div>

                                    {venueLocation && (
                                        <div className="mt-3 p-3 bg-white rounded border text-sm">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{venueLocation.name}</p>
                                                    {venueLocation.buildingName && (
                                                        <p className="text-gray-600 text-xs mt-1">{venueLocation.buildingName}</p>
                                                    )}
                                                    <p className="text-gray-500 text-xs mt-1">
                                                        {venueLocation.startingPoints.length} starting point{venueLocation.startingPoints.length !== 1 ? 's' : ''} configured
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setVenueLocation(null)}
                                                    className="text-red-600 hover:text-red-800 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Event Schedule</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input type="date" label="Start Date" name="startDate" value={formData.startDate} onChange={handleChange} error={errors.startDate} required leftIcon={<Calendar size={16} />} />
                                <Input type="time" label="Start Time" name="startTime" value={formData.startTime} onChange={handleChange} error={errors.startTime} required leftIcon={<Clock size={16} />} />
                                <Input type="date" label="End Date" name="endDate" value={formData.endDate} onChange={handleChange} error={errors.endDate} required leftIcon={<Calendar size={16} />} />
                                <Input type="time" label="End Time" name="endTime" value={formData.endTime} onChange={handleChange} error={errors.endTime} required leftIcon={<Clock size={16} />} />
                            </div>
                        </div>
                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Registration Window</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Registration Starts On"
                                    name="registrationStartDate"
                                    type="datetime-local"
                                    value={formData.registrationStartDate}
                                    onChange={handleChange}
                                    error={errors.registrationStartDate}
                                    helperText="Note: When students can start registering."
                                />
                                <Input
                                    label="Registration Deadline"
                                    name="registrationDeadline"
                                    type="datetime-local"
                                    value={formData.registrationDeadline}
                                    onChange={handleChange}
                                    error={errors.registrationDeadline}
                                    helperText="Note: When new registrations will be blocked."
                                />
                            </div>
                        </div>
                        {user?.role === 'club' && (
                            <div className="p-6 bg-white rounded-lg border shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="President Phone" name="presidentPhone" type="tel" leftIcon={<Phone size={16} />} placeholder="President's contact number" value={formData.presidentPhone} onChange={handleChange} error={errors.presidentPhone} />
                                    <Input label="Vice President Phone" name="vicePresidentPhone" type="tel" leftIcon={<Phone size={16} />} placeholder="Vice President's contact number" value={formData.vicePresidentPhone} onChange={handleChange} error={errors.vicePresidentPhone} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1 space-y-6 mt-6 lg:mt-0">
                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Event Image</h2>
                            <label htmlFor="image-upload" className="relative cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500 transition-colors">
                                {(imageFile || formData.image) ? (
                                    <img src={imageFile ? URL.createObjectURL(imageFile) : formData.image} alt="Preview" className="h-32 w-full rounded-md object-cover" />
                                ) : (
                                    <>
                                        <ImageUp className="h-10 w-10 text-gray-400 mb-2" />
                                        <span className="text-sm font-medium text-indigo-600">Click to upload</span>
                                        <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                                    </>
                                )}
                                <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0" />
                            </label>
                        </div>

                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Certificate Template (Optional)</h2>
                            <p className="text-sm text-gray-500 mb-2">
                                Note: Recommended dimensions are 2048x1583px.
                            </p>
                            <label htmlFor="certificate-upload" className="relative cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500 transition-colors">
                                {(certificateFile || formData.certificateTemplateUrl) ? (
                                    <img src={certificateFile ? URL.createObjectURL(certificateFile) : formData.certificateTemplateUrl} alt="Certificate Preview" className="h-32 w-full rounded-md object-cover" />
                                ) : (
                                    <>
                                        <Award className="h-10 w-10 text-gray-400 mb-2" />
                                        <span className="text-sm font-medium text-indigo-600">Upload Template</span>
                                        <span className="text-xs text-gray-500 mt-1">PNG or JPG recommended</span>
                                    </>
                                )}
                                <input id="certificate-upload" type="file" accept="image/png, image/jpeg" onChange={handleCertificateChange} className="absolute inset-0 w-full h-full opacity-0" />
                            </label>

                            {(certificateFile || formData.certificateTemplateUrl) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    leftIcon={<Settings size={16} />}
                                    onClick={() => setIsLayoutModalOpen(true)}
                                    className="mt-4 w-full"
                                >
                                    Configure Certificate Layout
                                </Button>
                            )}
                        </div>

                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                                    <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full p-2 border rounded-md shadow-sm border-gray-300">
                                        <option value="free">Free Event</option>
                                        <option value="paid">Paid Event</option>
                                    </select>
                                </div>
                                {formData.eventType === 'paid' && (
                                    <>
                                        <Input label="Event Fee (INR)" name="eventFee" type="number" leftIcon={<DollarSign size={16} />} placeholder="e.g., 50" value={formData.eventFee} onChange={handleChange} error={errors.eventFee} required />
                                        <Input label="Organizer's UPI ID" name="upiId" placeholder="your-id@oksbi" value={formData.upiId} onChange={handleChange} error={errors.upiId} required />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-white rounded-lg border shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Optional Details</h2>
                            <div className="space-y-4">
                                <Input label="Capacity" name="capacity" type="number" leftIcon={<Users size={16} />} placeholder="e.g., 100" value={formData.capacity} onChange={handleChange} error={errors.capacity} helperText="Leave blank for unlimited" />
                                <Input label="Tags" name="tags" leftIcon={<Tag size={16} />} placeholder="tech, workshop, social" value={formData.tags} onChange={handleChange} error={errors.tags} helperText="Separate tags with a comma" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Action Bar */}
                <div className="fixed bottom-0 left-10 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200 flex justify-end gap-3 lg:left-64">
                    <Button type="button" variant="outline" onClick={() => navigate('/events')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
                        {isEditMode ? 'Update Event' : 'Create Event'}
                    </Button>
                </div>

                <CertificateLayoutEditorModal
                    isOpen={isLayoutModalOpen}
                    onClose={() => setIsLayoutModalOpen(false)}
                    templateUrl={certificateFile ? URL.createObjectURL(certificateFile) : formData.certificateTemplateUrl}
                    initialLayout={formData.certificateLayout}
                    onSave={handleSaveLayout}
                />

                {/* Venue Map Selector Modal */}
                {isVenueModalOpen && (
                    <VenueMapSelector
                        initialValue={venueLocation}
                        onSave={(venue) => {
                            setVenueLocation(venue);
                            setIsVenueModalOpen(false);
                        }}
                        onClose={() => setIsVenueModalOpen(false)}
                    />
                )}
            </form>
        </div>
    );
};

export default CreateEvent;
