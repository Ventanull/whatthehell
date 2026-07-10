import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import api from '../api';
import { Users, Activity, MessageSquare, CreditCard, Shield } from 'lucide-react';
import { showToast } from '../utils/swal';

export default function Admin() {
  const { user, setAuth, token } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    totalCampaigns: 0,
    totalMessagesSent: 0,
    revenuePlaceholder: "$0.00"
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateUser = async (id, data) => {
    try {
      await api.put(`/admin/users/${id}`, data);
      fetchData();
      // If admin updated their own plan, refresh the global user state
      if (id === user.id) {
        const res = await api.get('/auth/me');
        setAuth(res.data.user, token);
      }
      showToast('success', 'User updated');
    } catch (error) {
      showToast('error', 'Failed to update user');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Platform overview and user management.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-brand-50 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-400 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400 mr-4">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 mr-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Messages Sent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMessagesSent}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400 mr-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.revenuePlaceholder}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/80">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">User Management</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                <th className="p-4">User Info</th>
                <th className="p-4">Company</th>
                <th className="p-4">Role</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-sm">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900 dark:text-white">{u.email}</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 flex flex-col mt-0.5">
                      <span>Name: {u.name || 'N/A'}</span>
                      <span>WA: {u.whatsappNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-gray-600 dark:text-slate-400 italic">
                    {u.companyName || '—'}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-slate-300">
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <select 
                      value={u.plan} 
                      onChange={(e) => updateUser(u._id, { plan: e.target.value, isActive: u.isActive })}
                      className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500 text-sm py-1.5 px-3 outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => updateUser(u._id, { plan: u.plan, isActive: !u.isActive })}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                        u.isActive 
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-red-900/30 dark:hover:text-red-400' 
                          : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-green-900/30 dark:hover:text-green-400'
                      }`}
                      title={u.isActive ? "Click to Ban" : "Click to Unban"}
                      disabled={u.role === 'admin'}
                    >
                      {u.isActive ? 'Active' : 'Banned'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
