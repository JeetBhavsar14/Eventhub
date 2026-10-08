export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isHost: boolean;
  platformRole: 'user' | 'admin' | 'super_admin';
  createdAt: string;
}

/** Fields a user may edit from their profile. Account and role fields stay server-managed. */
export type UserProfileUpdate = Pick<User, 'firstName' | 'lastName' | 'phone' | 'bio'>;
