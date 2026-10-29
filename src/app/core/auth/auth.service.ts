import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserProfileUpdate, AuthState, INITIAL_AUTH_STATE } from '@core/models';
import { LocalStorageService } from '@core/storage';
import { ApiClient } from '@core/api';

const AUTH_USER_KEY = 'eventhub_user';
const AUTH_TOKEN_KEY = 'eventhub_token';

// Server response contracts
interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

interface VerifyResponse {
  success: boolean;
  user?: User;
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
   * Cryptographically verifies the session token against the backend on startup.
   * Prevents client-side tampering: if localStorage was altered or the token signature
   * is invalid, the session is rejected and purged immediately.
   */
  private async restoreSession(): Promise<void> {
    const token = this.localStorage.get<string>(AUTH_TOKEN_KEY);
    if (!token) {
      this.logout(false);
      return;
    }

    // Optimistically set cached state while verification completes in background
    const cachedUser = this.localStorage.get<User>(AUTH_USER_KEY);
    if (cachedUser) {
      this._authState.set({ user: cachedUser, token, isAuthenticated: true, isLoading: true });
    } else {
      this._authState.update(s => ({ ...s, isLoading: true }));
    }

    try {
      // Backend cryptographically validates HMAC-SHA256 signature and returns genuine user record
      const result = await this.apiClient.get<VerifyResponse>('/auth/me');

      if (result.data && result.data.success && result.data.user) {
        const verifiedUser = result.data.user;
        // Overwrite any potentially modified localStorage user with the verified server truth
        this.localStorage.set(AUTH_USER_KEY, verifiedUser);
        this._authState.set({
          user: verifiedUser,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token was tampered with, forged, expired, or rejected by the server
        console.warn('[AuthService] Stored session failed cryptographic verification. Revoking session.');
        this.logout(false);
      }
    } catch {
      // Network/server error during initial verification
      this.logout(false);
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    this._authState.update(s => ({ ...s, isLoading: true }));

    // Send credentials to mock authentication endpoint (validated server-side)
    const result = await this.apiClient.post<AuthResponse>('/auth/login', {
      email,
      password
    });

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return {
        success: false,
        message: result.error.message || 'Invalid email or password.'
      };
    }

    const { user, token } = result.data;
    if (!user || !token) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Invalid response from authentication server.' };
    }

    // Persist verified user profile and cryptographically signed JWT
    this.localStorage.set(AUTH_USER_KEY, user);
    this.localStorage.set(AUTH_TOKEN_KEY, token);

    this._authState.set({
      user,
      token,
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

    // Dispatch registration to mock auth endpoint (password is never stored in plaintext database)
    const result = await this.apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      firstName,
      lastName,
      phone
    });

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return {
        success: false,
        message: result.error.message || 'Registration failed.'
      };
    }

    const { user, token } = result.data;
    if (!user || !token) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Invalid response from registration server.' };
    }

    this.localStorage.set(AUTH_USER_KEY, user);
    this.localStorage.set(AUTH_TOKEN_KEY, token);

    this._authState.set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true, message: 'Account created successfully.' };
  }

  /**
   * Persists profile edits and then keeps every local representation of the
   * signed-in user in sync (signal and local storage).
   */
  async updateProfile(changes: UserProfileUpdate): Promise<{ success: boolean; message: string }> {
    const user = this.currentUser();
    if (!user) {
      return { success: false, message: 'Please sign in before updating your profile.' };
    }

    const result = await this.apiClient.patch<User>(`/users/${user.id}`, changes);
    if (result.error) {
      return { success: false, message: result.error?.message || 'Could not save your profile. Is the server running?' };
    }

    const updatedUser = result.data;
    this.localStorage.set(AUTH_USER_KEY, updatedUser);
    this._authState.update(state => ({ ...state, user: updatedUser }));

    return { success: true, message: 'Profile updated successfully.' };
  }

  logout(navigate: boolean = true): void {
    this.localStorage.remove(AUTH_USER_KEY);
    this.localStorage.remove(AUTH_TOKEN_KEY);
    this._authState.set(INITIAL_AUTH_STATE);
    if (navigate) {
      this.router.navigate(['/']);
    }
  }
}
