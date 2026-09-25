import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import HandwritingLogo from './HandwritingLogo';

interface SplashScreenProps {
  onComplete: () => void;
  dayColor: { gradient: string; shadow: string };
  isAuthenticated: boolean;
}

export default function SplashScreen({ onComplete, dayColor }: SplashScreenProps) {
  const { isDark } = useTheme();
  
  useEffect(() => {
    // สั้นพอให้เห็นโลโก้เขียนจบ แต่ไม่ทำให้รอ (หน้าแรกถูกโหลดล่วงหน้าระหว่างนี้)
    const timer = setTimeout(() => {
      onComplete();
    }, 1300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="splash-screen"
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-950' 
          : 'bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50'
      }`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Logo Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Icon Box */}
        <motion.div
          className={`w-32 h-32 mb-6 bg-gradient-to-br ${dayColor.gradient} rounded-3xl flex items-center justify-center ${
            isDark ? '' : `shadow-2xl ${dayColor.shadow}`
          }`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
        >
          {/* SVG ไอคอนนิ่งๆ ไม่มีหมุนแล้ว */}
          <motion.svg
            className="w-16 h-16 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </motion.svg>
        </motion.div>

        {/* Text Logo */}
        <HandwritingLogo
          gradient={dayColor.gradient}
          size="lg"
          animated={true}
        />

        {/* Subtitle */}
        <motion.p
          className={`text-center font-semibold mt-4 text-lg ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
        >
          เมมโมการ์ด
        </motion.p>
      </div>

      {/* Loading indicator */}
      <motion.div
        className="absolute bottom-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`w-3 h-3 rounded-full bg-gradient-to-r ${dayColor.gradient}`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
