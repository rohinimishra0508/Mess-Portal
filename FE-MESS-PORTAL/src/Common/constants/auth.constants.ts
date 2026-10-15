export const STUDENT_EMAIL_REGEX =
  /^[a-zA-Z]+_[0-9]{4}(cb|cs|me|ce|ph|ee|mc|mm)[0-9]{2}@iitp\.ac\.in$/;

export const STUDENT_ROLL_REGEX = /^[0-9]{4}(CB|CS|ME|CE|PH|EE|MC|MM|AI)[0-9]{2}$/;

export const PHONE_REGEX = /^\d{10}$/;

/** Standard IFSC: 4 letters + 0 + 6 alphanumerics (e.g. SBIN0001234). */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const ACCOUNT_NUMBER_REGEX = /^\d{10,20}$/;

export const PASSWORD_MIN_LENGTH = 6;
export const STUDENT_NAME_MIN_LENGTH = 4;
export const STUDENT_NAME_MAX_LENGTH = 20;
