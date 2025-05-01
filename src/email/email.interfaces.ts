export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailContext {
  username: string;
  resetLink: string;
  expiresIn: string; // e.g., "60 minutes"
}

export interface EmailChangeEmailContext {
  username: string;
  verificationCode: string;
  newEmail: string;
  expiresIn: string;
}
