import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { adminAPI, companyAPI } from '@/utils/api';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Building2,
  Globe,
  DollarSign,
  Shield,
  Bell,
  Mail,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const settingsSchema = yup.object({
  companyName: yup.string().required('Company name is required'),
  country: yup.string().required('Country is required'),
  requireManagerApproval: yup.boolean(),
  maxExpenseAmount: yup.number().positive('Amount must be positive'),
  autoApprovalThreshold: yup.number().positive('Amount must be positive'),
  emailNotifications: yup.boolean(),
  slackIntegration: yup.boolean(),
});

const CompanySettings = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [activeTab, setActiveTab] = useState('general');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(settingsSchema),
  });

  useEffect(() => {
    fetchCompanyData();
    fetchCountries();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      // In a real app, you'd have a getCompanySettings API endpoint
      const company = user.company;
      
      setValue('companyName', company.name);
      setValue('country', company.country);
      setValue('requireManagerApproval', company.settings?.requireManagerApproval ?? true);
      setValue('maxExpenseAmount', company.settings?.maxExpenseAmount ?? 10000);
      setValue('autoApprovalThreshold', 100);
      setValue('emailNotifications', true);
      setValue('slackIntegration', false);
    } catch (error) {
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await companyAPI.getCountries();
      setCountries(response.data.countries);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    }
  };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      await adminAPI.updateCompanySettings({
        name: data.companyName,
        country: data.country,
        settings: {
          requireManagerApproval: data.requireManagerApproval,
          maxExpenseAmount: data.maxExpenseAmount,
          autoApprovalThreshold: data.autoApprovalThreshold,
          emailNotifications: data.emailNotifications,
          slackIntegration: data.slackIntegration,
        }
      });
      
      toast.success('Company settings updated successfully');
      
      // Update user context with new company data
      updateProfile({
        company: {
          ...user.company,
          name: data.companyName,
          country: data.country,
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Building2 },
    { id: 'approval', name: 'Approval Rules', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'integrations', name: 'Integrations', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600">Manage your company configuration and preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          {isDirty && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="mr-3 h-4 w-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="p-6">
              {activeTab === 'general' && (
                <GeneralSettings register={register} errors={errors} countries={countries} />
              )}
              
              {activeTab === 'approval' && (
                <ApprovalSettings register={register} errors={errors} watch={watch} />
              )}
              
              {activeTab === 'notifications' && (
                <NotificationSettings register={register} />
              )}
              
              {activeTab === 'integrations' && (
                <IntegrationSettings register={register} />
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving || !isDirty}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};

const GeneralSettings = ({ register, errors, countries }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('companyName')}
              type="text"
              className={`input-field pl-10 ${errors.companyName ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter company name"
            />
          </div>
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country *
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              {...register('country')}
              className={`input-field pl-10 ${errors.country ? 'border-red-300 focus:ring-red-500' : ''}`}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          {errors.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
          )}
        </div>
      </div>
    </div>

    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center space-x-2 mb-2">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">Currency Information</span>
      </div>
      <p className="text-xs text-blue-700">
        Your company currency is automatically set based on the selected country.
        All expense conversions will use this as the base currency.
      </p>
    </div>
  </div>
);

const ApprovalSettings = ({ register, errors, watch }) => {
  const requireManagerApproval = watch('requireManagerApproval');
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              {...register('requireManagerApproval')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Require manager approval for all expenses
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Expense Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('maxExpenseAmount')}
                  type="number"
                  className={`input-field pl-10 ${errors.maxExpenseAmount ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="10000"
                />
              </div>
              {errors.maxExpenseAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.maxExpenseAmount.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Maximum amount allowed for a single expense
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Approval Threshold
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('autoApprovalThreshold')}
                  type="number"
                  className="input-field pl-10"
                  placeholder="100"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Expenses below this amount are auto-approved
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-900">Approval Flow</span>
        </div>
        <p className="text-xs text-yellow-700">
          {requireManagerApproval 
            ? 'Expenses will first go to the employee\'s manager, then follow the configured approval rules.'
            : 'Expenses will directly follow the configured approval rules without manager approval.'
          }
        </p>
      </div>
    </div>
  );
};

const NotificationSettings = ({ register }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">
                Send email notifications for expense submissions and approvals
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              {...register('emailNotifications')}
              type="checkbox"
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">In-App Notifications</p>
              <p className="text-xs text-gray-500">
                Show notifications within the application
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
);

const IntegrationSettings = ({ register }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Third-party Integrations</h3>
      
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Slack Integration</p>
                <p className="text-xs text-gray-500">
                  Send expense notifications to Slack channels
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                {...register('slackIntegration')}
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700">
            Configure Slack Webhook
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 opacity-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">T</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Microsoft Teams</p>
                <p className="text-xs text-gray-500">
                  Integration with Microsoft Teams (Coming Soon)
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 opacity-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">Q</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">QuickBooks</p>
                <p className="text-xs text-gray-500">
                  Sync expenses with QuickBooks (Coming Soon)
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CompanySettings;