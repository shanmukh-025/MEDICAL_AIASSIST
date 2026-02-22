const nodemailer = require('nodemailer');

/**
 * Send a professional email for password reset
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - The unique reset link
 * @param {string} userName - The name of the user
 */
const sendResetEmail = async (to, resetUrl, userName) => {
    // Create a transporter using environment variables
    // For production, use a service like SendGrid, Amazon SES, or a Gmail App Password
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Use an "App Password" if using Gmail
        },
    });

    const mailOptions = {
        from: `"MediAssist AI" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Password Reset Request - MediAssist AI',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #059669; margin: 0;">MediAssist AI</h1>
          <p style="color: #64748b; font-size: 14px;">Your Digital Health Assistant</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi ${userName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            We received a request to reset the password for your MediAssist AI account. 
            Click the button below to set up a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset My Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #059669;">${resetUrl}</span>
          </p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} MediAssist AI. All rights reserved.
        </div>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw new Error('Failed to send reset email');
    }
};

module.exports = { sendResetEmail };
