import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserProfileUpdate, AuthState, INITIAL_AUTH_STATE } from '@core/models';
import { LocalStorageService } from '@core/storage';
import { ApiClient } from '@core/api';

const AUTH_USER_KEY = 'eventhub_user';
const AUTH_TOKEN_KEY = 'eventhub_token';

// Shape coming from db.json (includes password field — only for mock)
interface MockUserRecord extends User {
  password: string;
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

  private restoreSession(): void {
    const user  = this.localStorage.get<User>(AUTH_USER_KEY);
    const token = this.localStorage.get<string>(AUTH_TOKEN_KEY);

    if (user && token) {
      this._authState.set({ user, token, isAuthenticated: true, isLoading: false });
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    this._authState.update(s => ({ ...s, isLoading: true }));

    // Query json-server: GET /users?email=...
    const result = await this.apiClient.get<MockUserRecord[]>('/users', { email });

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Could not reach the server. Is json-server running?' };
    }

    const match = result.data.find(u => u.password === password);

    if (!match) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Invalid email or password.' };
    }

    // Strip the password field before storing — never store passwords
    const { password: _removed, ...safeUser } = match;
    const mockToken = generateMockJwt(safeUser as User);

    this.localStorage.set(AUTH_USER_KEY, safeUser);
    this.localStorage.set(AUTH_TOKEN_KEY, mockToken);

    this._authState.set({
      user: safeUser as User,
      token: mockToken,
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

    // Check if user already exists
    const existingCheck = await this.apiClient.get<MockUserRecord[]>('/users', { email });
    if (!existingCheck.error && existingCheck.data && existingCheck.data.length > 0) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'An account with this email already exists.' };
    }

    // POST /users — json-server creates and persists the new user in db.json
    const newRecord: Omit<MockUserRecord, 'id'> = {
      email,
      password,
      phone,
      firstName,
      lastName,
      isEmailVerified: false,
      isPhoneVerified: false,
      isHost: false,
      platformRole: 'user',
      createdAt: new Date().toISOString(),
    };

    const result = await this.apiClient.post<MockUserRecord>('/users', newRecord);

    if (result.error) {
      this._authState.update(s => ({ ...s, isLoading: false }));
      return { success: false, message: 'Registration failed. Is json-server running?' };
    }

    const { password: _removed, ...safeUser } = result.data;
    const mockToken = generateMockJwt(safeUser as User);

    this.localStorage.set(AUTH_USER_KEY, safeUser);
    this.localStorage.set(AUTH_TOKEN_KEY, mockToken);

    this._authState.set({
      user: safeUser as User,
      token: mockToken,
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

    const result = await this.apiClient.patch<MockUserRecord>(`/users/${user.id}`, changes);
    if (result.error) {
      return { success: false, message: 'Could not save your profile. Is json-server running?' };
    }

    const { password: _removed, ...safeUser } = result.data;
    const updatedUser = safeUser as User;
    this.localStorage.set(AUTH_USER_KEY, updatedUser);
    this._authState.update(state => ({ ...state, user: updatedUser }));

    return { success: true, message: 'Profile updated successfully.' };
  }

  logout(): void {
    this.localStorage.remove(AUTH_USER_KEY);
    this.localStorage.remove(AUTH_TOKEN_KEY);
    this._authState.set(INITIAL_AUTH_STATE);
    this.router.navigate(['/']);
  }
}
// Helper function to create a realistic JWT string
function generateMockJwt(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  
  const payload = btoa(JSON.stringify({ 
    sub: user.id, 
    email: user.email, 
    role: user.platformRole,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 1 day
  }));
  
  const signature = btoa('mock-signature-for-development');
  
  return `${header}.${payload}.${signature}`;
}
