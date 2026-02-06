import nodemailer from 'nodemailer';

const createHtmlBody = (type, recipient, event, notes) => {
    const styles = `
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 20px auto;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  `;
    const headerStyle = `
    background-color: #4f46e5;
    color: white;
    padding: 20px;
    text-align: center;
  `;
    const contentStyle = `padding: 24px;`;
    const buttonStyle = `
    display: inline-block;
    background-color: #4f46e5;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    margin-top: 20px;
  `;
    const footerStyle = `
    background-color: #f7f7f7;
    padding: 15px;
    text-align: center;
    font-size: 12px;
    color: #777;
  `;

    let title = '';
    let message = '';
    let buttonText = '';
    let buttonLink = '';

    switch (type) {
        case 'faculty_approval_needed':
            title = 'Action Required: Event Approval';
            message = `
        <p>Dear ${recipient.name},</p>
        <p>A new event <strong>"${event.title}"</strong> has been submitted by the club for your approval.</p>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}<br/>
           <strong>Location:</strong> ${event.location}</p>
        <p>Please review this event to ensure it meets campus guidelines.</p>
      `;
            buttonText = 'Review Event';
            buttonLink = `https://live-campus.vercel.app/faculty/approvals`;
            break;

        case 'event_approved':
            title = 'Event Approved by Faculty';
            message = `
        <p>Dear ${recipient.name},</p>
        <p>Good news! Your event <strong>"${event.title}"</strong> has been approved by your Faculty Advisor.</p>
        <p>It has now been forwarded to the Administration for final review.</p>
      `;
            buttonText = 'View Event Status';
            buttonLink = `https://live-campus.vercel.app/events/${event.id}`;
            break;

        case 'event_rejected':
            title = 'Event Returned by Faculty';
            message = `
        <p>Dear ${recipient.name},</p>
        <p>Your event <strong>"${event.title}"</strong> was reviewed by your Faculty Advisor and requires changes or was rejected.</p>
        <p><strong>Faculty Note:</strong><br/>
           <em style="color: #d9534f;">"${notes || 'No specific reason provided.'}"</em></p>
        <p>Please update the event details or contact your advisor for clarification.</p>
      `;
            buttonText = 'Edit Event';
            buttonLink = `https://live-campus.vercel.app/events/${event.id}/edit`;
            break;

        default:
            return `<p>New Notification</p>`;
    }

    return `
    <div style="${styles}">
      <div style="${headerStyle}">
        <h1 style="margin:0; font-size: 24px;">${title}</h1>
      </div>
      <div style="${contentStyle}">
        ${message}
        <div style="text-align: center;">
            <a href="${buttonLink}" style="${buttonStyle}">${buttonText}</a>
        </div>
      </div>
      <div style="${footerStyle}">
        <p>LiveCampus Notification System</p>
      </div>
    </div>
  `;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, recipient, event, notes } = req.body; // recipient: { email, name }

    if (!type || !recipient || !event) {
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

    const subjectMap = {
        faculty_approval_needed: `Action Required: Approval for "${event.title}"`,
        event_approved: `Faculty Approved: "${event.title}"`,
        event_rejected: `Update Required: "${event.title}"`,
    };

    const mailOptions = {
        from: '"LiveCampus" <livecampuss@gmail.com>',
        to: recipient.email,
        subject: subjectMap[type] || 'LiveCampus Notification',
        html: createHtmlBody(type, recipient, event, notes),
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error sending email:', err);
        res.status(500).json({ error: 'Error sending email', details: err.message });
    }
}
