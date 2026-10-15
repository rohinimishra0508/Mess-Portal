import { PROFILE_SCHEMA } from 'Student/Pages/profile/helpers/profile.schema';

const base = {
  firstName: 'Asha',
  lastName: '',
  phoneNumber: '9876543210',
  accountHolderName: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
};

const validate = async (values: Record<string, string>) => {
  try {
    const cast = await PROFILE_SCHEMA.validate(values, { abortEarly: false });
    return { ok: true, cast, errors: [] as string[] };
  } catch (e) {
    const err = e as { inner?: { path?: string; message: string }[]; message: string };
    return {
      ok: false,
      cast: null,
      errors: (err.inner ?? []).map((i) => `${i.path}: ${i.message}`),
    };
  }
};

it('accepts an empty bank section', async () => {
  const r = await validate(base);
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
});

it('requires account number + ifsc once any bank field is filled', async () => {
  const r = await validate({ ...base, bankName: 'SBI' });
  expect(r.ok).toBe(false);
  expect(r.errors.sort()).toEqual([
    'accountNumber: Account number is required to save bank details',
    'ifscCode: IFSC code is required to save bank details',
  ]);
});

it('accepts a complete bank section and uppercases the ifsc', async () => {
  const r = await validate({
    ...base,
    accountHolderName: 'Asha Rao',
    accountNumber: '12345678901',
    ifscCode: 'sbin0001234',
    bankName: 'SBI',
  });
  expect(r.errors).toEqual([]);
  expect(r.cast?.ifscCode).toBe('SBIN0001234');
});

it('rejects a malformed ifsc and a non-numeric / short account number', async () => {
  const r = await validate({ ...base, accountNumber: '12ab', ifscCode: 'SBI123' });
  expect(r.errors.sort()).toEqual([
    'accountNumber: Account number must be 10 to 20 digits',
    'ifscCode: Enter a valid IFSC code (e.g. SBIN0001234)',
  ]);
});
