import api from './api';
import { startProactiveRefresh, stopProactiveRefresh } from './api';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  ApiResponse,
} from '@/types';

/**
 * Authentication Service
 * Handles all auth-related API calls
 */
export const authService = {
  /**
   * Initiate registration - sends OTP to email
   */
  async initiateRegister(credentials: RegisterCredentials): Promise<{ email: string; expiresIn: number }> {
    const response = await api.post<ApiResponse<{ message: string; email: string; expiresIn: number }>>(
      '/auth/register',
      credentials
    );
    
    return response.data.data;
  },

  /**
   * Verify OTP and complete registration
   */
  async verifyOTP(email: string, otp: string): Promise<{ user: User; accessToken: string }> {
    const response = await api.post<ApiResponse<{ user: User; accessToken: string }>>(
      '/auth/verify-otp',
      { email, otp }
    );
    
    // Store token
    localStorage.setItem('accessToken', response.data.data.accessToken);
    startProactiveRefresh();
    
    return response.data.data;
  },

  /**
   * Resend OTP
   */
  async resendOTP(email: string): Promise<{ email: string; expiresIn: number }> {
    const response = await api.post<ApiResponse<{ message: string; email: string; expiresIn: number }>>(
      '/auth/resend-otp',
      { email }
    );
    
    return response.data.data;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; accessToken: string }> {
    const response = await api.post<ApiResponse<{ user: User; accessToken: string }>>(
      '/auth/login',
      credentials
    );
    
    // Store token
    localStorage.setItem('accessToken', response.data.data.accessToken);
    startProactiveRefresh();
    
    return response.data.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      stopProactiveRefresh();
    }
  },

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post('/auth/logout-all');
    } finally {
      localStorage.removeItem('accessToken');
      stopProactiveRefresh();
    }
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await api.patch<ApiResponse<User>>('/auth/me', updates);
    return response.data.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    localStorage.removeItem('accessToken');
    stopProactiveRefresh();
  },

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<{ authenticated: boolean; user: User }> {
    const response = await api.get<ApiResponse<{ authenticated: boolean; user: User }>>(
      '/auth/status'
    );
    return response.data.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    const { accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  },

  /**
   * Check if token exists locally
   */
  hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  },
};

export default authService;
