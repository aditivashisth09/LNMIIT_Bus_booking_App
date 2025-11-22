import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  console.log("📧 EMAIL DEBUG: Attempting to send via Port 587 (STARTTLS)...");
  console.log(`   - User: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,      // Change to 587
    secure: false,  // MUST be false for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // --- CRITICAL SETTINGS FOR CLOUD SERVERS ---
    family: 4, // Force IPv4
    tls: {
        rejectUnauthorized: false, // Ignore certificate errors
        ciphers: 'SSLv3'           // Use compatible cipher
    },
    // -------------------------------------------
    connectionTimeout: 10000, // Fail fast (10s)
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
    // We catch the error so the user's booking doesn't crash
  }
};

export default sendEmail;