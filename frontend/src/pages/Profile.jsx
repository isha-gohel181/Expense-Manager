import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/utils/api';
import { getInitials, formatDate } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Shield,
  Save,
  Camera,
  Eye,
  EyeOff,
  Edit,
  CheckCircle,
  Clock,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const profileSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  department: yup.string(),
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string().min(6, 'Password must be at least 6 characters').required('New password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile, isDirty: isProfileDirty },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      department: user?.department || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
    reset: resetPassword,
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });

  const handleUpdateProfile = async (data) => {
    try {
      await usersAPI.updateProfile(data);
      updateProfile(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (data) => {
    try {
      await usersAPI.updateProfile({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'activity', name: 'Recent Activity', icon: Calendar },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="h-24 w-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {getInitials(user?.firstName, user?.lastName)}
            </span>
          </div>
          <button className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-100 hover:bg-gray-50 transition-colors">
            <Camera className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-600 capitalize">{user?.role} at {user?.company?.name}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </span>
            <span className="text-sm text-gray-500">
              Member since {formatDate(user?.createdAt)}
            </span>
          </div>
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

          {/* Quick Stats */}
          <Card className="p-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Expenses</span>
                <span className="text-sm font-medium text-gray-900">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Approved</span>
                <span className="text-sm font-medium text-green-600">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="text-sm font-medium text-yellow-600">4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Rejected</span>
                <span className="text-sm font-medium text-red-600">2</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {activeTab === 'profile' && (
              <ProfileInformation
                user={user}
                register={registerProfile}
                handleSubmit={handleSubmitProfile}
                errors={profileErrors}
                isSubmitting={isSubmittingProfile}
                isDirty={isProfileDirty}
                onSubmit={handleUpdateProfile}
              />
            )}
            
            {activeTab === 'security' && (
              <SecuritySettings
                register={registerPassword}
                handleSubmit={handleSubmitPassword}
                errors={passwordErrors}
                isSubmitting={isSubmittingPassword}
                onSubmit={handleChangePassword}
                showCurrentPassword={showCurrentPassword}
                setShowCurrentPassword={setShowCurrentPassword}
                showNewPassword={showNewPassword}
                setShowNewPassword={setShowNewPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
              />
            )}
            
            {activeTab === 'activity' && (
              <RecentActivity user={user} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const ProfileInformation = ({ user, register, handleSubmit, errors, isSubmitting, isDirty, onSubmit }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
      <p className="text-sm text-gray-600 mb-6">
        Update your personal information and contact details.
      </p>
    </div>

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('firstName')}
              type="text"
              className={`input-field pl-10 ${errors.firstName ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="First name"
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('lastName')}
              type="text"
              className={`input-field pl-10 ${errors.lastName ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Last name"
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-field pl-10 bg-gray-50 cursor-not-allowed"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('department')}
              type="text"
              className="input-field pl-10"
              placeholder="Department"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={user?.role || ''}
              disabled
              className="input-field pl-10 bg-gray-50 cursor-not-allowed capitalize"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Manager
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={user?.manager ? `${user.manager.firstName} ${user.manager.lastName}` : 'No manager assigned'}
              disabled
              className="input-field pl-10 bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="btn-primary flex items-center disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" className="mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </motion.button>
      </div>
    </form>
  </div>
);

const SecuritySettings = ({
  register,
  handleSubmit,
  errors,
  isSubmitting,
  onSubmit,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
      <p className="text-sm text-gray-600 mb-6">
        Manage your account security and password settings.
      </p>
    </div>

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                {...register('currentPassword')}
                type={showCurrentPassword ? 'text' : 'password'}
                className={`input-field pl-10 pr-10 ${errors.currentPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                {...register('newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                className={`input-field pl-10 pr-10 ${errors.newPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-900">Password Requirements</span>
        </div>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• At least 6 characters long</li>
          <li>• Include both letters and numbers</li>
          <li>• Use a unique password not used elsewhere</li>
        </ul>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex items-center"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" className="mr-2" />
              Changing Password...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Change Password
            </>
          )}
        </motion.button>
      </div>
    </form>
  </div>
);

const RecentActivity = ({ user }) => {
  // Mock activity data - in a real app, this would come from an API
  const activities = [
    {
      id: 1,
      type: 'expense_created',
      title: 'Created new expense',
      description: 'Business lunch with clients - $85.50',
      timestamp: '2025-01-15T10:30:00Z',
      icon: Receipt,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 2,
      type: 'expense_approved',
      title: 'Expense approved',
      description: 'Travel expense for Q1 conference - $450.00',
      timestamp: '2025-01-14T14:20:00Z',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 3,
      type: 'profile_updated',
      title: 'Profile updated',
      description: 'Updated department information',
      timestamp: '2025-01-13T09:15:00Z',
      icon: User,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 4,
      type: 'expense_submitted',
      title: 'Expense submitted for approval',
      description: 'Office supplies purchase - $125.75',
      timestamp: '2025-01-12T16:45:00Z',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      id: 5,
      type: 'password_changed',
      title: 'Password changed',
      description: 'Account password was updated',
      timestamp: '2025-01-10T11:00:00Z',
      icon: Shield,
      color: 'bg-gray-100 text-gray-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <p className="text-sm text-gray-600 mb-6">
          Your recent account activity and expense submissions.
        </p>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
          >
            <div className={`p-2 rounded-full ${activity.color}`}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(activity.timestamp, 'TIME')}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center pt-4">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default Profile;