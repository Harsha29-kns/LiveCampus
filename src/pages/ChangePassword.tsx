import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import bcrypt from 'bcryptjs';

const ChangePassword: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!user) {
      setError('User not found.');
      return;
    }

    setIsSaving(true);
    try {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, 10);
      await updateDoc(doc(db, 'users', user.id), { password: hashedPassword });
      await logout();
      alert('Password changed successfully! Please log in with your new password.');
      navigate('/login');
    } catch (err) {
      setError('Failed to change password. Please try again.');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" fullWidth isLoading={isSaving}>
            Change Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;