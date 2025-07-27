import { addDoc, collection, doc, updateDoc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useClubStore } from '../stores/clubStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { User, Users, Phone, BookOpen, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner'; 

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

const CreateClub = () => {
  const [clubData, setClubData] = useState({
    name: '',
    description: '',
    presidentId: '',
    vicePresidentId: '',
    facultyAdvisorId: '',
    phoneNo: '',
    image: '', 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [isLoading, setIsLoading] = useState(true); // For initial data fetch
  const [users, setUsers] = useState<UserOption[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { fetchClubs } = useClubStore.getState();

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserOption)));

        if (isEditMode && id) {
          const docRef = doc(db, 'clubs', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setClubData({
              name: data.name || '',
              description: data.description || '',
              presidentId: data.presidentId || '',
              vicePresidentId: data.vicePresidentId || '',
              facultyAdvisorId: data.facultyAdvisorId || '',
              phoneNo: data.phoneNo || '',
              image: data.logo || '', 
            });
          } else {
            toast.error("Club not found.");
            navigate('/clubs');
          }
        }
      } catch (error) {
        toast.error("Failed to load necessary data.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [id, isEditMode, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClubData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'club-images'); // Set this in Cloudinary dashboard

    const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.secure_url; // This is the image URL
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Get user names for display
      const president = users.find(u => u.id === clubData.presidentId)?.name || '';
      const vicePresident = users.find(u => u.id === clubData.vicePresidentId)?.name || '';
      const facultyAdvisor = users.find(u => u.id === clubData.facultyAdvisorId)?.name || '';

      let imageUrl = clubData.image || '';
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      if (isEditMode && id) {
        // Update existing club
        await updateDoc(doc(db, 'clubs', id), {
          name: clubData.name,
          description: clubData.description,
          president,
          presidentId: clubData.presidentId,
          vicePresident,
          vicePresidentId: clubData.vicePresidentId,
          facultyAdvisor,
          facultyAdvisorId: clubData.facultyAdvisorId,
          phoneNo: clubData.phoneNo,
          logo: imageUrl,
          updatedAt: new Date().toISOString(),
        });
        await fetchClubs();
        toast.success('Club updated!');
        navigate(`/clubs/${id}`);
      } else {
        // Create club with user IDs, names, and image URL
        const docRef = await addDoc(collection(db, 'clubs'), {
          name: clubData.name,
          description: clubData.description,
          president,
          presidentId: clubData.presidentId,
          vicePresident,
          vicePresidentId: clubData.vicePresidentId,
          facultyAdvisor,
          facultyAdvisorId: clubData.facultyAdvisorId,
          phoneNo: clubData.phoneNo,
          logo: imageUrl,
          memberCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        
        try {
          await Promise.all([
            updateDoc(doc(db, 'users', clubData.presidentId), { clubId: docRef.id }),
            updateDoc(doc(db, 'users', clubData.vicePresidentId), { clubId: docRef.id }),
            updateDoc(doc(db, 'users', clubData.facultyAdvisorId), { clubId: docRef.id }),
          ]);
        } catch (err) {
          console.error('Failed to update clubId for users:', err);
          toast.error('Failed to link club to users!');
        }

        await fetchClubs();
        toast.success('Club created and linked to users!');
        navigate(`/clubs/${docRef.id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(isEditMode ? 'Failed to update club' : 'Failed to create club');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'clubs', id));
      toast.success('Club deleted!');
      navigate('/clubs');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete club');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Conditionally render the loading spinner while fetching initial data.
  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <LoadingSpinner size="lg" text={isEditMode ? "Loading club data..." : "Loading form..."} />
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-primary-800 flex items-center">
            <Users className="w-7 h-7 mr-2 text-primary-600" />
            {isEditMode ? 'Edit Club' : 'Create a New Club'}
          </h2>
          <p className="text-neutral-600 mt-2">
            {isEditMode
              ? 'Update the details below to edit this club.'
              : "Fill in the details below to register a new club. All fields are required."
            }
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="name">
                Club Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={clubData.name}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="e.g. Robotics Club"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="description">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                value={clubData.description}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="Describe your club's mission and activities"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="logo">
                <ImageIcon className="inline w-4 h-4 mr-1 text-primary-500" />
                Club Logo/Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full border border-neutral-300 rounded-md px-3 py-2"
              />
              {imageFile && (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="mt-2 h-24 rounded shadow"
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="presidentId">
                  <User className="inline w-4 h-4 mr-1 text-primary-500" />
                  President
                </label>
                <select
                  name="presidentId"
                  id="presidentId"
                  value={clubData.presidentId}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select President</option>
                  {users.filter(u => u.role === 'club').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="vicePresidentId">
                  <User className="inline w-4 h-4 mr-1 text-primary-500" />
                  Vice President
                </label>
                <select
                  name="vicePresidentId"
                  id="vicePresidentId"
                  value={clubData.vicePresidentId}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Vice President</option>
                  {users.filter(u => u.role === 'club').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="facultyAdvisorId">
                  <BookOpen className="inline w-4 h-4 mr-1 text-primary-500" />
                  Faculty Advisor
                </label>
                <select
                  name="facultyAdvisorId"
                  id="facultyAdvisorId"
                  value={clubData.facultyAdvisorId}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Faculty Advisor</option>
                  {users.filter(u => u.role === 'faculty').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="phoneNo">
                  <Phone className="inline w-4 h-4 mr-1 text-primary-500" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="phoneNo"
                  id="phoneNo"
                  value={clubData.phoneNo}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="px-8"
              >
                {isEditMode ? 'Update Club' : 'Create Club'}
              </Button>
              {isEditMode && (
                <Button
                  type="button"
                  variant="danger"
                  size="lg"
                  onClick={handleDelete}
                  isLoading={isSubmitting}
                  className="px-8"
                >
                  Delete Club
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default CreateClub;