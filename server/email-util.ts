import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  username: string
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured');
    throw new Error('Email service is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: resendApiKey,
    },
  });

  const resetUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: 'Queen City Elite <noreply@queencityelite.com>',
    to: toEmail,
    subject: 'Password Reset Request - Queen City Elite Front Desk',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #334155 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${username}</strong>,</p>
              
              <p>We received a request to reset your password for your Queen City Elite Front Desk Management System account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #1e40af;"><a href="${resetUrl}">${resetUrl}</a></p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged</li>
                </ul>
              </div>
              
              <p>If you have any questions or concerns, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Queen City Elite LLC</p>
              <p>Front Desk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${username},

We received a request to reset your password for your Queen City Elite Front Desk Management System account.

To reset your password, click the following link or copy and paste it into your browser:
${resetUrl}

⚠️ Security Notice:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Your password will remain unchanged

If you have any questions or concerns, please contact your system administrator.

© ${new Date().getFullYear()} Queen City Elite LLC
Front Desk Management System
    `,
  };

  await transporter.sendMail(mailOptions);
}
