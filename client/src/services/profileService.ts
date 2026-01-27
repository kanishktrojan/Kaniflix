import api from './api';
import type {
  ApiResponse,
  ProfileResponse,
  ExtendedUserPreferences,
  NotificationSettings,
  DeviceSession,
  UserSubscription,
  SubscriptionPlan,
  ProfileStats,
  RedeemCouponResponse,
  ExtendedUser,
  UserProfile,
} from '@/types';

/**
 * Profile Service
 * Handles all profile-related API calls
 */
export const profileService = {
  /**
   * Get complete profile with subscription and device count
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ApiResponse<ProfileResponse>>('/profile');
    return response.data.data;
  },

  /**
   * Update profile information
   */
  async updateProfile(updates: {
    username?: string;
    avatar?: string;
    profile?: Partial<UserProfile>;
  }): Promise<ExtendedUser> {
    const response = await api.patch<ApiResponse<ExtendedUser>>('/profile', updates);
    return response.data.data;
  },

  /**
   * Update playback and display preferences
   */
  async updatePreferences(preferences: Partial<ExtendedUserPreferences>): Promise<ExtendedUserPreferences> {
    const response = await api.patch<ApiResponse<ExtendedUserPreferences>>(
      '/profile/preferences',
      { preferences }
    );
    return response.data.data;
  },

  /**
   * Update notification settings
   */
  async updateNotifications(notifications: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await api.patch<ApiResponse<NotificationSettings>>(
      '/profile/notifications',
      { notifications }
    );
    return response.data.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/profile/change-password', { currentPassword, newPassword });
  },

  /**
   * Get all active device sessions
   */
  async getDevices(): Promise<DeviceSession[]> {
    const response = await api.get<ApiResponse<DeviceSession[]>>('/profile/devices');
    return response.data.data;
  },

  /**
   * Logout from a specific device
   */
  async logoutDevice(deviceId: string): Promise<void> {
    await api.delete(`/profile/devices/${deviceId}`);
  },

  /**
   * Logout from all devices except current
   */
  async logoutAllDevices(): Promise<void> {
    await api.post('/profile/devices/logout-all');
  },

  /**
   * Get subscription details and available plans
   */
  async getSubscription(): Promise<{
    current: UserSubscription | null;
    availablePlans: SubscriptionPlan[];
  }> {
    const response = await api.get<ApiResponse<{
      current: UserSubscription | null;
      availablePlans: SubscriptionPlan[];
    }>>('/profile/subscription');
    return response.data.data;
  },

  /**
   * Redeem a coupon code
   */
  async redeemCoupon(code: string): Promise<RedeemCouponResponse> {
    const response = await api.post<ApiResponse<RedeemCouponResponse>>(
      '/profile/redeem-coupon',
      { code }
    );
    return response.data.data;
  },

  /**
   * Set or update profile PIN
   */
  async setProfilePin(pin: string, currentPin?: string): Promise<void> {
    await api.post('/profile/pin', { pin, currentPin });
  },

  /**
   * Remove profile PIN
   */
  async removeProfilePin(pin: string): Promise<void> {
    await api.delete('/profile/pin', { data: { pin } });
  },

  /**
   * Verify profile PIN
   */
  async verifyProfilePin(pin: string): Promise<boolean> {
    const response = await api.post<ApiResponse<{ verified: boolean }>>(
      '/profile/pin/verify',
      { pin }
    );
    return response.data.data.verified;
  },

  /**
   * Get watch statistics
   */
  async getStats(): Promise<ProfileStats> {
    const response = await api.get<ApiResponse<ProfileStats>>('/profile/stats');
    return response.data.data;
  },

  /**
   * Update avatar
   */
  async updateAvatar(avatar: string): Promise<{ avatar: string }> {
    const response = await api.post<ApiResponse<{ avatar: string }>>(
      '/profile/avatar',
      { avatar }
    );
    return response.data.data;
  },

  /**
   * Remove avatar
   */
  async removeAvatar(): Promise<void> {
    await api.delete('/profile/avatar');
  },

  /**
   * Delete account
   */
  async deleteAccount(password: string): Promise<void> {
    await api.delete('/profile', {
      data: { password, confirmDelete: 'DELETE' }
    });
  },
};

export default profileService;
