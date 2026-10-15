import { createApi } from '@reduxjs/toolkit/query/react';
import { customBaseQuery } from 'Axios/AxiosInterceptor';
import { onQueryStartedErrorToast } from 'Utils/Common/rtkQueryErrorHandler';
import { buildListParams } from 'Utils/Common/listParams';
import {
  EMPTY_PAGINATION,
  type IApiEnvelope,
  type IPaginatedEnvelope,
  type IPaginatedResult,
} from 'Common/types/api.types';
import type {
  IAddAdminPayload,
  IAdminDashboardStats,
  IStudentListQuery,
  IStudentListRow,
} from 'Common/types/domain.types';
import type { IAdminRecord, IBankAccount, IStudentRecord } from 'Common/types/auth.types';
import type { IUpdateStudentProfilePayload } from 'Common/types/domain.types';

export const StudentApi = createApi({
  reducerPath: 'studentApi',
  baseQuery: customBaseQuery,
  tagTypes: ['StudentProfile', 'StudentList', 'StudentBank', 'AdminStats'],
  endpoints: (builder) => ({
    getStudentProfile: builder.query<IStudentRecord, void>({
      query: () => ({ method: 'GET', url: '/student' }),
      transformResponse: (response: IApiEnvelope<IStudentRecord>) => response.data,
      providesTags: ['StudentProfile'],
    }),
    updateStudentProfile: builder.mutation<IStudentRecord, IUpdateStudentProfilePayload>({
      query: (body) => ({ method: 'PUT', url: '/student', body }),
      transformResponse: (response: IApiEnvelope<IStudentRecord>) => response.data,
      invalidatesTags: ['StudentProfile'],
      onQueryStarted: onQueryStartedErrorToast,
    }),
    getAllStudents: builder.query<IPaginatedResult<IStudentListRow>, IStudentListQuery | void>({
      query: (params) => ({
        method: 'GET',
        url: '/admin/students_list',
        params: buildListParams(params ?? {}),
      }),
      transformResponse: (response: IPaginatedEnvelope<IStudentListRow>) => ({
        items: response.data ?? [],
        pagination: response.pagination ?? EMPTY_PAGINATION,
      }),
      providesTags: ['StudentList'],
    }),
    // Admin-side lookup, fetched only when a student's profile is actually
    // opened — bank details are not part of the list payload.
    getStudentBankDetails: builder.query<IBankAccount | null, string>({
      query: (studentId) => ({ method: 'GET', url: `/admin/students/${studentId}/bank` }),
      transformResponse: (response: IApiEnvelope<IBankAccount | null>) => response.data,
      providesTags: (_result, _error, studentId) => [{ type: 'StudentBank', id: studentId }],
    }),
    getAdminStats: builder.query<IAdminDashboardStats, void>({
      query: () => ({ method: 'GET', url: '/admin/stats' }),
      transformResponse: (response: IApiEnvelope<IAdminDashboardStats>) => response.data,
      providesTags: ['AdminStats'],
    }),
    addAdmin: builder.mutation<IAdminRecord, IAddAdminPayload>({
      query: (body) => ({ method: 'POST', url: '/admin/addAdmin', body }),
      transformResponse: (response: IApiEnvelope<IAdminRecord>) => response.data,
      onQueryStarted: onQueryStartedErrorToast,
    }),
  }),
});

export const {
  useGetStudentProfileQuery,
  useUpdateStudentProfileMutation,
  useGetAllStudentsQuery,
  useLazyGetAllStudentsQuery,
  useGetStudentBankDetailsQuery,
  useGetAdminStatsQuery,
  useAddAdminMutation,
} = StudentApi;
