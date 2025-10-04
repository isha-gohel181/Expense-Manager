import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  getProfile: () => api.get('/auth/profile'),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  createUser: (userData) => api.post('/users', userData),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getManagers: () => api.get('/users/managers'),
  updateProfile: (userData) => api.put('/users/profile/update', userData),
};

// Expenses API
export const expensesAPI = {
  getExpenses: (params) => api.get('/expenses', { params }),
  createExpense: (expenseData) => {
    const formData = new FormData();
    Object.keys(expenseData).forEach(key => {
      if (key === 'receipt' && expenseData[key]) {
        formData.append(key, expenseData[key]);
      } else {
        formData.append(key, expenseData[key]);
      }
    });
    return api.post('/expenses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // New function for processing receipt
  processReceipt: (receiptFile) => {
    const formData = new FormData();
    formData.append('receipt', receiptFile);
    return api.post('/expenses/process-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getExpenseById: (id) => api.get(`/expenses/${id}`),
  updateExpense: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getPendingApprovals: (params) => api.get('/expenses/pending/approvals', { params }),
  approveExpense: (id, decision, comments) => 
    api.post(`/expenses/${id}/approve`, { decision, comments }),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  createApprovalRule: (ruleData) => api.post('/admin/approval-rules', ruleData),
  getApprovalRules: (params) => api.get('/admin/approval-rules', { params }),
  updateApprovalRule: (id, ruleData) => api.put(`/admin/approval-rules/${id}`, ruleData),
  deleteApprovalRule: (id) => api.delete(`/admin/approval-rules/${id}`),
  getAllExpenses: (params) => api.get('/admin/expenses', { params }),
  overrideApproval: (id, decision, comments) => 
    api.post(`/admin/expenses/${id}/override`, { decision, comments }),
  updateCompanySettings: (settings) => api.put('/admin/company/settings', settings),
};

// Company API
export const companyAPI = {
  getCountries: () => api.get('/company/countries'),
  getExchangeRates: (currency) => api.get(`/company/exchange-rates/${currency}`),
};

export default api;