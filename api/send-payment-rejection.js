import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Add rejectionReason to the destructured body
  const { email, name, eventName, rejectionReason } = req.body;

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

  // Dynamic reason text
  const reasonText = rejectionReason 
    ? `Reason: ${rejectionReason}` 
    : 'Please check your transaction details and try again, or contact the event organizer for more information.';

  const mailOptions = {
    from: '"LiveCampus" <livecampuss@gmail.com>',
    to: email,
    subject: `❗ Payment Rejected for ${eventName}`,
    text: `Hello ${name},

We regret to inform you that your payment for the event "${eventName}" could not be verified and has been rejected.

${reasonText}

If you believe this is a mistake, please reach out to the event organizers directly.

Regards,
LiveCampus Team
`,
    html: `<p>Hello ${name},</p>
<p>We regret to inform you that your payment for the event "<b>${eventName}</b>" could not be verified and has been rejected.</p>
<p><i>${reasonText}</i></p>
<p>If you believe this is a mistake, please reach out to the event organizers directly.</p>
<p>Regards,<br/><b>LiveCampus Team</b></p>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Rejection email sent successfully.' });
  } catch (err) {
    console.error('Error sending rejection email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}