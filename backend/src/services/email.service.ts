import nodemailer from 'nodemailer';
import config from '../config.js';

// Create transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
  });
};

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"KIIT SmartBus" <${config.emailUser}>`,
    to: email,
    subject: 'Password Reset OTP - KIIT SmartBus',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 50px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; text-align: center; }
          .otp { font-size: 36px; font-weight: bold; color: #16a34a; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; display: inline-block; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Password Reset Request</h1></div>
          <div class="content">
            <p>You have requested to reset your password for KIIT SmartBus.</p>
            <p>Use the OTP below to proceed:</p>
            <div class="otp">${otp}</div>
            <p style="color: #6c757d;">This OTP is valid for 10 minutes.</p>
            <p style="color: #6c757d;">If you did not request this, please ignore this email.</p>
          </div>
          <div class="footer"><p>© 2025 KIIT SmartBus. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

export async function sendEmailVerificationOtp(email: string, otp: string, name: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"KIIT SmartBus" <${config.emailUser}>`,
    to: email,
    subject: 'Email Verification - KIIT SmartBus',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 50px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; text-align: center; }
          .otp { font-size: 36px; font-weight: bold; color: #16a34a; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; display: inline-block; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Email Verification</h1></div>
          <div class="content">
            <h2>Hello, ${name}!</h2>
            <p>Welcome to <strong>KIIT SmartBus</strong>. Please verify your email address using the OTP below:</p>
            <div class="otp">${otp}</div>
            <p style="color: #6c757d;">This OTP is valid for 10 minutes.</p>
            <p style="color: #6c757d;">If you did not register, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2025 KIIT SmartBus. All rights reserved.</p>
            <p>School of Computer Engineering, KIIT University</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  let attempts = 0;
  while (attempts < 2) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification OTP email sent:', info.messageId);
      return;
    } catch (error: any) {
      attempts++;
      console.error(`Email sending error (attempt ${attempts}):`, error.message);
      if (attempts < 2) await new Promise((r) => setTimeout(r, 3000));
      else throw new Error('Failed to send verification email after 2 attempts');
    }
  }
}
