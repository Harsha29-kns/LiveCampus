import nodemailer from 'nodemailer';

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

  const studentEmails = students.map(student => student.email);

  const mailOptions = {
    from: '"LiveCampus" <livecampuss@gmail.com>',
    to: studentEmails,
    subject: `New Event: ${event.title}`,
    text: `A new event has been created:

Title: ${event.title}
Description: ${event.description}
Location: ${event.location}
Date: ${new Date(event.startDate).toLocaleDateString()}
Time: ${new Date(event.startDate).toLocaleTimeString()}

Check it out on LiveCampus!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}