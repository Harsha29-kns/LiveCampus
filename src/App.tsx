import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

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
import CreateClub from './pages/CreateClub'; // or EditClub if you have a separate file

// Guards
import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';

function App() {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="/clubs/create" element={<CreateClub />} />
        <Route path="/clubs/:id/edit" element={<CreateClub />} /> {/* or <EditClub /> if you have it */}
        
      </Route>

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;