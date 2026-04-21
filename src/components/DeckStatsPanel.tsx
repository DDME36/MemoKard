import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import type { PublicDeck } from '../store/communityStore';

interface DeckStatsPanelProps {
  publicDeck: PublicDeck;
  shareLink: string;
  onUnshare: () => void;
  onUpdateDeck: () => void;
}

export default function DeckStatsPanel({
  publicDeck,
  shareLink,
  onUnshare,
  onUpdateDeck,
}: DeckStatsPanelProps) {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: publicDeck.name,
          text: publicDeck.description || `ชุดการ์ด ${publicDeck.name}`,
          url: shareLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className={`rounded-2xl border p-6 ${
        isDark
          ? 'bg-slate-900/50 border-slate-800'
          : 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-violet-900/30' : 'bg-violet-100'
          }`}
        >
          <svg
            className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </div>
        <div>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            สถิติการแชร์
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ชุดการ์ดนี้ถูกแชร์สู่ชุมชนแล้ว
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          className={`p-3 rounded-xl text-center ${
            isDark ? 'bg-slate-800/50' : 'bg-white/80'
          }`}
        >
          <div className={`text-2xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
            {publicDeck.importCount}
          </div>
          <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Import
          </div>
        </div>

        <div
          className={`p-3 rounded-xl text-center ${
            isDark ? 'bg-slate-800/50' : 'bg-white/80'
          }`}
        >
          <div className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {publicDeck.avgRating > 0 ? publicDeck.avgRating.toFixed(1) : '—'}
          </div>
          <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            คะแนน
          </div>
        </div>

        <div
          className={`p-3 rounded-xl text-center ${
            isDark ? 'bg-slate-800/50' : 'bg-white/80'
          }`}
        >
          <div className={`text-2xl font-bold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
            {publicDeck.ratingCount}
          </div>
          <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            รีวิว
          </div>
        </div>
      </div>

      {/* Share Link */}
      <div className="mb-4">
        <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ลิงก์แชร์
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={shareLink}
            readOnly
            className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            } focus:outline-none`}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              copied
                ? isDark
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-green-50 text-green-600'
                : isDark
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
          </motion.button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            isDark
              ? 'bg-violet-900/30 text-violet-300 hover:bg-violet-900/50'
              : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          แชร์ผ่าน
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onUpdateDeck}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            isDark
              ? 'bg-sky-900/30 text-sky-300 hover:bg-sky-900/50'
              : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          อัปเดต
        </motion.button>
      </div>

      {/* Unshare Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onUnshare}
        className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
          isDark
            ? 'bg-rose-900/20 text-rose-400 hover:bg-rose-900/30 border border-rose-800/30'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        ยกเลิกการแชร์
      </motion.button>
    </div>
  );
}
