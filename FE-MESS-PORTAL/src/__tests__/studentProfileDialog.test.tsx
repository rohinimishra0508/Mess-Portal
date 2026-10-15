import { render, screen } from '@testing-library/react';
import { skipToken } from '@reduxjs/toolkit/query/react';

import StudentProfileDialog from 'Admin/Pages/students/components/studentProfileDialog';
import type { IStudentListRow } from 'Common/types/domain.types';

const mockUseGetStudentBankDetailsQuery = jest.fn();

jest.mock('Redux/Slices/Common/StudentApi', () => ({
  useGetStudentBankDetailsQuery: (...args: unknown[]) =>
    mockUseGetStudentBankDetailsQuery(...args),
}));

const student: IStudentListRow = {
  _id: 'user-1',
  emailId: 'asha_2101cb61@iitp.ac.in',
  firstName: 'Asha',
  lastName: 'Rao',
  studentRoll: '2101CB61',
  phoneNumber: '9876543210',
};

const setBankState = (state: Record<string, unknown>) =>
  mockUseGetStudentBankDetailsQuery.mockReturnValue({
    data: undefined,
    isFetching: false,
    isError: false,
    ...state,
  });

beforeEach(() => mockUseGetStudentBankDetailsQuery.mockReset());

it('shows the fetched bank details alongside the profile', () => {
  setBankState({
    data: {
      accountHolderName: 'Asha Rao',
      accountNumber: '12345678901',
      ifscCode: 'SBIN0001234',
      bankName: 'State Bank of India',
    },
  });

  render(<StudentProfileDialog student={student} onClose={jest.fn()} />);

  expect(screen.getByText('Bank Details')).toBeInTheDocument();
  expect(screen.getByText('12345678901')).toBeInTheDocument();
  expect(screen.getByText('SBIN0001234')).toBeInTheDocument();
  expect(screen.getByText('State Bank of India')).toBeInTheDocument();
});

it('shows an empty state when the student has not added bank details', () => {
  setBankState({ data: null });

  render(<StudentProfileDialog student={student} onClose={jest.fn()} />);

  expect(
    screen.getByText('This student has not added their bank details yet.'),
  ).toBeInTheDocument();
});

it('shows an error when the lookup fails', () => {
  setBankState({ isError: true });

  render(<StudentProfileDialog student={student} onClose={jest.fn()} />);

  expect(screen.getByText('Could not load bank details.')).toBeInTheDocument();
});

it('skips the bank lookup while no student is selected', () => {
  setBankState({});

  render(<StudentProfileDialog student={null} onClose={jest.fn()} />);

  expect(screen.queryByText('Bank Details')).not.toBeInTheDocument();
  // skipToken, not an id — no request is issued for a closed dialog.
  expect(mockUseGetStudentBankDetailsQuery).toHaveBeenCalledWith(skipToken);
});
