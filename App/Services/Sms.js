const twilio = require('twilio');

// Replace with your Twilio credentials
const accountSid = 'your_account_sid';
const authToken = 'your_auth_token';
const client = new twilio(accountSid, authToken);

// Send SMS
client.messages
  .create({
    body: 'Hello from Node.js using Twilio!',
    from: '+1234567890', // Your Twilio number
    to: '+919876543210', // Recipient's number
  })
  .then(message => console.log(`Message sent! SID: ${message.sid}`))
  .catch(error => console.error('Error sending SMS:', error));
