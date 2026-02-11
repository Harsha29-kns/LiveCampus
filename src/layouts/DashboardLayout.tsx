import React, { useState, Fragment, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Home, Calendar, Users, LogOut, Menu, X, BarChart, ClipboardCheck, Building, Trophy, Settings, Bell, Globe, Trash2, CheckCheck, Ticket, Clock } from 'lucide-react';
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
    { to: '/public-events', icon: <Globe size={20} />, label: 'Public Events', roles: ['admin', 'faculty', 'club'] },
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
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300 relative overflow-hidden">
      {/* Background Gradients for Sidebar */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[40%] rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[40%] rounded-full bg-purple-500/10 blur-[80px]" />
      </div>

      {/* Logo Area */}
      <div className="relative z-10 h-24 flex items-center px-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 rounded-full"></div>
            <img src="/LiveCampus.svg" alt="logo" className="relative h-10 w-10 object-contain" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            LiveCampus
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center px-4 py-3.5 text-sm font-medium rounded-2xl transition-all duration-300 ease-in-out border border-transparent
               ${isActive
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/10'
                : 'text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`mr-4 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 22, strokeWidth: isActive ? 2.5 : 2 })}
                </span>
                <span className="flex-1 tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="relative z-10 p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group cursor-pointer" onClick={() => navigate(profileLink)}>
          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden border-2 border-slate-700/50 group-hover:border-indigo-500/50 transition-colors shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-white font-semibold">{user?.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

      {/* ---- Desktop Sidebar ---- */}
      <div className="hidden lg:flex lg:flex-col w-80 fixed inset-y-0 z-50 shadow-2xl shadow-indigo-900/10">
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in duration-200 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 w-full max-w-[280px]">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-4">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-white/10 hover:bg-white/20 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ---- Main Content ---- */}
      <div className="lg:pl-80 flex flex-col flex-1 min-h-screen transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 lg:h-20 px-4 lg:px-8 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300">
          {/* Background blur fix for some browsers */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xl -z-10" />

          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">
              {menuItems.find(i => location.pathname.startsWith(i.to) && (i.to !== '/' || location.pathname === '/'))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${notificationsOpen ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              >
                <Bell size={22} className={notificationsOpen ? 'animate-bounce-short' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              <Transition
                show={notificationsOpen}
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95 translate-y-2"
                enterTo="transform opacity-100 scale-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100 translate-y-0"
                leaveTo="transform opacity-0 scale-95 translate-y-2"
              >
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-200/50 z-50 origin-top-right">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/30">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-800 text-lg">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs font-bold text-white bg-indigo-500 px-2.5 py-1 rounded-full shadow-sm shadow-indigo-200">
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
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm transition-all"
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
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm transition-all"
                        >
                          <Trash2 size={14} />
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[20rem] sm:max-h-[28rem] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 20).map((n) => {
                        const typeStyles = {
                          info: 'bg-blue-50 text-blue-600 border-blue-100',
                          success: 'bg-green-50 text-green-600 border-green-100',
                          warning: 'bg-amber-50 text-amber-600 border-amber-100',
                          error: 'bg-red-50 text-red-600 border-red-100',
                        };
                        const typeIcons = {
                          info: '📢',
                          success: '✨',
                          warning: '⚠️',
                          error: '🚨',
                        };

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.id)}
                            className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 transition-all group ${!n.read ? 'bg-indigo-50/30' : ''
                              }`}
                          >
                            <div className="flex gap-4">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-2xl ${typeStyles[n.type || 'info']} border flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform`}>
                                {typeIcons[n.type || 'info']}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-700'} line-clamp-1`}>{n.title}</p>
                                  {!n.read && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                                <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5 font-medium">
                                  <Clock size={12} className="text-indigo-300" />
                                  {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Bell size={24} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                        <p className="text-xs mt-1 text-slate-400">You're all caught up!</p>
                      </div>
                    )}
                  </div>

                  {/* Footer - only show if more than 20 notifications */}
                  {notifications.length > 20 && (
                    <div className="p-3 bg-slate-50/50 text-center border-t border-slate-100 backdrop-blur-sm">
                      <p className="text-xs text-slate-500 font-medium">
                        Showing latest 20 of {notifications.length} notifications
                      </p>
                    </div>
                  )}
                </div>
              </Transition>
            </div>

            <div className="h-8 w-px bg-slate-200/60 hidden sm:block"></div>

            <button
              onClick={() => navigate(profileLink)}
              className="hidden sm:flex items-center gap-3 pl-2 py-1.5 pr-1.5 hover:bg-white rounded-full border border-transparent hover:border-slate-100 hover:shadow-sm transition-all cursor-pointer group"
              title={`Go to ${profileLabel}`}
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{user?.name}</p>
                <p className="text-xs text-slate-400 font-medium capitalize">{user?.role}</p>
              </div>
              <div className="h-9 w-9 p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-4 lg:p-8 relative">
          {/* Page specific background elements if needed */}
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
