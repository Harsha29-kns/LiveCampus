// src/pages/AdminUserManagement.tsx
import React, { useEffect, useState } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useClubStore } from '../stores/clubStore';
import Button from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CSVUploadSection from '../components/CSVUploadSection';

const AdminUserManagement: React.FC = () => {
    const { fetchUsers, deleteUser, addUser } = useAuthStore();
    const { clubs, fetchClubs, deleteClub } = useClubStore();

    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student' });

    const [editingClubId, setEditingClubId] = useState<string | null>(null);
    const [clubImageFile, setClubImageFile] = useState<File | null>(null);
    const [clubImageUrl, setClubImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchUsers().then(setUsers),
                fetchClubs()
            ]);
            setIsLoading(false);
        };
        loadData();
    }, [fetchUsers, fetchClubs]);

    const uploadToCloudinary = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'club-images'); // Make sure this preset exists in your Cloudinary account
        const res = await fetch('https://api.cloudinary.com/v1_1/ductmfmke/image/upload', { // Replace with your cloud name
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        return data.secure_url;
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        await addUser(newUser.name, newUser.email, 'defaultpassword', newUser.role);
        setNewUser({ name: '', email: '', role: 'student' });
        fetchUsers().then(setUsers);
    };

    const handleClubImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setClubImageFile(e.target.files[0]);
        }
    };

    const handleClubImageUpdate = async (clubId: string) => {
        if (!clubImageFile && !clubImageUrl) {
            toast.error("Please select an image file or provide an image URL.");
            return;
        }
        setIsUploading(true);
        try {
            let logoUrl = clubImageUrl;
            if (clubImageFile) {
                logoUrl = await uploadToCloudinary(clubImageFile);
            }
            if (logoUrl) {
                await updateDoc(doc(db, 'clubs', clubId), { logo: logoUrl });
                toast.success("Club image updated!");
                setEditingClubId(null);
                setClubImageFile(null);
                setClubImageUrl('');
                fetchClubs();
            }
        } catch (error) {
            toast.error("Failed to update club image.");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const students = users.filter(u => u.role === 'student' && u.status === 'approved');
    const clubsUsers = users.filter(u => u.role === 'club' && u.status === 'approved');
    const facultyUsers = users.filter(u => u.role === 'faculty' && u.status === 'approved');

    const handleApprove = async (userId: string, userEmail: string, userName: string) => {
        await updateDoc(doc(db, 'users', userId), { status: 'approved' });
        setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
        toast.success('User approved!');

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

    const handleReject = async (userId: string, userEmail: string, userName: string) => {
        await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
        setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'rejected' } : u));
        toast.success('User rejected!');

        try {
            await fetch('https://live-campus.vercel.app/api/send-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    name: userName,
                    rejected: true
                }),
            });
            toast.success('Rejection email sent!');
        } catch (error) {
            toast.error('Failed to send rejection email.');
        }
    };

    const handleMigration = async () => {
        if (!window.confirm("Run data migration? This will update existing events and clubs.")) return;
        setIsLoading(true);
        try {
            const { migrateData } = await import('../utils/migration');
            const result = await migrateData();
            if (result.success) {
                toast.success(`Migration completed. Updated ${result.count || 0} documents.`);
            } else {
                toast.error("Migration failed.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error during migration");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading management data..." />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-10 space-y-10">
            <h1 className="text-3xl font-bold text-primary-800 mb-6">Admin User & Club Management</h1>

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

            <Card>
                <CardBody>
                    <div className="flex items-start gap-4 mb-4">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-primary-700">Bulk Import</h3>
                            <p className="text-neutral-600 mb-2">Upload a CSV file to create clubs and link faculty members automatically.</p>
                            <div className="bg-neutral-50 p-3 rounded border text-sm text-neutral-700 font-mono">
                                <strong>Expected CSV Format:</strong><br />
                                <span className="text-neutral-500">Club Name, Club Email, Faculty ID, Faculty Name, Faculty Email</span>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <CSVUploadSection />

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
                                    <Button size="sm" variant="danger" onClick={() => handleReject(u.id, u.email, u.name)}>Reject</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                                <Button variant="danger" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
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
                                                <Button variant="danger" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
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
                                                <Button variant="danger" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
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
                                        variant="danger"
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
                                    {(!club.facultyMembers || club.facultyMembers.length === 0) && (
                                        <div className="flex items-center justify-center gap-1 text-red-500 text-xs font-semibold mt-1 bg-red-50 py-1 px-2 rounded-full border border-red-100">
                                            <AlertTriangle size={12} />
                                            <span>No Faculty Assigned</span>
                                        </div>
                                    )}
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
            <Card>
                <CardBody>
                    <h2 className="font-semibold text-lg text-primary-700 mb-4">System Maintenance</h2>
                    <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-lg border">
                        <div>
                            <h3 className="font-bold text-neutral-800">Data Migration</h3>
                            <p className="text-sm text-neutral-600">Update existing database records to support new faculty approval features.</p>
                        </div>
                        <Button onClick={handleMigration} variant="secondary">Run Migration</Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default AdminUserManagement;