import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Clock, Edit, Camera, Save, Award } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { Card, CardBody, CardHeader, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Event } from '../types';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Import the spinner component

const Profile: React.FC = () => {
  const { user, updateProfile, isLoading: isAuthLoading } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const navigate = useNavigate();

  const [isPageLoading, setIsPageLoading] = useState(true); // State for initial page load
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    department: user?.department || '',
    year: user?.year || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [club, setClub] = useState<any>(null);
  const [isClubEditing, setIsClubEditing] = useState(false);
  const [clubEditData, setClubEditData] = useState<any>({});

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) {
        setIsPageLoading(false);
        return;
      }

      setIsPageLoading(true);
      try {
        // Fetch events if not already loaded
        let currentEvents = events;
        if (events.length === 0) {
          await fetchEvents();
          // Note: We don't need to get events from store here as they'll be available on next render
        }

        // Fetch registered events
        const registrationsQuery = query(collection(db, 'eventRegistrations'), where('userId', '==', user.id));
        const registrationSnapshots = await getDocs(registrationsQuery);
        const eventIds = registrationSnapshots.docs.map(doc => doc.data().eventId);

        // Use the events from the store (they'll be updated after fetchEvents)
        if (currentEvents.length === 0) {
          // Wait a bit for events to be populated
          currentEvents = useEventStore.getState().events;
        }
        const userRegisteredEvents = currentEvents.filter(event => eventIds.includes(event.id));
        setRegisteredEvents(userRegisteredEvents);

        // Fetch certificates for the user
        const certificatesQuery = query(collection(db, 'certificates'), where('userId', '==', user.id));
        const certificatesSnapshot = await getDocs(certificatesQuery);
        const userCertificates = certificatesSnapshot.docs.map(doc => doc.data());
        setCertificates(userCertificates);

        // Fetch club data if applicable
        if (user.clubId) {
          const clubSnapshot = await getDoc(doc(db, 'clubs', user.clubId));
          if (clubSnapshot.exists()) {
            const clubData = clubSnapshot.data();
            setClub(clubData);
            setClubEditData(clubData);
          }
        }
      } catch (error) {
        toast.error("Failed to load profile data.");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadProfileData();
  }, [user]); // Only depend on user, not events or fetchEvents

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleClubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClubEditData({ ...clubEditData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.avatar && !isValidUrl(formData.avatar)) {
      newErrors.avatar = 'Please enter a valid URL';
    }

    // @ts-ignore
    if (formData.year && (isNaN(Number(formData.year)) || Number(formData.year) <= 0)) {
      newErrors.year = 'Year must be a positive number';
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

    const profileData = {
      name: formData.name,
      avatar: formData.avatar || undefined,
      department: formData.department || undefined,
      // @ts-ignore
      year: formData.year ? parseInt(formData.year) : undefined,
    };

    const success = await updateProfile(profileData);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleClubSave = async () => {
    if (!user?.clubId) return;
    await updateDoc(doc(db, 'clubs', user.clubId), {
      ...clubEditData,
      updatedAt: new Date().toISOString(),
    });
    setClub(clubEditData);
    setIsClubEditing(false);
    toast.success('Club profile updated!');
  };

  // This handles the case where the user object itself is not yet available from the auth store
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Loading User..." />
      </div>
    );
  }

  // This handles the loading of associated data like events and clubs after the user is available
  if (isPageLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Loading Profile Data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit size={16} />}
          >
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-neutral-900">Edit Profile</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Input
                    label="Full Name"
                    name="name"
                    leftIcon={<User size={16} />}
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    fullWidth
                    required
                  />

                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    leftIcon={<Mail size={16} />}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    fullWidth
                    required
                    disabled
                  />

                  <Input
                    label="Avatar URL"
                    name="avatar"
                    leftIcon={<Camera size={16} />}
                    placeholder="Enter avatar image URL"
                    value={formData.avatar}
                    onChange={handleChange}
                    error={errors.avatar}
                    helperText="Provide a URL to your profile picture"
                    fullWidth
                  />

                  {(user.role === 'student' || user.role === 'faculty') && (
                    <Input
                      label="Department"
                      name="department"
                      placeholder="Enter your department"
                      value={formData.department}
                      onChange={handleChange}
                      error={errors.department}
                      fullWidth
                    />
                  )}

                  {user.role === 'student' && (
                    <Input
                      label="Year"
                      name="year"
                      type="number"
                      placeholder="Enter your year"
                      value={formData.year}
                      onChange={handleChange}
                      error={errors.year}
                      fullWidth
                    />
                  )}
                </CardBody>
                <CardFooter className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    leftIcon={<Save size={16} />}
                    isLoading={isAuthLoading} // Use isAuthLoading for the save button's spinner
                  >
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-neutral-900">Profile Information</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-start">
                    <User className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                    <div>
                      <h3 className="font-medium text-neutral-900">Full Name</h3>
                      <p className="text-neutral-700">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                    <div>
                      <h3 className="font-medium text-neutral-900">Email</h3>
                      <p className="text-neutral-700">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Badge
                      variant={
                        user.role === 'admin' ? 'primary' :
                          user.role === 'faculty' ? 'secondary' :
                            user.role === 'club' ? 'success' : 'neutral'
                      }
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </div>

                  {user.department && (
                    <div className="flex items-start">
                      <div>
                        <h3 className="font-medium text-neutral-900">Department</h3>
                        <p className="text-neutral-700">{user.department}</p>
                      </div>
                    </div>
                  )}

                  {user.year && (
                    <div className="flex items-start">
                      <div>
                        <h3 className="font-medium text-neutral-900">Year</h3>
                        <p className="text-neutral-700">{user.year}</p>
                      </div>
                    </div>
                  )}
                </CardBody>
              </>
            )}
          </Card>

          {user.role === 'student' && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-neutral-900">My Certificates</h2>
              </CardHeader>
              <CardBody>
                {certificates.length > 0 ? (
                  <div className="space-y-4">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg border border-neutral-200"
                      >
                        <div className="flex-grow">
                          <h3 className="font-medium text-neutral-900">{cert.eventName}</h3>
                          <p className="text-sm text-neutral-500">Issued on: {format(parseISO(cert.issuedAt), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(cert.certificateUrl, '_blank')}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Award className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-neutral-700">No certificates yet</h3>
                    <p className="text-neutral-500">Attend events to earn certificates!</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900">My Registered Events</h2>
            </CardHeader>
            <CardBody>
              {registeredEvents.length > 0 ? (
                <div className="space-y-4">
                  {registeredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <div className="sm:w-32 text-center sm:text-left mb-2 sm:mb-0">
                        <div className="text-lg font-semibold text-primary-700">
                          {format(parseISO(event.startDate), 'MMM d')}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {format(parseISO(event.startDate), 'h:mm a')}
                        </div>
                      </div>

                      <div className="flex-grow">
                        <h3 className="font-medium text-neutral-900">{event.title}</h3>
                        <p className="text-sm text-neutral-500">{event.location}</p>
                      </div>

                      <div className="mt-2 sm:mt-0">
                        <Badge variant="success" size="sm">Registered</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-neutral-700">No registered events</h3>
                  <p className="text-neutral-500 mb-4">You haven't registered for any events yet.</p>
                  <Button
                    onClick={() => navigate('/events')}
                    variant="outline"
                  >
                    Browse Events
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900">Account Activity</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-neutral-900">Account Created</h3>
                  <p className="text-neutral-700">
                    {user.createdAt ? format(parseISO(user.createdAt), 'MMMM d, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="w-5 h-5 text-neutral-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium text-neutral-900">Last Updated</h3>
                  <p className="text-neutral-700">
                    {user.updatedAt ? format(parseISO(user.updatedAt), 'MMMM d, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-col items-center p-6">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-primary-700">
                    {user.name.charAt(0)}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold text-neutral-900">{user.name}</h2>
              <p className="text-neutral-500">{user.email}</p>
              <Badge
                variant={
                  user.role === 'admin' ? 'primary' :
                    user.role === 'faculty' ? 'secondary' :
                      user.role === 'club' ? 'success' : 'neutral'
                }
                className="mt-2"
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Quick Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/events')}
              >
                Browse Events
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/clubs')}
              >
                Explore Clubs
              </Button>

              {(user.role === 'admin' || user.role === 'faculty' || user.role === 'club') && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/events/create')}
                >
                  Create Event
                </Button>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-neutral-900">Account Settings</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/change-password')}
              >
                Change Password
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => toast.success('Notification settings feature coming soon!')}
              >
                Notification Settings
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => toast.success('Privacy settings feature coming soon!')}
              >
                Privacy Settings
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {user.role === 'club' && club && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-neutral-900">My Club</h2>
          </CardHeader>
          <CardBody>
            {isClubEditing ? (
              <>
                <input
                  name="name"
                  value={clubEditData.name || ''}
                  onChange={handleClubChange}
                  placeholder="Club Name"
                  className="mb-2 w-full border p-2 rounded"
                />
                <input
                  name="description"
                  value={clubEditData.description || ''}
                  onChange={handleClubChange}
                  placeholder="Description"
                  className="mb-2 w-full border p-2 rounded"
                />
                <input
                  name="facultyAdvisor"
                  value={clubEditData.facultyAdvisor || ''}
                  onChange={handleClubChange}
                  placeholder="Faculty Advisor"
                  className="mb-2 w-full border p-2 rounded"
                />
                <input
                  name="president"
                  value={clubEditData.president || ''}
                  onChange={handleClubChange}
                  placeholder="President"
                  className="mb-2 w-full border p-2 rounded"
                />
                <input
                  name="vicePresident"
                  value={clubEditData.vicePresident || ''}
                  onChange={handleClubChange}
                  placeholder="Vice President"
                  className="mb-2 w-full border p-2 rounded"
                />
                <input
                  name="phoneNo"
                  value={clubEditData.phoneNo || ''}
                  onChange={handleClubChange}
                  placeholder="Phone Number"
                  className="mb-2 w-full border p-2 rounded"
                />
                <Button onClick={handleClubSave} className="mt-2 mr-2">Save</Button>
                <Button variant="outline" onClick={() => setIsClubEditing(false)} className="mt-2">Cancel</Button>
              </>
            ) : (
              <>
                <div><b>Name:</b> {club.name}</div>
                <div><b>Description:</b> {club.description}</div>
                <div><b>Faculty Advisor:</b> {club.facultyAdvisor}</div>
                <div><b>President:</b> {club.president}</div>
                <div><b>Vice President:</b> {club.vicePresident}</div>
                <div><b>Phone:</b> {club.phoneNo}</div>
                <Button onClick={() => setIsClubEditing(true)} className="mt-2">Edit Club Profile</Button>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default Profile;
