import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff, User, AtSign } from 'lucide-react';
import { toast } from 'react-toastify';
import PuzzleCaptcha from '../../components/user/PuzzleCaptcha';
import './UserAuth.css';

// Import logo
import logoTransparent from '../../assets/gourdvision-name-high-resolution-logo-transparent.png';

const UserLogin = () => {
  // Auth method: 'email' or 'username'
  const [authMethod, setAuthMethod] = useState('email');
  
  // Email login state
  const [email, setEmail] = useState('');
  
  // Username login state
  const [username, setUsername] = useState('');
  
  // Common state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puzzleVerified, setPuzzleVerified] = useState(false);
  
  const { login, loginWithUsername, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Reset puzzle verification when switching methods
  useEffect(() => {
    setPuzzleVerified(false);
  }, [authMethod]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.warning('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        const user = result.user;
        const isVerified = user?.isEmailVerified || user?.emailVerified;
        
        if (!isVerified) {
          toast.info('Please verify your email to continue');
          navigate('/user/verify-email', { state: { email: user.email, sendPin: true } });
        } else {
          toast.success('Welcome back!');
          navigate('/user/home');
        }
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (!puzzleVerified) {
      toast.warning('Please complete the puzzle verification');
      return;
    }

    setLoading(true);

    try {
      const result = await loginWithUsername(username, password);
      
      if (result.success) {
        toast.success('Welcome back!');
        navigate('/user/home');
      } else {
        toast.error(result.message || 'Login failed');
        // Reset puzzle on failed login
        setPuzzleVerified(false);
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred during login');
      setPuzzleVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePuzzleVerify = (verified) => {
    setPuzzleVerified(verified);
    if (verified) {
      toast.success('Puzzle verified!');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src={logoTransparent} alt="GourdVision" className="logo-img" />
          </Link>
          <h1>Welcome Back</h1>
          <p>Sign in to your GourdVision account</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => setAuthMethod('email')}
          >
            <Mail size={18} />
            Email Login
          </button>
          <button 
            type="button"
            className={`auth-tab ${authMethod === 'username' ? 'active' : ''}`}
            onClick={() => setAuthMethod('username')}
          >
            <User size={18} />
            Username Login
          </button>
        </div>

        {/* Email Login Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-email">
                <Lock size={18} />
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password-email"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-method-note">
              <span>📧</span>
              Email verification code will be sent after login
            </div>

            <button 
              type="submit" 
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn size={18} />
                  Sign In with Email
                </>
              )}
            </button>
          </form>
        )}

        {/* Username Login Form */}
        {authMethod === 'username' && (
          <form onSubmit={handleUsernameLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">
                <AtSign size={18} />
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-username">
                <Lock size={18} />
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password-username"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Puzzle CAPTCHA */}
            <div className="puzzle-section">
              <label className="puzzle-label">
                🧩 Complete the puzzle to verify
              </label>
              <PuzzleCaptcha 
                onVerify={handlePuzzleVerify}
                onReset={() => setPuzzleVerified(false)}
              />
            </div>

            <button 
              type="submit" 
              className="auth-submit"
              disabled={loading || !puzzleVerified}
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn size={18} />
                  Sign In with Username
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/user/register">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
