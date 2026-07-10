import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import VerifyOTP from './pages/VerifyOTP';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import Contacts from './pages/Contacts';
import BulkMessaging from './pages/BulkMessaging';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import api from './api';
import Layout from './components/Layout';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { token, user, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(!user && !!token);

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const res = await api.get('/auth/me');
          setAuth(res.data.user, token);
        } catch (err) {
          logout();
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUser();
  }, [token, user, setAuth, logout]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Wrapper (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/verify-otp" 
          element={
            <PublicRoute>
              <VerifyOTP />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/sessions" 
          element={
            <ProtectedRoute>
              <Sessions />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/campaigns" 
          element={
            <ProtectedRoute>
              <BulkMessaging />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
