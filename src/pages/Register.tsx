import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Check } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
import toast from 'react-hot-toast';

// A proper SVG icon for Google
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,36.218,44,30.556,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const Register: React.FC = () => {
    // --- All original state, hooks, and logic are preserved ---
    const { register, signInWithGoogle, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // This function's logic remains unchanged
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email) || (!email.endsWith('@gmail.com') && !email.endsWith('@klu.ac.in'))) {
            newErrors.email = 'Only Gmail or klu.ac.in emails are allowed';
        }
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const success = await register(name, email, password, role);
        if (success) {
            toast.success('Registration successful! Awaiting admin approval.');
            navigate('/login');
        }
    };

    const handleGoogleSignIn = async () => {
        const success = await signInWithGoogle();
        if (success) {
            toast.success('Registration successful! Awaiting admin approval.');
            navigate('/login');
        }
    };

    const RoleCard = ({ value, label, icon, description }: { value: UserRole, label: string, icon: React.ReactNode, description: string }) => (
        <button
            type="button"
            onClick={() => setRole(value)}
            className={`relative text-left p-4 border rounded-lg transition-all duration-200 w-full ${role === value ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md' : 'border-gray-300 hover:border-gray-400'}`}
        >
            {role === value && <span className="absolute top-2 right-2 p-1 bg-indigo-500 rounded-full"><Check size={12} className="text-white" /></span>}
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold text-gray-800">{label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{description}</p>
        </button>
    );

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* --- Left Column (Branding) --- */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-slate-900 text-white p-12">
                <div className="w-full max-w-md">
                    <Link to="/" className="inline-block mb-8">
                        <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-16 w-16" />
                    </Link>
                    <h1 className="text-4xl font-bold tracking-tight">Join the Campus Community</h1>
                    <p className="mt-4 text-lg text-slate-300">
                        Sign up to discover events, join clubs, and get the most out of your college experience.
                    </p>
                    <ul className="mt-8 space-y-4 text-slate-300">
                        <li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" /><span>Never miss an event with real-time notifications.</span></li>
                        <li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" /><span>Explore and join clubs that match your interests.</span></li>
                        <li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" /><span>Manage your own club events and attendance seamlessly.</span></li>
                    </ul>
                </div>
            </div>

            {/* --- Right Column (Form) --- */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-md w-full space-y-6">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900">Create an Account</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    {/* Role selection removed - defaulting to Student */}


                    {/* --- THIS IS THE UPDATED SECTION --- */}
                    {/* Conditionally render the Google Sign-In button only for students */}
                    {role === 'student' && (
                        <>
                            <Button onClick={handleGoogleSignIn} fullWidth size="lg" variant="outline" isLoading={isLoading}>
                                <GoogleIcon /> <span className="ml-3">Sign up with Google</span>
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 text-gray-500">Or sign up with email</span></div>
                            </div>
                        </>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                        <Input label="Full Name" type="text" id="name" leftIcon={<User size={16} />} placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
                        <Input label="Email address" type="email" id="email" leftIcon={<Mail size={16} />} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
                        <Input label="Password" type="password" id="password" leftIcon={<Lock size={16} />} placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
                        <Input label="Confirm Password" type="password" id="confirmPassword" leftIcon={<Lock size={16} />} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} required />

                        <div>
                            <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                                Create Account
                            </Button>
                        </div>
                    </form>

                    <p className="text-xs text-center text-gray-500">
                        By signing up, you agree to our{' '}
                        <Link to="/terms" className="underline hover:text-gray-700">Terms of Service</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
