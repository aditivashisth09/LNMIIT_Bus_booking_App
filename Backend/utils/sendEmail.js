// /utils/sendEmail.js  (ES module, default export)
import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export default async function sendEmail({ to, subject, html, text, from }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not set');

  const payload = {
    sender: { email: from?.email ?? 'noreply@yourdomain.com', name: from?.name ?? 'My App' },
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const res = await axios.post(BREVO_API_URL, payload, {
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    timeout: 20000,
  });

  return res.data;
}
