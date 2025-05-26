import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '', // <-- Your Brevo SMTP user
    pass: '', // <-- Your Brevo SMTP password
  },
});

const mailOptions = {
  from: '"LiveCampus" <@gmail.com>', // <-- Use your verified Gmail address
  to: '@gmail.com', // <-- The email address you want to test with
  subject: 'Test Email from Brevo',
  text: 'This is a test email sent from Node.js using Brevo SMTP.',
};

transporter.sendMail(mailOptions)
  .then(info => {
    console.log('Email sent:', info.response);
  })
  .catch(err => {
    console.error('Error sending email:', err);
  });