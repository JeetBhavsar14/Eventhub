import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserProfileUpdate, AuthState, INITIAL_AUTH_STATE } from '@core/models';
import { LocalStorageService } from '@core/storage';
import { ApiClient, mapDjangoUserToAppUser } from '@core/api';

const AUTH_USER_KEY = 'eventhub_user';
const AUTH_TOKEN_KEY = 'eventhub_token';
const AUTH_REFRESH_TOKEN_KEY = 'eventhub_refresh_token';

// Server response contracts
interface DjangoTokenResponse {
  access: string;
  refresh: string;
}

interface DjangoRefreshTokenResponse {
  access: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly _authState = signal<AuthState>(INITIAL_AUTH_STATE);

  readonly currentUser    = computed(() => this._authState().user);
  readonly isAuthenticated = computed(() => this._authState().isAuthenticated);
  readonly isLoading      = computed(() => this._authState().isLoading);
  readonly token          = computed(() => this._authState().token);

  constructor(
    private localStorage: LocalStorageService,
    private apiClient: ApiClient,
    private router: Router
  ) {
    this.restoreSession();
  }

  /**
   * Cryptographically verifies the session token against Django SimpleJWT on startup.
   * If access token is expired, attempts automatic silent refresh using refresh token.
   */
  private async restoreSession(): Promise<void> {
    const token = this.localStorage.get<string>(AUTH_TOKEN_KEY);
    const refreshToken = this.localStorage.get<string>(AUTH_REFRESH_TOKEN_KEY);

    if (!token && !refreshToken) {
      this.logout(false);
      return;
    }

    // Optimistically set cached state while verification completes in background
    const cachedUser = this.localStorage.get<User>(AUTH_USER_KEY);
    if (cachedUser) {
      this._authState.set({ user: cachedUser, token: token || '', isAuthenticated: true, isLoading: true });
    } else {
      this._authState.update(s => ({ ...s, isLoading: true }));
    }

    try {
      // 1. Verify access token by retrieving current profile
      let profileResult = await this.apiClient.get<any>('/accounts/profile/');

      // 2. If access token is expired (401) and we have a refresh token, try silent refresh
      if (profileResult.error && refreshToken) {
        const refreshResult = await this.apiClient.post<DjangoRefreshTokenResponse>('/accounts/token/refresh/', {
          refresh: refreshToken
        });

        if (refreshResult.data?.access) {
          const newAccessToken = refreshResult.data.access;
          this.localStorage.set(AUTH_TOKEN_KEY, newAccessToken);
          // Retry profile fetch with new access token
          profileResult = await this.apiClient.get<any>('/accounts/profile/');
        }
      }

      if (profileResult.data && profileResult.data.email) {
        const verifiedUser = mapDjangoUserToAppUser(profileResult.data);
        this.localStorage.set(AUTH_USER_KEY, verifiedUser);
        const activeToken = this.localStorage.get<string>(AUTH_TOKEN_KEY) || token || '';
        this._authState.set({
          user: verifiedUser,
          token: activeToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        console.warn('[AuthService] Django session validation failed. Revoking stored credentials.');
        this.logout(false);
      }
    } catch {
      this.logout(false);
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    this._authState.update(s => ({ ...s, isLoading: true }));

    // Authenticate with Django SimpleJWT endpoint
    const result = await this.apiClient.post<DjangoTokenResponse>('/accounts/login/', {
      email,
      password
    });

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return {
        success: false,
        message: result.error.userMessage || 'Invalid email or password.'
      };
    }

    const { access, refresh } = result.data || {};
    if (!access) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Invalid response from authentication server.' };
    }

    // Persist tokens immediately so subsequent profile request attaches Authorization header
    this.localStorage.set(AUTH_TOKEN_KEY, access);
    if (refresh) {
      this.localStorage.set(AUTH_REFRESH_TOKEN_KEY, refresh);
    }
    this.localStorage.remove('eventhub_host_prototype_override');

    // Retrieve full profile from Django
    const profileRes = await this.apiClient.get<any>('/accounts/profile/');
    const user = profileRes.data ? mapDjangoUserToAppUser(profileRes.data) : mapDjangoUserToAppUser({ email, platform_role: 'super_admin' });

    this.localStorage.set(AUTH_USER_KEY, user);

    this._authState.set({
      user,
      token: access,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true, message: 'Logged in successfully.' };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<{ success: boolean; message: string }> {
    this._authState.update(s => ({ ...s, isLoading: true }));

    // Dispatch registration to Django endpoint
    const result = await this.apiClient.post<any>('/accounts/register/', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone
    });

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return {
        success: false,
        message: result.error.userMessage || 'Registration failed.'
      };
    }

    // Auto-login after registration
    return this.login(email, password);
  }

  /**
   * Persists profile edits to Django and synchronizes local state.
   */
  async updateProfile(changes: UserProfileUpdate): Promise<{ success: boolean; message: string }> {
    const user = this.currentUser();
    if (!user) {
      return { success: false, message: 'Please sign in before updating your profile.' };
    }

    const payload: Record<string, unknown> = {};
    if (changes.firstName !== undefined) payload['first_name'] = changes.firstName;
    if (changes.lastName !== undefined) payload['last_name'] = changes.lastName;
    if (changes.phone !== undefined) payload['phone'] = changes.phone;
    if (changes.bio !== undefined) payload['bio'] = changes.bio;

    const result = await this.apiClient.patch<any>('/accounts/profile/', payload);
    if (result.error) {
      return { success: false, message: result.error?.userMessage || 'Could not save your profile.' };
    }

    const updatedUser = mapDjangoUserToAppUser(result.data);
    this.localStorage.set(AUTH_USER_KEY, updatedUser);
    this._authState.update(state => ({ ...state, user: updatedUser }));

    return { success: true, message: 'Profile updated successfully.' };
  }

  /**
   * Refreshes the currently authenticated user's profile from Django.
   */
  async refreshCurrentUser(): Promise<User | null> {
    const user = this.currentUser();
    if (!user) return null;

    try {
      const res = await this.apiClient.get<any>('/accounts/profile/');
      if (res.data) {
        const freshUser = mapDjangoUserToAppUser(res.data);
        this.localStorage.set(AUTH_USER_KEY, freshUser);
        this._authState.update(state => ({ ...state, user: freshUser }));
        return freshUser;
      }
    } catch {
      // Ignore background refresh errors
    }
    return user;
  }

  logout(navigate: boolean = true): void {
    this.localStorage.remove(AUTH_USER_KEY);
    this.localStorage.remove(AUTH_TOKEN_KEY);
    this.localStorage.remove(AUTH_REFRESH_TOKEN_KEY);
    this.localStorage.remove('eventhub_host_application');
    this.localStorage.remove('eventhub_host_prototype_override');
    this._authState.set(INITIAL_AUTH_STATE);
    if (navigate) {
      this.router.navigate(['/']);
    }
  }
}
