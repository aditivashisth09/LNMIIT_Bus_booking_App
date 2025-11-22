import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  console.log("📧 EMAIL DEBUG: Attempting to send via Gmail...");
  console.log(`   - User: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use the built-in 'gmail' service preset
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // --- NETWORK FIXES ---
    family: 4, // Force IPv4 (Fixes the ETIMEDOUT issue)
    tls: {
        rejectUnauthorized: false // Prevent SSL handshake errors
    },
    // ---------------------
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
    // Don't throw error, just log it so the app doesn't crash
  }
};

export default sendEmail;