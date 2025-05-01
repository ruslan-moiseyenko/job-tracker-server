import {
  EmailChangeEmailContext,
  EmailTemplate,
  PasswordResetEmailContext,
} from './email.interfaces';

export class EmailTemplates {
  /**
   * Template for password reset emails
   */
  static passwordReset(context: PasswordResetEmailContext): EmailTemplate {
    const { username, resetLink, expiresIn } = context;

    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. Click the button below to reset your password:</p>
          <div style="margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in ${expiresIn}.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Thank you,<br>The Job Tracker Team</p>
        </div>
      `,
      text: `
        Reset Your Password
        
        Hello ${username},
        
        We received a request to reset your password. Please use the following link to reset your password:
        
        ${resetLink}
        
        This link will expire in ${expiresIn}.
        
        If you didn't request this, you can safely ignore this email.
        
        Thank you,
        The Job Tracker Team
      `,
    };
  }

  /**
   * Template for email verification when changing email
   */
  static emailChange(context: EmailChangeEmailContext): EmailTemplate {
    const { username, verificationCode, newEmail, expiresIn } = context;

    return {
      subject: 'Your Email Change Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your New Email Address</h2>
          <p>Hello ${username},</p>
          <p>You recently requested to change your email address to <strong>${newEmail}</strong>.</p>
          <p>Please use the following verification code to confirm this change:</p>
          <div style="margin: 25px 0; text-align: center;">
            <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px; display: inline-block;">
              ${verificationCode}
            </div>
          </div>
          <p>This code will expire in ${expiresIn}.</p>
          <p>If you didn't request this change, please ignore this email or contact our support team immediately.</p>
          <p>Thank you,<br>The Job Tracker Team</p>
        </div>
      `,
      text: `
        Verify Your New Email Address
        
        Hello ${username},
        
        You recently requested to change your email address to ${newEmail}.
        
        Please use the following verification code to confirm this change:
        
        ${verificationCode}
        
        This code will expire in ${expiresIn}.
        
        If you didn't request this change, please ignore this email or contact our support team immediately.
        
        Thank you,
        The Job Tracker Team
      `,
    };
  }
}
