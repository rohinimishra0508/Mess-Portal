export interface IAddAdminFormValues {
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  password: string;
  adminType: 'Warden' | 'Mess Secretary' | 'Mess Owner' | 'Other' | '';
}
