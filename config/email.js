const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM = `"TempSMS Pro" <${process.env.EMAIL_USER}>`;

const sendVerificationEmail = async (email, name, token) => {
  const url = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your TempSMS Pro account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">Welcome to TempSMS Pro, ${name}!</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">Verify Email</a>
        <p style="color:#64748b;font-size:13px">Link expires in 24 hours. If you did not create an account, ignore this email.</p>
      </div>`
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your TempSMS Pro password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">Password Reset Request</h2>
        <p>Hi ${name}, click the button below to reset your password.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">Reset Password</a>
        <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>`
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
