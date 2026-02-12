import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Smartphone, Shield, Loader2, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const OTPVerification = ({ phoneNumber, onVerified, onCancel, countryCode = '+91' }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (otpSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpSent, timer]);

  // Setup reCAPTCHA verifier
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          toast.error('reCAPTCHA expired. Please try again.');
        }
      });
    }
  };

  // Send OTP
  const sendOTP = async () => {
    try {
      setLoading(true);
      const formattedPhone = `${countryCode}${phoneNumber}`;
      
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setTimer(60);
      setCanResend(false);
      toast.success('OTP sent to your phone!');
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Better error messages
      if (error.code === 'auth/invalid-phone-number') {
        toast.error('Invalid phone number format');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else if (error.code === 'auth/quota-exceeded') {
        toast.error('SMS quota exceeded. Please contact support.');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
      
      // Reset reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    try {
      const otpCode = otp.join('');
      
      if (otpCode.length !== 6) {
        toast.error('Please enter complete 6-digit OTP');
        return;
      }

      setLoading(true);
      
      const result = await confirmationResult.confirm(otpCode);
      
      // User verified successfully
      toast.success('Phone number verified successfully!');
      
      // Call parent callback with verification token
      onVerified({
        phoneNumber: phoneNumber,
        verified: true,
        uid: result.user.uid,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      if (error.code === 'auth/invalid-verification-code') {
        toast.error('Invalid OTP. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        toast.error('OTP expired. Please request a new one.');
      } else {
        toast.error('Verification failed. Please try again.');
      }
      
      // Clear OTP fields
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    setOtp(['', '', '', '', '', '']);
    await sendOTP();
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-verify when all 6 digits entered
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      setTimeout(() => verifyOTP(), 500);
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Initial send on mount
  useEffect(() => {
    const initialSend = async () => {
      try {
        setLoading(true);
        const formattedPhone = `${countryCode}${phoneNumber}`;
        
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        
        setConfirmationResult(confirmation);
        setOtpSent(true);
        setTimer(60);
        setCanResend(false);
        toast.success('OTP sent to your phone!');
      } catch (error) {
        console.error('Error sending OTP:', error);
        
        if (error.code === 'auth/invalid-phone-number') {
          toast.error('Invalid phone number format');
        } else if (error.code === 'auth/too-many-requests') {
          toast.error('Too many attempts. Please try again later.');
        } else if (error.code === 'auth/quota-exceeded') {
          toast.error('SMS quota exceeded. Please contact support.');
        } else {
          toast.error('Failed to send OTP. Please try again.');
        }
        
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      } finally {
        setLoading(false);
      }
    };
    
    initialSend();
    
    // Cleanup
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [countryCode, phoneNumber]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
            disabled={loading}
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Verify Phone Number</h2>
              <p className="text-blue-100 text-sm">{countryCode} {phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!otpSent ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
              <p className="text-gray-600">Sending OTP...</p>
            </div>
          ) : (
            <>
              {/* Info */}
              <div className="text-center">
                <Smartphone className="mx-auto mb-3 text-blue-600" size={48} />
                <p className="text-gray-700">
                  Enter the 6-digit code sent to your phone
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center">
                {!canResend ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in <span className="font-bold text-blue-600">{timer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={resendOTP}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              {/* Verify Button */}
              <button
                onClick={verifyOTP}
                disabled={loading || otp.some(digit => !digit)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Verify OTP
                  </>
                )}
              </button>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Standard SMS rates may apply. If you don't receive the code within 60 seconds, tap "Resend OTP".
                </p>
              </div>
            </>
          )}
        </div>

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default OTPVerification;
