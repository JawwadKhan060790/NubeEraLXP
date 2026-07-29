import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LifeBuoy, LogOut } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Determine the user's dashboard based on local storage role or just go back
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const role = user.utype?.toLowerCase();
        if (role === 'admin' || role === 'superadmin') {
          navigate('/admin/dashboard');
          return;
        } else if (role === 'principal') {
          navigate('/principal/dashboard');
          return;
        } else if (role === 'staff') {
          navigate('/staff/dashboard');
          return;
        } else if (role === 'teacher') {
          navigate('/teacher/dashboard');
          return;
        } else if (role === 'parent') {
          navigate('/parent/dashboard');
          return;
        } else if (role === 'student') {
          navigate('/student/dashboard');
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Premium ambient decorative blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/60 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-100/40 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-[#283548] rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative z-10 text-center space-y-8 animate-in fade-in duration-300">
        
        {/* Shield Icon Block with animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-xl animate-pulse"></div>
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-400/25 text-rose-500 dark:text-rose-300 rounded-2xl flex items-center justify-center relative shadow-sm">
              <ShieldAlert className="w-10 h-10 stroke-[1.5] animate-bounce animate-duration-1000" />
            </div>
          </div>
        </div>

        {/* Text Block */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-400/25 px-3.5 py-1 rounded-full uppercase tracking-widest leading-none">
            Error Code 403: Forbidden
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none pt-2">
            Restricted Access Area
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold leading-relaxed max-w-sm mx-auto">
            You do not have authorization to view this page. Your portal role settings prevent access to this directory structure.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-[#283548] pt-6">
          <p className="text-[10px] font-medium text-slate-400 dark:text-[#64748b]">
            If you believe this is a technical mistake, please contact your school system manager or submit a support query.
          </p>
        </div>

        {/* CTA Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            onClick={handleGoBack}
            className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/support/raise-ticket')}
            className="w-full py-3.5 px-6 bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100/50 dark:hover:bg-[#334155]/50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm inline-flex items-center justify-center gap-2"
          >
            <LifeBuoy className="w-4 h-4 text-indigo-600" /> Raise Support Ticket
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-black text-rose-500 hover:text-rose-700 transition-colors uppercase tracking-widest inline-flex items-center gap-1.5 cursor-pointer mx-auto pt-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out of Account
        </button>

      </div>
    </div>
  );
};

export default Unauthorized;
