import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Key, UserCheck, ChevronDown, Menu, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import type { User } from '../types/index';
import { ecommerceService } from '../services/ecommerceService';
import NotificationBell from '../components/support/NotificationBell';
import SchoolSelector from '../components/SchoolSelector';

const getMediaUrl = (url: string | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  ) {
    return `${protocol}//${host}:5000${url}`;
  }
  return url;
};

interface HeaderProps {
  user: User | null;
  onMenuToggle: () => void;
  sidebarWidth?: number;
}

const Header: React.FC<HeaderProps> = ({ user, onMenuToggle, sidebarWidth = 288 }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [cartCount, setCartCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const fetchCartCount = async () => {
    try {
      if (user?.utype === 'student' || user?.utype === 'parent') {
        const cartData = await ecommerceService.getCart();
        const count = cartData.items.reduce((acc, item) => acc + item.quantity, 0);
        setCartCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch cart count', err);
    }
  };

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => {
      window.removeEventListener('cartUpdated', fetchCartCount);
    };
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const roleDisplay: Record<string, string> = {
    admin: 'Administrator',
    superadmin: 'Super Admin',
    principal: 'Principal',
    staff: 'Staff',
    teacher: 'Teacher',
    student: 'Student',
  };

  return (
    <header
      id="main-header"
      style={{ left: isDesktop ? `${sidebarWidth}px` : '0' }}
      className="h-[64px] bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl border-b border-slate-200 dark:border-[#334155] shadow-[0_4px_20px_rgba(15,30,60,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] fixed top-0 right-0 z-40 transition-all duration-300"
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">

        {/* Left side — mobile menu toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="mobile-menu-btn"
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md text-slate-500 dark:text-[#94a3b8] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-[#334155] transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right side — actions */}
        <div className="flex items-center gap-4">

          {/* Dark / Light Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-[#94a3b8] dark:hover:bg-[#334155] dark:hover:text-yellow-400 transition-all"
          >
            {theme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

          {/* Shopping Cart Icon for Student / Parent */}
          {(user?.utype === 'student' || user?.utype === 'parent') && (
            <Link
              to="/shop/cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-slate-500 dark:text-[#94a3b8] hover:bg-blue-50 dark:hover:bg-[#334155] hover:text-blue-600 transition-colors cursor-pointer"
              title="View Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-[8px] font-black text-white ring-2 ring-white shadow-sm shadow-blue-500/50">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* School selector — visible only for SuperAdmin / Admin / Staff / Teacher */}
          <SchoolSelector isDark={theme === 'dark'} />

          {/* Real-time In-App Notification Bell */}
          <NotificationBell />

          {/* User menu */}
          <div className="relative group" ref={dropdownRef}>
            <button
              type="button"
              id="user-menu-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full transition-all duration-200 border ${isDropdownOpen ? 'bg-white dark:bg-[#1e293b] border-blue-100 dark:border-[#334155] shadow-[0_4px_20px_rgba(37,99,235,0.08)]' : 'border-transparent hover:bg-white/60 dark:hover:bg-[#1e293b]/60 hover:shadow-sm'}`}
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md shadow-blue-500/20 overflow-hidden"
                aria-hidden="true"
              >
                {user?.profile_image_url ? (
                  <img src={getMediaUrl(user.profile_image_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              {/* Name + role */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                  <p className="text-[9px] font-black text-slate-400 dark:text-[#64748b] leading-none uppercase tracking-widest">
                    {roleDisplay[user?.utype || ''] || user?.utype || 'User'}
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 dark:text-[#64748b] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-blue-600'}`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div
                id="user-dropdown"
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] backdrop-blur-xl rounded-2xl border border-white dark:border-[#334155] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] py-1 z-50 origin-top-right"
                style={{ animation: 'dropdown-in 150ms ease-out' }}
              >
                <div className="px-4 py-3 border-b border-slate-100/50 dark:border-[#283548]/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#64748b] mb-0.5">Signed in as</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.email}</p>
                </div>

                <div className="py-1" role="none">
                  {user?.utype !== 'admin' && (
                    <Link
                      to="/update-profile"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-[#e2e8f0] hover:bg-gray-50 dark:hover:bg-[#283548] hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-gray-400 dark:text-[#64748b]" aria-hidden="true" />
                      Update Profile
                    </Link>
                  )}
                  <Link
                    to="/change-password"
                    role="menuitem"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-[#e2e8f0] hover:bg-gray-50 dark:hover:bg-[#283548] hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Key className="w-4 h-4 text-gray-400 dark:text-[#64748b]" aria-hidden="true" />
                    Change Password
                  </Link>
                </div>

                <div className="border-t border-gray-100 dark:border-[#283548] py-1" role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Action Button */}
      {(user?.utype === 'student' || user?.utype === 'parent') && cartCount > 0 && (
        <Link
          to="/shop/cart"
          className="lg:hidden fixed bottom-6 right-6 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_8px_30px_rgba(37,99,235,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
          title="View Cart"
        >
          <ShoppingCart className="w-5.5 h-5.5" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-black text-white ring-2 ring-white animate-bounce shadow-sm">
            {cartCount}
          </span>
        </Link>
      )}

      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </header>
  );
};

export default Header;
