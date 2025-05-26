import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: '8dfe1e002@smtp-brevo.com', // <-- Your Brevo SMTP user
    pass: 'Rbha60BLFyJv1X5C', // <-- Your Brevo SMTP password
  },
});

const mailOptions = {
  from: '"LiveCampus" <livecampuss@gmail.com>', // <-- Use your verified Gmail address
  to: 'chilukuriharsha116@gmail.com', // <-- The email address you want to test with
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