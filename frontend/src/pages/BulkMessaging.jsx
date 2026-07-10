import React, { useState, useEffect, useRef } from 'react';
import { Send, Pause, Play, XCircle, Paperclip, Bold, Italic, Strikethrough, Code, Image as ImageIcon, FileText, Video, Mic } from 'lucide-react';
import api from '../api';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../utils/swal';

export default function BulkMessaging() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [packetConfig, setPacketConfig] = useState({ minPacketSize: 5, maxPacketSize: 10, minDelay: 90, maxDelay: 120 });
  const { user } = useAuthStore();
  const textareaRef = useRef(null);

  const fetchData = async () => {
    // Fetch sessions and campaigns independently so one failing endpoint
    // doesn't prevent rendering the other (previously Promise.all hid errors).
    try {
      const sessRes = await api.get('/sessions');
      console.debug('Sessions API response:', sessRes.data);
      const allSessions = Array.isArray(sessRes.data.sessions) ? sessRes.data.sessions : [];
      setSessions(allSessions.filter(s => s.status === 'CONNECTED'));
    } catch (err) {
      console.error('Failed to fetch sessions', err);
      setSessions([]);
    }

    try {
      const campRes = await api.get('/campaigns');
      setCampaigns(Array.isArray(campRes.data.campaigns) ? campRes.data.campaigns : []);
    } catch (err) {
      // Backend currently returns 404 for GET /api/campaigns in this branch
      // Log and continue — campaigns history is optional for showing sessions.
      console.warn('Failed to fetch campaigns (this may be a missing endpoint):', err.response?.status || err.message);
      setCampaigns([]);
    }
  };

  useEffect(() => {
    fetchData();

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(apiUrl);
    
    socket.on('connect', () => {
      if (user?.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('campaign_progress', (data) => {
      setCampaigns((prev) => 
        prev.map((c) => {
          if (c._id !== data.campaignId) return c;

          const packetSentVal = (data.packetSent ?? c.packetSent) ?? 0;
          const packetFailedVal = (data.packetFailed ?? c.packetFailed) ?? 0;
          const packetTotalVal = (data.packetTotal ?? c.packetTotal) ?? 0;

          return {
            ...c,
            sent: data.sent,
            failed: data.failed,
            pending: (data.total ?? c.totalContacts ?? 0) - (data.sent ?? c.sent ?? 0) - (data.failed ?? c.failed ?? 0),
            packetSent: packetSentVal,
            packetFailed: packetFailedVal,
            packetTotal: packetTotalVal,
            packetPending: packetTotalVal - packetSentVal - packetFailedVal,
          };
        })
      );
    });

    socket.on('campaign_completed', (data) => {
      setCampaigns((prev) => 
        prev.map((c) => 
          c._id === data.campaignId 
            ? { ...c, status: data.status, pending: 0 } 
            : c
        )
      );
    });

    return () => socket.disconnect();
  }, [user?.id]);

  const handleStartCampaign = async (e) => {
    e.preventDefault();
    if (selectedSessions.length === 0) return showToast('warning', 'Select at least one active session');
    if (!messageTemplate.trim() && !mediaFile) {
      return showToast('warning', 'Add a message or attach media before starting the campaign');
    }
    if (packetConfig.minPacketSize < 5 || packetConfig.maxPacketSize < 5) {
      return showToast('error', 'Minimum and Maximum packet size must be at least 5.');
    }
    if (packetConfig.maxPacketSize - packetConfig.minPacketSize < 5) {
      return showToast('error', 'The difference between Min and Max packet size must be at least 5.');
    }
    if (packetConfig.minDelay <= 0 || packetConfig.maxDelay <= 0) {
      return showToast('error', 'Delays must be positive numbers.');
    }

    setLoading(true);
    try {
      // Use FormData to support optional media upload
      const form = new FormData();
      form.append('sessionIds', JSON.stringify(selectedSessions));
      form.append('message', messageTemplate);
      form.append('config', JSON.stringify({ ...packetConfig }));
      if (mediaFile) form.append('media', mediaFile);

      console.debug('Starting campaign with FormData');
      const res = await api.post('/campaigns', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.debug('Start campaign response:', res && res.data);
      showToast('success', res.data?.message || 'Campaign started');
      // Optimistically prepend the created campaign so history updates even
      // if GET /api/campaigns is missing on the backend (frontend previously
      // cleared list when that endpoint returned 404).
      if (res.data && res.data.campaign) {
        setCampaigns((prev) => [res.data.campaign, ...prev]);
      }
      setMessageTemplate('');
      setSelectedSessions([]);
      setMediaFile(null);
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/campaigns/${id}/status`, { status });
      fetchData();
    } catch (error) {
      showToast('error', 'Failed to update status');
    }
  };

  const insertFormatting = (prefix, suffix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = messageTemplate;
    const before = text.substring(0, start);
    const selected = text.substring(start, end) || 'text';
    const after = text.substring(end);
    
    setMessageTemplate(`${before}${prefix}${selected}${suffix}${after}`);
    
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'RUNNING': return 'text-blue-600 bg-blue-100';
      case 'PAUSED': return 'text-yellow-600 bg-yellow-100';
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      case 'CANCELLED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const visibleCampaigns = showAllCampaigns ? campaigns : campaigns.slice(0, 5);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Messaging</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Send mass campaigns to your contacts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Campaign</h3>
              <form onSubmit={handleStartCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Sender Sessions *</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900/50">
                    {sessions.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400 p-2">No active sessions available.</p>}
                    {sessions.map(s => (
                      <label key={s._id} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          checked={selectedSessions.includes(s._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSessions([...selectedSessions, s._id]);
                            else setSelectedSessions(selectedSessions.filter(id => id !== s._id));
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{s.sessionName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Message Template <span className="text-gray-400">(optional if media is attached)</span></label>
                    <div className="flex space-x-1">
                      <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Bold">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => insertFormatting('_', '_')} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Italic">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => insertFormatting('~', '~')} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Strikethrough">
                        <Strikethrough className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => insertFormatting('```', '```')} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Monospace">
                        <Code className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">Use {'{name}'} to insert contact's name.</p>
                  <textarea
                    ref={textareaRef}
                    rows={5}
                    className="w-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors resize-none"
                    placeholder="Hello {name}, we have a special offer for you!"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Min Packet Size</label>
                    <input type="number" min="5" value={packetConfig.minPacketSize} onChange={(e) => setPacketConfig({ ...packetConfig, minPacketSize: Number(e.target.value) })} className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Max Packet Size</label>
                    <input type="number" min="5" value={packetConfig.maxPacketSize} onChange={(e) => setPacketConfig({ ...packetConfig, maxPacketSize: Number(e.target.value) })} className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Min Delay (s)</label>
                    <input type="number" min="1" value={packetConfig.minDelay} onChange={(e) => setPacketConfig({ ...packetConfig, minDelay: Number(e.target.value) })} className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Max Delay (s)</label>
                    <input type="number" min="1" value={packetConfig.maxDelay} onChange={(e) => setPacketConfig({ ...packetConfig, maxDelay: Number(e.target.value) })} className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white" />
                  </div>
                </div>

                {/* IP pool input removed — provider manages source IPs */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Attach Media (Optional)</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                      <Paperclip className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Select File</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setMediaFile(e.target.files[0])}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      />
                    </label>
                    {mediaFile && (
                      <div className="flex items-center bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1.5 rounded-lg text-sm max-w-[180px]">
                        <span className="truncate mr-2 font-medium">{mediaFile.name}</span>
                        <button type="button" onClick={() => setMediaFile(null)} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || sessions.length === 0}
                  className="w-full bg-brand-600 text-white px-4 py-3 rounded-xl hover:bg-brand-700 flex justify-center items-center font-bold shadow-sm shadow-brand-500/20 disabled:opacity-70 transition-colors"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Start Campaign
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/80 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Campaign History</h3>
                {campaigns.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCampaigns((prev) => !prev)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {showAllCampaigns ? 'Show less' : 'Show all'}
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-5 space-y-4">
                {visibleCampaigns.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-slate-400 py-12">No campaigns found. Start one to see it here.</div>
                )}
                {visibleCampaigns.map(camp => (
                  <div key={camp._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md ${getStatusColor(camp.status)}`}>
                          {camp.status}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 font-medium">Started: {new Date(camp.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        {camp.status === 'RUNNING' && (
                          <button onClick={() => updateStatus(camp._id, 'PAUSED')} className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {camp.status === 'PAUSED' && (
                          <button onClick={() => updateStatus(camp._id, 'RUNNING')} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {(camp.status === 'RUNNING' || camp.status === 'PAUSED' || camp.status === 'PENDING') && (
                          <button onClick={() => updateStatus(camp._id, 'CANCELLED')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      {/* Show packet-level stats if available, otherwise fall back to contact counts */}
                      <div className="text-sm">
                        <div className="text-xs text-gray-400">Packets</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="px-2 py-1 rounded bg-green-50 text-green-700 text-sm">Sent: {camp.packetSent ?? 0}</div>
                          <div className="px-2 py-1 rounded bg-red-50 text-red-700 text-sm">Failed: {camp.packetFailed ?? 0}</div>
                          <div className="px-2 py-1 rounded bg-gray-50 text-gray-700 text-sm">Pending: {camp.packetPending ?? (camp.packetTotal ? camp.packetTotal - (camp.packetSent ?? 0) - (camp.packetFailed ?? 0) : 0)}</div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-xs text-gray-400">Recipients</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="px-2 py-1 rounded bg-green-50 text-green-700 text-sm">Sent: {camp.sent ?? 0}</div>
                          <div className="px-2 py-1 rounded bg-red-50 text-red-700 text-sm">Failed: {camp.failed ?? 0}</div>
                          <div className="px-2 py-1 rounded bg-gray-50 text-gray-700 text-sm">Pending: {camp.pending ?? 0}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mb-5 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg">
                      {camp.mediaType && (
                        <div className="flex-shrink-0 mt-0.5">
                          {camp.mediaType === 'image' && <ImageIcon className="w-4 h-4 text-brand-500" />}
                          {camp.mediaType === 'video' && <Video className="w-4 h-4 text-brand-500" />}
                          {camp.mediaType === 'audio' && <Mic className="w-4 h-4 text-brand-500" />}
                          {camp.mediaType === 'document' && <FileText className="w-4 h-4 text-brand-500" />}
                        </div>
                      )}
                      <p className="text-gray-700 dark:text-slate-300 text-sm whitespace-pre-wrap line-clamp-3 font-medium">{camp.messageTemplate}</p>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 text-center text-sm">
                      <div className="bg-gray-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700">
                        <span className="block text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wide">Total</span>
                        <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{camp.totalContacts}</span>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-2.5 rounded-xl border border-green-100 dark:border-green-800/30">
                        <span className="block text-green-600 dark:text-green-400 text-[10px] uppercase font-bold tracking-wide">Sent</span>
                        <span className="font-bold text-green-700 dark:text-green-300 mt-0.5 block">{camp.sent}</span>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-100 dark:border-red-800/30">
                        <span className="block text-red-600 dark:text-red-400 text-[10px] uppercase font-bold tracking-wide">Failed</span>
                        <span className="font-bold text-red-700 dark:text-red-300 mt-0.5 block">{camp.failed}</span>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2.5 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
                        <span className="block text-yellow-600 dark:text-yellow-400 text-[10px] uppercase font-bold tracking-wide">Pending</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-300 mt-0.5 block">{camp.pending}</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-5 overflow-hidden">
                      <div 
                        className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(camp.sent / Math.max(camp.totalContacts, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
