import {
    Calendar, Users, MessageSquare, QrCode, CreditCard, Shield,
    Layout, Trophy, GraduationCap, CheckCircle, FileCheck,
    Upload, Globe, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { motion } from 'framer-motion';

const Features = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    const categories = [
        {
            title: "Core Event Management",
            description: "Everything you need to organize successful campus events.",
            color: "from-blue-500 to-indigo-600",
            features: [
                {
                    icon: <Calendar className="w-6 h-6" />,
                    title: "Event Creation & Management",
                    description: "Create detailed event pages with ticketing, schedules, and rich media."
                },
                {
                    icon: <QrCode className="w-6 h-6" />,
                    title: "Smart Attendance",
                    description: "Fast, secure check-ins using dynamic QR codes with proxy detection."
                },
                {
                    icon: <Layout className="w-6 h-6" />,
                    title: "Organizer Dashboard",
                    description: "Real-time analytics on registrations, revenue, and attendee demographics."
                }
            ]
        },
        {
            title: "Academic Integration",
            description: "Seamlessly connect extracurriculars with academic goals.",
            color: "from-purple-500 to-pink-600",
            features: [
                {
                    icon: <GraduationCap className="w-6 h-6" />,
                    title: "Marks & Credits",
                    description: "Award academic credits or marks directly for event participation."
                },
                {
                    icon: <Trophy className="w-6 h-6" />,
                    title: "Leaderboard",
                    description: "Gamify campus life with student and club leaderboards based on activity."
                },
                {
                    icon: <CheckCircle className="w-6 h-6" />,
                    title: "Faculty Governance",
                    description: "Dedicated workflows for faculty to review and approve event proposals."
                }
            ]
        },
        {
            title: "Security & Trust",
            description: "Built-in security for payments, data, and access.",
            color: "from-emerald-500 to-teal-600",
            features: [
                {
                    icon: <Shield className="w-6 h-6" />,
                    title: "Role-Based Access",
                    description: "Granular permissions for Students, Faculty, Admins, and Gatekeepers."
                },
                {
                    icon: <FileCheck className="w-6 h-6" />,
                    title: "Certificate Verification",
                    description: "Public verification tool to confirm the authenticity of issued certificates."
                },
                {
                    icon: <CreditCard className="w-6 h-6" />,
                    title: "Payment Verification",
                    description: "Secure tools for manual and automated verification(coming soon) of event payments."
                }
            ]
        },
        {
            title: "Community & Operations",
            description: "Tools to grow your club and streamline operations.",
            color: "from-orange-500 to-red-600",
            features: [
                {
                    icon: <Users className="w-6 h-6" />,
                    title: "Club Management",
                    description: "Manage members, roles, and showcase your club's portfolio."
                },
                {
                    icon: <Globe className="w-6 h-6" />,
                    title: "Public Events Hub",
                    description: "Public-facing pages to showcase events to the broader community."
                },
                {
                    icon: <Upload className="w-6 h-6" />,
                    title: "Bulk Data Import",
                    description: "Easily upload clubs,faculty lists and data via CSV for quick setup."
                },
                {
                    icon: <MessageSquare className="w-6 h-6" />,
                    title: "Real-time Support",
                    description: "Chat directly with attendees to resolve queries instantly."
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Hero Section */}
            <div className="relative bg-zinc-900 text-white pt-32 pb-40 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -right-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-b from-indigo-600/20 to-transparent blur-3xl"></div>
                    <div className="absolute -bottom-1/2 -left-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-6 backdrop-blur-sm">
                            The All-In-One Campus Platform
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                            More Than Just <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                Event Management
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                            A complete ecosystem connecting students, clubs, and faculty. From attendance to academic credits, we handle it all.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button size="lg" onClick={() => navigate('/register')} className="bg-white text-zinc-900 hover:bg-gray-100 border-none shadow-xl shadow-indigo-500/20 text-lg px-8 py-4">
                                Get Started <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button size="lg" variant="outline" onClick={() => navigate('/events')} className="border-zinc-700 text-white hover:bg-zinc-800 text-lg px-8 py-4">
                                Explore Events
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 -mt-20 z-20">
                <div className="space-y-24">
                    {categories.map((category, idx) => (
                        <motion.div
                            key={idx}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                            className="bg-white/80 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-white/50"
                        >
                            <div className="flex flex-col md:flex-row gap-12 items-start">
                                <div className="md:w-1/3 sticky top-24">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                                        {idx === 0 ? <Calendar /> : idx === 1 ? <GraduationCap /> : idx === 2 ? <Shield /> : <Users />}
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{category.title}</h2>
                                    <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                        {category.description}
                                    </p>
                                    <div className="hidden md:block h-1 w-24 bg-gradient-to-r from-gray-200 to-transparent rounded-full"></div>
                                </div>
                                <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {category.features.map((feature, fIdx) => (
                                        <motion.div
                                            key={fIdx}
                                            variants={itemVariants}
                                            className="group p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-600 mb-4 shadow-sm group-hover:scale-110 group-hover:text-indigo-600 transition-all duration-300`}>
                                                {feature.icon}
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                                {feature.title}
                                            </h3>
                                            <p className="text-gray-500 text-sm leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Stats / Trust Section */}
            <div className="bg-white py-24 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-indigo-600 mb-2">100%</div>
                            <div className="text-gray-500">Paperless</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-purple-600 mb-2">Secure</div>
                            <div className="text-gray-500">Role-Based Access</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-pink-600 mb-2">Real-time</div>
                            <div className="text-gray-500">Analytics</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-teal-600 mb-2">Instant</div>
                            <div className="text-gray-500">Certificates</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900 py-24 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-3xl rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-3xl rounded-full"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">
                        Ready to Transform Your Campus Experience?
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                        Join the platform that streams events, academics, and club management into one unified experience.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" onClick={() => navigate('/register')} className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-600/30 text-lg px-8 py-4">
                            Create Your Account
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => navigate('/contact')} className="border-zinc-700 text-white hover:bg-zinc-800 text-lg px-8 py-4">
                            Contact Sales
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;
