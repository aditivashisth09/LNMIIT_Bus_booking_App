import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // Convert port to number to be safe
  const port = Number(process.env.EMAIL_HOST_PORT) || Number(process.env.EMAIL_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com', 
    port: port,
    // FIX: Automatically enable 'secure' (SSL) if using port 465
    secure: port === 465, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `"LNMIIT Transport" <${process.env.EMAIL_USER}>`, 
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