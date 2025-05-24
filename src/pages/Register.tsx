import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Mail, Lock, User, UserCheck } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
//import { useAuthStore } from '../stores/authStore';

const Register: React.FC = () => {
  const { signInWithGoogle } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (
      !/\S+@\S+\.\S+/.test(email) ||
      (!email.endsWith('@gmail.com') && !email.endsWith('@klu.ac.in'))
    ) {
      newErrors.email = 'Only Gmail or college email addresses are allowed';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const success = await register(name, email, password, role);
    
    if (success) {
      alert('Registration successful! Please check your email to verify your account before logging in.');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center">
            <Calendar className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-neutral-900">Create your account</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              leftIcon={<User size={16} />}
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              fullWidth
              required
            />
            
            <Input
              label="Email address"
              type="email"
              leftIcon={<Mail size={16} />}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              fullWidth
              required
            />
            
            <Input
              label="Password"
              type="password"
              leftIcon={<Lock size={16} />}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              fullWidth
              required
            />
            
            <Input
              label="Confirm Password"
              type="password"
              leftIcon={<Lock size={16} />}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              fullWidth
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center py-2 px-4 border ${
                    role === 'student'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                  } rounded-md shadow-sm text-sm font-medium transition-colors`}
                >
                  <UserCheck size={16} className="mr-2" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('club')}
                  className={`flex items-center justify-center py-2 px-4 border ${
                    role === 'club'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                  } rounded-md shadow-sm text-sm font-medium transition-colors`}
                >
                  <UserCheck size={16} className="mr-2" />
                  Club
                </button>
                <button
                  type="button"
                  onClick={() => setRole('faculty')}
                  className={`flex items-center justify-center py-2 px-4 border ${
                    role === 'faculty'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                  } rounded-md shadow-sm text-sm font-medium transition-colors`}
                >
                  <UserCheck size={16} className="mr-2" />
                  Faculty
                </button>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Faculty and admin accounts require approval and are created by administrators.
              </p>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>
        
        {role === 'student' && (
          <div className="mt-4">
            <Button
              onClick={async () => {
                try {
                  await signInWithGoogle();
                  navigate('/'); // or wherever you want to redirect
                } catch (error) {
                  alert('Google sign-up failed');
                }
              }}
              fullWidth
              size="lg"
              variant="outline"
              className="flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 20a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-18a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-.5 13H8v-1.5h1.5V15zm0-2.5H8v-1.5h1.5v1.5zm3 2.5h-1.5v-1.5H12v1.5zm0-2.5h-1.5v-1.5H12v1.5zm-3-8H8v1.5h1.5V7zm3 0h-1.5v1.5H12V7zm0 3h-1.5v1.5H12v-1.5z" />
              </svg>
              <span>Sign up with Google</span>
            </Button>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <p className="text-xs text-neutral-500">
            By signing up, you agree to our{' '}
            <a href="#" className="text-primary-600 hover:text-primary-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 hover:text-primary-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;