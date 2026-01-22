// src/app/models/user.model.ts
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleType: string;
  status: string;
  contactNo: string | null;
  alternateContactNo: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  completeAddress: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  otp: string | null;
  roles: any[];
  createdOn: string;
  passwordSetDate: string;
  lastLoginTime: string | null;
}
