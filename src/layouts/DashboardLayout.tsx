import React, { useState, Fragment, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Home, Calendar, Users, LogOut, Menu, X, BarChart, ClipboardCheck, Building, Trophy, Settings, Bell, ChevronRight, Globe, Trash2, CheckCheck, Ticket } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { fetchNotifications, unreadCount, notifications, markAsRead, markAllAsRead, deleteAllNotifications } = useNotificationStore();

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
    { to: '/', icon: <Home size={20} />, label: 'Dashboard', roles: ['admin', 'faculty', 'student', 'club'] },
    { to: '/public-events', icon: <Globe size={20} />, label: 'Public Events', roles: ['admin', 'faculty', 'student', 'club'] },
    { to: '/events', icon: <Calendar size={20} />, label: 'Events', roles: ['admin', 'faculty', 'student', 'club'] },
    { to: '/tickets', icon: <Ticket size={20} />, label: 'Support', roles: ['student'] },
    { to: '/club/tickets', icon: <Ticket size={20} />, label: 'Tickets', roles: ['club'] },
    { to: '/clubs', icon: <Building size={20} />, label: 'Clubs', roles: ['admin', 'faculty', 'student', 'club'] },
    { to: profileLink, icon: profileIcon, label: profileLabel, roles: ['admin', 'faculty', 'student', 'club'] },
    { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard', roles: ['admin', 'faculty', 'student', 'club'] },
  ];

  const roleSpecificItems: any = {
    admin: [
      { to: '/admin/users', icon: <Settings size={20} />, label: 'Admin Panel', roles: ['admin'] },

    ],
    club: [
      { to: '/attendance', icon: <ClipboardCheck size={20} />, label: 'Attendance', roles: ['club', 'faculty'] },
      { to: '/marks', icon: <BarChart size={20} />, label: 'Marks', roles: ['club', 'faculty'] },
    ],
    faculty: [
      { to: '/attendance', icon: <ClipboardCheck size={20} />, label: 'Attendance', roles: ['club', 'faculty'] },
      { to: '/marks', icon: <BarChart size={20} />, label: 'Marks', roles: ['club', 'faculty'] },
    ],
  };

  const menuItems = [...baseMenuItems, ...(user ? roleSpecificItems[user.role] || [] : [])]
    .filter(i => user && i.roles.includes(user.role));

  // ----- SIDEBAR COMPONENT -----
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/LiveCampus.svg" alt="logo" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold tracking-tight">LiveCampus</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
               ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={16} className="text-indigo-200" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden border-2 border-slate-700">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-white font-semibold">{user?.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/10 hover:shadow-sm transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ---- Desktop Sidebar ---- */}
      <div className="hidden lg:flex lg:flex-col w-72 fixed inset-y-0 z-50">
        <SidebarContent />
      </div>

      {/* ---- Mobile Sidebar ---- */}
      <Transition show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="lg:hidden relative z-50" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 w-full max-w-xs">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                {/* REUSING SIDEBAR CONTENT FOR MOBILE TO ENSURE CONSISTENCY */}
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ---- Main Content ---- */}
      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-20 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {menuItems.find(i => location.pathname.startsWith(i.to) && (i.to !== '/' || location.pathname === '/'))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              <Transition
                show={notificationsOpen}
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <div className="absolute right-0 mt-2 w-96 bg-white shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 z-50 origin-top-right">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-800 text-lg">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {/* Action Buttons */}
                    {notifications.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (user) markAllAsRead(user.id);
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <CheckCheck size={14} />
                          Mark all read
                        </button>
                        <button
                          onClick={() => {
                            if (user && confirm('Clear all notifications?')) {
                              deleteAllNotifications(user.id);
                              setNotificationsOpen(false);
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[28rem] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 20).map((n) => {
                        const typeColors = {
                          info: 'bg-blue-100 text-blue-600',
                          success: 'bg-green-100 text-green-600',
                          warning: 'bg-yellow-100 text-yellow-600',
                          error: 'bg-red-100 text-red-600',
                        };
                        const typeIcons = {
                          info: '📢',
                          success: '✅',
                          warning: '⚠️',
                          error: '❌',
                        };

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.id)}
                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${!n.read ? 'bg-indigo-50/40 border-l-4 border-l-indigo-500' : ''
                              }`}
                          >
                            <div className="flex gap-3">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${typeColors[n.type || 'info']} flex items-center justify-center text-sm`}>
                                {typeIcons[n.type || 'info']}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{n.title}</p>
                                  {!n.read && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Bell size={48} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium">No notifications yet</p>
                        <p className="text-xs mt-1">You're all caught up!</p>
                      </div>
                    )}
                  </div>

                  {/* Footer - only show if more than 20 notifications */}
                  {notifications.length > 20 && (
                    <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        Showing latest 20 of {notifications.length} notifications
                      </p>
                    </div>
                  )}
                </div>
              </Transition>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <button
              onClick={() => navigate(profileLink)}
              className="hidden sm:flex items-center gap-3 pl-2 hover:bg-slate-100 rounded-lg p-2 transition-colors cursor-pointer"
              title={`Go to ${profileLabel}`}
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
