import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, MessageSquare, Send, Users, Layers, Zap, Bot, PhoneCall, ShieldCheck, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar = () => {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, subtitle: 'Overview & Analytics' },
    { name: 'Devices', path: '/sessions', icon: Smartphone, subtitle: 'WhatsApp Sessions' },
    // { name: 'Single Message', path: '/single-message', icon: Send, subtitle: 'Test Messages' }, // Placeholder for future
    { name: 'Contacts', path: '/contacts', icon: Users, subtitle: 'Contact Management' },
    { name: 'Bulk Messages', path: '/campaigns', icon: Layers, subtitle: 'Mass Messaging' },
    // { name: 'Auto Reply', path: '/auto-reply', icon: Zap, subtitle: 'Automated Responses' }, // Placeholder
    // { name: 'Chatbot', path: '/chatbot', icon: Bot, subtitle: 'Conversational Agents' }, // Placeholder
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck, subtitle: 'Manage Platform' });
  }

  return (
    <aside className="w-72 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col flex-shrink-0 transition-colors duration-200">
      <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center transform rotate-12">
            <MessageSquare className="w-5 h-5 text-white transform -rotate-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">AR media</h1>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">WhatsApp Automation</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-slate-800/50 hover:text-brand-600 dark:hover:text-brand-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-brand-500 dark:text-brand-400'}`} />
                <div>
                  <h3 className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : 'text-gray-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
                    {item.name}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                    {item.subtitle}
                  </p>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200 font-semibold text-sm group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Logout Account</span>
        </button>

        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center justify-center gap-2 border border-gray-100 dark:border-slate-700/50">
          <span className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center">
            Made with <span className="text-pink-500 mx-1">💖</span> by <span className="font-semibold text-brand-600 dark:text-brand-400 ml-1">AR media</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
