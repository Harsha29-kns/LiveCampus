export type UserRole = 'admin' | 'faculty' | 'student' | 'club';

// This new interface defines the shape of the layout object
export interface CertificateLayout {
  name: { x: number; y: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
  regNo: { x: number; y: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
  qrCode: { x: number; y: number; size: number };
}

// Venue Navigation Types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StartingPoint {
  id: string;
  name: string;
  coordinates: Coordinates;
}

export interface VenueLocation {
  coordinates: Coordinates;
  name: string;
  buildingName?: string;
  floorNumber?: string;
  roomNumber?: string;
  instructions?: string;
  startingPoints: StartingPoint[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  year?: number;
  clubId?: string;
  linkedClubIds?: string[]; // For faculty: array of club IDs they're associated with
  club?: Club; // For club users: key set in authStore.checkAuth
  points?: number;
  mustChangePassword?: boolean; // If true, user must change password on next login
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationStartDate?: string; // New field for registration start
  registrationDeadline?: string;
  createdBy: string;
  organizerId: string;
  organizerName: string;
  organizerType: 'club' | 'faculty' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  facultyApprovalStatus?: 'pending' | 'approved' | 'rejected'; // Faculty approval status
  facultyApprovedBy?: string; // Faculty user ID who approved/rejected
  facultyApprovedAt?: string; // Timestamp of faculty approval/rejection
  facultyApprovalNotes?: string; // Notes from faculty on approval/rejection
  capacity?: number;
  registeredCount: number;
  image?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  eventType: 'free' | 'paid';
  eventFee?: string;
  upiId?: string;
  presidentPhone?: string;
  vicePresidentPhone?: string;
  certificateTemplateUrl?: string; // Field for the certificate template
  certificateLayout?: CertificateLayout;
  category: 'hackathon' | 'gateexam' | 'sports' | 'algorithms' | 'other';
  customCategory?: string;
  resources?: string[]; // e.g., 'mic', 'speaker', 'ac', 'powerbackup', 'water'
  rejectionReason?: string;
  rejectedBy?: string; // User ID who rejected
  venueLocation?: VenueLocation; // Venue navigation data
  // Team registration fields for hackathon events
  isTeamEvent?: boolean; // Flag to indicate if this is a team-based event
  minTeamSize?: number; // Minimum team size (e.g., 1)
  maxTeamSize?: number; // Maximum team size (e.g., 4 or 5)
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logo?: string;
  president: string;
  presidentId: string;
  vicePresident?: string;
  vicePresidentId?: string;
  facultyAdvisor: string;
  facultyAdvisorId: string;
  facultyMembers: string[]; // Array of faculty user IDs linked to this club
  phoneNo?: string;
  memberCount: number
  points?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
// Team member information (includes all fields for each member)
export interface TeamMemberInfo {
  name: string;
  regNo: string;
  phone: string;
  hostelName: string;
  roomNo: string;
  branch?: string;
  department?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: 'registered' | 'attended' | 'cancelled';
  registeredAt: string;
  checkedInAt?: string;
  transactionId?: string;
  transactionImage?: string;
  paymentVerified?: boolean;
  // Team registration fields
  teamSize?: number; // Actual number of team members
  teamLead?: TeamMemberInfo; // Team lead is the first member (also the userId)
  teamMembers?: TeamMemberInfo[]; // Additional team members (2nd to Nth)
  // Legacy individual registration fields (for backward compatibility)
  name?: string;
  regNo?: string;
  branch?: string;
  department?: string;
  phone?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  userId: string;
  createdAt: string;
}

export interface ClubFacultyCSVRow {
  clubName: string;
  clubEmail: string; // Added field
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
}
