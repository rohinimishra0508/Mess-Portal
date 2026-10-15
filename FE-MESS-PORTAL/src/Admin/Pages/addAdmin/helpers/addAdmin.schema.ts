import * as yup from 'yup';
import { PASSWORD_MIN_LENGTH, PHONE_REGEX } from 'Common/constants/auth.constants';
import type { IAddAdminFormValues } from '../constants/addAdmin.interfaces';

export const ADD_ADMIN_SCHEMA: yup.ObjectSchema<IAddAdminFormValues> = yup.object({
  firstName: yup.string().required('First name is required').trim(),
  lastName: yup.string().optional().default(''),
  emailId: yup.string().required('Email is required').email('Enter a valid email'),
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(PHONE_REGEX, 'Phone number must be exactly 10 digits'),
  password: yup
    .string()
    .required('Password is required')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  adminType: yup
    .mixed<'Warden' | 'Mess Secretary' | 'Mess Owner' | 'Other' | ''>()
    .required('Role is required')
    .oneOf(['Warden', 'Mess Secretary', 'Mess Owner', 'Other'], 'Select a role'),
});

export const ADD_ADMIN_DEFAULTS: IAddAdminFormValues = {
  firstName: '',
  lastName: '',
  emailId: '',
  phoneNumber: '',
  password: '',
  adminType: '',
};
