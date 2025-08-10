import nodemailer from 'nodemailer';

// Helper function to format the email body
const createHtmlBody = (name, eventName, reason, clubDetails) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #d9534f; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Payment Rejected</h1>
  </div>
  <div style="padding: 20px;">
    <p>Hello ${name},</p>
    <p>We regret to inform you that your payment for the event "<b>${eventName}</b>" could not be verified and has been rejected.</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;"><b>Rejection Reason:</b><br/><i>${reason}</i></p>
    </div>
    <p>If you believe this is a mistake or have any questions, please reach out to the event organizers directly.</p>
    ${clubDetails ? `
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
      <h3 style="margin-bottom: 10px;">Club Contact Information:</h3>
      <p style="margin: 5px 0;"><b>President:</b> ${clubDetails.president || 'Not specified'}</p>
      <p style="margin: 5px 0;"><b>Phone:</b> ${clubDetails.phoneNo || 'Not specified'}</p>
    </div>
    ` : ''}
  </div>
  <div style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">LiveCampus Event Management</p>
  </div>
</div>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Destructure all the new details from the request body
  const { email, name, eventName, rejectionReason, clubDetails } = req.body;

  if (!email || !name || !eventName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });

  const reasonText = rejectionReason 
    ? rejectionReason 
    : 'Please check your transaction details and try again.';

  const mailOptions = {
    from: '"LiveCampus" <livecampuss@gmail.com>',
    to: email,
    subject: `❗ Payment Rejected for ${eventName}`,
    html: createHtmlBody(name, eventName, reasonText, clubDetails),
    // Plain text fallback
    text: `Hello ${name},\n\nWe regret to inform you that your payment for the event "${eventName}" has been rejected.\n\nReason: ${reasonText}\n\nIf you believe this is a mistake, please reach out to the event organizers.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Rejection email sent successfully.' });
  } catch (err) {
    console.error('Error sending rejection email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}