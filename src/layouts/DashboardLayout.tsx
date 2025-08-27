import React, { useState, Fragment, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Home, Calendar, Users, LogOut, Menu, X, BarChart, Award, ClipboardCheck, DollarSign, Building, Trophy, Settings, Bell } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { fetchNotifications, unreadCount, notifications, markAsRead } = useNotificationStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [fetchNotifications, user]);

  useEffect(() => {
    setSidebarOpen(false); // close mobile sidebar on route change
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setNotificationsOpen(false);
  };

  // ----- MENU CONFIG -----
  const profileLink = user?.role === 'club' ? '/club-profile' : '/profile';
  const profileIcon = user?.role === 'club' ? <Building size={20} /> : <Users size={20} />;
  const profileLabel = user?.role === 'club' ? 'Club Profile' : 'My Profile';

  const baseMenuItems = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard', roles: ['admin','faculty','student','club'] },
    { to: '/events', icon: <Calendar size={20} />, label: 'Events', roles: ['admin','faculty','student','club'] },
    { to: '/clubs', icon: <Users size={20} />, label: 'Clubs', roles: ['admin','faculty','student','club'] },
    { to: profileLink, icon: profileIcon, label: profileLabel, roles: ['admin','faculty','student','club'] },
    { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard', roles: ['admin','faculty','student','club'] },
  ];

  const roleSpecificItems: any = {
    admin: [
      { to: '/admin/users', icon: <Settings size={20} />, label: 'Admin Panel', roles: ['admin'] },
      { to: '/admin/verify-payments', icon: <DollarSign size={20} />, label: 'Verify Payments', roles: ['admin'] },
    ],
    club: [
      { to: '/attendance', icon: <ClipboardCheck size={20} />, label: 'Attendance', roles: ['club','faculty'] },
      { to: '/marks', icon: <BarChart size={20} />, label: 'Marks', roles: ['club','faculty'] },
    ],
    faculty: [
      { to: '/attendance', icon: <ClipboardCheck size={20} />, label: 'Attendance', roles: ['club','faculty'] },
      { to: '/marks', icon: <BarChart size={20} />, label: 'Marks', roles: ['club','faculty'] },
    ],
  };

  const menuItems = [...baseMenuItems, ...(user ? roleSpecificItems[user.role] || [] : [])]
    .filter(i => user && i.roles.includes(user.role));

  // ----- NAV MENU -----
  const NavLinks = ({ mobile = false }) => (
    <nav className={`flex flex-col ${mobile ? 'space-y-1 p-4' : 'mt-6 space-y-1'}`}>
      {menuItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center px-4 py-2 rounded-md text-sm font-medium 
            ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'}`
          }
        >
          {item.icon}
          <span className="ml-3">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      
      {/* ---- Desktop Sidebar ---- */}
      <div className="hidden lg:flex lg:flex-col w-64 bg-slate-800">
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <img src="/LiveCampus.svg" alt="logo" className="h-10 w-10" />
          <span className="ml-2 text-lg font-semibold text-white">LiveCampus</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        {/* User Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center">
          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-10 w-10 object-cover" />
            ) : (
              <span className="text-white">{user?.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm text-white">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
          <button className="ml-auto text-gray-400 hover:text-white" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ---- Mobile Sidebar ---- */}
      <Transition show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="lg:hidden" onClose={setSidebarOpen}>
          <div className="fixed inset-0 z-40 flex">
            {/* Overlay */}
            <Transition.Child as={Fragment} enter="transition-opacity" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/60" />
            </Transition.Child>
            <Transition.Child as={Fragment} enter="transition-transform duration-300" enterFrom="-translate-x-full" enterTo="translate-x-0" leave="transition-transform duration-300" leaveFrom="translate-x-0" leaveTo="-translate-x-full">
              <Dialog.Panel className="relative flex flex-col w-64 bg-slate-800">
                <div className="flex items-center justify-between p-4">
                  <h2 className="text-white font-semibold">LiveCampus</h2>
                  <button onClick={() => setSidebarOpen(false)}><X className="text-white" /></button>
                </div>
                <NavLinks mobile />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ---- Main Content ---- */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">
              {menuItems.find(i => location.pathname.startsWith(i.to) && (i.to !== '/' || location.pathname === '/'))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg overflow-hidden z-50">
                  <div className="p-3 border-b font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} onClick={() => handleNotificationClick(n.id)} className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${!n.read ? 'bg-indigo-50' : ''}`}>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-sm text-gray-600">{n.message}</p>
                          <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-6">No notifications ✨</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
              {user?.avatar ? <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-white">{user?.name?.[0]}</span>}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
