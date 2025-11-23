import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    // Use the built-in 'gmail' service (Replaces host/port/secure lines)
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER, // Your existing .env variable
      pass: process.env.EMAIL_PASS, // Your existing .env variable
    },
    // CRITICAL: Keep these timeouts. 
    // If your cloud server blocks Gmail, these stop the app from "hanging" forever.
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
  });

  const message = {
    from: `"LNMIIT Transport" <${process.env.EMAIL_USER}>`, 
    to: options.email,
    subject: options.subject,
    text: options.message,
    // You can add HTML here if you want formatted emails like in your snippet
    // html: options.html 
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error);
    // We throw the error so the Controller knows to log it, 
    // but the Controller's try/catch will prevent the app from crashing.
    throw error; 
  }
};

export default sendEmail;