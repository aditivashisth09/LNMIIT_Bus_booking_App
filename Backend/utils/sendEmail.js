import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`📧 EMAIL SERVICE: Connecting to ${host}:${port}...`);

 const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,  // must be false for 2525
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});


  const message = {
    from: `"LNMIIT Transport" <${user}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('✅ Message sent successfully. ID:', info.messageId);
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
  }
};

export default sendEmail;