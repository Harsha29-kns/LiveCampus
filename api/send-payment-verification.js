import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, eventName } = req.body;

  if (!email || !name || !eventName) {
    return res.status(400).json({ error: 'Missing required fields: email, name, or eventName' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });

  const mailOptions = {
    from: '"LiveCampus" <livecampuss@gmail.com>',
    to: email,
    subject: `✅ Payment Verified for ${eventName}`,
    text: `Hello ${name},

Your payment for the event "${eventName}" has been successfully verified by the organizer.

You can now log in to the LiveCampus website to view the event details and download your unique QR code for check-in.

See you there!
LiveCampus Team
`,
    html: `<p>Hello ${name},</p>
<p>Your payment for the event "<b>${eventName}</b>" has been successfully verified by the organizer.</p>
<p>You can now log in to the LiveCampus website to view the event details and download your unique QR code for check-in.</p>
<p>See you there!<br/><b>LiveCampus Team</b></p>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Verification email sent successfully.' });
  } catch (err) {
    console.error('Error sending verification email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}