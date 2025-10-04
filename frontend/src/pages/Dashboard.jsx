import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { adminAPI, expensesAPI } from '@/utils/api';
import { useApi } from '@/hooks/useApi';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  DollarSign,
  Receipt,
  Clock,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        if (user?.role === 'admin') {
          const response = await adminAPI.getDashboardStats();
          setDashboardData(response.data);
        } else {
          // For employees and managers, get their expense data
          const [expensesResponse, approvalsResponse] = await Promise.all([
            expensesAPI.getExpenses({ limit: 10 }),
            user.role === 'manager' ? expensesAPI.getPendingApprovals({ limit: 5 }) : Promise.resolve({ data: { expenses: [] } })
          ]);
          
          setDashboardData({
            expenses: expensesResponse.data.expenses,
            pendingApprovals: approvalsResponse.data.expenses || [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-blue-100">
          Here's what's happening with your expenses today.
        </p>
      </motion.div>

      {/* Admin Dashboard */}
      {user?.role === 'admin' && (
        <AdminDashboard data={dashboardData} />
      )}

      {/* Manager Dashboard */}
      {user?.role === 'manager' && (
        <ManagerDashboard data={dashboardData} />
      )}

      {/* Employee Dashboard */}
      {user?.role === 'employee' && (
        <EmployeeDashboard data={dashboardData} />
      )}
    </div>
  );
};

const AdminDashboard = ({ data }) => {
  const { stats, expensesByCategory = [], recentExpenses = [] } = data || {};

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Monthly Expenses',
      value: stats?.totalExpenses || 0,
      icon: Receipt,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pendingExpenses || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '-5%',
    },
    {
      title: 'Total Amount',
      value: formatCurrency(stats?.totalAmount || 0, stats?.currency?.code),
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+15%',
    },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change} from last month</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Expenses by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalAmount"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Expenses */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Expenses
          </h3>
          <div className="space-y-4">
            {recentExpenses.map((expense) => (
              <div
                key={expense._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.employee?.firstName} {expense.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{expense.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(expense.convertedAmount?.value)}
                  </p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

const ManagerDashboard = ({ data }) => {
  const { expenses = [], pendingApprovals = [] } = data || {};

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{pendingApprovals.length}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  expenses.reduce((sum, exp) => sum + (exp.convertedAmount?.value || 0), 0)
                )}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Approvals
        </h3>
        {pendingApprovals.length > 0 ? (
          <div className="space-y-4">
            {pendingApprovals.map((expense) => (
              <ExpenseApprovalCard key={expense._id} expense={expense} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending approvals</p>
          </div>
        )}
      </Card>
    </>
  );
};

const EmployeeDashboard = ({ data }) => {
  const { expenses = [] } = data || {};

  const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending' || exp.status === 'in_review');
  const rejectedExpenses = expenses.filter(exp => exp.status === 'rejected');

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedExpenses.length}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingExpenses.length}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedExpenses.length}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
          <a
            href="/expenses/create"
            className="btn-primary"
          >
            New Expense
          </a>
        </div>
        {expenses.length > 0 ? (
          <div className="space-y-4">
            {expenses.slice(0, 5).map((expense) => (
              <ExpenseCard key={expense._id} expense={expense} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No expenses yet</p>
            <a href="/expenses/create" className="btn-primary">
              Create Your First Expense
            </a>
          </div>
        )}
      </Card>
    </>
  );
};

const ExpenseCard = ({ expense }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="flex items-center space-x-4">
      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
        <Receipt className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{expense.description}</p>
        <p className="text-xs text-gray-500">
          {expense.category} • {formatDate(expense.expenseDate)}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-gray-900">
        {formatCurrency(expense.amount?.value, expense.amount?.currency)}
      </p>
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
        {expense.status}
      </span>
    </div>
  </div>
);

const ExpenseApprovalCard = ({ expense }) => (
  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
    <div className="flex items-center space-x-4">
      <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {expense.employee?.firstName} {expense.employee?.lastName}
        </p>
        <p className="text-xs text-gray-500">
          {expense.description} • {formatDate(expense.expenseDate)}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-gray-900">
        {formatCurrency(expense.convertedAmount?.value)}
      </p>
      <a
        href={`/expenses/${expense._id}`}
        className="text-xs text-blue-600 hover:text-blue-700"
      >
        Review →
      </a>
    </div>
  </div>
);

export default Dashboard;