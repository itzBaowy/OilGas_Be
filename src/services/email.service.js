import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const emailService = {
  // Tạo transporter với cấu hình email của bạn
  createTransporter() {
    return createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  },

  // Gửi email OTP reset password
  async sendResetPasswordEmail(email, otp) {
    const transporter = this.createTransporter();
    
    const mailOptions = {
      from: `${process.env.MAIL_FROM_NAME || 'EVChargingSystem'} <${process.env.EMAIL_USER}>`,
      to: email,
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
      
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      throw new Error('Failed to send email');
    }
  },

  // OTP functions (nếu cần)
  async sendOtpEmail(email, otp) {
    const transporter = this.createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
};
