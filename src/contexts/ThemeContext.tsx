import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  isAutoMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Check if it's night time in Thailand (18:00 - 06:00)
function isNightTimeInThailand(): boolean {
  const now = new Date();
  const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
  const hour = thaiTime.getUTCHours();
  return hour >= 18 || hour < 6;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const isAuto = localStorage.getItem('themeAuto') !== 'false';
    
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    
    // Auto mode: check time
    return isAuto ? isNightTimeInThailand() : false;
  });

  const [isAutoMode, setIsAutoMode] = useState(() => {
    return localStorage.getItem('themeAuto') !== 'false';
  });

  // Auto-update theme based on time (check every minute)
  useEffect(() => {
    if (!isAutoMode) return;

    const checkTime = () => {
      const shouldBeDark = isNightTimeInThailand();
      if (shouldBeDark !== isDark) {
        setIsDark(shouldBeDark);
      }
    };

    // Check immediately
    checkTime();

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [isAutoMode, isDark]);

  useEffect(() => {
    if (isAutoMode) {
      localStorage.removeItem('theme');
      localStorage.setItem('themeAuto', 'true');
    } else {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      localStorage.setItem('themeAuto', 'false');
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark, isAutoMode]);

  const toggleTheme = () => {
    // When user manually toggles, disable auto mode
    setIsAutoMode(false);
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, isAutoMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
