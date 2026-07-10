import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Moon, Sun, Bell, Menu, ShieldCheck, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const Header = ({ toggleMobileMenu }) => {
  const { user } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/dashboard': return { title: 'Dashboard', sub: 'Overview of your WhatsApp automation activities' };
      case '/sessions': return { title: 'Devices', sub: 'Manage your connected WhatsApp numbers' };
      case '/contacts': return { title: 'Contacts', sub: 'Manage your audience and phone numbers' };
      case '/bulk-messaging': return { title: 'Bulk Campaigns', sub: 'Send mass messages to your contacts' };
      case '/admin': return { title: 'Admin Panel', sub: 'Manage platform users and settings' };
      default: return { title: 'AR media', sub: 'WhatsApp Automation' };
    }
  };

  const { title, sub } = getPageInfo();

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">{sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Commented out Search Bar for now 
        <div className="hidden md:flex relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-brand-500" />
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-64 pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 text-sm rounded-xl outline-none transition-all duration-200 dark:text-white dark:placeholder-slate-500"
          />
        </div>
        */}

        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <button className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative mr-1">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        {user && (
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Active Plan</span>
                <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-brand-100 dark:border-brand-800/50">
                  {user.plan}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>

        {user && (
          <Link to="/profile" className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full py-1.5 px-2 sm:px-4 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all hover:shadow-md active:scale-95 group">
            <div className="hidden sm:block text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-bold text-gray-800 dark:text-white capitalize leading-none group-hover:text-brand-600 transition-colors">
                  {user.name || user.role}
                </span>
                {user.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-green-500" />}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400">
                  {user.credits} <span className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">Credits</span>
                </span>
                <span className="mx-1 text-gray-300 dark:text-slate-700">|</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-500 font-medium lowercase">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30 overflow-hidden border-2 border-white dark:border-slate-700 group-hover:scale-110 transition-transform">
              {user.name ? user.name[0].toUpperCase() : <User className="w-5 h-5" />}
            </div>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
