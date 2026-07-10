import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import { Loader2, ArrowRight, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const email = location.state?.email;
  const regData = location.state?.regData;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }

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
  }, [email, navigate]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp: otpString,
        ...regData
      });
      setAuth(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setTimer(300);
    setCanResend(false);
    setError('');
    try {
      await api.post('/auth/send-otp', { email });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    }
  };

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden px-4">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-4 transform -rotate-6">
            <ShieldCheck className="w-8 h-8 text-white transform rotate-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center">Verify Email</h1>
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
            <Mail className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{email}</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-800 shadow-slate-200/50 dark:shadow-none">
          <div className="text-center mb-8">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Enter the 6-digit verification code we just sent to your email address.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-semibold text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="flex justify-between gap-2">
              {otp.map((data, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength="1"
                  className="w-12 h-16 text-center text-2xl font-black bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white"
                  value={data}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span>Verify & Login</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="flex flex-col items-center gap-4">
                {timer > 0 ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <span className="text-slate-400 font-medium">Expires in</span>
                    <span className="text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
                      {formatTime(timer)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-red-500">Code expired</span>
                )}

                <button 
                  type="button" 
                  onClick={handleResend}
                  disabled={!canResend}
                  className="flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 disabled:opacity-50 transition-colors group"
                >
                  <RefreshCw className={`w-4 h-4 ${!canResend ? '' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  Resend Verification Code
                </button>
              </div>
            </div>
          </form>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="w-full mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Back to Login
        </button>
      </motion.div>
    </div>
  );
}
