import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Ensure port is a number
  const port = Number(process.env.EMAIL_PORT) || 465;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: port,
    // --- FIX: Set secure to true ONLY if port is 465 ---
    secure: port === 465, 
    // ---------------------------------------------------
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `${process.env.EMAIL_USER}`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId); 
  } catch (error) {
    console.error('Error sending email: ', error); 
  }
};

export default sendEmail;