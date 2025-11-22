import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  console.log("📧 EMAIL DEBUG: Starting email send process...");
  console.log(`   - Host: smtp.gmail.com (Forced)`);
  console.log(`   - Port: 465 (Forced)`);
  console.log(`   - Secure: true (Forced)`);
  console.log(`   - User: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Force Gmail Host
    port: 465,              // Force SSL Port
    secure: true,           // Force Secure Connection
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Add timeouts to fail faster if it hangs
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
  });

  const message = {
    from: `"LNMIIT Bus App" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('✅ Message sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ FATAL EMAIL ERROR:', error);
    // We don't throw the error here to prevent crashing the booking process
  }
};

export default sendEmail;