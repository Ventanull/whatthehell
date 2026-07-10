import React, { useState, useEffect, useRef } from 'react';
import { Trash2, PlusCircle, Users, Download, Upload, Search } from 'lucide-react';
import api from '../api';
import { showToast, showConfirm } from '../utils/swal';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts', error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.phone) return;
    setLoading(true);
    try {
      await api.post('/contacts', newContact);
      setNewContact({ name: '', phone: '' });
      fetchContacts();
      showToast('success', 'Contact added');
    } catch (error) {
      showToast('error', 'Failed to add contact');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await api.post('/contacts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('success', res.data.message);
      fetchContacts();
    } catch (error) {
      showToast('error', 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/contacts/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      showToast('success', 'CSV exported');
    } catch (error) {
      showToast('error', 'Failed to export CSV');
    }
  };

  const handleSelectContact = (id) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c._id));
    }
  };

  const handleDeleteSingle = async (id) => {
    const result = await showConfirm('Delete Contact', 'Are you sure you want to delete this contact?');
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/contacts/${id}`);
      fetchContacts();
      showToast('success', 'Contact deleted');
    } catch (error) {
      showToast('error', 'Failed to delete contact');
    }
  };

  const handleDeleteSelected = async () => {
    const result = await showConfirm('Delete Multiple', `Are you sure you want to delete ${selectedContacts.length} contacts?`);
    if (!result.isConfirmed) return;
    try {
      await Promise.all(selectedContacts.map(id => api.delete(`/contacts/${id}`)));
      setSelectedContacts([]);
      fetchContacts();
      showToast('success', 'Contacts deleted');
    } catch (error) {
      showToast('error', 'Failed to delete some contacts');
    }
  };

  const filteredContacts = contacts.filter((c) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your audience for campaigns.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-brand-500 focus:border-brand-500 text-sm dark:text-white outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anmol Ratna"
                  className="w-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone Number (with country code)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +919876543210"
                  className="w-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex justify-center items-center font-medium shadow-sm disabled:opacity-70 transition-colors"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Save Contact
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Bulk Actions</h3>
            <div className="space-y-3">
              <label className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-slate-300 font-medium">
                <Upload className="w-5 h-5 mr-2 text-gray-400" />
                Import CSV
                <input type="file" className="hidden" accept=".csv" onChange={handleImportCSV} disabled={loading} />
              </label>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-gray-700 dark:text-slate-300 font-medium"
              >
                <Download className="w-5 h-5 mr-2 text-gray-400" />
                Export CSV
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-4 text-center">CSV format: name,phone</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/80">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Contact List <span className="text-sm font-normal text-gray-500 dark:text-slate-400 ml-2">({filteredContacts.length})</span>
              </h3>
              {selectedContacts.length > 0 && (
                <button 
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Selected ({selectedContacts.length})
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700/50 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 focus:ring-indigo-500"
                        onChange={handleSelectAll}
                        checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                      />
                    </th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-sm">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-slate-400">
                        No contacts found.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 focus:ring-indigo-500"
                            checked={selectedContacts.includes(c._id)}
                            onChange={() => handleSelectContact(c._id)}
                          />
                        </td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                        <td className="p-4 text-gray-600 dark:text-slate-300 font-mono text-sm">{c.phone}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDeleteSingle(c._id)} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
