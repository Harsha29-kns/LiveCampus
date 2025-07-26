import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, LogOut, Bell, Menu, X, Users, Home, Settings, BarChart2, QrCode } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';


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
    
    const menuItems = [
        { to: '/', icon: <Home size={22} />, label: 'Dashboard' },
        { to: '/events', icon: <Calendar size={22} />, label: 'Events' },
        { to: '/clubs', icon: <Users size={22} />, label: 'Clubs' },
        { to: '/profile', icon: <User size={22} />, label: 'Profile' },
    ];

    if (user?.role === 'admin') {
        menuItems.push({ to: '/admin/users', icon: <Settings size={22} />, label: 'Admin Panel' });
    }

    if (user?.role === 'club') {
        menuItems.push({ to: '/attendance', icon: <QrCode size={22} />, label: 'Attendance' });
        menuItems.push({ to: '/marks', icon: <BarChart2 size={22} />, label: 'Marks' });
    }

    // Reusable NavLinks component for both mobile and desktop sidebars
    const NavLinks = ({ inMobileSidebar = false }) => (
        <nav className={`flex flex-col ${inMobileSidebar ? 'space-y-2 p-4' : 'px-2 pt-4 space-y-1'}`}>
            {menuItems.map((item) => (
                <NavLink
                    key={item.to}
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
    
    // Reusable User Profile section
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
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 flex z-40">
                    {/* Backdrop */}
                    <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" />
                    
                    {/* Sidebar panel */}
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-800">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button type="button" className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center h-20 flex-shrink-0">
                            <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-10 w-10" />
                            <span className="ml-3 text-2xl font-semibold text-white">LiveCampus</span>
                        </div>
                        <div className="flex-1 flex flex-col overflow-y-auto">
                          <NavLinks inMobileSidebar />
                          <UserProfileSection inMobileSidebar />
                        </div>
                    </div>
                    <div className="flex-shrink-0 w-14" aria-hidden="true" />
                </div>
            )}


            {/* --- Main Content Area --- */}
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <header className="relative bg-white shadow-sm z-10">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            {/* Mobile Menu Button */}
                            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
                                <Menu size={28} />
                            </button>
                            
                            {/* Page Title */}
                            <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
                                {menuItems.find(item => location.pathname.startsWith(item.to) && (item.to !== '/' || location.pathname === '/'))?.label || 'Dashboard'}
                            </h1>
                            
                            {/* Header Actions */}
                            <div className="flex items-center space-x-4">
                               {/* Notifications Dropdown */}
                               <div className="relative" ref={notificationsRef}>
                                    <button 
                                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                                        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <Bell size={22} />
                                        {unreadCount > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500" />}
                                    </button>

                                    {notificationsOpen && (
                                        <div className="origin-top-right absolute z-10 right-0 mt-2 w-80 sm:w-96 rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5">
                                            <div className="flex flex-col max-h-[80vh]">
                                                <div className="p-4 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                                                </div>
                                                <div className="overflow-y-auto">
                                                    {notifications.length > 0 ? (
                                                        notifications.map((n) => (
                                                            <div key={n.id} onClick={() => handleNotificationClick(n.id)} className={`p-4 block w-full text-left hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-indigo-50' : ''}`}>
                                                                <p className="font-medium text-sm text-gray-900">{n.title}</p>
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