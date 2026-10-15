export interface IProfileFormValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

/** Bank fields are optional as a group, but all-or-nothing once one is filled. */
export const BANK_FIELD_KEYS = [
  'accountHolderName',
  'accountNumber',
  'ifscCode',
  'bankName',
] as const satisfies ReadonlyArray<keyof IProfileFormValues>;

export type BankFieldKey = (typeof BANK_FIELD_KEYS)[number];
