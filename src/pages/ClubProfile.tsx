import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { db } from '../firebaseConfig';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const ClubProfile: React.FC<{ onClose?: () => void; onSave?: () => void }> = ({ onClose, onSave }) => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [clubData, setClubData] = useState({
    name: '',
    facultyAdvisor: '',
    president: '',
    vicePresident: '',
    phoneNo: '',
    logo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClubData({ ...clubData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user?.id) {
      alert('User ID not found!');
      return;
    }
    // Create or update the club document
    const clubDocRef = doc(db, 'clubs', user.id);
    await setDoc(clubDocRef, {
      ...clubData,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await updateDoc(doc(db, 'users', user.id), { clubId: user.id });

    // Fetch the club document and update the user store and localStorage
    const clubSnap = await getDoc(clubDocRef);
    if (clubSnap.exists()) {
      const updatedUser = { ...user, clubId: user.id, club: clubSnap.data() };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser)); // <-- Make sure this is here!
    }

    if (onSave) onSave();
    if (onClose) onClose();
    // Optionally: navigate('/');
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Complete Your Club Profile</h2>
      <input name="name" value={clubData.name} onChange={handleChange} placeholder="Club Name" className="mb-2 w-full border p-2 rounded" required />
      <input name="facultyAdvisor" value={clubData.facultyAdvisor} onChange={handleChange} placeholder="Faculty Advisor" className="mb-2 w-full border p-2 rounded" required />
      <input name="president" value={clubData.president} onChange={handleChange} placeholder="President" className="mb-2 w-full border p-2 rounded" required />
      <input name="vicePresident" value={clubData.vicePresident} onChange={handleChange} placeholder="Vice President" className="mb-2 w-full border p-2 rounded" required />
      <input name="phoneNo" value={clubData.phoneNo} onChange={handleChange} placeholder="Phone Number" className="mb-2 w-full border p-2 rounded" required />
      <button onClick={handleSave} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded">Save</button>
      {onClose && <button onClick={onClose} className="mt-4 ml-2 bg-gray-300 text-gray-700 px-4 py-2 rounded">Close</button>}
    </div>
  );
};

export default ClubProfile;