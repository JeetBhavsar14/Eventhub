export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isHost: boolean;
  platformRole: 'user' | 'admin' | 'super_admin';
  createdAt: string;
}