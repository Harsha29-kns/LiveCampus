import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, LogOut, Bell, Menu, X, Users, Home, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { fetchNotifications, unreadCount, notifications, markAsRead } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
    }
  }, [fetchNotifications, user]);

  // Close sidebar when location changes (on mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setNotificationsOpen(false);
  };

  const navLinkClasses = (isActive: boolean) => 
    `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive 
        ? 'bg-primary-50 text-primary-700' 
        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  const menuItems = [
    { 
      to: '/', 
      icon: <Home size={20} />, 
      label: 'Dashboard' 
    },
    { 
      to: '/events', 
      icon: <Calendar size={20} />, 
      label: 'Events' 
    },
    { 
      to: '/clubs', 
      icon: <Users size={20} />, 
      label: 'Clubs' 
    },
    { 
      to: '/profile', 
      icon: <User size={20} />, 
      label: 'Profile' 
    },
  ];

  if (user?.role === 'admin') {
    menuItems.push({
      to: '/admin/users',
      icon: <Settings size={20} />,
      label: 'Admin Panel'
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
          <div className="flex items-center">
            <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-semibold text-primary-900">LiveCampus</span>
          </div>
          <button 
            className="text-neutral-500 hover:text-neutral-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="mt-4 px-2 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navLinkClasses(isActive)}
              end={item.to === '/'}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <button
                className="lg:hidden text-neutral-500 hover:text-neutral-700 mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center">
                <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-8 w-8" />
                <span className="ml-2 text-xl font-semibold text-primary-900">LiveCampus</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  className="relative p-1 rounded-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-error-500 text-white text-xs flex items-center justify-center transform translate-x-1 -translate-y-1">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {notificationsOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-2 px-4 border-b border-neutral-200 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-neutral-900">Notifications</h3>
                      <button className="text-xs text-primary-600 hover:text-primary-800">
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-4 px-4 text-sm text-neutral-500 text-center">
                          No notifications
                        </p>
                      ) : (
                        <div className="py-2">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              className={`block w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors ${
                                !notification.read ? 'bg-primary-50' : ''
                              }`}
                              onClick={() => handleNotificationClick(notification.id)}
                            >
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  className="flex items-center space-x-2 text-sm text-neutral-700 hover:text-neutral-900"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden md:block font-medium">
                    {user?.name}
                  </span>
                  <ChevronDown size={16} />
                </button>
                
                {profileMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      <div className="px-4 py-2 border-b border-neutral-200">
                        <p className="text-sm font-medium text-neutral-900">{user?.name}</p>
                        <p className="text-xs text-neutral-500">{user?.email}</p>
                        <Badge
                          variant={
                            user?.role === 'admin' ? 'primary' :
                            user?.role === 'faculty' ? 'secondary' :
                            user?.role === 'club' ? 'success' : 'neutral'
                          }
                          size="sm"
                          className="mt-1"
                        >
                          {user?.role}
                        </Badge>
                      </div>
                      <a
                        href="/profile"
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Your Profile
                      </a>
                      <a
                        href="/settings"
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Settings
                      </a>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-error-600"
                        onClick={handleLogout}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Desktop sidebar with content */}
      <div className="flex flex-1">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1 border-r border-neutral-200 bg-white">
              <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => navLinkClasses(isActive)}
                    end={item.to === '/'}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-neutral-200">
                <Button 
                  variant="outline" 
                  fullWidth
                  leftIcon={<LogOut size={18} />}
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;