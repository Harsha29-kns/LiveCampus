import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Mail, Lock } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login, isLoading, signInWithGoogle } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result === 'change-password') {
      navigate('/change-password');
    } else if (result === true) {
      navigate('/'); // or your dashboard
    }
    // handle errors as needed
  };

  const handleGoogleSignIn = async () => {
    const success = await signInWithGoogle();
    if (success) {
      navigate('/'); // ✅ This is your dashboard route (see App.tsx)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center">
            <Calendar className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-neutral-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Or{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              fullWidth
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="/forgot-password" className="text-blue-600 hover:underline">
                Forgot Password?
              </a>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-neutral-500">
              Or sign in with
            </span>
          </div>
        </div>

        <div>
          <Button
            onClick={handleGoogleSignIn}
            fullWidth
            size="lg"
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.293 11.293a1 1 0 01-1.414 0L10 10.414l-1.879 1.879a1 1 0 01-1.414-1.414l2.586-2.586a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414z" />
            </svg>
            <span>Sign in with Google</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;