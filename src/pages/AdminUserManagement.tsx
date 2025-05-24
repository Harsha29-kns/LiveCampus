import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useClubStore } from '../stores/clubStore';
import Button from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';

const AdminUserManagement: React.FC = () => {
  const { fetchUsers, deleteUser, addUser } = useAuthStore();
  const { clubs, fetchClubs, deleteClub } = useClubStore();

  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student' });

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

  // Filter users by role
  const students = users.filter(u => u.role === 'student');
  const clubsUsers = users.filter(u => u.role === 'club');
  const facultyUsers = users.filter(u => u.role === 'faculty');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin Management</h1>

      {/* Students */}
      <Card>
        <CardBody>
          <h3 className='font-semibold mb-2'>ADD USERS</h3>
          <form onSubmit={handleAddUser} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              className="border px-2 py-1 rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              className="border px-2 py-1 rounded"
              required
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              className="border px-2 py-1 rounded"
            >
              <option value="student">Student</option>
              <option value="club">Club</option>
              <option value="faculty">Faculty</option>
            </select>
            <Button type="submit" size="sm" variant="primary">Add User</Button>
          </form>
          <h2 className="font-semibold mb-2">Students</h2>
          <table className="min-w-full text-left mb-4">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b">Name</th>
                <th className="px-2 py-1 border-b">Email</th>
                <th className="px-2 py-1 border-b">Created At</th>
                <th className="px-2 py-1 border-b">Password</th>
                <th className="px-2 py-1 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map(user => (
                <tr key={user.id}>
                  <td className="px-2 py-1 border-b">{user.name}</td>
                  <td className="px-2 py-1 border-b">{user.email}</td>
                  <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-2 py-1 border-b">{user.password || '-'}</td>
                  <td className="px-2 py-1 border-b">
                    <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Clubs */}
      <Card>
        <CardBody>
          <h2 className="font-semibold mb-2">Clubs</h2>
          <ul>
            {clubs.map(club => (
              <li key={club.id} className="flex justify-between items-center border-b py-2">
                <span>{club.name}</span>
                <Button variant="error" size="sm" onClick={() => { deleteClub(club.id); fetchClubs(); }}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          <h3 className="font-semibold mt-4 mb-2">Club Users</h3>
          <table className="min-w-full text-left mb-4">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b">Name</th>
                <th className="px-2 py-1 border-b">Email</th>
                <th className="px-2 py-1 border-b">Created At</th>
                <th className="px-2 py-1 border-b">Password</th>
                <th className="px-2 py-1 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {clubsUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-2 py-1 border-b">{user.name}</td>
                  <td className="px-2 py-1 border-b">{user.email}</td>
                  <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-2 py-1 border-b">{user.password || '-'}</td>
                  <td className="px-2 py-1 border-b">
                    <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Faculty */}
      <Card>
        <CardBody>
          <h2 className="font-semibold mb-2">Faculty Users</h2>
          <table className="min-w-full text-left mb-4">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b">Name</th>
                <th className="px-2 py-1 border-b">Email</th>
                <th className="px-2 py-1 border-b">Created At</th>
                <th className="px-2 py-1 border-b">Password</th>
                <th className="px-2 py-1 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {facultyUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-2 py-1 border-b">{user.name}</td>
                  <td className="px-2 py-1 border-b">{user.email}</td>
                  <td className="px-2 py-1 border-b">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-2 py-1 border-b">{user.password || '-'}</td>
                  <td className="px-2 py-1 border-b">
                    <Button variant="error" size="sm" onClick={() => { deleteUser(user.id); fetchUsers().then(setUsers); }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminUserManagement;