import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../api';
import { MessageSquare, Smartphone, Users, FileText, Zap, Bot, PhoneCall, BarChart3, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ activeSessions: 0, totalCampaigns: 0, totalMessagesSent: 0, totalContacts: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Top Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">System Online</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <button 
            onClick={fetchStats}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-900 dark:to-indigo-900 rounded-3xl p-8 sm:p-10 shadow-lg shadow-brand-500/20 text-white">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
          <p className="text-brand-100 dark:text-indigo-200 text-base sm:text-lg max-w-xl mb-8">
            Here's what's happening with your WhatsApp automation today.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {stats.activeSessions} devices online
            </div>
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              {stats.totalMessagesSent} messages today
            </div>
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              {user?.plan} License
            </div>
          </div>
        </div>
        
        {/* Background Bubbles Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large soft glow bubbles */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          
          {/* Animated floating bubbles */}
          <div className="absolute top-10 right-20 w-16 h-16 bg-white/20 rounded-full animate-bounce" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-12 right-48 w-10 h-10 bg-white/10 rounded-full animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/3 left-1/4 w-8 h-8 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
          <div className="absolute bottom-1/4 right-1/3 w-6 h-6 bg-white/15 rounded-full animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
          
          {/* Original Message Icons */}
          {/* <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <MessageSquare className="w-96 h-96" />
          </div> */}
          <div className="absolute top-10 right-10 animate-float-x hidden md:block">
            <div 
              className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 flex items-center justify-center transform rotate-12 shadow-2xl hover:rotate-0 hover:scale-110 transition-all duration-500"
            >
              <MessageSquare className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Messages Sent" 
          value={stats.totalMessagesSent} 
          subtitle="Lifetime messages" 
          icon={MessageSquare} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Active Devices" 
          value={stats.activeSessions} 
          subtitle="Total connected" 
          icon={Smartphone} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Total Contacts" 
          value={stats.totalContacts || 0} 
          subtitle="Saved audience" 
          icon={Users} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Credits Left" 
          value={user?.credits || 0} 
          subtitle="Available for sending" 
          icon={FileText} 
          color="bg-orange-500" 
        />
      </div>

      {/* Secondary Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard 
          title="Bulk Campaigns" 
          icon={BarChart3} 
          iconColor="text-indigo-500" 
          stat1Label="Total" stat1Value={stats.totalCampaigns}
          stat2Label="Success Rate" stat2Value="98%"
          progress={75}
        />
        <FeatureCard 
          title="Auto Reply" 
          icon={Zap} 
          iconColor="text-yellow-500" 
          stat1Label="Active Rules" stat1Value="0"
          stat2Label="Total Responses" stat2Value="0"
          progress={0}
        />
        <FeatureCard 
          title="Chatbot" 
          icon={Bot} 
          iconColor="text-blue-500" 
          stat1Label="Active Flows" stat1Value="0"
          stat2Label="Conversations" stat2Value="0"
          progress={0}
        />
        <FeatureCard 
          title="Call Responder" 
          icon={PhoneCall} 
          iconColor="text-green-500" 
          stat1Label="Active Rules" stat1Value="0"
          stat2Label="Responses Sent" stat2Value="0"
          progress={0}
        />
      </div>
    </div>
  );
}

// Subcomponents

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${color} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <span className="flex items-center text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        ↑ 100%
      </span>
      <span className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</span>
    </div>
  </div>
);

const FeatureCard = ({ title, icon: Icon, iconColor, stat1Label, stat1Value, stat2Label, stat2Value, progress }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-center mb-6">
      <h4 className="text-base font-bold text-gray-900 dark:text-white">{title}</h4>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 dark:text-slate-400">{stat1Label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{stat1Value}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 dark:text-slate-400">{stat2Label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{stat2Value}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
        <div className={`h-1.5 rounded-full ${progress > 0 ? 'bg-brand-500' : 'bg-gray-300 dark:bg-slate-600'}`} style={{ width: `${progress || 10}%` }}></div>
      </div>
    </div>
  </div>
);
