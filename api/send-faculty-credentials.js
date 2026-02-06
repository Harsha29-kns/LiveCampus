import nodemailer from 'nodemailer';

// --- HTML Template for Faculty Account Creation ---
const createFacultyCredentialsHtml = (name, facultyId, email, password) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #4a90e2; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Welcome to LiveCampus!</h1>
    <p style="margin: 5px 0 0 0; font-size: 14px;">Faculty Account Created</p>
  </div>
  <div style="padding: 24px;">
    <p>Hello Dr. ${name},</p>
    <p>Your faculty account has been created on LiveCampus. You can now oversee club activities and approve events.</p>
    
    <div style="background-color: #f8f9fa; border-left: 4px solid #4a90e2; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #4a90e2;">Your Login Credentials</h3>
      <p style="margin: 8px 0;"><strong>Faculty ID:</strong> ${facultyId}</p>
      <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
    </div>
    
    <div style="background-color: #fff3cd; border-left: 4px solid: #ffc107; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> You will be required to change your password upon first login for security purposes.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://live-campus.vercel.app/login" style="background-color: #4a90e2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Login to Your Account
      </a>
    </div>
    
    <p>As a faculty member, you can:</p>
    <ul style="color: #555;">
      <li>View and approve events from clubs you're associated with</li>
      <li>Monitor club activities and member engagement</li>
      <li>Provide guidance and oversight to student organizations</li>
    </ul>
    
    <p>If you have any questions or need assistance, please contact the admin.</p>
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

    const { email, name, facultyId, password } = req.body;

    if (!email || !name || !facultyId || !password) {
        return res.status(400).json({ error: 'Missing required fields: email, name, facultyId, password' });
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
        from: `"LiveCampus" <livecampuss@gmail.com>`,
        to: email,
        subject: 'Your LiveCampus Faculty Account - Login Credentials',
        html: createFacultyCredentialsHtml(name, facultyId, email, password),
        text: `Hello Dr. ${name},\n\nYour faculty account has been created on LiveCampus.\n\nFaculty ID: ${facultyId}\nEmail: ${email}\nTemporary Password: ${password}\n\nYou will be required to change your password upon first login.\n\nLogin here: https://live-campus.vercel.app/login\n\nThank you!`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error sending faculty credentials email:', err);
        res.status(500).json({ error: 'Error sending email', details: err.message });
    }
}
