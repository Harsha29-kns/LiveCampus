import React, { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../firebaseConfig'; // Make sure this path is correct
import { useAuthStore } from '../stores/authStore'; // Make sure this path is correct
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Import the spinner component

// Define a type for our club data for better type safety
interface ClubData {
  name: string;
  facultyAdvisor: string;
  president: string;
  vicePresident: string;
  phoneNo: string;
  logo: string; // This is a URL to the logo, assuming you handle upload elsewhere
}

// Initial state for the form
const initialState: ClubData = {
  name: '',
  facultyAdvisor: '',
  president: '',
  vicePresident: '',
  phoneNo: '',
  logo: '',
};

const ClubProfile: React.FC<{ onClose?: () => void; onSave?: () => void }> = ({ onClose, onSave }) => {
  const { user, setUser } = useAuthStore();
  const [clubData, setClubData] = useState<ClubData>(initialState);
  
  // State for initial data loading and for the save operation
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. FETCH EXISTING DATA ON COMPONENT LOAD ---
  useEffect(() => {
    const fetchClubData = async () => {
      // Only fetch if we have a user with a linked clubId
      if (user?.clubId) {
        try {
          const clubDocRef = doc(db, 'clubs', user.clubId);
          const clubSnap = await getDoc(clubDocRef);
          if (clubSnap.exists()) {
            // Set the form state with existing data
            setClubData(clubSnap.data() as ClubData);
          }
        } catch (error) {
          console.error("Failed to fetch club data:", error);
          toast.error("Couldn't load your club data.");
        }
      }
      setIsLoading(false); // Stop loading once done
    };

    fetchClubData();
  }, [user]); // This effect runs when the user object is available

  // --- 2. HANDLE FORM INPUT CHANGES ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClubData({ ...clubData, [e.target.name]: e.target.value });
  };

  // --- 3. HANDLE THE SAVE ACTION ---
  const handleSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save!');
      return;
    }

    // Basic validation
    if (!clubData.name || !clubData.president) {
      toast.error('Please fill in at least the Club Name and President.');
      return;
    }
    
    setIsSaving(true);
    try {
      // Use a batch for atomic writes
      const batch = writeBatch(db);

      const clubDocRef = doc(db, 'clubs', user.id);
      batch.set(clubDocRef, { 
        ...clubData,
        createdBy: user.id, // Ensure creator is tracked
        updatedAt: new Date().toISOString()
       }, { merge: true });

      const userDocRef = doc(db, 'users', user.id);
      batch.update(userDocRef, { clubId: user.id });

      // Commit both writes at once
      await batch.commit();

      // Update the global user state
      const updatedUser = { ...user, clubId: user.id, club: clubData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Profile saved successfully!');

      if (onSave) onSave();
      if (onClose) onClose();

    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false); // Re-enable the button
    }
  };

  // --- 4. RENDER THE COMPONENT ---
  // Use the LoadingSpinner component for a better visual loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="lg" text="Loading Club Profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Club Profile</h2>
      
      <div className="space-y-4">
        <input name="name" value={clubData.name} onChange={handleChange} placeholder="Club Name" className="w-full border p-2 rounded" required />
        <input name="facultyAdvisor" value={clubData.facultyAdvisor} onChange={handleChange} placeholder="Faculty Advisor" className="w-full border p-2 rounded" required />
        <input name="president" value={clubData.president} onChange={handleChange} placeholder="President" className="w-full border p-2 rounded" required />
        <input name="vicePresident" value={clubData.vicePresident} onChange={handleChange} placeholder="Vice President" className="w-full border p-2 rounded" />
        <input type="tel" name="phoneNo" value={clubData.phoneNo} onChange={handleChange} placeholder="Contact Phone Number" className="w-full border p-2 rounded" />
      </div>

      <div className="mt-6 flex items-center justify-end space-x-4">
        {onClose && (
          <button onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
        )}
        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};

export default ClubProfile;