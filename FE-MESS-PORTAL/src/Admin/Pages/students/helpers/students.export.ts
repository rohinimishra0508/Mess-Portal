import type { IStudentListRow } from 'Common/types/domain.types';
import { STUDENTS_CSV_FILENAME } from '../constants/students.general';

const HEADERS = [
  'Roll',
  'Name',
  'Email',
  'Phone',
  'Account Holder',
  'Bank Name',
  'Account Number',
  'IFSC Code',
];

// Byte-order mark (U+FEFF) so Excel opens the CSV as UTF-8.
const BOM = String.fromCharCode(0xfeff);

const escapeCsv = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * A bare 11+ digit account number is read by Excel as a number and shown as
 * `1.23457E+10`; past 15 digits it is rounded and the value is destroyed
 * outright. The `="…"` form pins the cell to text so the number survives.
 *
 * Only ever applied to server-validated digit strings — never to free text,
 * since a leading `=` is exactly what `neutralise` exists to prevent.
 */
const asExcelText = (digits?: string): string => (digits ? `="${digits}"` : '');

/**
 * Blocks spreadsheet formula injection: a student could set their name or bank
 * name to `=HYPERLINK(...)`, which Excel would execute when the admin opens the
 * export. Prefixing with an apostrophe forces the cell to be read as text.
 */
const neutralise = (value?: string): string => {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

// Exports the student list as a UTF-8 CSV (opens directly in Excel).
export const exportStudentsToCsv = (students: ReadonlyArray<IStudentListRow>): void => {
  const rows = students.map((student) =>
    [
      neutralise(student.studentRoll),
      neutralise([student.firstName, student.lastName].filter(Boolean).join(' ')),
      neutralise(student.emailId),
      neutralise(student.phoneNumber),
      neutralise(student.bankAccount?.accountHolderName),
      neutralise(student.bankAccount?.bankName),
      asExcelText(student.bankAccount?.accountNumber),
      neutralise(student.bankAccount?.ifscCode),
    ]
      .map((field) => escapeCsv(String(field ?? '')))
      .join(','),
  );

  const csv = BOM + [HEADERS.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = STUDENTS_CSV_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
};
