import { Role } from './api.types';

export interface IBankAccount {
  accountHolderName?: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
}

export interface IStudentRecord {
  _id: string;
  emailId: string;
  firstName: string;
  lastName?: string;
  studentRoll: string;
  phoneNumber: string;
  profileImage?: string;
  avatar?: { public_id: string; url: string };
  bankAccount?: IBankAccount | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IAdminRecord {
  _id: string;
  emailId: string;
  firstName: string;
  lastName?: string;
  adminType: Exclude<Role, 'Student'>;
  createdAt?: string;
  updatedAt?: string;
}

export interface IStudentLoginPayload {
  emailId: string;
  password: string;
}

export interface IStudentRegisterPayload {
  emailId: string;
  firstName: string;
  lastName?: string;
  studentRoll: string;
  phoneNumber: string;
  password: string;
}

export interface IAdminLoginPayload {
  emailId: string;
  password: string;
}
