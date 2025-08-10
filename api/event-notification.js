import nodemailer from 'nodemailer';

// Helper function to format a date and time nicely
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  // @ts-ignore
  return date.toLocaleDateString('en-US', options);
};

// Function to create the rich HTML body for the email
const createHtmlBody = (event) => `
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  
  ${event.image ? `<img src="${event.image}" alt="${event.title}" style="width: 100%; height: auto; max-height: 250px; object-fit: cover;">` : ''}

  <div style="padding: 24px;">
    <h1 style="font-size: 28px; margin: 0 0 10px 0; color: #1a202c;">You're Invited!</h1>
    <p style="font-size: 16px; color: #555;">A new event has just been announced on LiveCampus:</p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4f46e5;">
      <h2 style="font-size: 22px; margin: 0 0 15px 0; color: #4f46e5;">${event.title}</h2>
      <p style="margin: 0 0 10px 0; font-size: 15px;">${event.description}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>🗓️ Date & Time:</strong> ${formatDateTime(event.startDate)}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>📍 Location:</strong> ${event.location}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Organized by:</strong> ${event.organizerName}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://live-campus.vercel.app/events/${event.id}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
        View Event & Register
      </a>
    </div>
    
    <p>Don't miss out on this opportunity. We hope to see you there!</p>
  </div>

  <div style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">LiveCampus | Your Campus Connection</p>
  </div>
</div>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { event, students } = req.body;

  if (!event || !students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Missing event or students data' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });

  // Use BCC to send to all students without revealing their emails to each other
  const studentEmails = students.map(student => student.email);

  const mailOptions = {
    from: '"LiveCampus" <livecampuss@gmail.com>',
    bcc: studentEmails, // Changed from 'to' to 'bcc' for privacy
    subject: `📢 New Event Announcement: ${event.title}`,
    html: createHtmlBody(event),
    text: `Hello!\n\nA new event has been published on LiveCampus!\n\nEvent: ${event.title}\nDescription: ${event.description}\nDate: ${formatDateTime(event.startDate)}\nLocation: ${event.location}\n\nFor more information and to register, visit: https://live-campus.vercel.app/events/${event.id}\n\nSee you there!\nLiveCampus Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}