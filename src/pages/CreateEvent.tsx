import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Image, Tag, Info } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody, CardHeader} from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Event } from '../types';
import toast from 'react-hot-toast';
import { db } from '../firebaseConfig';
import { addDoc, collection, doc, updateDoc, getDoc } from 'firebase/firestore';

const CreateEvent: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { createEvent, isLoading, getEventById, updateEvent } = useEventStore();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    capacity: '',
    image: '', // This will hold the URL of an existing image
    tags: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && id) {
      const fetchEvent = async () => {
        const event = getEventById(id); // Assuming this is synchronous
        if (event) {
          setFormData({
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            startDate: event.startDate ? event.startDate.slice(0, 10) : '',
            startTime: event.startDate ? event.startDate.slice(11, 16) : '',
            endDate: event.endDate ? event.endDate.slice(0, 10) : '',
            endTime: event.endDate ? event.endDate.slice(11, 16) : '',
            capacity: event.capacity ? String(event.capacity) : '',
            image: event.image || '',
            tags: event.tags ? event.tags.join(', ') : '',
          });
        } else {
            toast.error("Event not found for editing.");
            navigate('/events');
        }
      };
      fetchEvent();
    }
  }, [isEditMode, id, getEventById, navigate]);


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
  
  // This function uploads the file to your Cloudinary account
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // ⚠️ IMPORTANT: You might want to create a different preset for events, e.g., 'event-images'
    formData.append('upload_preset', 'event-images'); 

    const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.secure_url; // This is the image URL from Cloudinary
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

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create an event');
      return;
    }

    let imageUrl = formData.image || '';
    if (imageFile) {
        try {
            imageUrl = await uploadToCloudinary(imageFile);
        } catch (error) {
            toast.error("Image upload failed. Please try again.");
            return;
        }
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    const eventData: Partial<Event> = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      organizerId: user.id, // Or clubId if the user is a club
      organizerName: user.name,
      organizerType: user.role,
      createdBy: user.id,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      image: imageUrl || undefined,
      tags,
    };

    try {
      if (isEditMode && id) {
        await updateEvent(id, eventData);
        toast.success('Event updated successfully!');
      } else {
        await createEvent(eventData);
        // createEvent already shows a toast
      }
      navigate('/events');
    } catch (error) {
      console.error('Error creating/updating event:', error);
      toast.error('Failed to save the event. Please try again.');
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{isEditMode ? 'Edit' : 'Create New'} Event</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-neutral-900">Event Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Event Title"
              name="title"
              placeholder="Enter event title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              fullWidth
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={5}
                placeholder="Describe your event"
                value={formData.description}
                onChange={handleChange as any}
                className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none p-2 border ${
                  errors.description
                    ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                    : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                }`}
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-error-500">{errors.description}</p>
              )}
            </div>
            
            <Input
              label="Location"
              name="location"
              leftIcon={<MapPin size={16} />}
              placeholder="Enter event location"
              value={formData.location}
              onChange={handleChange}
              error={errors.location}
              fullWidth
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`w-full p-2 border rounded-md shadow-sm ${errors.startDate ? 'border-error-500' : 'border-neutral-300'}`} required />
                {errors.startDate && <p className="mt-1 text-sm text-error-500">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Time</label>
                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={`w-full p-2 border rounded-md shadow-sm ${errors.startTime ? 'border-error-500' : 'border-neutral-300'}`} required />
                {errors.startTime && <p className="mt-1 text-sm text-error-500">{errors.startTime}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`w-full p-2 border rounded-md shadow-sm ${errors.endDate ? 'border-error-500' : 'border-neutral-300'}`} required />
                {errors.endDate && <p className="mt-1 text-sm text-error-500">{errors.endDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Time</label>
                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={`w-full p-2 border rounded-md shadow-sm ${errors.endTime ? 'border-error-500' : 'border-neutral-300'}`} required />
                {errors.endTime && <p className="mt-1 text-sm text-error-500">{errors.endTime}</p>}
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-neutral-900">Additional Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Capacity (optional)"
              name="capacity"
              type="number"
              leftIcon={<Users size={16} />}
              placeholder="Maximum number of attendees"
              value={formData.capacity}
              onChange={handleChange}
              error={errors.capacity}
              helperText="Leave blank for unlimited capacity"
              fullWidth
            />
            
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Event Image
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-neutral-300 rounded-md p-2 text-sm text-neutral-700
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary-50 file:text-primary-700
                                hover:file:bg-primary-100"
                />
                {(imageFile || formData.image) && (
                    <div className="mt-2">
                        <p className="text-xs text-neutral-500 mb-1">Image Preview:</p>
                        <img
                            src={imageFile ? URL.createObjectURL(imageFile) : formData.image}
                            alt="Preview"
                            className="h-32 rounded shadow object-cover"
                        />
                    </div>
                )}
            </div>
            
            <Input
              label="Tags (optional)"
              name="tags"
              leftIcon={<Tag size={16} />}
              placeholder="e.g., tech, workshop, social (comma separated)"
              value={formData.tags}
              onChange={handleChange}
              error={errors.tags}
              helperText="Add tags to help categorize your event"
              fullWidth
            />
          </CardBody>
        </Card>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/events')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
          >
            {isEditMode ? 'Update' : 'Create'} Event
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;