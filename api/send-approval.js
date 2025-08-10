import nodemailer from 'nodemailer';

// --- HTML Template for Account Approval ---
const createApprovalHtml = (name) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #5cb85c; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Account Approved!</h1>
  </div>
  <div style="padding: 24px;">
    <p>Hello ${name},</p>
    <p>Welcome to LiveCampus! Your account has been successfully approved by the administrator.</p>
    <p>You can now log in to explore events, join clubs, and engage with the campus community.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://live-campus.vercel.app/login" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Login to Your Account
      </a>
    </div>
    <p>We're excited to have you on board!</p>
  </div>
  <div style="background-color: #f7f7f7; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">LiveCampus | Your Campus Connection</p>
  </div>
</div>
`;

// --- HTML Template for Account Rejection ---
const createRejectionHtml = (name) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #d9534f; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Account Status Update</h1>
  </div>
  <div style="padding: 24px;">
    <p>Hello ${name},</p>
    <p>We regret to inform you that your registration request for a LiveCampus account has been rejected by the administrator.</p>
    <p>This may be due to incomplete information or if the details provided could not be verified. If you believe this is an error, please try registering again with accurate information or contact our support team.</p>
    <p>Thank you for your understanding.</p>
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

  const isRejected = rejected === true;

  const mailOptions = {
    from: `"LiveCampus" <livecampuss@gmail.com>`,
    to: email,
    subject: isRejected ? 'Your LiveCampus Account Request' : 'Welcome to LiveCampus! Your Account is Approved',
    html: isRejected ? createRejectionHtml(name) : createApprovalHtml(name),
    text: isRejected
      ? `Hello ${name},\n\nWe regret to inform you that your account request has been rejected by the admin.\n\nThank you!`
      : `Hello ${name},\n\nYour account has been approved by the admin. You can now log in and use the portal: https://live-campus.vercel.app/login\n\nThank you!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Error sending email', details: err.message });
  }
}