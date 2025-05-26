import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, rejected } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });

  const subject = rejected
    ? 'Your Account Has Been Rejected'
    : 'Your Account Has Been Approved';

  const text = rejected
    ? `Hello ${name},\n\nWe regret to inform you that your account request has been rejected by the admin.\n\nThank you!`
    : `Hello ${name},\n\nYour account has been approved by the admin. You can now log in and use the portal.\n\nThank you!`;

  try {
    await transporter.sendMail({
      from: `"LiveCampus" <livecampuss@gmail.com>`,
      to: email,
      subject,
      text,
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}