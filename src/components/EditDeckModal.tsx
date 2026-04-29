import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const PRESET_COLORS = [
  { name: 'violet', hex: '#8b5cf6', label: 'ม่วง' },
  { name: 'sky', hex: '#38bdf8', label: 'ฟ้า' },
  { name: 'teal', hex: '#14b8a6', label: 'เขียวมรกต' },
  { name: 'rose', hex: '#f43f5e', label: 'ชมพูเข้ม' },
  { name: 'amber', hex: '#f59e0b', label: 'เหลืองทอง' },
  { name: 'emerald', hex: '#10b981', label: 'เขียวใบไม้' },
  { name: 'pink', hex: '#ec4899', label: 'ชมพู' },
  { name: 'indigo', hex: '#6366f1', label: 'คราม' },
  { name: 'red', hex: '#ef4444', label: 'แดง' },
  { name: 'orange', hex: '#f97316', label: 'ส้ม' },
  { name: 'lime', hex: '#84cc16', label: 'เขียวมะนาว' },
  { name: 'cyan', hex: '#06b6d4', label: 'ฟ้าอมเขียว' },
  { name: 'yellow', hex: '#eab308', label: 'เหลือง' },
  { name: 'purple', hex: '#a855f7', label: 'ม่วงอ่อน' },
  { name: 'fuchsia', hex: '#d946ef', label: 'บานเย็น' },
];

interface EditDeckModalProps {
  isOpen: boolean;
  deckName: string;
  deckColor: string;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

export default function EditDeckModal({ isOpen, deckName, deckColor, onClose, onSave }: EditDeckModalProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState(deckName);
  const [selectedColor, setSelectedColor] = useState(deckColor);
  const [customColor, setCustomColor] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(deckName);
      setSelectedColor(deckColor);
      setCustomColor('');
    }
  }, [isOpen, deckName, deckColor]);

  // Check if there are any changes
  const hasChanges = name.trim() !== deckName || selectedColor !== deckColor;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), selectedColor);
      onClose();
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor('');
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelectedColor(color);
  };

  if (!isOpen) return null;

  // Helper to safely get a hex color from a named color or hex
  const getHexColor = (colorStr: string) => {
    if (colorStr.startsWith('#')) return colorStr;
    const preset = PRESET_COLORS.find(c => c.name === colorStr);
    return preset ? preset.hex : '#8b5cf6'; // default to violet hex
  };

  const safeColor = getHexColor(selectedColor);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl ${
            isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              แก้ไขชุดการ์ด
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Deck Name */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                ชื่อชุดการ์ด
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น คำศัพท์ภาษาอังกฤษ"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200 focus:border-purple-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-purple-500'
                }`}
                required
                autoFocus
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                เลือกสี
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => handleColorSelect(color.hex)}
                    className={`w-full aspect-square rounded-xl transition-all ${
                      selectedColor === color.hex
                        ? 'ring-4 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      '--tw-ring-color': color.hex,
                      '--tw-ring-offset-color': isDark ? '#1e293b' : '#ffffff',
                    } as React.CSSProperties}
                    title={color.label}
                  />
                ))}
              </div>

              {/* Custom Color Picker */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="custom-color"
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 hover:border-slate-500'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-white/20"
                    style={{ backgroundColor: customColor || safeColor }}
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    เลือกสีอื่น
                  </span>
                  <input
                    id="custom-color"
                    type="color"
                    value={customColor || selectedColor}
                    onChange={handleCustomColorChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-colors ${
                  isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!hasChanges}
                className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all ${
                  !hasChanges 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-105'
                }`}
                style={{
                  background: hasChanges 
                    ? `linear-gradient(135deg, ${safeColor}, ${safeColor}dd)`
                    : isDark 
                      ? '#475569' 
                      : '#94a3b8',
                }}
              >
                บันทึก
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
