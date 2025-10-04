import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { adminAPI, usersAPI } from '@/utils/api';
import { formatCurrency, getInitials } from '@/utils/helpers';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  DollarSign,
  Percent,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ruleSchema = yup.object({
  name: yup.string().required('Rule name is required'),
  minAmount: yup.number().min(0, 'Amount must be positive').required('Minimum amount is required'),
  maxAmount: yup.number().min(0, 'Amount must be positive').required('Maximum amount is required'),
  categories: yup.array(),
  departments: yup.array(),
  ruleType: yup.string().oneOf(['sequential', 'percentage', 'specific_approver', 'hybrid']).required('Rule type is required'),
  percentageRequired: yup.number().when('ruleType', {
    is: (val) => val === 'percentage' || val === 'hybrid',
    then: (schema) => schema.min(1, 'Percentage must be at least 1').max(100, 'Percentage cannot exceed 100').required('Percentage is required'),
    otherwise: (schema) => schema.nullable(),
  }),
  approvers: yup.array().min(1, 'At least one approver is required'),
  requireManagerApproval: yup.boolean(),
  priority: yup.number().min(1, 'Priority must be at least 1').required('Priority is required'),
});

const ApprovalRules = () => {
  const [rules, setRules] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRules: 0,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    control,
  } = useForm({
    resolver: yupResolver(ruleSchema),
  });

  const ruleType = watch('ruleType');

  useEffect(() => {
    fetchRules();
    fetchManagers();
  }, [pagination.currentPage]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getApprovalRules({
        page: pagination.currentPage,
        limit: 10,
      });
      setRules(response.data.rules);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch approval rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await usersAPI.getManagers();
      setManagers(response.data.managers);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const handleCreateRule = async (data) => {
    try {
      const ruleData = {
        ...data,
        approvers: data.approvers.map((approverId, index) => ({
          user: approverId,
          sequence: index,
          isRequired: true,
        })),
        rules: {
          type: data.ruleType,
          percentageRequired: data.percentageRequired || null,
          specificApprovers: data.ruleType === 'specific_approver' ? data.approvers : [],
          requireManagerApproval: data.requireManagerApproval,
        },
        conditions: {
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
          categories: data.categories || [],
          departments: data.departments || [],
        },
      };

      await adminAPI.createApprovalRule(ruleData);
      toast.success('Approval rule created successfully');
      setShowCreateModal(false);
      reset();
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create approval rule');
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setValue('name', rule.name);
    setValue('minAmount', rule.conditions.minAmount);
    setValue('maxAmount', rule.conditions.maxAmount);
    setValue('categories', rule.conditions.categories || []);
    setValue('departments', rule.conditions.departments || []);
    setValue('ruleType', rule.rules.type);
    setValue('percentageRequired', rule.rules.percentageRequired || 50);
    setValue('approvers', rule.approvers.map(a => a.user._id));
    setValue('requireManagerApproval', rule.rules.requireManagerApproval);
    setValue('priority', rule.priority);
    setShowCreateModal(true);
  };

  const handleUpdateRule = async (data) => {
    try {
      const ruleData = {
        ...data,
        approvers: data.approvers.map((approverId, index) => ({
          user: approverId,
          sequence: index,
          isRequired: true,
        })),
        rules: {
          type: data.ruleType,
          percentageRequired: data.percentageRequired || null,
          specificApprovers: data.ruleType === 'specific_approver' ? data.approvers : [],
          requireManagerApproval: data.requireManagerApproval,
        },
        conditions: {
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
          categories: data.categories || [],
          departments: data.departments || [],
        },
      };

      await adminAPI.updateApprovalRule(editingRule._id, ruleData);
      toast.success('Approval rule updated successfully');
      setShowCreateModal(false);
      setEditingRule(null);
      reset();
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update approval rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this approval rule?')) return;
    
    try {
      await adminAPI.deleteApprovalRule(ruleId);
      toast.success('Approval rule deleted successfully');
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete approval rule');
    }
  };

  const onSubmit = editingRule ? handleUpdateRule : handleCreateRule;

  const uniqueDepartments = [...new Set(managers.map(m => m.department).filter(Boolean))];

  if (loading && rules.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Approval Rules</h1>
          <p className="text-gray-600">Configure approval workflows for different expense scenarios</p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            reset();
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-12 w-12 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No approval rules yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first approval rule to automate expense workflows
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Rule
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <motion.div
              key={rule._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ApprovalRuleCard
                rule={rule}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {(pagination.currentPage - 1) * 10 + 1} to{' '}
                {Math.min(pagination.currentPage * 10, pagination.totalRules)} of{' '}
                {pagination.totalRules} rules
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Create/Edit Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRule(null);
          reset();
        }}
        title={editingRule ? 'Edit Approval Rule' : 'Create Approval Rule'}
        size="large"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className={`input-field ${errors.name ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="e.g., High Value Expenses"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <input
                  {...register('priority')}
                  type="number"
                  min="1"
                  className={`input-field ${errors.priority ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="1"
                />
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Higher number = higher priority</p>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Conditions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('minAmount')}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input-field pl-10 ${errors.minAmount ? 'border-red-300 focus:ring-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.minAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.minAmount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('maxAmount')}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input-field pl-10 ${errors.maxAmount ? 'border-red-300 focus:ring-red-500' : ''}`}
                    placeholder="10000.00"
                  />
                </div>
                {errors.maxAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxAmount.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories (Optional)
                </label>
                <select
                  {...register('categories')}
                  multiple
                  className="input-field"
                  size="4"
                >
                  {EXPENSE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departments (Optional)
                </label>
                <select
                  {...register('departments')}
                  multiple
                  className="input-field"
                  size="4"
                >
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </div>

          {/* Approval Configuration */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Approval Configuration</h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  {...register('requireManagerApproval')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Require manager approval first
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Type *
                </label>
                <select
                  {...register('ruleType')}
                  className={`input-field ${errors.ruleType ? 'border-red-300 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select approval type</option>
                  <option value="sequential">Sequential - All approvers in order</option>
                  <option value="percentage">Percentage - X% of approvers needed</option>
                  <option value="specific_approver">Specific Approver - Any specific person</option>
                  <option value="hybrid">Hybrid - Percentage OR specific approver</option>
                </select>
                {errors.ruleType && (
                  <p className="mt-1 text-sm text-red-600">{errors.ruleType.message}</p>
                )}
              </div>

              {(ruleType === 'percentage' || ruleType === 'hybrid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Percentage Required *
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('percentageRequired')}
                      type="number"
                      min="1"
                      max="100"
                      className={`input-field pl-10 ${errors.percentageRequired ? 'border-red-300 focus:ring-red-500' : ''}`}
                      placeholder="60"
                    />
                  </div>
                  {errors.percentageRequired && (
                    <p className="mt-1 text-sm text-red-600">{errors.percentageRequired.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approvers *
                </label>
                <select
                  {...register('approvers')}
                  multiple
                  className={`input-field ${errors.approvers ? 'border-red-300 focus:ring-red-500' : ''}`}
                  size="6"
                >
                  {managers.map(manager => (
                    <option key={manager._id} value={manager._id}>
                      {manager.firstName} {manager.lastName} ({manager.role})
                    </option>
                  ))}
                </select>
                {errors.approvers && (
                  <p className="mt-1 text-sm text-red-600">{errors.approvers.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingRule(null);
                reset();
              }}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary flex items-center justify-center"
            >
              {isSubmitting ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : null}
              {isSubmitting 
                ? (editingRule ? 'Updating...' : 'Creating...') 
                : (editingRule ? 'Update Rule' : 'Create Rule')
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const ApprovalRuleCard = ({ rule, onEdit, onDelete }) => {
  const getRuleTypeIcon = (type) => {
    switch (type) {
      case 'sequential':
        return <ArrowRight className="h-4 w-4" />;
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'specific_approver':
        return <CheckCircle className="h-4 w-4" />;
      case 'hybrid':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRuleTypeColor = (type) => {
    switch (type) {
      case 'sequential':
        return 'bg-blue-100 text-blue-800';
      case 'percentage':
        return 'bg-green-100 text-green-800';
      case 'specific_approver':
        return 'bg-purple-100 text-purple-800';
      case 'hybrid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRuleTypeColor(rule.rules.type)}`}>
              {getRuleTypeIcon(rule.rules.type)}
              <span className="ml-1 capitalize">{rule.rules.type.replace('_', ' ')}</span>
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
              Priority {rule.priority}
            </span>
            {!rule.isActive && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Amount Range</p>
              <p className="font-medium text-gray-900">
                {formatCurrency(rule.conditions.minAmount)} - {formatCurrency(rule.conditions.maxAmount)}
              </p>
            </div>

            {rule.conditions.categories?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="font-medium text-gray-900 capitalize">
                  {rule.conditions.categories.slice(0, 2).join(', ')}
                  {rule.conditions.categories.length > 2 && ` +${rule.conditions.categories.length - 2} more`}
                </p>
              </div>
            )}

            {rule.conditions.departments?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500">Departments</p>
                <p className="font-medium text-gray-900">
                  {rule.conditions.departments.slice(0, 2).join(', ')}
                  {rule.conditions.departments.length > 2 && ` +${rule.conditions.departments.length - 2} more`}
                </p>
              </div>
            )}
          </div>

          {/* Approvers */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Approvers</p>
            <div className="flex items-center space-x-2">
              {rule.approvers.slice(0, 5).map((approver, index) => (
                <div key={approver.user._id} className="flex items-center space-x-1">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {getInitials(approver.user.firstName, approver.user.lastName)}
                    </span>
                  </div>
                  {index < Math.min(rule.approvers.length - 1, 4) && (
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              ))}
              {rule.approvers.length > 5 && (
                <span className="text-sm text-gray-500">+{rule.approvers.length - 5} more</span>
              )}
            </div>
          </div>

          {/* Rule Details */}
          <div className="text-sm text-gray-600">
            {rule.rules.requireManagerApproval && (
              <p className="mb-1">• Requires manager approval first</p>
            )}
            {rule.rules.type === 'percentage' && (
              <p className="mb-1">• Requires {rule.rules.percentageRequired}% approval</p>
            )}
            {rule.rules.type === 'hybrid' && (
              <p className="mb-1">• Requires {rule.rules.percentageRequired}% OR specific approver</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(rule._id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ApprovalRules;