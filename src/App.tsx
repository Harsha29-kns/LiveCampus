import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Maintenance from './pages/Maintenance';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { Analytics } from "@vercel/analytics/react";

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import Clubs from './pages/Clubs';
import ClubDetails from './pages/ClubDetails';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import AdminUserManagement from './pages/AdminUserManagement';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import CreateClub from './pages/CreateClub';
import Contact from './pages/Contact';
import About from './pages/About';
import ClubProfile from './pages/ClubProfile';
import EventMarks from './pages/EventMarks';
import MarksDashboard from './pages/MarksDashboard';
import EventAttendance from './pages/EventAttendance';
import AttendanceDashboard from './pages/AttendanceDashboard';

// Guards
import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';
import useAutoLogout from './hooks/useAutoLogout';

function App() {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Custom hook for auto logout
  useAutoLogout();

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role === 'club' &&
      (
        !user.club ||
        !user.club.name ||
        !user.club.facultyAdvisor ||
        !user.club.president ||
        !user.club.vicePresident
      ) &&
      location.pathname !== '/club-profile'
    ) {
      navigate('/club-profile');
    }
  }, [isAuthenticated, user, navigate, location.pathname]);

  // 🔧 Show maintenance screen if env variable is set
  if (maintenanceMode) {
    return <Maintenance />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
      </Route>

      {/* Protected Routes */}
      <Route element={
        <AuthGuard>
          <DashboardLayout />
        </AuthGuard>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route 
          path="/events/create" 
          element={
            <RoleGuard allowedRoles={['admin', 'club', 'faculty']}>
              <CreateEvent />
            </RoleGuard>
          } 
        />
        <Route
          path="/events/edit/:id"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['admin', 'faculty', 'club']}>
                <CreateEvent />
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/clubs/:id" element={<ClubDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin/users"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['admin']}>
                <AdminUserManagement />
              </RoleGuard>
            </AuthGuard>
          }
        />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          path="/clubs/create"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <CreateClub />
            </RoleGuard>
          }
        />
        <Route path="/clubs/:id/edit" element={<CreateClub />} />
        <Route path="/club-profile" element={<ClubProfile />} />
        <Route path="/events/:eventId/marks" element={<EventMarks />} />
        <Route path="/marks" element={<MarksDashboard />} />
        <Route path="/events/:eventId/attendance" element={<EventAttendance />} />
        <Route path="/attendance" element={<AttendanceDashboard />} />
      </Route>

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
