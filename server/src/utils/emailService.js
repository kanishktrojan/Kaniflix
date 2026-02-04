const axios = require('axios');
const { Resend } = require('resend');
const config = require('../config');

/**
 * Email Service
 * Supports two modes controlled via admin settings:
 * 1. Third Party Service (Resend) - Direct API integration
 * 2. Kaniflix Service - External microservice via HTTP
 */
class EmailService {
  constructor() {
    this.resend = null;
    this.initialized = false;
    this.Settings = null; // Will be set lazily to avoid circular dependency
  }

  /**
   * Get the Settings model (lazy load to avoid circular dependency)
   */
  getSettingsModel() {
    if (!this.Settings) {
      this.Settings = require('../models/Settings');
    }
    return this.Settings;
  }

  /**
   * Get current email service settings from database
   */
  async getEmailSettings() {
    try {
      const Settings = this.getSettingsModel();
      const settings = await Settings.getSetting('email_service');
      return settings || {
        provider: 'third_party', // Default to Resend
        kaniflixServiceUrl: config.EMAIL_SERVICE_URL,
        kaniflixServiceApiKey: config.EMAIL_SERVICE_API_KEY
      };
    } catch (error) {
      console.warn('⚠️ Could not load email settings, using defaults');
      return {
        provider: 'third_party',
        kaniflixServiceUrl: config.EMAIL_SERVICE_URL,
        kaniflixServiceApiKey: config.EMAIL_SERVICE_API_KEY
      };
    }
  }

  /**
   * Get or create the Resend client
   */
  getResendClient() {
    if (!config.RESEND_API_KEY) {
      return null;
    }
    if (!this.resend) {
      this.resend = new Resend(config.RESEND_API_KEY);
    }
    return this.resend;
  }

  /**
   * Initialize the email service
   */
  async initialize() {
    if (this.initialized) return;

    const settings = await this.getEmailSettings();
    
    if (settings.provider === 'third_party') {
      if (!config.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured. Emails will be logged to console.');
      } else {
        console.log('✅ Email Service ready (Resend - Third Party)');
      }
    } else {
      if (!settings.kaniflixServiceUrl) {
        console.warn('⚠️ Kaniflix Email Service URL not configured. Emails will be logged to console.');
      } else {
        console.log(`✅ Email Service ready (Kaniflix Service: ${settings.kaniflixServiceUrl})`);
      }
    }

    this.initialized = true;
  }

  /**
   * Send email via Resend (Third Party)
   */
  async sendViaResend({ to, subject, html }) {
    const client = this.getResendClient();
    
    if (!client) {
      console.log('\n📧 ========== EMAIL (DEV MODE - Resend not configured) ==========');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Length: ${html.length} chars`);
      console.log('================================================================\n');
      return { success: true, dev: true };
    }

    try {
      const fromAddress = config.EMAIL_FROM || 'KANIFLIX <noreply@kaniflix.in>';
      
      const { data, error } = await client.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html
      });

      if (error) {
        console.error('❌ Resend error:', error.message);
        throw new Error(error.message);
      }

      console.log(`📧 Email sent via Resend to ${to}: ${data.id}`);
      return { success: true, messageId: data.id, provider: 'resend' };
    } catch (error) {
      console.error('❌ Resend error:', error.message);
      throw error;
    }
  }

  /**
   * Send email via Kaniflix Service (external microservice)
   */
  async sendViaKaniflixService({ to, subject, html }, settings) {
    const serviceUrl = settings.kaniflixServiceUrl || config.EMAIL_SERVICE_URL;
    const apiKey = settings.kaniflixServiceApiKey || config.EMAIL_SERVICE_API_KEY;

    if (!serviceUrl) {
      console.log('\n📧 ========== EMAIL (DEV MODE - Kaniflix Service not configured) ==========');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Length: ${html.length} chars`);
      console.log('==========================================================================\n');
      return { success: true, dev: true };
    }

    const targetUrl = `${serviceUrl}/send`;
    console.log(`📧 Attempting to send email to ${to} via Kaniflix Service: ${targetUrl}`);

    try {
      const response = await axios.post(
        targetUrl,
        { to, subject, html },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'X-API-Key': apiKey })
          },
          timeout: 60000
        }
      );

      console.log(`📧 Email sent via Kaniflix Service to ${to}`);
      return { ...response.data, provider: 'kaniflix_service' };
    } catch (error) {
      console.error('❌ Kaniflix Service error details:');
      console.error('   URL:', targetUrl);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Failed to send email via Kaniflix Service: ${errorMessage}`);
    }
  }

  /**
   * Send email using the configured provider
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, html }) {
    await this.initialize();

    const settings = await this.getEmailSettings();
    
    if (settings.provider === 'kaniflix_service') {
      return this.sendViaKaniflixService({ to, subject, html }, settings);
    } else {
      // Default to Resend (third_party)
      return this.sendViaResend({ to, subject, html });
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOTP(email, otp, username) {
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

    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetToken, username) {
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

    return this.sendEmail({ to: email, subject, html });
  }
}

module.exports = new EmailService();
