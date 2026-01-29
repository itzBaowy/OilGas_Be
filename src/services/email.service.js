import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

//config sendgrid api
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailService = {
  async sendResetPasswordEmail(email, otp) {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'OTP Reset Password - Oil & Gas Management',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Bạn đã yêu cầu reset mật khẩu. Sử dụng mã OTP bên dưới:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">
                ${otp}
              </span>
            </div>
          </div>
          <p style="text-align: center; color: #666; font-size: 14px;">
            Mã OTP có hiệu lực trong <strong>5 phút</strong>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ⚠️ Không chia sẻ mã này với bất kỳ ai.
          </p>
          <p style="color: #666; font-size: 14px;">
            Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
      text: `Mã OTP reset password của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,
    };

    try {
      console.log('📧 Sending OTP email to:', email);
      console.log('🔢 OTP:', otp);
      
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
