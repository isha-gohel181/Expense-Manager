import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import Dashboard from '@/pages/Dashboard';
import ExpenseList from '@/pages/expenses/ExpenseList';
import CreateExpense from '@/pages/expenses/CreateExpense';
import ExpenseDetail from '@/pages/expenses/ExpenseDetail';
import ApprovalsList from '@/pages/approvals/ApprovalsList';
import UserManagement from '@/pages/admin/UserManagement';
import CompanySettings from '@/pages/admin/CompanySettings';
import ApprovalRules from '@/pages/admin/ApprovalRules';
import Profile from '@/pages/Profile';
import { AnimatePresence } from 'framer-motion';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <Layout>
                    <ExpenseList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/expenses/create" element={
                <ProtectedRoute>
                  <Layout>
                    <CreateExpense />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/expenses/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <ExpenseDetail />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/approvals" element={
                <ProtectedRoute roles={['manager', 'admin']}>
                  <Layout>
                    <ApprovalsList />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['admin']}>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/settings" element={
                <ProtectedRoute roles={['admin']}>
                  <Layout>
                    <CompanySettings />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/approval-rules" element={
                <ProtectedRoute roles={['admin']}>
                  <Layout>
                    <ApprovalRules />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Redirect unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;