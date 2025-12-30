const nodemailer = require('nodemailer');

// Cached transporter
let cachedTransporter = null;

// Create transporter - using Gmail
const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }
  
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  // Remove any quotes and extra spaces from app password
  const cleanPass = pass ? pass.replace(/['"]/g, '').trim() : '';
  
  if (!user || !cleanPass) {
    console.error('❌ Email credentials missing! Check your .env file.');
    return null;
  }
  
  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: cleanPass // Use App Password, not regular password
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates (for some networks)
    }
  });
  
  return cachedTransporter;
};

// Verify email connection
const verifyEmailConnection = async () => {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const cleanPass = pass ? pass.replace(/['"]/g, '').replace(/\s/g, '').trim() : '';
    
    console.log('📧 Email Config Check:');
    console.log('  - EMAIL_USER:', user ? `${user.substring(0, 5)}...@gmail.com` : '❌ NOT SET');
    console.log('  - EMAIL_PASS:', cleanPass ? `${cleanPass.length} chars (should be 16)` : '❌ NOT SET');
    
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Could not create transporter - credentials missing');
    }
    await transporter.verify();
    console.log('✅ Email server connection verified!');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    console.error('   Make sure your Gmail App Password is correct (16 chars without spaces)');
    console.error('   Get one from: https://myaccount.google.com/apppasswords');
    return false;
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP Email
const sendOTPEmail = async (email, otp, firstName = 'there') => {
  const transporter = createTransporter();
  const logoUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/logo-big.png`;
  
  const mailOptions = {
    from: {
      name: 'Mindora',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Verify Your Email - Mindora',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: #ffffff; border-radius: 16px 16px 0 0;">
                    <img src="${logoUrl}" alt="Mindora" style="height: 60px; margin-bottom: 12px;" />
                    <p style="margin: 0; color: #6B7280; font-size: 14px; font-weight: 500;">Study smarter, not harder.</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px 40px;">
                    <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 22px; font-weight: 600; font-family: 'Quicksand', sans-serif;">
                      Hey ${firstName}! 👋
                    </h2>
                    <p style="margin: 0 0 25px; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      Welcome to Mindora! To complete your registration, please use the verification code below:
                    </p>
                    
                    <!-- OTP Box with Brand Colors -->
                    <div style="background: linear-gradient(135deg, #E6F4F8, #D0EBF2); border: 2px solid #0073a0; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 10px; color: #0073a0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: 'Quicksand', sans-serif;">
                        Your Verification Code
                      </p>
                      <p style="margin: 0; color: #005a7f; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </p>
                    </div>
                    
                    <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      This code will expire in <strong style="color: #DC2626;">10 minutes</strong>.
                    </p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      If you didn't request this code, please ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: 'Quicksand', sans-serif;">
                      © ${new Date().getFullYear()} Mindora. All rights reserved.
                    </p>
                    <p style="margin: 10px 0 0; color: #9CA3AF; font-size: 11px; font-family: 'Quicksand', sans-serif;">
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send Welcome Email (after verification)
const sendWelcomeEmail = async (email, firstName = 'there') => {
  const transporter = createTransporter();
  const logoUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/logo-big.png`;
  const welcomeImageUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/welcome_aboard.png`;
  
  const mailOptions = {
    from: {
      name: 'Mindora',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Welcome to Mindora!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: #ffffff; border-radius: 16px 16px 0 0;">
                    <img src="${logoUrl}" alt="Mindora" style="height: 60px; margin-bottom: 12px;" />
                    <p style="margin: 0; color: #6B7280; font-size: 14px; font-weight: 500;">Study smarter, not harder.</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px 40px; text-align: center;">
                    <img src="${welcomeImageUrl}" alt="Welcome Aboard" style="max-width: 200px; margin-bottom: 20px;" />
                    <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; font-family: 'Quicksand', sans-serif;">
                      Welcome to Mindora, ${firstName}!
                    </h2>
                    <p style="margin: 0 0 25px; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      Your email has been verified successfully. You're now part of our learning community!
                    </p>
                    
                    <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: left;">
                      <p style="margin: 0 0 15px; color: #374151; font-weight: 600; font-family: 'Quicksand', sans-serif;">What's next?</p>
                      <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px; font-family: 'Quicksand', sans-serif;">• Explore learning resources</p>
                      <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px; font-family: 'Quicksand', sans-serif;">• Set your study goals</p>
                      <p style="margin: 0; color: #6B7280; font-size: 14px; font-family: 'Quicksand', sans-serif;">• Verify your student ID to unlock all features</p>
                    </div>
                    
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/app/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #0073a0, #005a7f); color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: 'Quicksand', sans-serif;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: 'Quicksand', sans-serif;">
                      © ${new Date().getFullYear()} Mindora. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw - welcome email is not critical
    return { success: false, error: error.message };
  }
};

// Send ID Verification Status Email
const sendVerificationStatusEmail = async (email, firstName, status, message = '') => {
  const transporter = createTransporter();
  const logoUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/logo-big.png`;
  
  const isApproved = status === 'verified';
  
  const mailOptions = {
    from: {
      name: 'Mindora',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: isApproved 
      ? 'Your ID has been verified - Mindora' 
      : 'ID Verification Update - Mindora',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: #ffffff; border-radius: 16px 16px 0 0;">
                    <img src="${logoUrl}" alt="Mindora" style="height: 60px; margin-bottom: 12px;" />
                    <p style="margin: 0; color: #6B7280; font-size: 14px; font-weight: 500;">Study smarter, not harder.</p>
                  </td>
                </tr>

                <!-- Status Banner -->
                <tr>
                  <td style="padding: 30px 40px; text-align: center; background: ${isApproved ? 'linear-gradient(135deg, #E6F4F8, #D0EBF2)' : 'linear-gradient(135deg, #FEF2F2, #FECACA)'};">
                    <h2 style="margin: 0; color: ${isApproved ? '#0073a0' : '#DC2626'}; font-size: 24px; font-weight: 700; font-family: 'Quicksand', sans-serif;">
                      ${isApproved ? 'ID Verified!' : 'Verification Update'}
                    </h2>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px 40px;">
                    <p style="margin: 0 0 20px; color: #1F2937; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      Hi ${firstName},
                    </p>
                    ${isApproved ? `
                      <p style="margin: 0 0 25px; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                        Great news! Your student ID has been verified. You now have full access to all Mindora features including:
                      </p>
                      <ul style="margin: 0 0 25px; padding-left: 20px; color: #6B7280; font-family: 'Quicksand', sans-serif;">
                        <li style="margin-bottom: 8px;">Upload and share notes</li>
                        <li style="margin-bottom: 8px;">Comment on resources</li>
                        <li style="margin-bottom: 8px;">Like and save content</li>
                        <li style="margin-bottom: 8px;">Join study groups</li>
                      </ul>
                    ` : `
                      <p style="margin: 0 0 15px; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                        Unfortunately, we couldn't verify your ID at this time.
                      </p>
                      ${message ? `
                        <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                          <p style="margin: 0; color: #991B1B; font-size: 14px; font-family: 'Quicksand', sans-serif;"><strong>Reason:</strong> ${message}</p>
                        </div>
                      ` : ''}
                      <p style="margin: 0; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                        You can try uploading a new ID photo from your profile settings.
                      </p>
                    `}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: 'Quicksand', sans-serif;">
                      © ${new Date().getFullYear()} Mindora. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification status email:', error);
    return { success: false, error: error.message };
  }
};

// Send Password Reset OTP Email
const sendPasswordResetOTP = async (email, otp, firstName = 'there') => {
  const transporter = createTransporter();
  const logoUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/logo-big.png`;
  
  const mailOptions = {
    from: {
      name: 'Mindora',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Reset Your Password - Mindora',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: #ffffff; border-radius: 16px 16px 0 0;">
                    <img src="${logoUrl}" alt="Mindora" style="height: 60px; margin-bottom: 12px;" />
                    <p style="margin: 0; color: #6B7280; font-size: 14px; font-weight: 500;">Study smarter, not harder.</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px 40px;">
                    <h2 style="margin: 0 0 20px; color: #1F2937; font-size: 22px; font-weight: 600; font-family: 'Quicksand', sans-serif;">
                      Reset Your Password
                    </h2>
                    <p style="margin: 0 0 25px; color: #6B7280; font-size: 16px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      Hey ${firstName}, we received a request to reset your password. Use the code below to proceed:
                    </p>
                    
                    <!-- OTP Box with Brand Colors -->
                    <div style="background: linear-gradient(135deg, #E6F4F8, #D0EBF2); border: 2px solid #0073a0; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 10px; color: #0073a0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: 'Quicksand', sans-serif;">
                        Your Reset Code
                      </p>
                      <p style="margin: 0; color: #005a7f; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </p>
                    </div>
                    
                    <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      This code will expire in <strong style="color: #DC2626;">10 minutes</strong>.
                    </p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px; line-height: 1.6; font-family: 'Quicksand', sans-serif;">
                      If you didn't request a password reset, please ignore this email or contact support if you're concerned.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: 'Quicksand', sans-serif;">
                      © ${new Date().getFullYear()} Mindora. All rights reserved.
                    </p>
                    <p style="margin: 10px 0 0; color: #9CA3AF; font-size: 11px; font-family: 'Quicksand', sans-serif;">
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendVerificationStatusEmail,
  sendPasswordResetOTP,
  verifyEmailConnection
};
