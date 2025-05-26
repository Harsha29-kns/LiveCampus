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

// Firestore code to add a new club document
await addDoc(collection(db, 'clubs'), {
  name,
  description,
  president,
  vicePresident,
  facultyAdvisor,
  phoneNo,
  memberCount: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // ...other fields
});

// Firestore code to add a new event document
await addDoc(collection(db, 'events'), {
  // ...other fields...
  organizerId: user.role === 'club' ? user.clubId : user.id, // Use clubId for club users
  organizerType: user.role === 'club' ? 'club' : user.role,
  createdBy: user.id,
  // ...other fields...
});

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure your email transport with Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '8dfe1e001@smtp-brevo.com', // Your Brevo SMTP user (usually your email)
    pass: 'SpdMXG...', // Your Brevo SMTP password
  },
});

exports.sendApprovalEmail = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send email if status changed from not approved to approved
    if (before.status !== 'approved' && after.status === 'approved') {
      const mailOptions = {
        from: '"Event Portal" <8dfe1e001@smtp-brevo.com>', // <-- Use your Brevo SMTP user here
        to: after.email,
        subject: 'Your Account Has Been Approved',
        text: `Hello ${after.name},\n\nYour account has been approved by the admin. You can now log in and use the portal.\n\nThank you!`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Approval email sent to:', after.email);
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }
    return null;
  });