import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (Option | string)[];
  placeholder?: string;
  className?: string;
  variant?: 'outline' | 'flat';
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  buttonClassName?: string;
  dayColor?: { gradient: string; shadow: string };
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'เลือก...',
  className = '',
  variant = 'outline',
  icon,
  align = 'left',
  buttonClassName = '',
  dayColor,
}: CustomSelectProps) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options array (allowing string[] alongside Option[])
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect and adjust open direction (dropup vs dropdown) based on remaining space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 200 && rect.top > 200) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  // Extract base color name from dayColor to build standard border and ring utilities dynamically
  const match = dayColor?.gradient.match(/from-(\w+)-/);
  const colorName = match ? match[1] : 'violet';

  const activeColorMap: Record<string, { border: string; borderOpen: string; bg: string; text: string; ring: string }> = {
    red: { border: 'hover:border-red-500 focus:border-red-500', borderOpen: 'border-red-500', bg: 'bg-red-600', text: 'text-red-600', ring: 'ring-red-500/20' },
    yellow: { border: 'hover:border-amber-500 focus:border-amber-500', borderOpen: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-500', ring: 'ring-amber-500/20' },
    pink: { border: 'hover:border-pink-500 focus:border-pink-500', borderOpen: 'border-pink-500', bg: 'bg-pink-600', text: 'text-pink-600', ring: 'ring-pink-500/20' },
    green: { border: 'hover:border-green-600 focus:border-green-600', borderOpen: 'border-green-600', bg: 'bg-green-600', text: 'text-green-600', ring: 'ring-green-600/20' },
    orange: { border: 'hover:border-orange-500 focus:border-orange-500', borderOpen: 'border-orange-500', bg: 'bg-orange-600', text: 'text-orange-600', ring: 'ring-orange-500/20' },
    sky: { border: 'hover:border-sky-500 focus:border-sky-500', borderOpen: 'border-sky-500', bg: 'bg-sky-600', text: 'text-sky-600', ring: 'ring-sky-500/20' },
    purple: { border: 'hover:border-purple-500 focus:border-purple-500', borderOpen: 'border-purple-500', bg: 'bg-purple-600', text: 'text-purple-600', ring: 'ring-purple-500/20' },
    violet: { border: 'hover:border-violet-500 focus:border-violet-500', borderOpen: 'border-violet-500', bg: 'bg-violet-600', text: 'text-violet-600', ring: 'ring-violet-500/20' },
  };

  const activeTheme = activeColorMap[colorName] || activeColorMap.violet;

  // Set visual styles based on variant
  const triggerStyles =
    variant === 'flat'
      ? `${
          isDark
            ? 'bg-slate-950 text-slate-300 border-none hover:bg-slate-900/60'
            : 'bg-slate-50 text-slate-700 border-none hover:bg-slate-100/80'
        }`
      : `${
          isDark
            ? `bg-slate-800 border-slate-700 text-white ${activeTheme.border}`
            : `bg-white border-slate-200 text-slate-900 ${activeTheme.border} shadow-sm`
        }`;

  return (
    <div 
      ref={containerRef} 
      className={`relative select-none ${className} ${isOpen ? 'z-30' : 'z-10'}`}
    >
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-sm font-semibold transition-all duration-200 outline-none ${triggerStyles} ${
          isOpen && variant === 'outline'
            ? isDark
              ? `${activeTheme.borderOpen} ring-2 ${activeTheme.ring}`
              : `${activeTheme.borderOpen} ring-2 ${activeTheme.ring} shadow-inner`
            : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
          <span className={`truncate ${selectedOption ? 'font-bold' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="ml-2 shrink-0 flex items-center justify-center text-slate-400"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openDirection === 'up' ? -4 : 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openDirection === 'up' ? -4 : 4, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className={`absolute z-50 min-w-full rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${
              openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${
              isDark
                ? 'bg-slate-900/95 border-slate-800 shadow-slate-950/60'
                : 'bg-white/95 border-slate-100 shadow-slate-200/50'
            }`}
          >
            <div className="max-h-64 py-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {normalizedOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? dayColor
                          ? `bg-gradient-to-r ${dayColor.gradient} text-white`
                          : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2 shrink-0 flex items-center justify-center"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


