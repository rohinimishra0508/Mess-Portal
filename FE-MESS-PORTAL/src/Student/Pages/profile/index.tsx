import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';

import ApiError from 'Common/Components/ApiError';
import LoadingSkeleton from 'Common/Components/LoadingSkeleton';
import RHFormElement from 'Common/Components/RHFormElement';

import { useProfile } from './hooks/useProfile';

import {
  PROFILE_ACCOUNT_HOLDER_LABEL,
  PROFILE_ACCOUNT_NUMBER_LABEL,
  PROFILE_BANK_HELPER,
  PROFILE_BANK_NAME_LABEL,
  PROFILE_BANK_TITLE,
  PROFILE_DETAILS_TITLE,
  PROFILE_FIRSTNAME_LABEL,
  PROFILE_IFSC_LABEL,
  PROFILE_IFSC_PLACEHOLDER,
  PROFILE_LASTNAME_LABEL,
  PROFILE_PHONE_LABEL,
  PROFILE_SAVE_LABEL,
} from './constants/profile.general';

import './profile.scss';

const getInitials = (first?: string, last?: string): string => {
  const initials = (first?.[0] ?? '') + (last?.[0] ?? '');
  return initials.toUpperCase() || '?';
};

const Profile = () => {
  const { control, errors, isLoading, error, refetch, isSaving, onSubmit, profile } = useProfile();

  if (isLoading) return <LoadingSkeleton count={5} height={56} />;
  if (error) return <ApiError refetch={refetch} />;
  if (!profile) return <ApiError refetch={refetch} title='Profile unavailable' />;

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  return (
    <Box className='profileWrapper'>
      <Card>
        <CardContent>
          <Box className='profileWrapper__header'>
            <Avatar className='profileWrapper__avatar' src={profile.avatar?.url}>
              {getInitials(profile.firstName, profile.lastName)}
            </Avatar>
            <Box className='profileWrapper__identity'>
              <Typography variant='headingM' component='h1'>
                {fullName || 'My Profile'}
              </Typography>
              <Box className='profileWrapper__meta'>
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<EmailOutlinedIcon />}
                  label={profile.emailId}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<BadgeOutlinedIcon />}
                  label={`Roll: ${profile.studentRoll}`}
                />
              </Box>
            </Box>
          </Box>

          <Divider className='profileWrapper__divider' />

          <Typography variant='headingS' component='h2' className='profileWrapper__sectionTitle'>
            {PROFILE_DETAILS_TITLE}
          </Typography>

          <Box component='form' onSubmit={onSubmit} className='profileWrapper__form' noValidate>
            <Box className='profileWrapper__grid'>
              <RHFormElement
                control={control}
                name='firstName'
                mode='text'
                label={PROFILE_FIRSTNAME_LABEL}
                error={errors.firstName}
              />
              <RHFormElement
                control={control}
                name='lastName'
                mode='text'
                label={PROFILE_LASTNAME_LABEL}
                error={errors.lastName}
              />
              <RHFormElement
                control={control}
                name='phoneNumber'
                mode='text'
                label={PROFILE_PHONE_LABEL}
                error={errors.phoneNumber}
              />
            </Box>

            <Divider className='profileWrapper__divider' />

            <Typography variant='headingS' component='h2' className='profileWrapper__sectionTitle'>
              {PROFILE_BANK_TITLE}
            </Typography>
            <Typography variant='subtextM' className='profileWrapper__sectionHelper'>
              {PROFILE_BANK_HELPER}
            </Typography>

            <Box className='profileWrapper__grid'>
              <RHFormElement
                control={control}
                name='accountHolderName'
                mode='text'
                label={PROFILE_ACCOUNT_HOLDER_LABEL}
                error={errors.accountHolderName}
              />
              <RHFormElement
                control={control}
                name='bankName'
                mode='text'
                label={PROFILE_BANK_NAME_LABEL}
                error={errors.bankName}
              />
              <RHFormElement
                control={control}
                name='accountNumber'
                mode='text'
                label={PROFILE_ACCOUNT_NUMBER_LABEL}
                error={errors.accountNumber}
              />
              <RHFormElement
                control={control}
                name='ifscCode'
                mode='text'
                label={PROFILE_IFSC_LABEL}
                placeholder={PROFILE_IFSC_PLACEHOLDER}
                error={errors.ifscCode}
              />
            </Box>

            <Button
              type='submit'
              variant='contained'
              size='large'
              disabled={isSaving}
              className='profileWrapper__submit'
            >
              {isSaving ? <CircularProgress size={22} color='inherit' /> : PROFILE_SAVE_LABEL}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
