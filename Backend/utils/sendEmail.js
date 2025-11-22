import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`📧 EMAIL SERVICE: Connecting to ${host}:${port}...`);

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // True for 465, False for 587
    auth: {
      user: user,
      pass: pass,
    },
    // Standard timeouts
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000,
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
    // Do NOT throw the error. This allows the booking to succeed 
    // even if the email fails.
  }
};

export default sendEmail;