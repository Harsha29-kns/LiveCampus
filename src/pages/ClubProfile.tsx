import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useClubStore } from '../stores/clubStore';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast } from 'date-fns';
import { motion } from 'framer-motion';

import { Event } from '../types';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';

import {
  Building,
  Edit,
  Save,
  Image as ImageIcon,
  Calendar,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';

const CreateClubProfileForm: React.FC = () => {
    const { createClubProfileForUser, isLoading } = useClubStore();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        facultyAdvisor: '',
        president: '',
        vicePresident: '',
        phoneNo: '',
        logo: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await createClubProfileForUser(formData);
        if (success) {
            navigate('/'); 
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <Card>
                <CardHeader>
                    <h1 className="text-3xl font-bold text-gray-900">Create Your Club Profile</h1>
                    <p className="mt-1 text-gray-600">Your account is approved! Please provide the details for your club to get started.</p>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="Club Name" name="name" value={formData.name} onChange={handleChange} required />
                        <Input label="Faculty Advisor" name="facultyAdvisor" value={formData.facultyAdvisor} onChange={handleChange} required />
                        <Input label="President" name="president" value={formData.president} onChange={handleChange} required />
                        <Input label="Vice President" name="vicePresident" value={formData.vicePresident} onChange={handleChange} required />
                        <Input label="Contact Phone" name="phoneNo" value={formData.phoneNo} onChange={handleChange} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full border rounded-md p-2 border-gray-300"
                                required
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" isLoading={isLoading} leftIcon={<Save size={16} />}>Save and Continue</Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </motion.div>
    );
};

const ClubProfile: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const navigate = useNavigate();

  const [clubData, setClubData] = useState<any>(null);
  const [clubEvents, setClubEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user?.role !== 'club') {
          setIsLoading(false);
          return;
      }
      if (!user.clubId) {
          setIsLoading(false);
          setClubData(null); 
          return;
      }

      setIsLoading(true);
      try {
        const clubDocRef = doc(db, 'clubs', user.clubId);
        const clubSnap = await getDoc(clubDocRef);
        if (clubSnap.exists()) {
          const data = { id: clubSnap.id, ...clubSnap.data() };
          setClubData(data);
          setEditData(data);
        } else {
          setClubData(null); 
        }

        if (events.length === 0) {
          await fetchEvents();
        }
      } catch (error) {
        toast.error('Failed to load club information.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, events.length, fetchEvents]);

  useEffect(() => {
    if (clubData && events.length > 0) {
      const upcoming = events
        .filter(event => event.organizerId === clubData.id && !isPast(parseISO(event.endDate)))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setClubEvents(upcoming);
    }
  }, [clubData, events]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'club-images');

    const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error.message || 'Cloudinary upload failed');
    return data.secure_url;
  };

  const handleSave = async () => {
    if (!user?.clubId) return;
    setIsSaving(true);
    try {
      let imageUrl = editData.logo || '';
      if (logoFile) {
        toast.loading('Uploading new logo...');
        imageUrl = await uploadToCloudinary(logoFile);
        toast.dismiss();
      }

      const updatedData = { ...editData, logo: imageUrl, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'clubs', user.clubId), updatedData);

      const updatedUser = { ...user, club: updatedData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Club profile saved successfully!');
      setIsEditing(false);
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading Club Dashboard..." />
      </div>
    );
  }

  if (!clubData) {
    return <CreateClubProfileForm />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building /> {clubData.name}
          </h1>
          <p className="mt-1 text-gray-600">Your club management dashboard.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} leftIcon={<Edit size={18} />}>
            Edit Club Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-gray-900">📝 Club Information</h2>
              <p className="text-sm text-gray-500 mt-1">Edit or view your club’s details and description.</p>
            </CardHeader>
            <CardBody>
              {isEditing ? (
                <div className="space-y-4">
                  <Input label="Club Name" name="name" value={editData.name || ''} onChange={handleChange} />
                  <Input label="Faculty Advisor" name="facultyAdvisor" value={editData.facultyAdvisor || ''} onChange={handleChange} />
                  <Input label="President" name="president" value={editData.president || ''} onChange={handleChange} />
                  <Input label="Vice President" name="vicePresident" value={editData.vicePresident || ''} onChange={handleChange} />
                  <Input label="Contact Phone" name="phoneNo" value={editData.phoneNo || ''} onChange={handleChange} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={editData.description || ''}
                      onChange={handleChange}
                      rows={4}
                      className="w-full border rounded-md p-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ImageIcon className="inline w-4 h-4 mr-1" /> Club Logo
                    </label>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="w-full border p-2 rounded-md" />
                    {(logoFile || editData.logo) && (
                      <div className="mt-2 flex items-center gap-4">
                        <img
                          src={logoFile ? URL.createObjectURL(logoFile) : editData.logo}
                          alt="Preview"
                          className="h-24 w-24 rounded-md border object-cover shadow"
                        />
                        <p className="text-sm text-gray-500">Preview of uploaded logo</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save size={16} />}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {clubData.logo && (
                    <img
                      src={clubData.logo}
                      alt={clubData.name}
                      className="h-32 w-32 rounded-full object-cover shadow-md mb-4"
                    />
                  )}
                  <p><strong className="font-semibold text-gray-800">Faculty Advisor:</strong> {clubData.facultyAdvisor}</p>
                  <p><strong className="font-semibold text-gray-800">President:</strong> {clubData.president}</p>
                  <p><strong className="font-semibold text-gray-800">Vice President:</strong> {clubData.vicePresident}</p>
                  <p><strong className="font-semibold text-gray-800">Contact:</strong> {clubData.phoneNo}</p>
                  <p className="whitespace-pre-wrap pt-2">
                    <strong className="font-semibold text-gray-800">Description:</strong><br />
                    {clubData.description}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-8">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📅 Upcoming Events</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/events/create')} leftIcon={<PlusCircle size={16} />}>New</Button>
            </CardHeader>
            <CardBody>
              {clubEvents.length > 0 ? (
                <div className="space-y-3">
                  {clubEvents.slice(0, 5).map(event => (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{event.title}</p>
                        <p className="text-sm text-gray-500">{format(parseISO(event.startDate), 'E, d MMM')}</p>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-gray-500">No upcoming events found.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
};

export default ClubProfile;