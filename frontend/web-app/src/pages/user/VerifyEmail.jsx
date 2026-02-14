import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verificationService } from '../../services/userApi';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { toast } from 'react-toastify';
import logoTransparent from '../../assets/gourdvision-name-high-resolution-logo-transparent.png';
import './UserAuth.css';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useUserAuth();
  const email = location.state?.email || user?.email;

  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/user/login', { replace: true });
    }
  }, [email, navigate]);

  // Send PIN on mount if coming from registration
  useEffect(() => {
    if (location.state?.sendPin && email) {
      handleResend();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handlePinChange = (value, index) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && digit) {
      const fullPin = [...newPin.slice(0, 5), digit].join('');
      if (fullPin.length === 6) {
        handleVerify(fullPin);
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newPin = pastedData.split('');
      setPin(newPin);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;

    setLoading(true);
    try {
      const result = await verificationService.sendVerificationPin(email);
      if (result.success) {
        setResendTimer(60);
        toast.success('Verification code sent to your email!');
      } else {
        toast.error(result.message || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (codeToVerify) => {
    const fullPin = codeToVerify || pin.join('');

    if (fullPin.length !== 6) {
      toast.warning('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await verificationService.verifyEmailWithPin(email, fullPin);

      if (result.success) {
        // Update user context
        if (updateUser) {
          updateUser({ ...user, isEmailVerified: true });
        }
        toast.success('Email verified successfully!');
        navigate('/user/home', { replace: true });
      } else {
        toast.error(result.message || 'Invalid verification code');
        // Clear the PIN inputs on error
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error(error.message || 'Verification failed');
      setPin(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card verify-card">
        <div className="auth-header">
          <a href="/" className="auth-logo">
            <img src={logoTransparent} alt="GourdVision" className="logo-img" />
          </a>
          <h1>Verify Your Email</h1>
          <p>We sent a 6-digit code to</p>
          <p className="email-display">{email}</p>
        </div>

        <div className="verify-content">
          <div className="pin-container" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="pin-input"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            className="auth-submit"
            onClick={() => handleVerify()}
            disabled={loading || pin.join('').length !== 6}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Verify Email
              </>
            )}
          </button>

          <div className="resend-section">
            <p>Didn't receive the code?</p>
            {resendTimer > 0 ? (
              <span className="resend-timer">Resend in {resendTimer}s</span>
            ) : (
              <button className="resend-btn" onClick={handleResend} disabled={loading}>
                Resend Code
              </button>
            )}
          </div>

          <button className="back-link" onClick={() => navigate('/user/login')}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
