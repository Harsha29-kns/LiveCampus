import React, { useState, Fragment, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Toaster } from 'react-hot-toast';
import { Home, Calendar, Users, Shield, LogOut, Menu, X, BarChart, Award, ClipboardCheck, DollarSign, Building, Trophy, Settings, QrCode, Bell } from 'lucide-react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';


const DashboardLayout: React.FC = () => {
    const { user, logout } = useAuthStore();
    const { fetchNotifications, unreadCount, notifications, markAsRead } = useNotificationStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    const notificationsRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (user) {
            fetchNotifications(user.id);
        }
    }, [fetchNotifications, user]);

    useEffect(() => {
        setSidebarOpen(false); // Close mobile sidebar on navigation
    }, [location.pathname]);
    

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [notificationsRef]);


    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    
    const handleNotificationClick = (notificationId: string) => {
        markAsRead(notificationId);
        setNotificationsOpen(false); 
    };
    
    // Dynamically set the profile link and other UI elements based on user role
    const profileLink = user?.role === 'club' ? '/club-profile' : '/profile';
    const profileIcon = user?.role === 'club' ? <Building size={22} /> : <Users size={22} />;
    const profileLabel = user?.role === 'club' ? 'Club Profile' : 'My Profile';

    const baseMenuItems = [
        { to: '/', icon: <Home size={22} />, label: 'Dashboard', roles: ['admin', 'faculty', 'student', 'club'] },
        { to: '/events', icon: <Calendar size={22} />, label: 'Events', roles: ['admin', 'faculty', 'student', 'club'] },
        { to: '/clubs', icon: <Users size={22} />, label: 'Clubs', roles: ['admin', 'faculty', 'student', 'club'] },
        { to: profileLink, icon: profileIcon, label: profileLabel, roles: ['admin', 'faculty', 'student', 'club'] },
        { to: '/leaderboard', icon: <Trophy size={22} />, label: 'Leaderboard', roles: ['admin', 'faculty', 'student', 'club'] },
    ];

    const roleSpecificItems = {
        admin: [
            { to: '/admin/users', icon: <Settings size={22} />, label: 'Admin Panel', roles: ['admin'] },
            { to: '/admin/verify-payments', icon: <DollarSign size={22} />, label: 'Verify Payments', roles: ['admin'] }
        ],
        club: [
            { to: '/attendance', icon: <ClipboardCheck size={22} />, label: 'Attendance', roles: ['club', 'faculty'] },
            { to: '/marks', icon: <BarChart size={22} />, label: 'Marks', roles: ['club', 'faculty'] }
        ],
        faculty: [
            { to: '/attendance', icon: <ClipboardCheck size={22} />, label: 'Attendance', roles: ['club', 'faculty'] },
            { to: '/marks', icon: <BarChart size={22} />, label: 'Marks', roles: ['club', 'faculty'] }
        ]
    };
    
    const menuItems = [
        ...baseMenuItems,
        ...(user ? roleSpecificItems[user.role] || [] : [])
    ].filter(item => user && item.roles.includes(user.role));


    const NavLinks = ({ inMobileSidebar = false }) => (
        <nav className={`flex flex-col ${inMobileSidebar ? 'space-y-2 p-4' : 'px-2 pt-4 space-y-1'}`}>
            {menuItems.map((item) => (
                <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                        `flex items-center p-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200
                        ${inMobileSidebar ? 'text-base' : ''}
                        ${isActive ? 'bg-indigo-600 text-white shadow-inner' : ''}`
                    }
                >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <span className={`ml-4 text-sm font-medium ${inMobileSidebar ? 'inline-block' : 'opacity-0 group-hover:opacity-100 group-hover:inline-block transition-opacity duration-200 delay-100'}`}>
                        {item.label}
                    </span>
                </NavLink>
            ))}
        </nav>
    );
    
    const UserProfileSection = ({ inMobileSidebar = false }) => (
        <div className={`mt-auto ${inMobileSidebar ? 'p-4 border-t border-slate-700' : 'p-2'}`}>
            <div className="group flex items-center p-3 rounded-lg hover:bg-slate-700 transition-all duration-200">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-white font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div className={`ml-4 flex-1 ${inMobileSidebar ? 'inline-block' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100'}`}>
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.role}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className={`ml-2 text-slate-400 hover:text-white ${inMobileSidebar ? 'inline-block' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100'}`}
                    aria-label="Log out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex">
            <Toaster position="top-center" />

            {/* --- Static Sidebar for Desktop --- */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <div className="group flex flex-col w-20 hover:w-64 bg-slate-800 shadow-xl transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-center h-20 flex-shrink-0">
                        <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <NavLinks />
                        <UserProfileSection />
                    </div>
                </div>
            </div>

            {/* --- Mobile Sidebar (with backdrop) --- */}
            <Transition show={sidebarOpen} as={Fragment}>
                <Dialog className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                    <TransitionChild
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/80" />
                    </TransitionChild>

                    <div className="fixed inset-0 flex">
                        <TransitionChild
                            as={Fragment}
                            enter="transition ease-in-out duration-300 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in-out duration-300 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
                                <TransitionChild
                                    as={Fragment}
                                    enter="ease-in-out duration-300"
                                    enterFrom="opacity-0"
                                    enterTo="opacity-100"
                                    leave="ease-in-out duration-300"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                        <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                                            <X className="h-6 w-6 text-white" />
                                        </button>
                                    </div>
                                </TransitionChild>
                                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-800 pb-4">
                                     <div className="flex items-center justify-center h-20 flex-shrink-0">
                                        <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-10 w-10" />
                                        <span className="ml-3 text-2xl font-semibold text-white">LiveCampus</span>
                                    </div>
                                    <NavLinks inMobileSidebar />
                                    <UserProfileSection inMobileSidebar />
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>


            {/* --- Main Content Area --- */}
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <header className="relative bg-white shadow-sm z-10">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
                                <Menu size={28} />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
                                {menuItems.find(item => location.pathname.startsWith(item.to) && (item.to !== '/' || location.pathname === '/'))?.label || 'Dashboard'}
                            </h1>
                            <div className="flex items-center space-x-4">
                               <div className="relative" ref={notificationsRef}>
                                    <button 
                                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                                        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100"
                                    >
                                        <Bell size={22} />
                                        {unreadCount > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500" />}
                                    </button>

                                    {notificationsOpen && (
                                        <div className="origin-top-right absolute z-10 right-0 mt-2 w-80 rounded-lg shadow-xl bg-white">
                                            <div className="flex flex-col max-h-[80vh]">
                                                <div className="p-4 border-b">
                                                    <h3 className="font-semibold">Notifications</h3>
                                                </div>
                                                <div className="overflow-y-auto">
                                                    {notifications.length > 0 ? (
                                                        notifications.map((n) => (
                                                            <div key={n.id} onClick={() => handleNotificationClick(n.id)} className={`p-4 hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-indigo-50' : ''}`}>
                                                                <p className="font-medium">{n.title}</p>
                                                                <p className="text-sm text-gray-500">{n.message}</p>
                                                                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-center text-gray-500 py-12">You're all caught up! ✨</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                               </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="py-8">
                        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
