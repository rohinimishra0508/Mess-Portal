import _map from 'lodash/map';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import type { IStudentListRow } from 'Common/types/domain.types';

interface IRenderStudentRowsArgs {
  students: ReadonlyArray<IStudentListRow>;
  onView: (student: IStudentListRow) => void;
  startIndex?: number;
}

export const renderStudentRows = ({ students, onView, startIndex = 0 }: IRenderStudentRowsArgs) =>
  _map(students, (student, index) => {
    const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
    return (
      <TableRow key={student._id} hover>
        <TableCell>{startIndex + index + 1}</TableCell>
        <TableCell>{student.studentRoll}</TableCell>
        <TableCell>{fullName}</TableCell>
        <TableCell>{student.emailId}</TableCell>
        <TableCell>{student.phoneNumber}</TableCell>
        <TableCell align='right'>
          <Tooltip title='View profile'>
            <IconButton
              size='small'
              color='primary'
              onClick={() => onView(student)}
              aria-label={`View ${fullName}'s profile`}
            >
              <VisibilityOutlinedIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    );
  });
