import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, CloudRain, Flame, Radio, X, Minus, GripHorizontal } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ZenModePanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayColor: { gradient: string; shadow: string };
}

// ✅ Replaced ScriptProcessorNode (deprecated) with AudioBufferSourceNode loop.
// ScriptProcessor runs on the main thread and is deprecated in all modern browsers.
class AudioMixer {
  ctx: AudioContext | null = null;
  rainGain: GainNode | null = null;
  brownGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    const ACtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new ACtx();

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(this.ctx.destination);

    this.brownGain = this.ctx.createGain();
    this.brownGain.gain.value = 0;
    this.brownGain.connect(this.ctx.destination);

    this._startRain();
    this._startBrownNoise();
  }

  _makeNoise(seconds: number, filter: (data: Float32Array, sampleRate: number) => void): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const bufferSize = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    filter(data, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  _startRain() {
    if (!this.ctx || !this.rainGain) return;
    const src = this._makeNoise(3, (data) => {
      // White noise filtered to sound like rain
      let lastOut = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        // Simple low-pass (IIR) to tilt toward rain frequency
        lastOut = (lastOut + 0.006 * white) / 1.006;
        data[i] = lastOut * 18;
      }
    });
    // Bandpass filter around 800Hz to shape rain timbre
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    src.connect(filter);
    filter.connect(this.rainGain);
    src.start();
  }

  _startBrownNoise() {
    if (!this.ctx || !this.brownGain) return;
    const src = this._makeNoise(4, (data) => {
      // Brown noise via random walk
      let lastOut = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    });
    src.connect(this.brownGain);
    src.start();
  }

  private _resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setRainVolume(val: number) {
    this._resume();
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.15);
    }
  }

  setBrownVolume(val: number) {
    this._resume();
    if (this.brownGain && this.ctx) {
      this.brownGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.15);
    }
  }

  /** Play a simple chime when the Pomodoro phase ends. */
  playBell() {
    if (!this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.15, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.6);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.6);
    });
  }

  stop() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.rainGain = null;
      this.brownGain = null;
    }
  }
}

export default function ZenModePanel({ isOpen, onClose, dayColor }: ZenModePanelProps) {
  const { isDark } = useTheme();
  
  const [isMinimized, setIsMinimized] = useState(false);

  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  // ✅ Store timerRunning + isBreak in refs so interval callback always reads fresh values
  const timerRunningRef = useRef(false);
  const isBreakRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio State
  const [rainVol, setRainVol] = useState(0);
  const [brownVol, setBrownVol] = useState(0);
  const mixerRef = useRef<AudioMixer | null>(null);

  // YouTube Lofi State
  const [showLofi, setShowLofi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      if (!mixerRef.current) {
        mixerRef.current = new AudioMixer();
        mixerRef.current.init();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (mixerRef.current) mixerRef.current.setRainVolume(rainVol);
  }, [rainVol]);

  useEffect(() => {
    if (mixerRef.current) mixerRef.current.setBrownVolume(brownVol);
  }, [brownVol]);

  // ✅ Fixed Timer: use a stable setInterval in a ref — no more create/destroy every second.
  // The interval is started/stopped based on timerRunning state changes only.
  useEffect(() => {
    timerRunningRef.current = timerRunning;
  }, [timerRunning]);

  useEffect(() => {
    isBreakRef.current = isBreak;
  }, [isBreak]);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Phase complete — switch Focus ↔ Break
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          // ✅ Use ref to read current isBreak value inside interval callback
          const wasBreak = isBreakRef.current;
          setTimerRunning(false);
          setIsBreak(!wasBreak);
          // ✅ Set correct duration for NEXT phase
          const nextTime = wasBreak ? 25 * 60 : 5 * 60;
          // Play bell using the shared mixer AudioContext (no new context)
          mixerRef.current?.playBell();
          return nextTime;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning]);

  const handleClose = () => {
    if (mixerRef.current) {
      mixerRef.current.stop();
      mixerRef.current = null;
    }
    setTimerRunning(false);
    setShowLofi(false);
    setRainVol(0);
    setBrownVol(0);
    onClose();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCustomGradient = dayColor.gradient.includes('gradient(');
  const gradientClass = isCustomGradient ? '' : dayColor.gradient;
  const gradientStyle = isCustomGradient ? { backgroundImage: dayColor.gradient } : {};

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed z-50 backdrop-blur-xl shadow-2xl border ${
            isMinimized 
              ? 'p-1.5 rounded-full flex items-center gap-1 cursor-grab active:cursor-grabbing' 
              : 'w-80 rounded-3xl p-5'
          } ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}
          style={{ top: '5rem', right: '1rem', touchAction: "none" }}
        >
          {/* Hidden Iframe for zero visual footprint */}
          {showLofi && (
            <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
              <iframe 
                src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&controls=0" 
                allow="autoplay" 
                title="Lofi Radio"
              />
            </div>
          )}

          {isMinimized ? (
            <>
              {/* Drag Handle */}
              <div className="px-2 opacity-40 hover:opacity-100 transition-opacity">
                <GripHorizontal className="w-4 h-4" />
              </div>
              
              {/* Expand Button */}
              <button 
                onClick={() => setIsMinimized(false)} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="ขยาย (Expand)"
              >
                <Headphones className={`w-4 h-4 ${(timerRunning || showLofi || rainVol > 0 || brownVol > 0) ? 'text-indigo-500 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-sm font-bold">
                  {timerRunning ? formatTime(timeLeft) : 'Zen'}
                </span>
              </button>

              {/* Close Button */}
              <button 
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-500 transition-colors"
                title="ปิด (Close)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6 cursor-grab active:cursor-grabbing">
                <h3 className="font-bold text-lg flex items-center gap-2 pointer-events-none">
                  <Headphones className="w-5 h-5 text-indigo-500" /> โหมดสมาธิ
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsMinimized(true)} 
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                    title="พับเก็บ (Minimize)"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleClose} 
                    className="p-1.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors text-slate-500 hover:text-rose-500"
                    title="ปิด (Close)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Pomodoro Timer */}
              <div className={`p-4 rounded-2xl mb-4 text-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-100/50'}`}>
                <div className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">
                  {isBreak ? 'เวลาพัก (Break)' : 'เวลาโฟกัส (Focus)'}
                </div>
                <div className={`text-4xl font-black font-mono mb-3 bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`} style={gradientStyle}>
                  {formatTime(timeLeft)}
                </div>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => {
                      timerRunningRef.current = !timerRunning;
                      setTimerRunning(!timerRunning);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gradientClass} shadow-md`}
                    style={gradientStyle}
                  >
                    {timerRunning ? 'หยุดพัก' : 'เริ่มจับเวลา'}
                  </button>
                  <button 
                    onClick={() => {
                      // ✅ Fix: reset to the CURRENT phase duration (not the opposite)
                      setTimerRunning(false);
                      timerRunningRef.current = false;
                      setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
                    }}
                    className={`px-3 py-2 rounded-xl font-bold text-sm border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-200'}`}
                  >
                    รีเซ็ต
                  </button>
                </div>
              </div>

              {/* Ambient Sounds */}
              <div className="space-y-4 mb-6">
                <div className="text-xs font-bold uppercase tracking-widest opacity-50">Ambient Sounds</div>
                
                <div className="flex items-center gap-3">
                  <CloudRain className={`w-5 h-5 ${rainVol > 0 ? 'text-blue-400' : 'text-slate-400'}`} />
                  <input 
                    type="range" min="0" max="0.5" step="0.01" 
                    value={rainVol} 
                    onChange={(e) => setRainVol(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Flame className={`w-5 h-5 ${brownVol > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                  <input 
                    type="range" min="0" max="0.5" step="0.01" 
                    value={brownVol} 
                    onChange={(e) => setBrownVol(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>

              {/* Lofi Radio Toggle */}
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-100/50'}`}>
                <button 
                  onClick={() => setShowLofi(!showLofi)}
                  className="w-full flex items-center justify-between font-bold text-sm group"
                >
                  <span className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${showLofi ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} /> 
                    Lofi Radio
                  </span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showLofi ? 'bg-rose-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                    <motion.div 
                      layout 
                      className={`absolute top-0.5 bottom-0.5 bg-white rounded-full w-4 shadow-sm ${showLofi ? 'right-0.5' : 'left-0.5'}`} 
                    />
                  </div>
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}