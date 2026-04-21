import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isSupabaseConfigured } from '../lib/supabase';
import HandwritingLogo from '../components/HandwritingLogo';
import { translateAuthError } from '../utils/errorMapper';

// สีประจำวันแบบไทย (ตามเวลาประเทศไทย UTC+7)
const THAI_DAY_COLORS = {
  0: { from: 'from-red-400', to: 'to-rose-500', gradient: 'from-red-600 to-rose-600', shadow: 'shadow-red-300', name: 'อาทิตย์' },
  1: { from: 'from-yellow-400', to: 'to-amber-500', gradient: 'from-yellow-600 to-amber-600', shadow: 'shadow-yellow-300', name: 'จันทร์' },
  2: { from: 'from-pink-400', to: 'to-rose-500', gradient: 'from-pink-600 to-rose-600', shadow: 'shadow-pink-300', name: 'อังคาร' },
  3: { from: 'from-green-400', to: 'to-emerald-500', gradient: 'from-green-600 to-emerald-600', shadow: 'shadow-green-300', name: 'พุธ' },
  4: { from: 'from-orange-400', to: 'to-amber-500', gradient: 'from-orange-600 to-amber-600', shadow: 'shadow-orange-300', name: 'พฤหัสบดี' },
  5: { from: 'from-sky-400', to: 'to-blue-500', gradient: 'from-sky-600 to-blue-600', shadow: 'shadow-sky-300', name: 'ศุกร์' },
  6: { from: 'from-purple-400', to: 'to-violet-500', gradient: 'from-purple-600 to-violet-600', shadow: 'shadow-purple-300', name: 'เสาร์' }
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, setDemoMode, checkUsernameAvailable } = useAuth();
  const { isDark } = useTheme();
  const supabaseConfigured = isSupabaseConfigured();

  // คำนวณสีตามวันในสัปดาห์ (เวลาไทย UTC+7)
  const dayColor = useMemo(() => {
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const dayOfWeek = thaiTime.getUTCDay();
    return THAI_DAY_COLORS[dayOfWeek as keyof typeof THAI_DAY_COLORS];
  }, []);

  // Real-time Username Validation
  useEffect(() => {
    if (mode !== 'register') return;
    
    // Format check first
    if (username.trim().length < 3 || !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      const isAvailable = await checkUsernameAvailable(username);
      setUsernameStatus(isAvailable ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [username, mode, checkUsernameAvailable]);

  // Real-time Email Validation
  useEffect(() => {
    if (mode !== 'register') return;
    if (!email) {
      setEmailValid(null);
      return;
    }
    const timer = setTimeout(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValid(emailRegex.test(email));
    }, 300);
    return () => clearTimeout(timer);
  }, [email, mode]);

  // Password strength calculation (0 to 4)
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const isFormValid = () => {
    if (mode === 'login') return email.trim().length > 0 && password.length > 0;
    
    return (
      usernameStatus === 'available' &&
      emailValid === true &&
      password.length >= 6 &&
      password === confirmPassword
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isFormValid()) return;
    
    setLoading(true);

    try {
      if (mode === 'register') {
        const { error } = await signUp(username.trim(), email.trim(), password);
        if (error) {
          setError(translateAuthError(error.message));
        } else {
          setError('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...');
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(translateAuthError(error.message));
      }
    } catch (err: any) {
      setError(translateAuthError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
  };

  const inputClasses = `w-full pl-11 pr-4 py-3.5 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all font-medium ${
    isDark 
      ? 'bg-slate-800/80 border-slate-700/50 text-slate-100 placeholder-slate-500 focus:border-teal-500/80 focus:ring-teal-500/20' 
      : 'bg-white/90 border-slate-200/60 text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:ring-teal-400/20 shadow-sm'
  }`;

  const strength = getPasswordStrength();
  const strengthColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-500'];

  return (
    <motion.div 
      key="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-950' 
          : `bg-gradient-to-br from-slate-50 via-${dayColor.from.split('-')[1]}-50 to-${dayColor.to.split('-')[1]}-50`
      }`}
    >
      
      {/* Animated Background Elements */}
      {!isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 20, repeat: Infinity }} className={`absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br ${dayColor.from} ${dayColor.to} rounded-full blur-3xl`} />
          <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 25, repeat: Infinity, delay: 2 }} className={`absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br ${dayColor.to} ${dayColor.from} rounded-full blur-3xl`} />
        </div>
      )}

      {/* Main Content */}
      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${dayColor.gradient} rounded-[2rem] flex items-center justify-center ${
              isDark ? 'shadow-inner' : `shadow-xl ${dayColor.shadow}`
            }`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </motion.div>
          <HandwritingLogo gradient={dayColor.gradient} size="lg" animated={false} />
          <motion.p className={`font-medium text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }}>
            เมมโมการ์ด · ระบบทบทวนอัจฉริยะ · วัน{dayColor.name}
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className={`backdrop-blur-2xl rounded-[2rem] border p-8 ${
            isDark 
              ? 'bg-slate-900/80 border-slate-800 shadow-2xl' 
              : `bg-white/80 shadow-2xl ${dayColor.from.replace('from-', 'border-').replace('-400', '-100/50')}`
          }`}
        >
          {/* Mode Toggle */}
          <div className={`relative flex mb-8 p-1.5 rounded-2xl ${isDark ? 'bg-slate-950/50' : 'bg-slate-100/80'}`}>
            <motion.div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r ${dayColor.gradient} ${isDark ? '' : 'shadow-md'}`}
              animate={{ x: mode === 'login' ? 0 : 'calc(100% + 12px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
            <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`relative flex-1 py-3 rounded-xl font-bold text-sm transition-colors z-10 ${mode === 'login' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
              เข้าสู่ระบบ
            </button>
            <button type="button" onClick={() => { setMode('register'); setError(''); }} className={`relative flex-1 py-3 rounded-xl font-bold text-sm transition-colors z-10 ${mode === 'register' ? 'text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
              สมัครสมาชิก
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!supabaseConfigured ? (
              <motion.div key="no-config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                <div className={`border rounded-2xl p-4 mb-4 ${isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>ยังไม่ได้ตั้งค่า Supabase</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Username */}
                {mode === 'register' && (
                  <div>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ตั้งชื่อผู้ใช้ (Username)" className={inputClasses} required disabled={loading} minLength={3} maxLength={20} />
                      
                      {/* Validation Status Icon */}
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        {usernameStatus === 'checking' && <svg className="animate-spin w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {usernameStatus === 'available' && <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        {usernameStatus === 'taken' && <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                      </div>
                    </div>
                    {mode === 'register' && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`text-[11px] mt-2 font-medium px-1 ${usernameStatus === 'taken' ? 'text-rose-500' : isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        {usernameStatus === 'taken' ? 'ชื่อผู้ใช้นี้มีคนใช้งานแล้ว โปรดลองชื่ออื่น' : 'ใช้ a-z, 0-9 หรือ _ เท่านั้น (3-20 ตัวอักษร)'}
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Email / Login Identifier */}
                <div>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <input type={mode === 'register' ? 'email' : 'text'} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === 'register' ? 'อีเมลแอดเดรส' : 'ชื่อผู้ใช้ หรือ อีเมล'} className={inputClasses} required disabled={loading} />
                    
                    {/* Validation Status Icon */}
                    {mode === 'register' && email.length > 0 && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        {emailValid === true && <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        {emailValid === false && <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'รหัสผ่าน (อย่างน้อย 6 ตัว)' : 'รหัสผ่าน'} className={inputClasses} required disabled={loading} minLength={6} />
                  </div>
                  
                  {/* Password Strength Meter */}
                  {mode === 'register' && password.length > 0 && (
                    <div className="mt-3 px-1">
                      <div className="flex gap-1.5 h-1.5 mb-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} className={`flex-1 rounded-full transition-all duration-300 ${strength >= level ? strengthColors[Math.min(strength - 1, 3)] : isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        {strength < 2 && 'รหัสผ่านคาดเดาง่าย'}
                        {strength === 2 && 'รหัสผ่านระดับปานกลาง'}
                        {strength >= 3 && 'รหัสผ่านปลอดภัยมาก'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                {mode === 'register' && (
                  <div>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => setConfirmTouched(true)} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className={inputClasses} required disabled={loading} minLength={6} />
                      
                      {/* Match Status Icon */}
                      {confirmPassword.length > 0 && confirmTouched && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          {password === confirmPassword ? <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
                      <div className={`text-xs font-semibold p-3.5 rounded-2xl border ${error.includes('สำเร็จ') ? isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200' : isDark ? 'bg-rose-900/30 text-rose-400 border-rose-800/50' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button type="submit" whileHover={isFormValid() ? { scale: 1.02 } : {}} whileTap={isFormValid() ? { scale: 0.98 } : {}} disabled={loading || !isFormValid()} className={`w-full py-4 mt-2 bg-gradient-to-r ${dayColor.gradient} hover:opacity-95 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:grayscale-[0.5] disabled:cursor-not-allowed ${isDark ? '' : `shadow-lg ${dayColor.shadow}`}`}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="block text-base tracking-wide">
                        {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกฟรี'}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </motion.button>
              </form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Demo Mode Button — เฉพาะหน้า login */}
        {mode === 'login' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 text-center">
            <motion.button onClick={handleDemoMode} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className={`inline-flex items-center gap-2 px-6 py-3.5 backdrop-blur-md border font-semibold rounded-2xl transition-all ${isDark ? 'bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50 text-slate-300' : `bg-white/40 hover:bg-white/60 border-white/50 text-slate-700 shadow-sm hover:shadow-md`}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              ทดลองใช้งานโดยไม่ล็อกอิน
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
