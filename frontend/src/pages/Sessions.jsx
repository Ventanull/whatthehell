import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, Smartphone, PlusCircle, RefreshCw, Edit2, Check, X } from 'lucide-react';
import api from '../api';
import { useAuthStore } from '../store/authStore';
import { io } from 'socket.io-client';
import { showToast, showConfirm } from '../utils/swal';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrs, setQrs] = useState({});
  const [qrTimes, setQrTimes] = useState({});
  const [now, setNow] = useState(Date.now());
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const { user } = useAuthStore();

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      setSessions(res.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions');
    }
  };

  const getMaxSessions = () => {
    switch (user?.plan) {
      case 'starter': return 5;
      case 'pro': return 10;
      case 'enterprise': return 'Unlimited';
      default: return 5;
    }
  };

  const maxSessions = getMaxSessions();
  const isLimitReached = maxSessions !== 'Unlimited' && sessions.length >= maxSessions;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'RECONNECTING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  useEffect(() => {
    fetchSessions();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(apiUrl);
    socket.on('connect', () => {
      if (user?.id) socket.emit('join', user.id);
    });
    socket.on('qr', (data) => {
      setQrs((prev) => ({ ...prev, [data.folderName]: data.qr }));
      setQrTimes((prev) => ({ ...prev, [data.folderName]: Date.now() }));
    });
    socket.on('session_status', (data) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.folderName === data.folderName ? { ...s, status: data.status } : s
        )
      );
      if (data.status === 'CONNECTED' || data.status === 'DISCONNECTED') {
        setQrs((prev) => {
          const newQrs = { ...prev };
          delete newQrs[data.folderName];
          return newQrs;
        });
      }
    });
    
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [user?.id]);

  const addSession = async (e) => {
    e.preventDefault();
    if (!sessionName) return;
    setLoading(true);
    try {
      await api.post('/sessions', { sessionName });
      setSessionName('');
      fetchSessions();
    } catch (error) {
      showToast('error', 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id) => {
    const result = await showConfirm('Delete Session', 'Are you sure you want to delete this session?');
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/sessions/${id}`);
      fetchSessions();
      showToast('success', 'Session deleted');
    } catch (error) {
      showToast('error', 'Failed to delete session');
    }
  };

  const handleUpdateName = async (id) => {
    if (!editName) return setEditingId(null);
    try {
      await api.put(`/sessions/${id}`, { sessionName: editName });
      setEditingId(null);
      fetchSessions();
      showToast('success', 'Name updated');
    } catch (error) {
      showToast('error', 'Failed to update name');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Devices</h2>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {sessions.length} / {maxSessions} Used
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your connected WhatsApp accounts.</p>
        </div>
        <form onSubmit={addSession} className="flex gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Session Name"
            className="flex-1 md:w-64 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors disabled:opacity-50"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            disabled={isLimitReached}
          />
          <button
            type="submit"
            disabled={loading || isLimitReached}
            className="bg-brand-600 dark:bg-brand-500 text-white px-4 py-2 rounded-xl hover:bg-brand-700 dark:hover:bg-brand-600 flex items-center justify-center font-medium shadow-sm shadow-brand-500/20 disabled:opacity-70 transition-colors whitespace-nowrap"
            title={isLimitReached ? "Plan limit reached" : ""}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Session
          </button>
        </form>
      </div>

      {sessions.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 text-center">
          <Smartphone className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-gray-500 dark:text-slate-400 text-lg">No sessions found. Add a session to link your WhatsApp.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((s) => (
          <div key={s._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.status === 'CONNECTED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  {editingId === s._id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 px-2 py-1 rounded text-sm outline-none focus:border-brand-500 w-32"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(s._id)}
                      />
                      <button onClick={() => handleUpdateName(s._id)} className="text-green-500 hover:text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{s.sessionName}</h3>
                      <button 
                        onClick={() => { setEditingId(s._id); setEditName(s.sessionName); }}
                        className="opacity-0 group-hover/name:opacity-100 text-gray-400 hover:text-brand-500 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md mt-1 inline-block ${getStatusBadge(s.status)}`}>
                    {s.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => deleteSession(s._id)} 
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete Session"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 flex-1 flex flex-col items-center justify-center min-h-[220px]">
              {(s.status === 'INITIATED' || s.status === 'RECONNECTING') ? (
                qrs[s.folderName] ? (
                  <div className="text-center w-full">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-4">Scan QR code with WhatsApp</p>
                    <div className="bg-white p-3 rounded-2xl shadow-sm inline-block border border-gray-200">
                      <QRCodeSVG value={qrs[s.folderName]} size={180} />
                    </div>
                    {qrTimes[s.folderName] && (
                      <div className="mt-3 text-[11px] font-medium text-gray-500 dark:text-slate-400">
                        <p>Refreshed {Math.floor((now - qrTimes[s.folderName]) / 1000)}s ago</p>
                        <p className="text-brand-600 dark:text-brand-400 mt-0.5">
                          New QR in {Math.max(0, 60 - Math.floor((now - qrTimes[s.folderName]) / 1000))}s
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mb-3 text-brand-500" />
                    <p className="text-sm">Generating QR code...</p>
                  </div>
                )
              ) : s.status === 'CONNECTED' ? (
                <div className="text-center text-green-600 dark:text-green-400 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-lg">Connected</p>
                  <p className="text-sm opacity-80 mt-1 text-gray-500 dark:text-slate-400">Ready to send messages</p>
                </div>
              ) : (
                <div className="text-center text-red-500 dark:text-red-400 flex flex-col items-center justify-center">
                  <p className="font-medium">Disconnected</p>
                  <p className="text-xs opacity-80 mt-1">Please delete and re-add</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
