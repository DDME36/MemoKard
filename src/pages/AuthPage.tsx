import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isSupabaseConfigured } from '../lib/supabase';
import HandwritingLogo from '../components/HandwritingLogo';

// สีประจำวันแบบไทย (ตามเวลาประเทศไทย UTC+7)
const THAI_DAY_COLORS = {
  0: { // อาทิตย์ - แดง
    from: 'from-red-400',
    to: 'to-rose-500',
    gradient: 'from-red-600 to-rose-600',
    shadow: 'shadow-red-300',
    name: 'อาทิตย์'
  },
  1: { // จันทร์ - เหลือง
    from: 'from-yellow-400',
    to: 'to-amber-500',
    gradient: 'from-yellow-600 to-amber-600',
    shadow: 'shadow-yellow-300',
    name: 'จันทร์'
  },
  2: { // อังคาร - ชมพู
    from: 'from-pink-400',
    to: 'to-rose-500',
    gradient: 'from-pink-600 to-rose-600',
    shadow: 'shadow-pink-300',
    name: 'อังคาร'
  },
  3: { // พุธ - เขียว
    from: 'from-green-400',
    to: 'to-emerald-500',
    gradient: 'from-green-600 to-emerald-600',
    shadow: 'shadow-green-300',
    name: 'พุธ'
  },
  4: { // พฤหัสบดี - ส้ม
    from: 'from-orange-400',
    to: 'to-amber-500',
    gradient: 'from-orange-600 to-amber-600',
    shadow: 'shadow-orange-300',
    name: 'พฤหัสบดี'
  },
  5: { // ศุกร์ - ฟ้า
    from: 'from-sky-400',
    to: 'to-blue-500',
    gradient: 'from-sky-600 to-blue-600',
    shadow: 'shadow-sky-300',
    name: 'ศุกร์'
  },
  6: { // เสาร์ - ม่วง
    from: 'from-purple-400',
    to: 'to-violet-500',
    gradient: 'from-purple-600 to-violet-600',
    shadow: 'shadow-purple-300',
    name: 'เสาร์'
  }
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, setDemoMode } = useAuth();
  const { isDark } = useTheme();
  const supabaseConfigured = isSupabaseConfigured();

  // คำนวณสีตามวันในสัปดาห์ (เวลาไทย UTC+7)
  const dayColor = useMemo(() => {
    const now = new Date();
    // แปลงเป็นเวลาไทย (UTC+7)
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const dayOfWeek = thaiTime.getUTCDay();
    return THAI_DAY_COLORS[dayOfWeek as keyof typeof THAI_DAY_COLORS];
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (username.trim().length < 3) {
          setError('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
          setLoading(false);
          return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
          setError('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 และ _ เท่านั้น');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('รหัสผ่านไม่ตรงกัน');
          setLoading(false);
          return;
        }
        const { error } = await signUp(username.trim(), email, password);
        if (error) {
          setError(error.message);
        } else {
          setError('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
  };

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
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className={`absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br ${dayColor.from} ${dayColor.to} rounded-full blur-3xl`}
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 25, repeat: Infinity, delay: 2 }}
            className={`absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br ${dayColor.to} ${dayColor.from} rounded-full blur-3xl`}
          />
          <motion.div
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 15, repeat: Infinity, delay: 1 }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-br ${dayColor.from} ${dayColor.to} rounded-full blur-3xl`}
          />
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
            className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${dayColor.gradient} rounded-3xl flex items-center justify-center ${
              isDark ? '' : `shadow-2xl ${dayColor.shadow}`
            }`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
          >
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </motion.div>
          <HandwritingLogo gradient={dayColor.gradient} size="lg" animated={false} />
          <motion.p 
            className={`font-semibold text-sm mt-3 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            เมมโมการ์ด · ระบบทบทวนอัจฉริยะ · วัน{dayColor.name}
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className={`backdrop-blur-xl rounded-3xl border p-8 ${
            isDark 
              ? 'bg-slate-900/95 border-slate-800 shadow-2xl' 
              : `bg-white/80 shadow-2xl ${dayColor.from.replace('from-', 'border-').replace('-400', '-100')}`
          }`}
        >
          {/* Mode Toggle — animated sliding indicator */}
          <div className={`relative flex mb-6 p-1 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {/* Sliding background */}
            <motion.div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r ${dayColor.gradient} ${isDark ? '' : 'shadow-lg'}`}
              animate={{ x: mode === 'login' ? 0 : 'calc(100% + 8px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setMode('login')}
              className={`relative flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors z-10 ${
                mode === 'login'
                  ? 'text-white'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => setMode('register')}
              className={`relative flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors z-10 ${
                mode === 'register'
                  ? 'text-white'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!supabaseConfigured ? (
              <motion.div
                key="no-config"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4"
              >
                <div className={`border rounded-2xl p-4 mb-4 ${isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                    ยังไม่ได้ตั้งค่า Supabase
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                    กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY
                  </p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username — เฉพาะตอนสมัคร */}
                {mode === 'register' && (
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      ชื่อผู้ใช้
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100/20 transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-200' 
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                      required
                      disabled={loading}
                      minLength={3}
                      maxLength={20}
                    />
                    <p className={`text-[10px] mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      ใช้ได้เฉพาะ a-z, 0-9 และ _ (3-20 ตัวอักษร)
                    </p>
                  </div>
                )}

                {/* Email/Username input */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {mode === 'register' ? 'อีเมล' : 'ชื่อผู้ใช้ หรือ อีเมล'}
                  </label>
                  <input
                    type={mode === 'register' ? 'email' : 'text'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'register' ? 'your@email.com' : 'username หรือ email'}
                    className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100/20 transition-all font-medium ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-slate-200' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    required
                    disabled={loading}
                  />
                  {mode === 'register' && (
                    <p className={`text-[10px] mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      ใช้สำหรับกู้คืนรหัสผ่านเท่านั้น
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100/20 transition-all font-medium ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-slate-200' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {/* Confirm Password — เฉพาะตอนสมัคร */}
                {mode === 'register' && (
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      ยืนยันรหัสผ่าน
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 border-2 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-4 transition-all font-medium ${
                        confirmPassword.length === 0
                          ? isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-teal-400 focus:ring-teal-100/20' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-teal-400 focus:ring-teal-100/20'
                          : confirmPassword === password
                            ? 'bg-emerald-50 border-emerald-400 text-slate-800 focus:border-emerald-400 focus:ring-emerald-100/20'
                            : 'bg-rose-50 border-rose-400 text-slate-800 focus:border-rose-400 focus:ring-rose-100/20'
                      }`}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    {confirmPassword.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                          confirmPassword === password ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {confirmPassword === password ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            รหัสผ่านตรงกัน
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            รหัสผ่านไม่ตรงกัน
                          </>
                        )}
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs font-medium p-3 rounded-xl ${
                      error.includes('สำเร็จ')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit Button — เปลี่ยนแค่ข้อความ ไม่ขยับ */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className={`w-full py-3.5 bg-gradient-to-r ${dayColor.gradient} hover:opacity-90 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark ? '' : `shadow-lg ${dayColor.shadow} hover:shadow-xl`
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={mode}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="block"
                      >
                        {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </motion.button>

                {/* Divider + Google — เฉพาะหน้า login */}
                {mode === 'login' && (
                  <p className={`text-center text-xs mt-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    ยังไม่มีบัญชี?{' '}
                    <button type="button" onClick={() => setMode('register')} className={`font-semibold underline ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>
                      สมัครสมาชิก
                    </button>
                  </p>
                )}
              </form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Demo Mode Button — เฉพาะหน้า login */}
        {mode === 'login' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <motion.button
              onClick={handleDemoMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`inline-flex items-center gap-2 px-6 py-3 backdrop-blur-sm border font-semibold rounded-xl transition-all ${
                isDark 
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300' 
                  : `bg-white/60 hover:bg-white/80 ${dayColor.from.replace('from-', 'border-').replace('-400', '-200')} text-${dayColor.from.split('-')[1]}-700 shadow-sm hover:shadow-md`
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              ข้ามการล็อกอิน (ทดลองใช้)
            </motion.button>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              ข้อมูลจะเก็บในเครื่องเท่านั้น
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className={`text-center text-xs mt-8 ${
            isDark ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          ใช้งานฟรี ไม่มีค่าใช้จ่าย
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
