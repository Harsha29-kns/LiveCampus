import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';

const ChangePassword: React.FC = () => {
  const { changePassword, isLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!user.mustChangePassword) {
      // If user doesn't need to change password, redirect to home
      // navigate('/');
      // Actually, maybe they came here voluntarily?
      // If voluntary, stay.
      // But if this page is used for mandatory change, maybe distinct?
      // I'll allow voluntary change too.
    }
  }, [user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const success = await changePassword(password);
    if (success) {
      navigate('/dashboard'); // Redirect to dashboard
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-orange-100 p-3 rounded-full">
            <Lock className="h-10 w-10 text-orange-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Change Password
        </h2>
        {user.mustChangePassword && (
          <p className="mt-2 text-center text-sm text-red-600 font-medium bg-red-50 p-2 rounded">
            For security reasons, you must change your password before proceeding.
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardBody>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <Input
                id="password"
                type="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
                leftIcon={<Lock size={16} />}
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                leftIcon={<Lock size={16} />}
              />

              <div>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  variant="primary"
                >
                  Update Password & Continue
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;