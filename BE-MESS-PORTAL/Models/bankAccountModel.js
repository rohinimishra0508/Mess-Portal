import mongoose, { Schema } from 'mongoose';

// Financial details kept separate from the profile: sensitive PII and the
// foundation for payments / reimbursement.
const bankAccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    accountHolderName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
      minlength: [10, 'Account Number should contain more than 10 digits'],
      maxlength: [20, 'Account Number should contain less than 20 digits'],
      validate: {
        validator: (v) => /^[0-9]+$/.test(v),
        message: 'Account number must contain digits only',
      },
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Standard IFSC: 4 letters + 0 + 6 alphanumerics (e.g. SBIN0001234)
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid IFSC code!`,
      },
    },
    bankName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const bankAccountModel = mongoose.model('BankAccount', bankAccountSchema, 'BankAccounts');

/**
 * The subset of an account that is safe to hand to a client — drops the internal
 * `_id`/`userId`/timestamps. Returns `null` when the student has not added their
 * details yet, which callers render as an empty state.
 */
export const toBankAccountView = (bank) =>
  bank
    ? {
        accountHolderName: bank.accountHolderName ?? '',
        accountNumber: bank.accountNumber,
        ifscCode: bank.ifscCode,
        bankName: bank.bankName ?? '',
      }
    : null;

export default bankAccountModel;
