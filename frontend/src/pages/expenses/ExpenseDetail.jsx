import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { expensesAPI } from '@/utils/api';
import { formatCurrency, formatDate, getStatusColor, getCategoryIcon, getInitials } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  Receipt,
  MessageSquare,
  Download,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await expensesAPI.getExpenseById(id);
      setExpense(response.data.expense);
    } catch (error) {
      toast.error('Failed to fetch expense details');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    try {
      setSubmittingApproval(true);
      await expensesAPI.approveExpense(id, approvalDecision, approvalComments);
      toast.success(`Expense ${approvalDecision} successfully`);
      setShowApprovalModal(false);
      fetchExpense();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process approval');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const canApprove = () => {
    return (user?.role === 'manager' || user?.role === 'admin') && 
           expense?.status === 'in_review' &&
           expense?.approvals?.some(approval => 
             approval.approver._id === user._id && approval.status === 'pending'
           );
  };

  const canEdit = () => {
    return expense?.employee._id === user?._id && expense?.status === 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Expense not found</h3>
        <button onClick={() => navigate('/expenses')} className="btn-primary">
          Back to Expenses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/expenses')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
            <p className="text-gray-600">
              Submitted by {expense.employee.firstName} {expense.employee.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {canEdit() && (
            <>
              <button
                onClick={() => navigate(`/expenses/${id}/edit`)}
                className="btn-secondary flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button className="btn-secondary text-red-600 hover:bg-red-50 flex items-center">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}

          {canApprove() && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setApprovalDecision('rejected');
                  setShowApprovalModal(true);
                }}
                className="btn-secondary text-red-600 hover:bg-red-50 flex items-center"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
              <button
                onClick={() => {
                  setApprovalDecision('approved');
                  setShowApprovalModal(true);
                }}
                className="btn-primary flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">
                  {getCategoryIcon(expense.category)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {expense.description}
                  </h2>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(expense.status)}`}>
                    {expense.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(expense.amount.value, expense.amount.currency)}
                </p>
                {expense.amount.currency !== expense.convertedAmount.currency && (
                  <p className="text-sm text-gray-500">
                    ≈ {formatCurrency(expense.convertedAmount.value, expense.convertedAmount.currency)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employee</p>
                  <p className="font-medium text-gray-900">
                    {expense.employee.firstName} {expense.employee.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(expense.expenseDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {expense.category.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {expense.ocrData && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    OCR Processed ({expense.ocrData.confidence}% confidence)
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  This expense was auto-filled using receipt scanning technology.
                </p>
              </div>
            )}
          </Card>

          {/* Approval Workflow */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Workflow</h3>
            <ApprovalTimeline approvals={expense.approvals} status={expense.status} />
          </Card>

          {/* Comments */}
          {expense.approvals?.some(a => a.comments) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
              <div className="space-y-4">
                {expense.approvals
                  .filter(approval => approval.comments)
                  .map((approval, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {getInitials(approval.approver.firstName, approval.approver.lastName)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {approval.approver.firstName} {approval.approver.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(approval.approvedAt, 'TIME')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{approval.comments}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Receipt */}
          {expense.receipt && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt</h3>
              <div className="space-y-4">
                <img
                  src={expense.receipt.path}
                  alt="Receipt"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="flex space-x-2">
                  <button className="flex-1 btn-secondary flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </button>
                  <button className="flex-1 btn-secondary flex items-center justify-center">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted</span>
                <span className="text-gray-900">{formatDate(expense.createdAt, 'TIME')}</span>
              </div>
              {expense.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="text-gray-900">{formatDate(expense.approvedAt, 'TIME')}</span>
                </div>
              )}
              {expense.rejectedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Rejected</span>
                  <span className="text-gray-900">{formatDate(expense.rejectedAt, 'TIME')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Currency</span>
                <span className="text-gray-900">{expense.amount.currency}</span>
              </div>
              {expense.finalApprover && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Final Approver</span>
                  <span className="text-gray-900">
                    {expense.finalApprover.firstName} {expense.finalApprover.lastName}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={`${approvalDecision === 'approved' ? 'Approve' : 'Reject'} Expense`}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {approvalDecision} this expense? 
            {approvalDecision === 'rejected' && ' Please provide a reason for rejection.'}
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments {approvalDecision === 'rejected' && '*'}
            </label>
            <textarea
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              rows={3}
              placeholder={`Add comments about this ${approvalDecision}...`}
              className="input-field"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => setShowApprovalModal(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleApproval}
              disabled={submittingApproval || (approvalDecision === 'rejected' && !approvalComments.trim())}
              className={`flex-1 ${approvalDecision === 'approved' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white'} flex items-center justify-center`}
            >
              {submittingApproval ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : approvalDecision === 'approved' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {submittingApproval ? 'Processing...' : `${approvalDecision === 'approved' ? 'Approve' : 'Reject'} Expense`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ApprovalTimeline = ({ approvals, status }) => {
  const getStepStatus = (approval, index) => {
    if (approval.status === 'approved') return 'completed';
    if (approval.status === 'rejected') return 'rejected';
    if (approval.status === 'pending' && index === 0) return 'active';
    if (approval.status === 'pending') return 'upcoming';
    return 'upcoming';
  };

  return (
    <div className="relative">
      {approvals.map((approval, index) => {
        const stepStatus = getStepStatus(approval, index);
        const isLast = index === approvals.length - 1;

        return (
          <div key={index} className="relative pb-8">
            {!isLast && (
              <span
                className={`absolute left-4 top-8 -ml-px h-full w-0.5 ${
                  stepStatus === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />
            )}
            
            <div className="relative flex items-start space-x-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  stepStatus === 'completed'
                    ? 'bg-green-500 text-white'
                    : stepStatus === 'rejected'
                    ? 'bg-red-500 text-white'
                    : stepStatus === 'active'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {stepStatus === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : stepStatus === 'rejected' ? (
                  <XCircle className="h-5 w-5" />
                ) : stepStatus === 'active' ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {approval.approver.firstName} {approval.approver.lastName}
                  </p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    stepStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : stepStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : stepStatus === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {approval.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 capitalize">
                  {approval.approver.role} • Sequence {approval.sequence + 1}
                </p>
                {approval.approvedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(approval.approvedAt, 'TIME')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseDetail;