import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import {
  useGetStudentProfileQuery,
  useUpdateStudentProfileMutation,
} from 'Redux/Slices/Common/StudentApi';
import { showSnackbar, SNACKBAR_SEVERITY } from 'Redux/Slices/Common/SnackbarSlice';
import { useAppDispatch } from 'Redux/Store';
import type { IUpdateStudentProfilePayload } from 'Common/types/domain.types';

import type { IProfileFormValues } from '../constants/profile.interfaces';
import { PROFILE_SCHEMA } from '../helpers/profile.schema';
import { PROFILE_SUCCESS_MESSAGE } from '../constants/profile.general';

const EMPTY_VALUES: IProfileFormValues = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  accountHolderName: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
};

export const useProfile = () => {
  const dispatch = useAppDispatch();
  const { data, isLoading, error, refetch } = useGetStudentProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateStudentProfileMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IProfileFormValues>({
    resolver: yupResolver(PROFILE_SCHEMA),
    defaultValues: EMPTY_VALUES,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!data) return;
    reset({
      firstName: data.firstName,
      lastName: data.lastName ?? '',
      phoneNumber: data.phoneNumber,
      accountHolderName: data.bankAccount?.accountHolderName ?? '',
      accountNumber: data.bankAccount?.accountNumber ?? '',
      ifscCode: data.bankAccount?.ifscCode ?? '',
      bankName: data.bankAccount?.bankName ?? '',
    });
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: IUpdateStudentProfilePayload = {
      firstName: values.firstName,
      phoneNumber: values.phoneNumber,
      ...(values.lastName ? { lastName: values.lastName } : {}),
    };

    // The API stores bank details as one record, so only send them once the
    // required pair is present — a half-filled form leaves the account alone.
    if (values.accountNumber && values.ifscCode) {
      payload.accountNumber = values.accountNumber;
      payload.ifscCode = values.ifscCode;
      payload.accountHolderName = values.accountHolderName;
      payload.bankName = values.bankName;
    }

    try {
      await updateProfile(payload).unwrap();
      dispatch(
        showSnackbar({ severity: SNACKBAR_SEVERITY.SUCCESS, message: PROFILE_SUCCESS_MESSAGE }),
      );
    } catch {
      // error toast handled centrally
    }
  });

  return {
    control,
    errors,
    isLoading,
    error,
    refetch,
    isSaving,
    onSubmit,
    profile: data,
  };
};
