import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  // CRITICAL:
  // 1. If you have a verified domain, use: 'LNMIIT Transport <admin@yourdomain.com>'
  // 2. If testing without a domain, use: 'onboarding@resend.dev'
  // You CANNOT use @gmail.com addresses here.
  const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: options.email,
      subject: options.subject,
      // Resend supports HTML. We use your plain text message inside a generic HTML wrapper
      html: `<p style="white-space: pre-wrap;">${options.message}</p>`, 
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully via Resend:', data.id);
    return data;
  } catch (error) {
    console.error('Error sending email:', error.message);
    // Throwing ensures your controller knows it failed (and logs it)
    throw error;
  }
};

export default sendEmail;