import logo from '@/assets/logo.png';
import api from '@/services/api';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, X } from 'lucide-react';
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

      let redirectPath = '/student/dashboard';
      if (user.utype === 'admin' || user.utype === 'superadmin') redirectPath = '/admin/dashboard';
      else if (user.utype === 'staff') redirectPath = '/staff/dashboard';
      else if (user.utype === 'teacher') redirectPath = '/teacher/dashboard';
      else if (user.utype === 'principal') redirectPath = '/principal/dashboard';
      else if (user.utype === 'student') redirectPath = '/student/dashboard';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-stretch justify-center relative overflow-hidden">

      {/* Subdued professional warm/cool ambient blurs */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-slate-100 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] bg-indigo-50/70 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Clean high-end architectural grid line pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f060_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f060_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Dual Column Layout Container */}
      <div className="w-full flex z-10">

        {/* LEFT COLUMN: Premium Immersive Light Tech Showcase */}
        <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] flex-col justify-between p-16 relative overflow-hidden bg-gradient-to-tr from-slate-100/60 via-slate-50 to-indigo-50/20 border-r border-slate-150">

          {/* Subdued professional light warm/cool ambient highlights */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-200/20 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute bottom-[-25%] right-[-10%] w-[70%] h-[70%] bg-purple-200/20 rounded-full blur-[160px] pointer-events-none"></div>
          <div className="absolute top-[30%] left-[20%] w-[250px] h-[250px] bg-blue-200/10 rounded-full blur-[100px] pointer-events-none"></div>

          {/* Clean grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

          {/* Top Brand Logo */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
              <img src={logo} alt="NUBEERA Tech Logo" className="w-full h-full object-contain opacity-95" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 text-lg tracking-wider uppercase leading-none">NUBEERA</span>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.25em] mt-1">LXP Platform</span>
            </div>
          </div>

          {/* Central Immersive Tech Pillars */}
          <div className="flex flex-col justify-center flex-1 py-10 relative z-10 space-y-12 max-w-xl">

            {/* Catchy dynamic label */}
            <div className="space-y-4">

              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Explore the Future of <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Integrated Learning.</span>
              </h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                A unified enterprise hub designed for advanced robotics, digital curriculum simulation, smart inventory automation, and school-wide performance metrics.
              </p>
            </div>

            {/* Glowing Pillar Cards */}
            <div className="grid grid-cols-1 gap-4">

              <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.02)] hover:bg-slate-50/80 hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Enterprise Security</h4>
                  <p className="text-xs text-slate-550 leading-relaxed">Strict role-based access control safeguarding institutional data, teacher workflows, and student records.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.02)] hover:bg-slate-50/80 hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Virtual & Physical STEM Labs</h4>
                  <p className="text-xs text-slate-550 leading-relaxed">Full coverage of drone engineering, 3D printing simulation, and hands-on modular robotics catalog matrices.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.02)] hover:bg-slate-50/80 hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-pink-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Analytics & School Intelligence</h4>
                  <p className="text-xs text-slate-550 leading-relaxed">Advanced grade maps, interactive assignment submissions, and granular administrative school dashboards.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Left Side Footer */}
          <div className="text-slate-500 text-xs font-bold relative z-10 flex justify-between items-center border-t border-slate-200/60 pt-8">
            <span>© {new Date().getFullYear()} NUBEERA Tech Platform</span>

          </div>
        </div>


        {/* RIGHT COLUMN: Clean premium light corporate form */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/20">

          {/* Mobile Only Brand Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl p-1.5">
              <img src={logo} alt="NUBEERA Tech Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-slate-900 text-xl tracking-wider uppercase">NUBEERA Tech</span>
          </div>

          <div className="w-full max-w-[420px]">

            {/* Immersive crisp white card container with solid clean styling */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(71,85,105,0.06)] relative z-20">

              {/* Form Heading */}
              <div className="mb-8 space-y-2">

                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Sign In
                </h1>
              </div>

              {/* Error notifications */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-200 shadow-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="text-xs font-bold leading-normal">{error}</span>
                </div>
              )}

              {/* Login authentication Form */}
              <form id="login-form" onSubmit={handleLogin} className="space-y-5" noValidate>

                {/* Email or Mobile Number field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-700">Email or Mobile Number</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-email"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim())}
                      placeholder="Enter Email or Mobile Number"
                      className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-semibold transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-bold text-slate-700">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-semibold transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password triggers */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="login-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600 font-semibold hover:text-slate-900 transition-colors">Remember Me</span>
                  </label>
                  <button
                    type="button"
                    id="forgot-password-btn"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    className="font-bold text-blue-600 hover:text-indigo-600 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Form submit trigger */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In </span>
                  )}
                </button>

              </form>

            </div>

            {/* Micro copyright footer */}
            <p className="lg:hidden text-center text-[10px] text-slate-550 mt-8 tracking-wider uppercase font-bold">
              © {new Date().getFullYear()} NUBEERA Tech Platform
            </p>

          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Password Recovery</h2>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold italic">Enter your email to reset your password</p>
              </div>
              <button type="button" onClick={closeForgotModal} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 transition-all shadow-sm" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="p-6 md:p-8 space-y-4 text-xs font-semibold">

              {/* Messages */}
              {forgotError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 mb-4 shadow-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="font-bold leading-normal">{forgotError}</span>
                </div>
              )}
              {forgotSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3 mb-4 shadow-sm">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <span className="font-bold">{forgotSuccess}</span>
                </div>
              )}

              {/* Step 1: Email Input */}
              {forgotStep === 'request' && (
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-slate-700 font-bold">Email Address</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter Email Address"
                      className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold shadow-sm transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">A one-time OTP will be sent to your email.</p>
                </div>
              )}

              {/* Step 2: OTP & New Password */}
              {forgotStep === 'otp' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-otp" className="text-slate-700 font-bold">One-Time Passcode (OTP)</label>
                    <div className="relative mt-1">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-otp"
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit verification code"
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold tracking-widest shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-new-password" className="text-slate-700 font-bold">New Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold shadow-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-confirm-password" className="text-slate-700 font-bold">Confirm Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-semibold shadow-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={closeForgotModal} className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 w-1/3 text-sm py-3 font-bold shadow-sm rounded-xl">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button type="submit" disabled={forgotLoading} className="btn flex-1 text-sm py-3 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)]">
                  {forgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <>{forgotStep === 'request' ? 'Request OTP' : 'Reset Password'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
