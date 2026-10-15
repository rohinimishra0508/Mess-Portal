import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

import { skipToken } from '@reduxjs/toolkit/query/react';

import { useGetStudentBankDetailsQuery } from 'Redux/Slices/Common/StudentApi';
import type { IStudentListRow } from 'Common/types/domain.types';

import './studentProfileDialog.scss';

interface IStudentProfileDialogProps {
  student: IStudentListRow | null;
  onClose: () => void;
}

interface IDetailRow {
  label: string;
  value?: string;
}

const BANK_TITLE = 'Bank Details';
const BANK_EMPTY = 'This student has not added their bank details yet.';
const BANK_ERROR = 'Could not load bank details.';

const DetailRows = ({ rows }: { rows: ReadonlyArray<IDetailRow> }) => (
  <>
    {rows.map((row) => (
      <Box key={row.label} className='studentProfileDialog__row'>
        <Typography variant='semiBoldLabelM' component='span'>
          {row.label}
        </Typography>
        <Typography variant='textM' component='span'>
          {row.value || '—'}
        </Typography>
      </Box>
    ))}
  </>
);

const StudentProfileDialog = ({ student, onClose }: IStudentProfileDialogProps) => {
  // Bank details live behind their own endpoint, so they are only fetched for
  // the student whose profile is actually open.
  const {
    data: bank,
    isFetching: isLoadingBank,
    isError: isBankError,
  } = useGetStudentBankDetailsQuery(student?._id ?? skipToken);

  const fullName = student ? [student.firstName, student.lastName].filter(Boolean).join(' ') : '';
  const details: IDetailRow[] = student
    ? [
        { label: 'Roll No.', value: student.studentRoll },
        { label: 'Name', value: fullName },
        { label: 'Email', value: student.emailId },
        { label: 'Contact No.', value: student.phoneNumber },
      ]
    : [];

  const bankDetails: IDetailRow[] = bank
    ? [
        { label: 'Account Holder', value: bank.accountHolderName },
        { label: 'Bank Name', value: bank.bankName },
        { label: 'Account No.', value: bank.accountNumber },
        { label: 'IFSC Code', value: bank.ifscCode },
      ]
    : [];

  const renderBankSection = () => {
    if (isLoadingBank) {
      return <Skeleton variant='rounded' height={96} />;
    }
    if (isBankError) {
      return <Alert severity='error'>{BANK_ERROR}</Alert>;
    }
    if (!bank) {
      return (
        <Typography variant='textM' className='studentProfileDialog__empty'>
          {BANK_EMPTY}
        </Typography>
      );
    }
    return (
      <Box className='studentProfileDialog__details'>
        <DetailRows rows={bankDetails} />
      </Box>
    );
  };

  return (
    <Dialog open={Boolean(student)} onClose={onClose} maxWidth='sm' fullWidth>
      {student && (
        <>
          <DialogTitle className='studentProfileDialog__title'>
            <span>{fullName}&apos;s Profile</span>
            <IconButton size='small' onClick={onClose} aria-label='Close'>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box className='studentProfileDialog__body'>
              <Avatar src={student.avatar?.url} className='studentProfileDialog__avatar'>
                {student.firstName?.charAt(0).toUpperCase()}
              </Avatar>
              <Box className='studentProfileDialog__details'>
                <DetailRows rows={details} />
              </Box>
            </Box>

            <Divider className='studentProfileDialog__divider' />

            <Typography
              variant='headingS'
              component='h3'
              className='studentProfileDialog__sectionTitle'
            >
              {BANK_TITLE}
            </Typography>
            {renderBankSection()}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default StudentProfileDialog;
