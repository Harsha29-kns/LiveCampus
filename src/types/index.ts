export type UserRole = 'admin' | 'faculty' | 'student' | 'club';

// This new interface defines the shape of the layout object
export interface CertificateLayout {
  name: { x: number; y: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
  regNo: { x: number; y: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
  qrCode: { x: number; y: number; size: number };
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
  points?: number;
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
  certificateLayout?: CertificateLayout; // <-- ADD THIS NEW FIELD
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
  phoneNo?: string;
  memberCount: number
  points?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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