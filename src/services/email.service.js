import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

//config sendgrid api
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailService = {
async sendResetPasswordEmail(email, resetLink) {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Reset Your Password - Oil & Gas Management',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>You have requested to reset your password. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #4CAF50; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;
                    font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #4CAF50; word-break: break-all; font-size: 14px;">
          ${resetLink}
        </p>
        
        <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
          ⚠️ This link will expire in <strong>15 minutes</strong>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you did not request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Oil & Gas Management System<br/>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
    text: `Reset your password by clicking this link: ${resetLink}. This link will expire in 15 minutes.`,
  };

  try {
    console.log('📧 Sending password reset email to:', email);
    console.log('🔗 Reset link:', resetLink);
    
    await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid');
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw new Error('Failed to send email');
  }
},

  // OTP functions (nếu cần)
  async sendOtpEmail(email, otp) {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your OTP Code</h2>
          <p>Your OTP code is: <strong style="font-size: 24px; color: #4CAF50;">${otp}</strong></p>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      throw error;
    }
  },

  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
};
