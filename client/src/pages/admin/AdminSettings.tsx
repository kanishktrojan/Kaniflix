import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Shield,
  Clock,
  Users,
  Zap,
  Search,
  Play,
  Trophy,
  RefreshCw,
  Save,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Mail,
  Server,
  Send,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '@/services';
import type { RateLimitSettings, RateLimitCategorySettings, RateLimitCategory, EmailSettings, EmailServiceProvider } from '@/types';

// Settings Tab Type
type SettingsTab = 'rate-limits' | 'email';

// Category configuration
const categoryConfig: Record<
  RateLimitCategory,
  { label: string; description: string; icon: React.ElementType; color: string }
> = {
  general: {
    label: 'General API',
    description: 'All API endpoints not covered by specific limiters',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
  },
  auth: {
    label: 'Authentication',
    description: 'Login, signup, password reset endpoints',
    icon: Shield,
    color: 'from-red-500 to-red-600',
  },
  search: {
    label: 'Search',
    description: 'Search and autocomplete endpoints',
    icon: Search,
    color: 'from-purple-500 to-purple-600',
  },
  stream: {
    label: 'Streaming',
    description: 'Video and media streaming endpoints',
    icon: Play,
    color: 'from-green-500 to-green-600',
  },
  sports: {
    label: 'Sports',
    description: 'Sports events and live streaming endpoints',
    icon: Trophy,
    color: 'from-orange-500 to-orange-600',
  },
};

// Time presets for window selection
const timePresets = [
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
  { label: '30 minutes', value: 1800000 },
  { label: '1 hour', value: 3600000 },
];

// Helper to format ms to readable string
const formatWindow = (ms: number): string => {
  if (ms < 60000) return `${ms / 1000} seconds`;
  if (ms < 3600000) return `${ms / 60000} minutes`;
  return `${ms / 3600000} hours`;
};

const AdminSettings = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('rate-limits');
  
  // Rate limit settings state
  const [settings, setSettings] = useState<RateLimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<RateLimitCategory | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<RateLimitSettings | null>(null);
  
  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailHasChanges, setEmailHasChanges] = useState(false);
  const [originalEmailSettings, setOriginalEmailSettings] = useState<EmailSettings | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchEmailSettings();
  }, []);
  
  const fetchEmailSettings = async () => {
    try {
      setEmailLoading(true);
      setEmailError(null);
      const data = await adminService.getEmailSettings();
      setEmailSettings(data);
      setOriginalEmailSettings(JSON.parse(JSON.stringify(data)));
      setEmailHasChanges(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load email settings';
      setEmailError(errorMessage);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getRateLimitSettings();
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const updated = await adminService.updateRateLimitSettings(settings);
      setSettings(updated);
      setOriginalSettings(JSON.parse(JSON.stringify(updated)));
      setHasChanges(false);
      setSuccess('Settings saved successfully! Changes will take effect within 30 seconds.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all rate limit settings to defaults?')) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const data = await adminService.resetRateLimitSettings();
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
      setSuccess('Settings reset to defaults successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateCategorySettings = (
    category: RateLimitCategory,
    field: keyof RateLimitCategorySettings,
    value: boolean | number
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const discardChanges = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      setHasChanges(false);
    }
  };
  
  // Email settings handlers
  const handleSaveEmail = async () => {
    if (!emailSettings) return;

    try {
      setEmailSaving(true);
      setEmailError(null);
      setEmailSuccess(null);
      const updated = await adminService.updateEmailSettings(emailSettings);
      setEmailSettings(updated);
      setOriginalEmailSettings(JSON.parse(JSON.stringify(updated)));
      setEmailHasChanges(false);
      setEmailSuccess('Email settings saved successfully!');
      setTimeout(() => setEmailSuccess(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save email settings';
      setEmailError(errorMessage);
    } finally {
      setEmailSaving(false);
    }
  };
  
  const updateEmailProvider = (provider: EmailServiceProvider) => {
    if (!emailSettings) return;
    setEmailSettings({ ...emailSettings, provider });
    setEmailHasChanges(true);
  };
  
  const updateKaniflixServiceUrl = (url: string) => {
    if (!emailSettings) return;
    setEmailSettings({ ...emailSettings, kaniflixServiceUrl: url });
    setEmailHasChanges(true);
  };
  
  const updateKaniflixServiceApiKey = (key: string) => {
    if (!emailSettings) return;
    setEmailSettings({ ...emailSettings, kaniflixServiceApiKey: key });
    setEmailHasChanges(true);
  };
  
  const discardEmailChanges = () => {
    if (originalEmailSettings) {
      setEmailSettings(JSON.parse(JSON.stringify(originalEmailSettings)));
      setEmailHasChanges(false);
    }
  };
  
  const handleTestEmail = async () => {
    if (!testEmail) {
      setEmailError('Please enter an email address to send test email');
      return;
    }
    
    try {
      setTestingEmail(true);
      setEmailError(null);
      setEmailSuccess(null);
      const result = await adminService.testEmailService(testEmail);
      if (result.dev) {
        setEmailSuccess('Test email logged to console (dev mode - email service not configured)');
      } else {
        setEmailSuccess(`Test email sent successfully via ${result.provider}! Message ID: ${result.messageId}`);
      }
      setTimeout(() => setEmailSuccess(null), 8000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test email';
      setEmailError(errorMessage);
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading && emailLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-red-500" />
            Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your KANIFLIX platform settings
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('rate-limits')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'rate-limits'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Rate Limits
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'email'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email Service
        </button>
      </div>
      
      {/* Rate Limits Tab */}
      {activeTab === 'rate-limits' && (
        <div className="space-y-6">
          {/* Rate Limits Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Rate Limiting</h2>
              <p className="text-gray-400 text-sm mt-1">
                Configure API rate limiting to protect your server from abuse
              </p>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <button
                  onClick={discardChanges}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${
                  hasChanges
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
              >
                <Check className="w-5 h-5 flex-shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium">How Rate Limiting Works</p>
              <p className="mt-1 text-blue-400/80">
                Rate limiting controls how many requests a user can make within a time window.
                When the limit is exceeded, users receive a 429 (Too Many Requests) error.
                Settings are cached for 30 seconds, so changes may take up to 30 seconds to apply.
              </p>
            </div>
          </div>

      {/* Settings Cards */}
      {settings && (
        <div className="space-y-4">
          {(Object.keys(categoryConfig) as RateLimitCategory[]).map((category) => {
            const config = categoryConfig[category];
            const catSettings = settings[category];
            const Icon = config.icon;
            const isExpanded = expandedCategory === category;

            return (
              <motion.div
                key={category}
                layout
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${config.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                      <p className="text-sm text-gray-400">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Quick Toggle */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-gray-400">
                        {catSettings.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() =>
                          updateCategorySettings(category, 'enabled', !catSettings.enabled)
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          catSettings.enabled ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                            catSettings.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {/* Summary */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatWindow(catSettings.windowMs)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        {catSettings.maxRequests} requests
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Settings */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-700/50"
                    >
                      <div className="p-6 space-y-6">
                        {/* Time Window */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Clock className="w-4 h-4 inline mr-2" />
                              Time Window
                            </label>
                            <select
                              value={catSettings.windowMs}
                              onChange={(e) =>
                                updateCategorySettings(
                                  category,
                                  'windowMs',
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                              {timePresets.map((preset) => (
                                <option key={preset.value} value={preset.value}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              The time period for counting requests
                            </p>
                          </div>

                          {/* Max Requests */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Zap className="w-4 h-4 inline mr-2" />
                              Max Requests
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              value={catSettings.maxRequests}
                              onChange={(e) =>
                                updateCategorySettings(
                                  category,
                                  'maxRequests',
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Maximum requests allowed per time window
                            </p>
                          </div>
                        </div>

                        {/* Skip Options */}
                        <div className="flex flex-wrap gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={catSettings.skipAdmin}
                              onChange={(e) =>
                                updateCategorySettings(category, 'skipAdmin', e.target.checked)
                              }
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-800"
                            />
                            <div>
                              <span className="text-white font-medium flex items-center gap-2">
                                <Shield className="w-4 h-4 text-red-400" />
                                Skip for Admins
                              </span>
                              <span className="text-xs text-gray-400">
                                Admin users bypass this rate limit
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={catSettings.skipPremium}
                              onChange={(e) =>
                                updateCategorySettings(category, 'skipPremium', e.target.checked)
                              }
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-800"
                            />
                            <div>
                              <span className="text-white font-medium flex items-center gap-2">
                                <Users className="w-4 h-4 text-yellow-400" />
                                Skip for Premium Users
                              </span>
                              <span className="text-xs text-gray-400">
                                Premium users bypass this rate limit
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Rate Calculation */}
                        <div className="p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-sm text-gray-300">
                            <strong>Effective Rate:</strong>{' '}
                            {catSettings.enabled ? (
                              <span className="text-green-400">
                                {catSettings.maxRequests} requests per{' '}
                                {formatWindow(catSettings.windowMs)}
                                {' ≈ '}
                                {Math.round(
                                  (catSettings.maxRequests / catSettings.windowMs) * 60000
                                )}{' '}
                                requests/minute
                              </span>
                            ) : (
                              <span className="text-yellow-400">
                                Unlimited (rate limiting disabled)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
      )}
      
      {/* Email Service Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Email Settings Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Email Service</h2>
              <p className="text-gray-400 text-sm mt-1">
                Configure how OTP and notification emails are sent
              </p>
            </div>

            <div className="flex items-center gap-3">
              {emailHasChanges && (
                <button
                  onClick={discardEmailChanges}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSaveEmail}
                disabled={!emailHasChanges || emailSaving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${
                  emailHasChanges
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {emailSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
          
          {/* Email Messages */}
          <AnimatePresence>
            {emailError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {emailError}
              </motion.div>
            )}

            {emailSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400"
              >
                <Check className="w-5 h-5 flex-shrink-0" />
                {emailSuccess}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium">Email Service Options</p>
              <p className="mt-1 text-blue-400/80">
                <strong>Third Party Service (Resend):</strong> Uses Resend API directly from the main server. Fast and reliable with generous free tier.
                <br />
                <strong>Kaniflix Service:</strong> Uses your own email microservice running on a separate server. Useful as backup or when Resend limits are reached.
              </p>
            </div>
          </div>
          
          {emailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500" />
            </div>
          ) : emailSettings && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Email Provider</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Third Party Service (Resend) */}
                  <button
                    onClick={() => updateEmailProvider('third_party')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                      emailSettings.provider === 'third_party'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    {emailSettings.provider === 'third_party' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                        <ExternalLink className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Third Party Service</h4>
                        <p className="text-xs text-gray-400">Resend API</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      Uses Resend API directly. Configured via environment variables (RESEND_API_KEY).
                      Fast, reliable, and includes analytics.
                    </p>
                  </button>
                  
                  {/* Kaniflix Service */}
                  <button
                    onClick={() => updateEmailProvider('kaniflix_service')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                      emailSettings.provider === 'kaniflix_service'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    }`}
                  >
                    {emailSettings.provider === 'kaniflix_service' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                        <Server className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Kaniflix Service</h4>
                        <p className="text-xs text-gray-400">Self-hosted microservice</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      Uses your own email microservice via HTTP. Configure the URL below.
                      Useful as backup when third-party limits are reached.
                    </p>
                  </button>
                </div>
              </div>
              
              {/* Kaniflix Service Configuration */}
              {emailSettings.provider === 'kaniflix_service' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Kaniflix Service Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service URL
                      </label>
                      <input
                        type="url"
                        value={emailSettings.kaniflixServiceUrl}
                        onChange={(e) => updateKaniflixServiceUrl(e.target.value)}
                        placeholder="https://your-email-service.example.com"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The URL of your Kaniflix email microservice (e.g., Cloudflare tunnel URL)
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={emailSettings.kaniflixServiceApiKey}
                        onChange={(e) => updateKaniflixServiceApiKey(e.target.value)}
                        placeholder="Enter API key for authentication"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        API key used to authenticate requests to the email service
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Test Email */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Test Email Service</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Send a test email to verify your email service configuration is working correctly.
                </p>
                
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail || !testEmail}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingEmail ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Test
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
