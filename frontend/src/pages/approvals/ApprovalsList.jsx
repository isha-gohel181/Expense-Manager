import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { expensesAPI } from '@/utils/api';
import { formatCurrency, formatDate, getCategoryIcon, getInitials } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Search,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ApprovalsList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExpenses: 0,
  });

  useEffect(() => {
    fetchPendingApprovals();
  }, [filters, pagination.currentPage]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...filters,
      };
      
      const response = await expensesAPI.getPendingApprovals(params);
      setExpenses(response.data.expenses);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApproval = async (expenseId, decision, comments = '') => {
    try {
      await expensesAPI.approveExpense(expenseId, decision, comments);
      toast.success(`Expense ${decision} successfully`);
      fetchPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process approval');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  if (loading && expenses.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve expense submissions</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-4 w-4 mr-1" />
            {pagination.totalExpenses} pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </Card>

      {/* Approvals List */}
      {expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-500">No pending approvals at the moment.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <motion.div
              key={expense._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ApprovalCard
                expense={expense}
                onQuickApproval={handleQuickApproval}
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
                {Math.min(pagination.currentPage * 10, pagination.totalExpenses)} of{' '}
                {pagination.totalExpenses} results
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
    </div>
  );
};

const ApprovalCard = ({ expense, onQuickApproval }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [comments, setComments] = useState('');

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Employee Avatar */}
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-blue-600">
                {getInitials(expense.employee.firstName, expense.employee.lastName)}
              </span>
            </div>

            {/* Expense Details */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {expense.employee.firstName} {expense.employee.lastName}
                </h3>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">{expense.employee.department}</span>
              </div>
              
              <div className="flex items-center space-x-4 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(expense.category)}</span>
                  <span className="text-sm text-gray-600 capitalize">
                    {expense.category.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {formatDate(expense.expenseDate)}
                </div>
              </div>

              <p className="text-gray-700 mb-3">{expense.description}</p>

              {/* Amount */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(expense.convertedAmount.value, expense.convertedAmount.currency)}
                  </span>
                  {expense.amount.currency !== expense.convertedAmount.currency && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Original: {formatCurrency(expense.amount.value, expense.amount.currency)})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/expenses/${expense._id}`}
                    className="btn-secondary flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                  
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="btn-primary"
                  >
                    Quick Actions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-200"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  placeholder="Add approval comments..."
                  className="input-field"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    onQuickApproval(expense._id, 'rejected', comments || 'Rejected without comments');
                    setShowQuickActions(false);
                    setComments('');
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </button>
                
                <button
                  onClick={() => {
                    onQuickApproval(expense._id, 'approved', comments || 'Approved');
                    setShowQuickActions(false);
                    setComments('');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {expense.receipt && (
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Receipt attached
            </span>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              View Receipt
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ApprovalsList;