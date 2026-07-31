import logo from '@/assets/logo.png';
import login3dBanner from '@/assets/login_3d_banner.png';
import api from '@/services/api';
import { Activity, AlertCircle, ArrowRight, BarChart3, Bot, Cpu, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'otp'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    const rememberedId = localStorage.getItem('rememberUser');
    if (rememberedId) {
      setEmail(rememberedId);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('theme', 'light');

      if (rememberMe) {
        localStorage.setItem('rememberUser', email);
      } else {
        localStorage.removeItem('rememberUser');
      }

      let redirectPath = '/student/learning';
      if (user.utype === 'admin' || user.utype === 'superadmin') redirectPath = '/admin/dashboard';
      else if (user.utype === 'staff') redirectPath = '/staff/dashboard';
      else if (user.utype === 'teacher') redirectPath = '/teacher/dashboard';
      else if (user.utype === 'principal') redirectPath = '/principal/dashboard';
      else if (user.utype === 'student') redirectPath = '/student/learning';
      else if (user.utype === 'parent') redirectPath = '/parent/dashboard';

      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      if (forgotStep === 'request') {
        const res = await api.post('/auth/forgot-password', { email: forgotEmail });
        setForgotSuccess(res.data.message || 'OTP has been sent to your registered email.');
        setForgotStep('otp');
      } else if (forgotStep === 'otp') {
        if (!otp || !newPassword || !confirmNewPassword) {
          setForgotError("Please fill out all fields.");
          setForgotLoading(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setForgotError("Passwords do not match.");
          setForgotLoading(false);
          return;
        }
        const res = await api.post('/auth/reset-password', { email: forgotEmail, otp, newPassword });
        setForgotSuccess(res.data.message || 'Password reset successful!');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep('request');
          setForgotEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
          setForgotSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep('request');
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError('');
    setForgotSuccess('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeForgotModal(); };
    if (showForgotModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/30 text-slate-800 flex items-stretch justify-center relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">

      {/* Main Dual-Column Container */}
      <div className="w-full flex z-10 min-h-screen">

        {/* LEFT COLUMN: Live Animated 3D Full Image Showcase */}
        <div className="hidden lg:flex lg:w-[54%] xl:w-[58%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-slate-950 select-none">
          
          {/* Full 3D Background Image with Ken-Burns Continuous Smooth Zoom & Pan */}
          <img 
            src={login3dBanner} 
            alt="3D Futuristic STEM Learning" 
            className="absolute inset-0 w-full h-full object-cover object-center animate-kenburns pointer-events-none"
          />

          {/* Dynamic Light Beam Sweep Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-beam-sweep pointer-events-none"></div>

          {/* Soft Gradient & Vignette Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/60 pointer-events-none"></div>

          {/* Top Brand Header */}
          <div className="flex items-center justify-between relative z-20">
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-60 blur-md group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-2 shadow-lg">
                  <img src={logo} alt="NubeEra Tech Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-xl tracking-wider uppercase leading-none drop-shadow-md">NUBEERA</span>
                  <span className="text-[9px] font-extrabold text-indigo-200 bg-indigo-600/70 border border-indigo-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Enterprise
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.22em] mt-1 drop-shadow-xs">Learning Experience Portal</span>
              </div>
            </div>

            {/* Top Right Live System Radar Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-md">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live Portal System</span>
            </div>
          </div>

          {/* FLOATING LIVE METRIC WIDGET 1: Top Right */}
          <div className="absolute top-28 right-10 bg-slate-900/75 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 text-white z-20 animate-float max-w-xs">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Bot className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">AI Robotics Lab</span>
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">ONLINE</span>
              </div>
              <p className="text-xs font-bold text-white truncate">1,250+ Active Simulators</p>
            </div>
          </div>

          {/* FLOATING LIVE METRIC WIDGET 2: Middle Left */}
          <div className="absolute top-[42%] left-10 bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 text-white z-20 animate-float-slow max-w-xs">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider">Curriculum Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">98.4% Syllabus Sync</span>
                <span className="text-[9px] font-bold text-emerald-300">↑ +4.2%</span>
              </div>
              <div className="w-36 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-emerald-400 rounded-full w-[98%] animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Bottom Glassmorphic Overlay Banner */}
          <div className="relative z-20 mt-auto pt-10">
            <div className="bg-slate-900/65 backdrop-blur-2xl border border-white/25 rounded-3xl p-6 xl:p-8 shadow-2xl space-y-3.5 max-w-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-xs font-bold shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Integrated STEM & Robotics Portal</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-300 uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Multi-Campus Powered</span>
                </div>
              </div>

              <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-sm">
                Empowering the Next Generation of <span className="bg-gradient-to-r from-amber-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">Innovators.</span>
              </h2>
              <p className="text-slate-200 text-xs font-medium leading-relaxed opacity-95">
                Streamlining school management, digital learning paths, AI-assisted robotics, and multi-campus curriculum delivery.
              </p>

              {/* Live Ticker Stats Footer Pill Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/15">
                <div className="bg-white/10 border border-white/15 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-black text-white">50+</div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase">Campuses</div>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-black text-white">100k+</div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase">Students</div>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-black text-emerald-300">99.9%</div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase">Uptime</div>
                </div>
              </div>
            </div>

            {/* Left Side Footer inside 3D Panel */}
            <div className="text-slate-300 text-xs font-semibold flex justify-between items-center pt-6 px-1">
              <span>© {new Date().getFullYear()} NubeEra Tech Platform</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                All Systems Operational
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Enhanced Soft Light & High-Tech Ambient Form Container */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/30 overflow-hidden">

          {/* Ambient Glowing Orbs on Right Background */}
          <div className="absolute top-[-8%] right-[-8%] w-[420px] h-[420px] bg-gradient-to-br from-indigo-300/30 via-purple-200/25 to-blue-200/20 rounded-full blur-[110px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[380px] h-[380px] bg-gradient-to-tr from-blue-300/25 via-indigo-200/20 to-pink-200/15 rounded-full blur-[120px] pointer-events-none"></div>

          {/* High-Tech Micro Dot Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-[0.18] pointer-events-none"></div>

          {/* Floating Geometric Decorative Glass Elements */}
          <div className="absolute top-[12%] right-[10%] w-24 h-24 rounded-3xl bg-white/40 border border-white/60 backdrop-blur-md shadow-lg shadow-indigo-500/5 rotate-12 pointer-events-none hidden xl:block animate-in fade-in duration-500"></div>
          <div className="absolute bottom-[14%] left-[8%] w-20 h-20 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-lg shadow-indigo-500/5 -rotate-12 pointer-events-none hidden xl:block animate-in fade-in duration-700"></div>

          {/* Mobile Only Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 relative z-20">
            <div className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <img src={logo} alt="NubeEra Tech Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-wider uppercase">NUBEERA LXP</span>
          </div>

          <div className="w-full max-w-[430px] relative z-20">

            {/* Premium Multi-Layered Soft White Glass Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/80 border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.14)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_25px_70px_-15px_rgba(99,102,241,0.2)]">
              
              {/* Vibrant Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

              {/* Status Security Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-6 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Protected SSO Authentication</span>
              </div>

              {/* Header Title */}
              <div className="mb-7 space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome back
                </h1>
                <p className="text-slate-500 text-xs font-semibold">
                  Please sign in to access your portal dashboard.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-200 shadow-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="text-xs font-bold leading-normal">{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form id="login-form" onSubmit={handleLogin} className="space-y-5" noValidate>

                {/* Email or Mobile Field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-email"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim())}
                      placeholder="name@school.com or mobile"
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-semibold transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      id="forgot-password-btn"
                      onClick={() => {
                        setForgotEmail(email);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-semibold transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      id="login-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 bg-slate-50 text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">
                      Remember login details
                    </span>
                  </label>
                </div>

                {/* Attractive Soft Vibrant Sign In Button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="group relative w-full mt-4 py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 active:scale-[0.99] text-white text-sm font-black tracking-wide rounded-2xl shadow-[0_8px_25px_-5px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_28px_-5px_rgba(79,70,229,0.5)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border border-indigo-400/30 overflow-hidden"
                >
                  {/* Subtle hover shine sweep */}
                  <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 pointer-events-none"></div>

                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span className="uppercase tracking-wider">Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span className="uppercase tracking-wider">Sign In</span>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

              </form>

            </div>

            {/* Mobile Footer */}
            <p className="lg:hidden text-center text-[10px] text-slate-500 mt-8 tracking-wider uppercase font-bold">
              © {new Date().getFullYear()} NubeEra Tech Platform
            </p>

          </div>

        </div>

      </div>

      {/* Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" /> Password Recovery
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Enter your email to receive an OTP code</p>
              </div>
              <button type="button" onClick={closeForgotModal} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 transition-all cursor-pointer shadow-xs" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="p-6 md:p-8 space-y-4 text-xs font-semibold">

              {forgotError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 shadow-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="font-bold leading-normal">{forgotError}</span>
                </div>
              )}
              {forgotSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 shadow-xs">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <span className="font-bold">{forgotSuccess}</span>
                </div>
              )}

              {forgotStep === 'request' && (
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-slate-700 font-bold uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@school.com"
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold transition-all shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">A verification passcode will be sent to your inbox.</p>
                </div>
              )}

              {forgotStep === 'otp' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-otp" className="text-slate-700 font-bold uppercase tracking-wider">One-Time Passcode (OTP)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-otp"
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold tracking-widest shadow-xs transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-new-password" className="text-slate-700 font-bold uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold shadow-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-confirm-password" className="text-slate-700 font-bold uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-semibold shadow-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={closeForgotModal} className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 w-1/3 text-xs font-bold rounded-2xl transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={forgotLoading} className="flex-1 py-3.5 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl shadow-md transition-all cursor-pointer">
                  {forgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" />
                  ) : (
                    <>{forgotStep === 'request' ? 'Request OTP' : 'Reset Password'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1) translate(0%, 0%); }
          50% { transform: scale(1.08) translate(-1%, -1.5%); }
          100% { transform: scale(1) translate(0%, 0%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes beamSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-kenburns {
          animation: kenburns 24s ease-in-out infinite alternate;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .animate-beam-sweep {
          animation: beamSweep 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
