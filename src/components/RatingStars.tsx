import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
}

export default function RatingStars({
  rating,
  onRate,
  readonly = false,
  size = 'md',
  showCount = false,
  count = 0,
}: RatingStarsProps) {
  const { isDark } = useTheme();
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating || rating;

  const handleClick = (value: number) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <motion.button
            key={value}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            whileHover={!readonly ? { scale: 1.1 } : {}}
            whileTap={!readonly ? { scale: 0.95 } : {}}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
          >
            <svg
              className={`${sizeClasses[size]} transition-colors ${
                value <= displayRating
                  ? 'text-amber-400 fill-amber-400'
                  : isDark
                  ? 'text-slate-700'
                  : 'text-slate-300'
              }`}
              fill={value <= displayRating ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </motion.button>
        ))}
      </div>

      {showCount && (
        <span
          className={`text-sm font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {rating > 0 ? rating.toFixed(1) : '—'}
          {count > 0 && (
            <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>
              {' '}
              ({count})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

