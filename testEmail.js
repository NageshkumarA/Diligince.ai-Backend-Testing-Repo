require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "pitlaharshavardhan7@gmail.com",
      subject: "Test Email",
      text: "Hello! Nodemailer test successful ✅",
    });
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Email sending failed:", err);
  }
}

testEmail();
