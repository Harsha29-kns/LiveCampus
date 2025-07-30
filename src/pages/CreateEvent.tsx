import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, ImageUp, Tag, Calendar, Clock, Save } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Event } from '../types';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const CreateEvent: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);
    const navigate = useNavigate();
    const { createEvent, getEventById, updateEvent, events, fetchEvents } = useEventStore();
    const { user } = useAuthStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Always start in loading state

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        capacity: '',
        image: '',
        tags: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadEventData = async () => {
            if (isEditMode && id) {
                // Ensure events are available in the store
                if (events.length === 0) {
                    await fetchEvents();
                }
                const event = getEventById(id);

                if (event) {
                    setFormData({
                        title: event.title || '',
                        description: event.description || '',
                        location: event.location || '',
                        // CORRECTED: Use `format` for reliable date/time conversion
                        startDate: event.startDate ? format(parseISO(event.startDate), 'yyyy-MM-dd') : '',
                        startTime: event.startDate ? format(parseISO(event.startDate), 'HH:mm') : '',
                        endDate: event.endDate ? format(parseISO(event.endDate), 'yyyy-MM-dd') : '',
                        endTime: event.endDate ? format(parseISO(event.endDate), 'HH:mm') : '',
                        capacity: event.capacity ? String(event.capacity) : '',
                        image: event.image || '',
                        tags: event.tags ? event.tags.join(', ') : '',
                    });
                } else {
                    toast.error("Event not found for editing.");
                    navigate('/events');
                }
            }
            setIsLoading(false); // Stop loading after data is set or if not in edit mode
        };

        loadEventData();
    }, [isEditMode, id, getEventById, navigate, events, fetchEvents]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };


    const uploadToCloudinary = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'event-images');
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
        if (startDateTime >= endDateTime) {
            newErrors.endDate = 'End date/time must be after start date/time';
        }
        if (formData.capacity && (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)) {
            newErrors.capacity = 'Capacity must be a positive number';
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


        setIsSubmitting(true);

        try {
            // CORRECTED: Preserve existing image URL if no new file is selected
            let imageUrl = formData.image || '';
            if (imageFile) {
                toast.loading('Uploading image...');
                imageUrl = await uploadToCloudinary(imageFile);
                toast.dismiss();
            }

            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
            const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);

            if (isEditMode && id) {
                const originalEvent = getEventById(id);
                const eventData: Partial<Event> = {
                    title: formData.title,
                    description: formData.description,
                    location: formData.location,
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString(),
                    capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
                    image: imageUrl || undefined,
                    tags,
                    // CORRECTED: Do not change organizer info on edit
                    organizerId: originalEvent?.organizerId,
                    organizerName: originalEvent?.organizerName,
                    organizerType: originalEvent?.organizerType,
                    createdBy: originalEvent?.createdBy,
                };
                await updateEvent(id, eventData);
                toast.success('Event updated successfully!');
            } else {
                 const eventData: Partial<Event> = {
                    title: formData.title,
                    description: formData.description,
                    location: formData.location,
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString(),
                    organizerId: user.role === 'club' ? user.clubId : user.id,
                    organizerName: user.name,
                    organizerType: user.role,
                    createdBy: user.id,
                    capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
                    image: imageUrl || undefined,
                    tags,
                    clubId: user.role === 'club' ? user.clubId : undefined,
                };
                await createEvent(eventData);
            }
            navigate('/events');

        } catch (error: any) {
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

            {/* Main Form Layout */}
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-white rounded-lg border shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Core Details</h2>
                        <div className="space-y-4">
                            <Input label="Event Title" name="title" placeholder="e.g., Annual Tech Fest" value={formData.title} onChange={handleChange} error={errors.title} required />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" rows={5} placeholder="Provide a detailed description of your event..." value={formData.description} onChange={handleChange as any} className={`w-full p-2 border rounded-md shadow-sm ${errors.description ? 'border-red-500' : 'border-gray-300'}`} required />
                                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                            </div>
                            <Input label="Location" name="location" leftIcon={<MapPin size={16} />} placeholder="e.g., College Auditorium" value={formData.location} onChange={handleChange} error={errors.location} required />
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-lg border shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Date & Time</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input type="date" label="Start Date" name="startDate" value={formData.startDate} onChange={handleChange} error={errors.startDate} required leftIcon={<Calendar size={16}/>} />
                            <Input type="time" label="Start Time" name="startTime" value={formData.startTime} onChange={handleChange} error={errors.startTime} required leftIcon={<Clock size={16}/>} />
                            <Input type="date" label="End Date" name="endDate" value={formData.endDate} onChange={handleChange} error={errors.endDate} required leftIcon={<Calendar size={16}/>} />
                            <Input type="time" label="End Time" name="endTime" value={formData.endTime} onChange={handleChange} error={errors.endTime} required leftIcon={<Clock size={16}/>} />
                        </div>
                    </div>
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
                                    <span className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</span>
                                </>
                            )}
                            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0" />
                        </label>
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200 flex justify-end gap-3 lg:pr-[calc(50%-36rem)]">
                <Button type="button" variant="outline" onClick={() => navigate('/events')} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={16}/>}>
                    {isEditMode ? 'Update Event' : 'Create Event'}
                </Button>
            </div>
        </form>
    );
};

export default CreateEvent;