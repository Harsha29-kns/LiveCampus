export type UserRole = 'admin' | 'faculty' | 'student' | 'club';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  year?: number;
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
  memberCount: number;
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