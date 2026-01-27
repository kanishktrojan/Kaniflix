import api from './api';
import type { ApiResponse, SubscriptionPlan, UserSubscription } from '@/types';

// Razorpay types
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
    backdropclose?: boolean;
  };
  notes?: Record<string, string>;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayPaymentError {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: RazorpayPaymentError) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  plan: {
    id: string;
    name: string;
    originalPrice: number;
    finalPrice: number;
  };
  appliedCoupon: {
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null;
  razorpayKeyId: string;
  // For free activations
  freeActivation?: boolean;
  subscription?: UserSubscription;
  message?: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon: {
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
  };
  discount: {
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  };
}

export interface PaymentVerifyResponse {
  success: boolean;
  message: string;
  subscription: UserSubscription;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  subscription: (UserSubscription & {
    isExpired: boolean;
    daysRemaining: number;
  }) | null;
}

export interface PaymentHistoryItem {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded' | 'pending';
  paidAt: string;
  description?: string;
}

export interface RedeemCodeResponse {
  success?: boolean;
  requiresPayment: boolean;
  message: string;
  code: string;
  discountType?: string;
  discountValue?: number;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  plan?: {
    id: string;
    name: string;
    tier: string;
  };
  subscription?: {
    id: string;
    plan: {
      id: string;
      name: string;
      tier: string;
    };
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    features: string[];
  };
}

/**
 * Payment Service
 * Handles Razorpay payment integration
 */
export const paymentService = {
  /**
   * Load Razorpay script dynamically
   */
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Razorpay) {
        console.log('[PaymentService] Razorpay already loaded');
        resolve(true);
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="razorpay"]');
      if (existingScript) {
        console.log('[PaymentService] Razorpay script already in DOM, waiting for load...');
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkLoaded);
            resolve(true);
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkLoaded);
          resolve(!!window.Razorpay);
        }, 10000);
        return;
      }

      console.log('[PaymentService] Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('[PaymentService] Razorpay script loaded successfully');
        resolve(true);
      };
      script.onerror = (e) => {
        console.error('[PaymentService] Failed to load Razorpay script', e);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  },

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get<ApiResponse<SubscriptionPlan[]>>('/payments/plans');
    return response.data.data;
  },

  /**
   * Validate a coupon code
   */
  async validateCoupon(
    code: string,
    planId?: string,
    billingCycle?: 'monthly' | 'yearly'
  ): Promise<CouponValidationResponse> {
    const response = await api.post<ApiResponse<CouponValidationResponse>>(
      '/payments/validate-coupon',
      { code, planId, billingCycle }
    );
    return response.data.data;
  },

  /**
   * Redeem a promo code for free subscription
   */
  async redeemCode(
    code: string,
    planId?: string,
    billingCycle?: 'monthly' | 'yearly'
  ): Promise<RedeemCodeResponse> {
    const response = await api.post<ApiResponse<RedeemCodeResponse>>(
      '/payments/redeem-code',
      { code, planId, billingCycle }
    );
    return response.data.data;
  },

  /**
   * Create a Razorpay order
   */
  async createOrder(
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    couponCode?: string
  ): Promise<CreateOrderResponse> {
    const response = await api.post<ApiResponse<CreateOrderResponse>>(
      '/payments/create-order',
      { planId, billingCycle, couponCode }
    );
    return response.data.data;
  },

  /**
   * Verify payment after Razorpay checkout
   */
  async verifyPayment(
    razorpayResponse: RazorpayResponse,
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    couponCode?: string
  ): Promise<PaymentVerifyResponse> {
    const response = await api.post<ApiResponse<PaymentVerifyResponse>>(
      '/payments/verify',
      {
        ...razorpayResponse,
        planId,
        billingCycle,
        couponCode,
      }
    );
    return response.data.data;
  },

  /**
   * Get current subscription status
   */
  async getSubscription(): Promise<SubscriptionStatus> {
    const response = await api.get<ApiResponse<SubscriptionStatus>>(
      '/payments/subscription'
    );
    return response.data.data;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ message: string; cancelAt: string }> {
    const response = await api.post<ApiResponse<{ message: string; cancelAt: string }>>(
      '/payments/cancel'
    );
    return response.data.data;
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(): Promise<{ payments: PaymentHistoryItem[] }> {
    const response = await api.get<ApiResponse<{ payments: PaymentHistoryItem[] }>>(
      '/payments/history'
    );
    return response.data.data;
  },

  /**
   * Open Razorpay checkout
   */
  async checkout(
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    couponCode?: string,
    userInfo?: { name?: string; email?: string; phone?: string },
    onSuccess?: (subscription: UserSubscription) => void,
    onError?: (error: Error) => void,
    onDismiss?: () => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Starting checkout process...');

        // Load Razorpay script
        const loaded = await this.loadRazorpayScript();
        console.log('Razorpay script loaded:', loaded);

        if (!loaded) {
          const error = new Error('Failed to load Razorpay. Please try again.');
          onError?.(error);
          reject(error);
          return;
        }

        // Create order
        console.log('Creating order for plan:', planId);
        const orderData = await this.createOrder(planId, billingCycle, couponCode);
        console.log('Order created:', orderData);

        // If free activation (100% discount), no payment needed
        if (orderData.freeActivation && orderData.subscription) {
          onSuccess?.(orderData.subscription);
          resolve();
          return;
        }

        // Check if we have required data
        if (!orderData.razorpayKeyId) {
          const error = new Error('Razorpay key not configured');
          onError?.(error);
          reject(error);
          return;
        }
        if (!orderData.orderId) {
          const error = new Error('Order ID not received');
          onError?.(error);
          reject(error);
          return;
        }

        console.log('Opening Razorpay with key:', orderData.razorpayKeyId);
        console.log('Order ID:', orderData.orderId);
        console.log('Amount:', orderData.amount);

        // Check if Razorpay is properly available
        if (typeof window.Razorpay !== 'function') {
          const error = new Error('Razorpay not loaded properly. Please refresh and try again.');
          onError?.(error);
          reject(error);
          return;
        }

        // Open Razorpay checkout
        const options: RazorpayOptions = {
          key: orderData.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'KANIFLIX',
          description: `${orderData.plan.name} - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              console.log('Payment successful, verifying...', response);
              const result = await this.verifyPayment(
                response,
                planId,
                billingCycle,
                couponCode
              );
              // Clean up Razorpay DOM elements after successful payment
              setTimeout(() => {
                document.querySelectorAll('.razorpay-container, .razorpay-backdrop, [class*="razorpay"], iframe[src*="razorpay"]').forEach(el => el.remove());
              }, 100);
              onSuccess?.(result.subscription);
              resolve();
            } catch (error) {
              console.error('Payment verification failed:', error);
              // Clean up on error too
              setTimeout(() => {
                document.querySelectorAll('.razorpay-container, .razorpay-backdrop, [class*="razorpay"], iframe[src*="razorpay"]').forEach(el => el.remove());
              }, 100);
              onError?.(error as Error);
              reject(error);
            }
          },
          prefill: {
            name: userInfo?.name || '',
            email: userInfo?.email || '',
            contact: userInfo?.phone || '',
          },
          theme: {
            color: '#E50914', // Netflix red
          },
          modal: {
            ondismiss: () => {
              console.log('Razorpay modal dismissed');
              // Clean up any leftover Razorpay DOM elements
              setTimeout(() => {
                const razorpayElements = document.querySelectorAll('.razorpay-container, .razorpay-backdrop, [class*="razorpay"], iframe[src*="razorpay"]');
                razorpayElements.forEach(el => el.remove());
                // Also remove any orphaned fixed position overlays that Razorpay might have left
                document.querySelectorAll('div[style*="position: fixed"][style*="z-index"]').forEach(el => {
                  if (el.innerHTML === '' || !el.closest('#root')) {
                    el.remove();
                  }
                });
              }, 100);
              onDismiss?.();
              resolve();
            },
            escape: true,
            confirm_close: true,
            backdropclose: false,
          },
        };

        console.log('Razorpay options:', options);

        const razorpay = new window.Razorpay(options);

        // Add error handler
        razorpay.on('payment.failed', function (response: RazorpayPaymentError) {
          console.error('Payment failed:', response.error);
          onError?.(new Error(response.error.description || 'Payment failed'));
          resolve();
        });

        console.log('Calling razorpay.open()...');
        razorpay.open();
        console.log('Razorpay modal should be visible now');

      } catch (error) {
        console.error('Checkout error:', error);
        onError?.(error as Error);
        reject(error);
      }
    });
  },
};

export default paymentService;
