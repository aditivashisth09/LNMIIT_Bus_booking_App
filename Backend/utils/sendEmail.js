// send-with-brevo-api.js
const axios = require('axios');

async function sendEmail() {
  const API_KEY = process.env.BREVO_API_KEY; // create and store in env
  const data = {
    sender: { name: "My App", email: "noreply@yourdomain.com" },
    to: [{ email: "user@example.com", name: "User" }],
    subject: "Test",
    htmlContent: "<h1>Hello</h1><p>This is a test</p>"
  };

  const res = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    data,
    { headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' } }
  );
  console.log('Brevo response', res.data);
}

sendEmail().catch(err => console.error(err.response?.data || err.message));
