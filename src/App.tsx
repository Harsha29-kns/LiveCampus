import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react"

// Layouts (keep static for shell)
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Guards (keep static for routing logic)
import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';
import useAutoLogout from './hooks/useAutoLogout';

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p className="text-neutral-600">Loading...</p>
    </div>
  </div>
);

// Lazy-loaded pages for code splitting
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const Clubs = lazy(() => import('./pages/Clubs'));
const ClubDetails = lazy(() => import('./pages/ClubDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminUserManagement = lazy(() => import('./pages/AdminUserManagement'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const CreateClub = lazy(() => import('./pages/CreateClub'));
const Contact = lazy(() => import('./pages/Contact'));
const About = lazy(() => import('./pages/About'));
const ClubProfile = lazy(() => import('./pages/ClubProfile'));
const EventMarks = lazy(() => import('./pages/EventMarks'));
const MarksDashboard = lazy(() => import('./pages/MarksDashboard'));
const EventAttendance = lazy(() => import('./pages/EventAttendance'));
const AttendanceDashboard = lazy(() => import('./pages/AttendanceDashboard'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const VerifyPayments = lazy(() => import('./pages/VerifyPayments'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const FacultyEventApproval = lazy(() => import('./pages/FacultyEventApproval'));
const NavigationPage = lazy(() => import('./pages/NavigationPage'));
const Tickets = lazy(() => import('./pages/Tickets'));
const CreateTicket = lazy(() => import('./pages/CreateTicket'));
const TicketChat = lazy(() => import('./pages/TicketChat'));
const ClubTickets = lazy(() => import('./pages/ClubTickets'));
const PublicEvents = lazy(() => import('./pages/PublicEvents'));
const Features = lazy(() => import('./pages/Features'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Debug: Import test notification
import './test-notification';
import './test-create-event';

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
    if (!isAuthenticated || !user) return;

    // 1. Forced Password Change
    if (user.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password');
      return;
    }

    // 2. Club Profile Completion
    if (
      user.role === 'club' &&
      (
        !user.club ||
        !user.club.name ||
        !user.club.facultyAdvisor ||
        !user.club.president
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
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Add the verification route here to make it public */}
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/verify-certificate/:id" element={<VerifyCertificate />} />
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
            <Route path="/events/:id/navigate" element={<NavigationPage />} />
            <Route path="/public-events" element={<PublicEvents />} />
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

            {/* Ticket System Routes */}
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:ticketId" element={<TicketChat />} />
            <Route path="/club/tickets" element={<ClubTickets />} />

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
            <Route
              path="/faculty/approvals"
              element={
                <RoleGuard allowedRoles={['faculty']}>
                  <FacultyEventApproval />
                </RoleGuard>
              }
            />
            <Route path="/clubs/:id/edit" element={<CreateClub />} />
            <Route path="/club-profile" element={<ClubProfile />} />
            <Route path="/events/:eventId/marks" element={<EventMarks />} />
            <Route path="/marks" element={<MarksDashboard />} />
            <Route path="/events/:eventId/attendance" element={<EventAttendance />} />

            {/* --- NEW ROUTE FOR PAYMENT VERIFICATION --- */}
            <Route
              path="/events/:eventId/verify-payments"
              element={
                <RoleGuard allowedRoles={['admin', 'club', 'faculty']}>
                  <VerifyPayments />
                </RoleGuard>
              }
            />

            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Route>

          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
