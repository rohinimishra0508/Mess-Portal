import { exportStudentsToCsv } from 'Admin/Pages/students/helpers/students.export';
import type { IStudentListRow } from 'Common/types/domain.types';

const captureCsv = (students: IStudentListRow[]): string => {
  let captured = '';
  const createObjectURL = jest.fn((blob: Blob) => {
    // jsdom Blobs expose no sync reader, so read the text we were handed.
    captured = (blob as unknown as { __text: string }).__text;
    return 'blob:mock';
  });

  const OriginalBlob = global.Blob;
  global.Blob = class extends OriginalBlob {
    __text: string;
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      this.__text = parts.join('');
    }
  } as unknown as typeof Blob;

  global.URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  global.URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  exportStudentsToCsv(students);

  global.Blob = OriginalBlob;
  return captured;
};

const student = (overrides: Partial<IStudentListRow> = {}): IStudentListRow => ({
  _id: 'u1',
  emailId: 'asha_2101cb61@iitp.ac.in',
  firstName: 'Asha',
  lastName: 'Rao',
  studentRoll: '2101CB61',
  phoneNumber: '9876543210',
  ...overrides,
});

it('includes the bank columns in the header', () => {
  const csv = captureCsv([student()]);
  const [header] = csv.split('\n');
  expect(header).toContain('Account Holder');
  expect(header).toContain('Bank Name');
  expect(header).toContain('Account Number');
  expect(header).toContain('IFSC Code');
});

it('writes the bank details and pins the account number to text', () => {
  const csv = captureCsv([
    student({
      bankAccount: {
        accountHolderName: 'Asha Rao',
        accountNumber: '12345678901234567',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
    }),
  ]);
  const row = csv.split('\n')[1];

  expect(row).toContain('Asha Rao');
  expect(row).toContain('State Bank of India');
  expect(row).toContain('SBIN0001234');
  // ="12345678901234567" survives CSV quote-escaping and stops Excel rounding it.
  expect(row).toContain('"=""12345678901234567"""');
});

it('leaves the bank columns blank for a student with no account', () => {
  const csv = captureCsv([student({ bankAccount: null })]);
  expect(csv.split('\n')[1]).toBe('2101CB61,Asha Rao,asha_2101cb61@iitp.ac.in,9876543210,,,,');
});

it('neutralises a formula smuggled into a free-text field', () => {
  const csv = captureCsv([
    student({
      bankAccount: {
        accountHolderName: '=HYPERLINK("http://evil.test")',
        accountNumber: '12345678901',
        ifscCode: 'SBIN0001234',
        bankName: '',
      },
    }),
  ]);
  const row = csv.split('\n')[1];

  expect(row).toContain(`"'=HYPERLINK(""http://evil.test"")"`);
  expect(row).not.toContain(',=HYPERLINK');
});
