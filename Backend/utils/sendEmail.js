import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Set to 'true' if port is 465, otherwise 'false' (like for port 587)
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
    // html: "<b>Hello world?</b>", // You can use HTML formatting
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId); // Check your backend console for this log!
  } catch (error) {
    console.error('Error sending email: ', error); // Check your backend console for this log!
  }
};

export default sendEmail;