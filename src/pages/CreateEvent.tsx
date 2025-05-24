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

const CreateEvent: React.FC = () => {
  const { id } = useParams<{ id?: string }>(); // <-- get id from URL
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
    image: '',
    tags: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    // Check if end date/time is after start date/time
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      newErrors.endDate = 'End date/time must be after start date/time';
    }
    
    // Validate capacity is a positive number if provided
    if (formData.capacity && (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }
    
    // Validate image URL if provided
    if (formData.image && !isValidUrl(formData.image)) {
      newErrors.image = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
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

    // Combine date and time
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    // Parse tags
    const tags = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    const eventData: Partial<Event> = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      createdBy: user.id,
      organizerId: user.id,
      organizerName: user.role === 'admin' ? 'Campus Administration' : 
                    user.role === 'faculty' ? `Faculty of ${user.department || 'Studies'}` : 
                    user.role === 'club' ? user.name : 'Student Organization',
      organizerType: user.role === 'student' ? 'club' : user.role,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      image: formData.image || undefined,
      tags,
    };
    
    if (isEditMode) {
      // Update existing event
      await updateEvent(id!, eventData); // You need to implement updateEvent in your store
      toast.success('Event updated successfully!');
    } else {
      // Create new event
      const newEvent = await createEvent(eventData);
      if (newEvent) {
        toast.success('Event created successfully! Awaiting approval.');
      }
    }
    navigate('/events');
  };
  
  useEffect(() => {
    if (isEditMode) {
      // Fetch event data and prefill form
      const fetchEvent = async () => {
        // Replace with your event fetching logic
        const event = getEventById(id!);
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
        }
      };
      fetchEvent();
    }
  }, [isEditMode, id]);
  
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
                onChange={handleChange}
                className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none ${
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
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none ${
                    errors.startDate
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                  }`}
                  required
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-error-500">{errors.startDate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none ${
                    errors.startTime
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                  }`}
                  required
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-error-500">{errors.startTime}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none ${
                    errors.endDate
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                  }`}
                  required
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-error-500">{errors.endDate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={`w-full rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors focus:outline-none ${
                    errors.endTime
                      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                  }`}
                  required
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-error-500">{errors.endTime}</p>
                )}
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
            
            <Input
              label="Image URL (optional)"
              name="image"
              leftIcon={<Image size={16} />}
              placeholder="Enter image URL for your event"
              value={formData.image}
              onChange={handleChange}
              error={errors.image}
              helperText="Provide a URL to an image for your event"
              fullWidth
            />
            
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
        
        <Card className="bg-blue-50 border border-blue-200">
          <CardBody className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-neutral-900 mb-1">Event Approval Process</h3>
              <p className="text-neutral-700 text-sm">
                All events require approval from administrators before they become visible to all users.
                You will be notified once your event is approved or if any changes are needed.
              </p>
            </div>
          </CardBody>
        </Card>
        
        <div className="flex justify-end space-x-3">
          <Button
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