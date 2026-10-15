import * as yup from 'yup';
import {
  ACCOUNT_NUMBER_REGEX,
  IFSC_REGEX,
  PHONE_REGEX,
  STUDENT_NAME_MAX_LENGTH,
} from 'Common/constants/auth.constants';
import { BANK_FIELD_KEYS, type IProfileFormValues } from '../constants/profile.interfaces';

const BANK_HOLDER_MAX_LENGTH = 60;
const BANK_NAME_MAX_LENGTH = 60;

/**
 * True once the student has typed into any bank field. Read off `this.parent`
 * instead of yup's `when()` because account number and IFSC each require the
 * other, and mutual `when()` refs make yup throw a cyclic-dependency error.
 */
const hasAnyBankValue = (parent: Partial<IProfileFormValues>): boolean =>
  BANK_FIELD_KEYS.some((key) => Boolean(parent[key]?.trim()));

function requiredWithBankDetails(this: yup.TestContext, value?: string): boolean {
  return !hasAnyBankValue(this.parent) || Boolean(value?.trim());
}

export const PROFILE_SCHEMA: yup.ObjectSchema<IProfileFormValues> = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .trim()
    .max(STUDENT_NAME_MAX_LENGTH, `First name cannot exceed ${STUDENT_NAME_MAX_LENGTH} characters`),
  lastName: yup
    .string()
    .trim()
    .max(STUDENT_NAME_MAX_LENGTH, `Last name cannot exceed ${STUDENT_NAME_MAX_LENGTH} characters`)
    .default(''),
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(PHONE_REGEX, 'Phone number must be exactly 10 digits'),
  accountHolderName: yup
    .string()
    .trim()
    .max(
      BANK_HOLDER_MAX_LENGTH,
      `Account holder name cannot exceed ${BANK_HOLDER_MAX_LENGTH} characters`,
    )
    .default(''),
  accountNumber: yup
    .string()
    .trim()
    .test(
      'account-number-required',
      'Account number is required to save bank details',
      requiredWithBankDetails,
    )
    .matches(ACCOUNT_NUMBER_REGEX, {
      message: 'Account number must be 10 to 20 digits',
      excludeEmptyString: true,
    })
    .default(''),
  ifscCode: yup
    .string()
    .trim()
    // Stored uppercase by the API, so normalise here and let the user type either case.
    .transform((value: unknown) => (typeof value === 'string' ? value.toUpperCase() : value))
    .test('ifsc-required', 'IFSC code is required to save bank details', requiredWithBankDetails)
    .matches(IFSC_REGEX, {
      message: 'Enter a valid IFSC code (e.g. SBIN0001234)',
      excludeEmptyString: true,
    })
    .default(''),
  bankName: yup
    .string()
    .trim()
    .max(BANK_NAME_MAX_LENGTH, `Bank name cannot exceed ${BANK_NAME_MAX_LENGTH} characters`)
    .default(''),
});
