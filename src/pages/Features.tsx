
import {
    Calendar, Users, MessageSquare, Award, QrCode, CreditCard, Shield,
    Layout, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const Features = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <Calendar className="w-8 h-8 text-indigo-600" />,
            title: "Event Management",
            description: "Create, browse, and manage campus events with ease. Supports both free and paid events with detailed analytics."
        },
        {
            icon: <Users className="w-8 h-8 text-purple-600" />,
            title: "Club Management",
            description: "Comprehensive tools for clubs to manage members, events, and approvals. specialized workflows for faculty advisors."
        },
        {
            icon: <MessageSquare className="w-8 h-8 text-blue-600" />,
            title: "Real-time Support",
            description: "Instant support ticketing system with real-time chat between students and club organizers."
        },
        {
            icon: <Award className="w-8 h-8 text-yellow-600" />,
            title: "Digital Certificates",
            description: "Automated certificate generation for attendees. Secure, verifiable, and distributed instantly via email."
        },
        {
            icon: <QrCode className="w-8 h-8 text-green-600" />,
            title: "Smart Attendance",
            description: "Fast and secure attendance tracking using dynamic QR codes. Detects proxy attendance and supports team check-ins."
        },
        {
            icon: <CreditCard className="w-8 h-8 text-pink-600" />,
            title: "Secure Payments-Coming Soon and  now used normal payment",
            description: "Integrated UPI payment gateway for paid events with automated verification and transaction tracking."
        },
        {
            icon: <Shield className="w-8 h-8 text-red-600" />,
            title: "Role-Based Access",
            description: "Granular permission system for Students, Faculty, Club Admins, and Gatekeepers to ensure security."
        },
        {
            icon: <Smartphone className="w-8 h-8 text-teal-600" />,
            title: "Mobile Friendly",
            description: "Fully responsive design that works perfectly on all devices, from desktops to mobile phones."
        },
        {
            icon: <Layout className="w-8 h-8 text-orange-600" />,
            title: "Interactive Dashboard",
            description: "Personalized dashboards for all users to track registrations, tickets, and event updates."
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 text-white py-24 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in">
                        Powerful Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Campus Life</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto mb-10">
                        Everything you need to manage events, clubs, and student activities in one seamless platform.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button size="lg" onClick={() => navigate('/register')} className="bg-white text-indigo-900 hover:bg-gray-100 border-none shadow-xl">
                            Get Started
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => navigate('/events')} className="border-white text-white hover:bg-white/10">
                            Browse Events
                        </Button>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-10 z-20 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group"
                        >
                            <div className="bg-gray-50 rounded-xl p-3 w-fit mb-6 group-hover:bg-indigo-50 transition-colors">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Call to Action */}
            <div className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-indigo-50 rounded-3xl p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-100 rounded-full opacity-50 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-100 rounded-full opacity-50 blur-3xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to experience the future of campus events?</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                                Join thousands of students and organizers who are already using LiveCampus to streamline their activities.
                            </p>
                            <Button size="lg" onClick={() => navigate('/register')}>
                                Join LiveCampus Now
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;
