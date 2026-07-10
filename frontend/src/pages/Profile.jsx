import React, { useState } from 'react';
import { User, Mail, Smartphone, Building, Shield, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../api';
import { showToast } from '../utils/swal';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { user, setAuth, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Profile fields
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    whatsappNumber: user?.whatsappNumber || '',
    companyName: user?.companyName || ''
  });

  // Email change state
  const [emailStep, setEmailStep] = useState(0); // 0: Idle, 1: Verify Old OTP, 2: New Email Entry, 3: Verify New OTP
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const res = await api.put('/auth/profile', profileData);
      setAuth(res.data.user, token);
      showToast('success', 'Profile updated successfully!');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const startEmailChange = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-email-change');
      setEmailStep(1);
      showToast('success', 'OTP sent to your current email.');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOldEmail = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-old-email', { otp });
      setEmailStep(2);
      setOtp('');
      showToast('success', 'Current email verified. Now enter your new email.');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const requestNewEmailOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-new-email', { newEmail });
      setEmailStep(3);
      showToast('success', `OTP sent to ${newEmail}`);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Email already in use');
    } finally {
      setLoading(false);
    }
  };

  const verifyNewEmail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-new-email', { otp, newEmail });
      setAuth(res.data.user, token);
      setEmailStep(0);
      setOtp('');
      setNewEmail('');
      showToast('success', 'Email address updated successfully!');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-brand-500/20">
            {user?.name ? user.name[0].toUpperCase() : <User className="w-10 h-10" />}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{user?.name || 'User Profile'}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-xs font-bold uppercase tracking-wider">
                {user?.plan} Plan
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 h-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-500" /> Account Details
            </h3>
            


            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="Anmol Ratna"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 ml-1">WhatsApp Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                      value={profileData.whatsappNumber}
                      onChange={(e) => setProfileData({...profileData, whatsappNumber: e.target.value})}
                      placeholder="+919876543210"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 ml-1">Company Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                    value={profileData.companyName}
                    onChange={(e) => setProfileData({...profileData, companyName: e.target.value})}
                    placeholder="AR media Solutions"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-500/25 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security / Email Change */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 h-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" /> Security
            </h3>

            <div className="space-y-6">
              <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Email Address</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 opacity-80">{user?.email}</p>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {emailStep === 0 && (
                    <motion.button
                      key="step0"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={startEmailChange}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl border border-gray-200 dark:border-slate-700 transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Change Email</p>
                        <p className="text-[10px] text-gray-500 dark:text-slate-500">Requires 2-step verification</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  )}

                  {emailStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Enter OTP sent to your current email:</p>
                      <input 
                        type="text" maxLength="6" placeholder="000000"
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-brand-500/20"
                        value={otp} onChange={(e) => setOtp(e.target.value)}
                      />
                      <button onClick={verifyOldEmail} disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-70">
                        Verify Current Email
                      </button>
                    </motion.div>
                  )}

                  {emailStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Enter your new email address:</p>
                      <input 
                        type="email" placeholder="newemail@example.com"
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                        value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      />
                      <button onClick={requestNewEmailOTP} disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-70">
                        Send OTP to New Email
                      </button>
                    </motion.div>
                  )}

                  {emailStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Enter OTP sent to {newEmail}:</p>
                      <input 
                        type="text" maxLength="6" placeholder="000000"
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-brand-500/20"
                        value={otp} onChange={(e) => setOtp(e.target.value)}
                      />
                      <button onClick={verifyNewEmail} disabled={loading} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-70">
                        Confirm Email Change
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {emailStep > 0 && (
                  <button onClick={() => setEmailStep(0)} className="w-full text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                    Cancel Process
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
