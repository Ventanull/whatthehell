import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { Mail, ArrowRight, Loader2, User, Smartphone, Building2, MessageSquare } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showRegFields, setShowRegFields] = useState(false);
  const [regData, setRegData] = useState({ name: '', whatsappNumber: '', companyName: '' });
  const navigate = useNavigate();

  const handleContinue = async (e) => {
    e.preventDefault();
    if (showRegFields) {
      if (!regData.name) return setError('Name is required');
      handleSendOTP();
    } else {
      setIsChecking(true);
      setError('');
      try {
        const res = await api.post('/auth/check-email', { email });
        if (res.data.exists) {
          handleSendOTP();
        } else {
          setShowRegFields(true);
        }
      } catch (err) {
        setError('Error checking email. Please check your connection.');
      } finally {
        setIsChecking(false);
      }
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email });
      navigate('/verify-otp', { state: { email, regData: showRegFields ? regData : null } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden px-4">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-500/20 mb-4 transform rotate-12">
            <MessageSquare className="w-8 h-8 text-white transform -rotate-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center">
            AR media <span className="text-brand-600">WhatsApp</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">The most powerful automation platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-800 shadow-slate-200/50 dark:shadow-none">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {showRegFields ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {showRegFields ? 'Tell us a bit about yourself' : 'Sign in to continue your journey'}
            </p>
          </div>

          <form onSubmit={handleContinue} className="space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={showRegFields}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-12 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white font-medium disabled:opacity-60"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence>
                {showRegFields && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name *</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-12 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white font-medium"
                          placeholder="Anmol Ratna"
                          value={regData.name}
                          onChange={(e) => setRegData({...regData, name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">WhatsApp No. (Optional)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Smartphone className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-12 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white font-medium"
                          placeholder="+919876543210"
                          value={regData.whatsappNumber}
                          onChange={(e) => setRegData({...regData, whatsappNumber: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Company Name (Optional)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-12 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all dark:text-white font-medium"
                          placeholder="AR media Solutions"
                          value={regData.companyName}
                          onChange={(e) => setRegData({...regData, companyName: e.target.value})}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || isChecking}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {loading || isChecking ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span>{showRegFields ? 'Register & Continue' : 'Continue'}</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              {showRegFields && (
                <button 
                  type="button"
                  onClick={() => setShowRegFields(false)}
                  className="w-full mt-4 text-sm font-bold text-slate-400 hover:text-brand-500 transition-colors"
                >
                  Use a different email
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-slate-500 dark:text-slate-500 text-sm font-medium">
          Trusted by 10,000+ businesses worldwide
        </p>
      </motion.div>
    </div>
  );
}
