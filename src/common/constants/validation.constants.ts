export const ValidationConstants = {
  // Authentication related
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,

  // User related
  NAME_MIN_LENGTH: 2,

  // Email related
  VERIFICATION_CODE_LENGTH: 6,

  // Company Note related
  COMPANY_NOTE_MIN_LENGTH: 1, // Only when content is provided
  COMPANY_NOTE_MAX_LENGTH: 5000,
};
