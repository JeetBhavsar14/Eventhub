import { User } from '@core/models';

/**
 * Normalizes a Django REST Framework User / Profile record into the frontend User model.
 */
export function mapDjangoUserToAppUser(djangoUser: any): User {
  if (!djangoUser) {
    throw new Error('No user data provided from Django');
  }

  // Handle nested profile objects if returned like { user: {...}, ... } or { data: {...} }
  const data = djangoUser.data || (djangoUser.user ? { ...djangoUser.user, ...djangoUser } : djangoUser);

  const role = (data.platform_role || data.role || (data.is_superuser ? 'super_admin' : 'user')).toLowerCase();
  const isSuperAdmin = Boolean(data.is_superuser || role === 'super_admin');
  const isAdmin = isSuperAdmin || Boolean(data.is_staff || role === 'admin');
  const isHost = role === 'host' || isAdmin || Boolean(data.is_host);

  // Determine appropriate display names
  let firstName = data.first_name || data.firstName || '';
  let lastName = data.last_name || data.lastName || '';

  if (!firstName && isSuperAdmin) {
    firstName = 'Super Admin';
  } else if (!firstName && data.email) {
    firstName = data.email.split('@')[0];
  }

  const isEmailVerified = Boolean(
    data.is_email_verified ?? 
    data.email_verified ?? 
    data.is_verified ?? 
    data.verified ?? 
    false
  );

  const isPhoneVerified = Boolean(
    data.is_phone_verified ?? 
    data.phone_verified ?? 
    false
  );

  return {
    id: String(data.id || data.pk || '1'),
    email: data.email || '',
    phone: data.phone || data.phone_number || data.mobile || '',
    firstName,
    lastName,
    bio: data.bio || '',
    avatarUrl: data.avatar_url || data.avatar || '',
    isEmailVerified,
    isPhoneVerified,
    isHost,
    platformRole: (isSuperAdmin ? 'super_admin' : (role === 'host' ? 'host' : 'user')) as User['platformRole'],
    createdAt: data.created_at || data.date_joined || new Date().toISOString()
  };
}

