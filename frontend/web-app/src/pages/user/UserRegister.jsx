import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, AtSign } from 'lucide-react';
import { toast } from 'react-toastify';
import PuzzleCaptcha from '../../components/user/PuzzleCaptcha';
import './UserAuth.css';

// Import logo
import logoTransparent from '../../assets/gourdvision-name-high-resolution-logo-transparent.png';

const UserRegister = () => {
  // Auth method: 'email' or 'username'
  const [authMethod, setAuthMethod] = useState('email');
  
  // Email registration form data
  const [emailFormData, setEmailFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Username registration form data
  const [usernameFormData, setUsernameFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puzzleVerified, setPuzzleVerified] = useState(false);
  
  const { register, registerWithUsername, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Reset states when switching methods
  useEffect(() => {
    setPuzzleVerified(false);
    setAgreeToTerms(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [authMethod]);

  const updateEmailField = (field, value) => {
    setEmailFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateUsernameField = (field, value) => {
    setUsernameFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateEmailForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = emailFormData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      toast.warning('Password must contain uppercase, lowercase, and a number');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (!agreeToTerms) {
      toast.warning('Please agree to the Terms of Service');
      return false;
    }

    return true;
  };

  const validateUsernameForm = () => {
    const { firstName, lastName, username, password, confirmPassword } = usernameFormData;

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return false;
    }

    // Username validation
    if (username.length < 3 || username.length > 30) {
      toast.error('Username must be between 3 and 30 characters');
      return false;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return false;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (!puzzleVerified) {
      toast.warning('Please complete the puzzle verification');
      return false;
    }

    if (!agreeToTerms) {
      toast.warning('Please agree to the Terms of Service');
      return false;
    }

    return true;
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = emailFormData;
      const result = await register(signupData);
      
      if (result.success) {
        toast.success('Account created! Please verify your email.');
        navigate('/user/verify-email', { state: { email: signupData.email, sendPin: true } });
      } else {
        toast.error(result.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameRegister = async (e) => {
    e.preventDefault();
    
    if (!validateUsernameForm()) return;

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = usernameFormData;
      const result = await registerWithUsername(signupData);
      
      if (result.success) {
        toast.success('Account created successfully!');
        navigate('/user/home');
      } else {
        toast.error(result.message || 'Registration failed');
        setPuzzleVerified(false);
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred during registration');
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
      <div className="auth-card register-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src={logoTransparent} alt="GourdVision" className="logo-img" />
          </Link>
          <h1>Create Account</h1>
          <p>Join the GourdVision community today</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => setAuthMethod('email')}
          >
            <Mail size={18} />
            With Email
          </button>
          <button 
            type="button"
            className={`auth-tab ${authMethod === 'username' ? 'active' : ''}`}
            onClick={() => setAuthMethod('username')}
          >
            <User size={18} />
            With Username
          </button>
        </div>

        {/* Email Registration Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailRegister} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName-email">
                  <User size={18} />
                  First Name
                </label>
                <input
                  id="firstName-email"
                  type="text"
                  value={emailFormData.firstName}
                  onChange={(e) => updateEmailField('firstName', e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName-email">
                  <User size={18} />
                  Last Name
                </label>
                <input
                  id="lastName-email"
                  type="text"
                  value={emailFormData.lastName}
                  onChange={(e) => updateEmailField('lastName', e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={emailFormData.email}
                onChange={(e) => updateEmailField('email', e.target.value)}
                placeholder="john@example.com"
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
                  value={emailFormData.password}
                  onChange={(e) => updateEmailField('password', e.target.value)}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="password-hint">
                Min 8 characters with uppercase, lowercase, and number
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword-email">
                <Lock size={18} />
                Confirm Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword-email"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={emailFormData.confirmPassword}
                  onChange={(e) => updateEmailField('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-method-note">
              <span>📧</span>
              Email verification code will be sent after registration
            </div>

            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms-email"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
              />
              <label htmlFor="terms-email">
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button 
              type="submit" 
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : (
                <>
                  <UserPlus size={18} />
                  Create Account with Email
                </>
              )}
            </button>
          </form>
        )}

        {/* Username Registration Form */}
        {authMethod === 'username' && (
          <form onSubmit={handleUsernameRegister} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName-username">
                  <User size={18} />
                  First Name
                </label>
                <input
                  id="firstName-username"
                  type="text"
                  value={usernameFormData.firstName}
                  onChange={(e) => updateUsernameField('firstName', e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName-username">
                  <User size={18} />
                  Last Name
                </label>
                <input
                  id="lastName-username"
                  type="text"
                  value={usernameFormData.lastName}
                  onChange={(e) => updateUsernameField('lastName', e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">
                <AtSign size={18} />
                Username
              </label>
              <input
                id="username"
                type="text"
                value={usernameFormData.username}
                onChange={(e) => updateUsernameField('username', e.target.value)}
                placeholder="john_doe123"
                required
                autoComplete="username"
              />
              <small className="password-hint">
                3-30 characters, letters, numbers, and underscores only
              </small>
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
                  value={usernameFormData.password}
                  onChange={(e) => updateUsernameField('password', e.target.value)}
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className="password-hint">
                Minimum 6 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword-username">
                <Lock size={18} />
                Confirm Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword-username"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={usernameFormData.confirmPassword}
                  onChange={(e) => updateUsernameField('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Puzzle CAPTCHA */}
            <div className="puzzle-section">
              <label className="puzzle-label">
                🧩 Complete the puzzle to verify you're human
              </label>
              <PuzzleCaptcha 
                onVerify={handlePuzzleVerify}
                onReset={() => setPuzzleVerified(false)}
              />
            </div>

            <div className="auth-method-note success">
              <span>✅</span>
              No email verification required - instant access!
            </div>

            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms-username"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
              />
              <label htmlFor="terms-username">
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button 
              type="submit" 
              className="auth-submit"
              disabled={loading || !puzzleVerified}
            >
              {loading ? 'Creating Account...' : (
                <>
                  <UserPlus size={18} />
                  Create Account with Username
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Already have an account? <Link to="/user/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
