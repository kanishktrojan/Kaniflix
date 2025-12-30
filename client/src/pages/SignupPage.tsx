import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { AuthLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import { cn } from '@/utils';

type SignupStep = 'details' | 'otp';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  
  const [step, setStep] = useState<SignupStep>('details');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpExpiry, setOtpExpiry] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP expiry
  useEffect(() => {
    if (step === 'otp' && otpExpiry > 0) {
      const timer = setInterval(() => {
        setOtpExpiry((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, otpExpiry]);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Initiate registration mutation
  const initRegisterMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) => 
      authService.initiateRegister(data),
    onSuccess: (data) => {
      setStep('otp');
      setOtpExpiry(data.expiresIn);
      setResendCooldown(60);
      setCanResend(false);
      setErrors({});
    },
    onError: (error: Error) => {
      const message = error.message || 'Signup failed. Please try again.';
      if (message.toLowerCase().includes('email')) {
        setErrors({ email: message });
      } else if (message.toLowerCase().includes('username')) {
        setErrors({ username: message });
      } else {
        setErrors({ general: message });
      }
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: (otpCode: string) => authService.verifyOTP(formData.email, otpCode),
    onSuccess: (data) => {
      setUser(data.user);
      navigate('/');
    },
    onError: (error: Error) => {
      const message = error.message || 'Invalid OTP. Please try again.';
      setErrors({ otp: message });
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
  });

  // Resend OTP mutation
  const resendOTPMutation = useMutation({
    mutationFn: () => authService.resendOTP(formData.email),
    onSuccess: (data) => {
      setOtpExpiry(data.expiresIn);
      setResendCooldown(60);
      setCanResend(false);
      setErrors({ otp: '' });
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
    onError: (error: Error) => {
      setErrors({ otp: error.message || 'Failed to resend OTP.' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const { confirmPassword, ...signupData } = formData;
      initRegisterMutation.mutate(signupData);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrors((prev) => ({ ...prev, otp: '' }));
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits are filled
    if (value && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOTPMutation.mutate(fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
      verifyOTPMutation.mutate(pasted);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter all 6 digits' });
      return;
    }
    verifyOTPMutation.mutate(otpCode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { strength: 0, label: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-background/80 backdrop-blur-lg rounded-xl p-8 md:p-10 shadow-2xl"
            >
              <h1 className="text-3xl font-bold mb-2">Create Account</h1>
              <p className="text-text-muted mb-8">
                Join KANIFLIX and start streaming
              </p>

              {/* Error Message */}
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6"
                >
                  {errors.general}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitDetails} className="space-y-5">
                {/* Username */}
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Username"
                      className={cn(
                        'w-full pl-11 pr-4 py-3 bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
                        errors.username ? 'border-red-500' : 'border-surface'
                      )}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      className={cn(
                        'w-full pl-11 pr-4 py-3 bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
                        errors.email ? 'border-red-500' : 'border-surface'
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Password"
                      className={cn(
                        'w-full pl-11 pr-12 py-3 bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
                        errors.password ? 'border-red-500' : 'border-surface'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              i < passwordStrength.strength
                                ? passwordStrength.color
                                : 'bg-surface'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-text-muted">{passwordStrength.label}</p>
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className={cn(
                        'w-full pl-11 pr-12 py-3 bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
                        errors.confirmPassword ? 'border-red-500' : 'border-surface'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 mt-1 rounded border-surface bg-surface text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-secondary">
                      I agree to the{' '}
                      <Link to="/terms" className="text-white hover:text-primary">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-white hover:text-primary">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-red-500 text-sm mt-1">{errors.terms}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={initRegisterMutation.isPending}
                >
                  Continue
                </Button>
              </form>

              {/* Sign In Link */}
              <p className="text-center mt-8 text-text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:text-primary transition-colors font-medium">
                  Sign in
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-background/80 backdrop-blur-lg rounded-xl p-8 md:p-10 shadow-2xl"
            >
              {/* Back button */}
              <button
                onClick={() => setStep('details')}
                className="flex items-center gap-2 text-text-muted hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
                <p className="text-text-muted">
                  We've sent a 6-digit code to
                </p>
                <p className="text-white font-medium">{formData.email}</p>
              </div>

              {/* Error Message */}
              {errors.otp && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-center"
                >
                  {errors.otp}
                </motion.div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOTP}>
                {/* OTP Inputs */}
                <div className="flex justify-center gap-3 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={cn(
                        'w-12 h-14 text-center text-2xl font-bold bg-surface border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
                        errors.otp ? 'border-red-500' : 'border-surface'
                      )}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* Timer */}
                <div className="text-center mb-6">
                  {otpExpiry > 0 ? (
                    <p className="text-text-muted">
                      Code expires in{' '}
                      <span className={cn(
                        'font-medium',
                        otpExpiry < 60 ? 'text-red-500' : 'text-white'
                      )}>
                        {formatTime(otpExpiry)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-red-500">Code expired. Please request a new one.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={verifyOTPMutation.isPending}
                  disabled={otp.join('').length !== 6 || otpExpiry === 0}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Verify & Create Account
                </Button>
              </form>

              {/* Resend */}
              <div className="text-center mt-6">
                <p className="text-text-muted text-sm">
                  Didn't receive the code?{' '}
                  {canResend ? (
                    <button
                      onClick={() => resendOTPMutation.mutate()}
                      disabled={resendOTPMutation.isPending}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      {resendOTPMutation.isPending ? 'Sending...' : 'Resend'}
                    </button>
                  ) : (
                    <span className="text-text-secondary">
                      Resend in {resendCooldown}s
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
