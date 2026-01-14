import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Admin Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Forum from './pages/Forum';
import News from './pages/News';

// User Components
import UserProtectedRoute from './components/user/UserProtectedRoute';
import UserLogin from './pages/user/UserLogin';
import UserRegister from './pages/user/UserRegister';
import VerifyEmail from './pages/user/VerifyEmail';
import LandingPage from './pages/user/LandingPage';
import UserHome from './pages/user/UserHome';
import UserForum from './pages/user/UserForum';
import UserPostDetail from './pages/user/UserPostDetail';
import UserCreatePost from './pages/user/UserCreatePost';
import UserNews from './pages/user/UserNews';
import UserNewsDetail from './pages/user/UserNewsDetail';
import UserEducational from './pages/user/UserEducational';

function App() {
  return (
    <AuthProvider>
      <UserAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ==================== ADMIN ROUTES ==================== */}
            {/* Admin Login */}
            <Route path="/login" element={<Login />} />

            {/* Admin Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/forum"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Forum />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <Layout>
                    <News />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* ==================== USER ROUTES ==================== */}
            {/* Landing Page - Public (for non-logged in users) */}
            <Route path="/" element={<LandingPage />} />
            
            {/* User Authentication - Public */}
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/register" element={<UserRegister />} />
            <Route path="/user/verify-email" element={<VerifyEmail />} />

            {/* User Home - Protected (logged in AND verified users) */}
            <Route
              path="/user/home"
              element={
                <UserProtectedRoute>
                  <UserHome />
                </UserProtectedRoute>
              }
            />

            {/* User Forum - Protected (verified users only) */}
            <Route
              path="/user/forum"
              element={
                <UserProtectedRoute>
                  <UserForum />
                </UserProtectedRoute>
              }
            />
            <Route
              path="/user/forum/post/:id"
              element={
                <UserProtectedRoute>
                  <UserPostDetail />
                </UserProtectedRoute>
              }
            />
            <Route
              path="/user/forum/create"
              element={
                <UserProtectedRoute>
                  <UserCreatePost />
                </UserProtectedRoute>
              }
            />

            {/* User News - Protected (verified users only) */}
            <Route
              path="/user/news"
              element={
                <UserProtectedRoute>
                  <UserNews />
                </UserProtectedRoute>
              }
            />
            <Route
              path="/user/news/:id"
              element={
                <UserProtectedRoute>
                  <UserNewsDetail />
                </UserProtectedRoute>
              }
            />

            {/* User Educational - Protected (verified users only) */}
            <Route
              path="/user/learn"
              element={
                <UserProtectedRoute>
                  <UserEducational />
                </UserProtectedRoute>
              }
            />

            {/* ==================== REDIRECTS ==================== */}
            {/* Redirect /user to home if logged in */}
            <Route path="/user" element={<Navigate to="/user/home" replace />} />

            {/* 404 - Redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </BrowserRouter>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
