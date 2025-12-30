const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Email Service
 * Handles all email sending functionality
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the email transporter
   */
  async initialize() {
    if (this.initialized) return;

    // Check for required config
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.warn('⚠️ Email service not configured. OTP emails will be logged to console.');
      this.initialized = true;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: config.SMTP_SECURE === 'true',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('✅ Email service initialized and verified');
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      console.error('   Check your SMTP credentials and settings');
      // Keep the transporter to allow retry
    }

    this.initialized = true;
  }

  /**
   * Send OTP verification email
   */
  async sendOTP(email, otp, username) {
    await this.initialize();

    const subject = 'Verify Your KANIFLIX Account';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #141414;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1f1f1f; border-radius: 12px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #e50914 0%, #b20710 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 2px;">KANIFLIX</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Welcome, ${username}!</h2>
                    <p style="margin: 0 0 30px; color: #b3b3b3; font-size: 16px; line-height: 1.6;">
                      Thank you for signing up for KANIFLIX. To complete your registration and start streaming, please verify your email address with the code below:
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 30px 0;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #e50914 0%, #b20710 100%); padding: 20px 50px; border-radius: 8px;">
                        <span style="font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 8px;">${otp}</span>
                      </div>
                    </div>
                    
                    <p style="margin: 30px 0 0; color: #b3b3b3; font-size: 14px; line-height: 1.6;">
                      This code will expire in <strong style="color: #e50914;">10 minutes</strong>.
                    </p>
                    <p style="margin: 10px 0 0; color: #b3b3b3; font-size: 14px; line-height: 1.6;">
                      If you didn't create a KANIFLIX account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #181818; border-top: 1px solid #333;">
                    <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} KANIFLIX. All rights reserved.
                    </p>
                    <p style="margin: 10px 0 0; color: #666; font-size: 12px; text-align: center;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // If transporter is not configured, log to console (development mode)
    if (!this.transporter) {
      console.log('\n📧 ========== EMAIL (DEV MODE) ==========');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`OTP Code: ${otp}`);
      console.log('=========================================\n');
      return { success: true, dev: true };
    }

    try {
      // Use SMTP_FROM if set, otherwise use SMTP_USER
      const fromAddress = config.SMTP_FROM || config.SMTP_USER;
      
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html
      });

      console.log(`📧 OTP email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetToken, username) {
    await this.initialize();

    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your KANIFLIX Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #141414;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1f1f1f; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #e50914 0%, #b20710 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">KANIFLIX</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Password Reset Request</h2>
                    <p style="margin: 0 0 30px; color: #b3b3b3; font-size: 16px; line-height: 1.6;">
                      Hi ${username}, we received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #e50914 0%, #b20710 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Reset Password
                      </a>
                    </div>
                    <p style="margin: 30px 0 0; color: #b3b3b3; font-size: 14px;">
                      This link expires in 1 hour. If you didn't request this, ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; background-color: #181818; border-top: 1px solid #333;">
                    <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} KANIFLIX. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!this.transporter) {
      console.log('\n📧 ========== EMAIL (DEV MODE) ==========');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('=========================================\n');
      return { success: true, dev: true };
    }

    try {
      const fromAddress = config.SMTP_FROM || config.SMTP_USER;
      
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();
