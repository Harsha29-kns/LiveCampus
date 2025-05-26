import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useClubStore } from '../stores/clubStore';
import Button from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebaseConfig';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AdminUserManagement: React.FC = () => {
  const { fetchUsers, deleteUser, addUser } = useAuthStore();
  const { clubs, fetchClubs, deleteClub } = useClubStore();

  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student' });

  // For club image editing
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [clubImageFile, setClubImageFile] = useState<File | null>(null);
  const [clubImageUrl, setClubImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers);
    fetchClubs();
  }, [fetchUsers, fetchClubs]);

  // Add User Handler
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await addUser(newUser.name, newUser.email, 'defaultpassword', newUser.role);
    setNewUser({ name: '', email: '', role: 'student' });
    fetchUsers().then(setUsers);
  };

  // Club image upload logic
  const handleClubImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setClubImageFile(e.target.files[0]);
    }
  };

  const handleClubImageUpdate = async (clubId: string) => {
    setIsUploading(true);
    let logoUrl = clubImageUrl;
    try {
      if (clubImageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `clubs/${Date.now()}_${clubImageFile.name}`);
        await uploadBytes(storageRef, clubImageFile);
        logoUrl = await getDownloadURL(storageRef);
      }
      if (logoUrl) {
        await updateDoc(doc(db, 'clubs', clubId), { logo: logoUrl });
        setEditingClubId(null);
        setClubImageFile(null);
        setClubImageUrl('');
        fetchClubs();
      }
    } catch (err) {
      alert('Failed to update club image');
    }
    setIsUploading(false);
  };

  // Filter users by role
  const students = users.filter(u => u.role === 'student');
  const clubsUsers = users.filter(u => u.role === 'club' && u.status === 'approved');
  const facultyUsers = users.filter(u => u.role === 'faculty' && u.status === 'approved');

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    };
    fetchUsers();
  }, []);

  // Approve user
  const handleApprove = async (userId: string, userEmail: string, userName: string) => {
    // 1. Approve the user in Firestore
    await updateDoc(doc(db, 'users', userId), { status: 'approved' });
    setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
    toast.success('User approved!');

    // 2. Call your Vercel API to send the approval email
    try {
      await fetch('https://live-campus.vercel.app/api/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName }),
      });
      toast.success('Approval email sent!');
    } catch (error) {
      toast.error('Failed to send approval email.');
    }
  };

  // Reject user
  const handleReject = async (userId: string, userEmail: string, userName: string) => {
    // 1. Update user status in Firestore
    await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
    setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'rejected' } : u));
    toast.success('User rejected!');

    // 2. Call your Vercel API to send the rejection email
    try {
      await fetch('https://live-campus.vercel.app/api/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          rejected: true // Add a flag to indicate rejection
        }),
      });
      toast.success('Rejection email sent!');
    } catch (error) {
      toast.error('Failed to send rejection email.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      <h1 className="text-3xl font-bold text-primary-800 mb-6">Admin User & Club Management</h1>

      {/* Add User */}
      <Card>
        <CardBody>
          <h3 className="font-semibold text-lg mb-4 text-primary-700">Add New User</h3>
          <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              className="border px-3 py-2 rounded w-full md:w-1/4"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              className="border px-3 py-2 rounded w-full md:w-1/4"
              required
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              className="border px-3 py-2 rounded w-full md:w-1/4"
            >
              <option value="student">Student</option>
              <option value="club">Club</option>
              <option value="faculty">Faculty</option>
            </select>
            <Button type="submit" size="md" variant="primary" className="w-full md:w-auto">Add User</Button>
          </form>
        </CardBody>
      </Card>

      {/* Pending Approvals */}
      <Card>
        <CardBody>
          <h2 className="text-xl font-bold mb-2">Pending Approvals</h2>
          {users.filter(u => u.status === 'pending').length === 0 ? (
            <div className="text-neutral-500">No pending users.</div>
          ) : (
            <ul>
              {users.filter(u => u.status === 'pending').map(u => (
                <li key={u.id} className="flex items-center gap-4 mb-2">
                  <span>{u.name} ({u.email}) - {u.role}</span>
                  <Button size="sm" onClick={() => handleApprove(u.id, u.email, u.name)}>Approve</Button>
                  <Button size="sm" variant="error" onClick={() => handleReject(u.id, u.email, u.name)}>Reject</Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Users by Role */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Students */}
        <Card>
          <CardBody>
            <h2 className="font-semibold text-primary-700 mb-2">Students</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left mb-2">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">Name</th>
                    <th className="px-2 py-1 border-b">Email</th>
                    <th className="px-2 py-1 border-b">Created At</th>
                    <th className="px-2 py-1 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(user => (
                    <tr key={user.id}>
                      <td className="px-2 py-1 border-b">{user.name}</td>
                      <td className="px-2 py-1 border-b">{user.email}</td>
                      <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                      <td className="px-2 py-1 border-b">
                        <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Club Users */}
        <Card>
          <CardBody>
            <h2 className="font-semibold text-primary-700 mb-2">Club Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left mb-2">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">Name</th>
                    <th className="px-2 py-1 border-b">Email</th>
                    <th className="px-2 py-1 border-b">Created At</th>
                    <th className="px-2 py-1 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clubsUsers.map(user => (
                    <tr key={user.id}>
                      <td className="px-2 py-1 border-b">{user.name}</td>
                      <td className="px-2 py-1 border-b">{user.email}</td>
                      <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                      <td className="px-2 py-1 border-b">
                        <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Faculty Users */}
        <Card>
          <CardBody>
            <h2 className="font-semibold text-primary-700 mb-2">Faculty Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left mb-2">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">Name</th>
                    <th className="px-2 py-1 border-b">Email</th>
                    <th className="px-2 py-1 border-b">Created At</th>
                    <th className="px-2 py-1 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyUsers.map(user => (
                    <tr key={user.id}>
                      <td className="px-2 py-1 border-b">{user.name}</td>
                      <td className="px-2 py-1 border-b">{user.email}</td>
                      <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                      <td className="px-2 py-1 border-b">
                        <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Clubs List */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-lg text-primary-700 mb-4">Clubs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map(club => (
              <div
                key={club.id}
                className="flex flex-col items-center bg-white border rounded-xl shadow p-6 relative"
              >
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingClubId(club.id)}
                  >
                    Edit Image
                  </Button>
                  <Button
                    variant="error"
                    size="sm"
                    onClick={() => { deleteClub(club.id); fetchClubs(); }}
                  >
                    Delete
                  </Button>
                </div>
                <div className="mb-3">
                  <div className="h-20 w-20 rounded-full bg-neutral-100 border flex items-center justify-center overflow-hidden">
                    {club.logo ? (
                      <img
                        src={club.logo}
                        alt="logo"
                        className="h-20 w-20 object-cover"
                      />
                    ) : (
                      <span className="text-neutral-400 text-4xl">🏷️</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{club.name}</div>
                  <div className="text-neutral-500 text-sm mb-2">{club.description}</div>
                </div>
                {editingClubId === club.id && (
                  <div className="w-full mt-4 flex flex-col gap-2 items-center bg-neutral-50 p-3 rounded-lg border">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleClubImageChange}
                      className="border px-2 py-1 rounded w-full"
                    />
                    <span className="text-sm text-neutral-500">or</span>
                    <input
                      type="url"
                      placeholder="Paste image URL"
                      value={clubImageUrl}
                      onChange={e => setClubImageUrl(e.target.value)}
                      className="border px-2 py-1 rounded w-full"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={isUploading}
                        onClick={() => handleClubImageUpdate(club.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingClubId(null);
                          setClubImageFile(null);
                          setClubImageUrl('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {clubs.length === 0 && (
              <div className="text-neutral-500 text-center py-8 col-span-full">No clubs found.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminUserManagement;