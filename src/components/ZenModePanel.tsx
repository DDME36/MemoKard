import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Headphones, CloudRain, Flame, Radio, X, Minus, GripHorizontal, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { haptics, sounds } from '../utils/haptics';

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
    const ACtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  const dragControls = useDragControls();
  
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
  const [audioError, setAudioError] = useState('');
  const [effectsEnabled, setEffectsEnabled] = useState(() => sounds.isEnabled());

  // YouTube Lofi State
  const [showLofi, setShowLofi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => setIsMinimized(false));
      if (!mixerRef.current) {
        try {
          const mixer = new AudioMixer();
          mixer.init();
          mixerRef.current = mixer;
          Promise.resolve().then(() => setAudioError(''));
        } catch (error) {
          console.debug('[zen] Ambient audio unavailable:', error);
          Promise.resolve().then(() => setAudioError('เบราว์เซอร์ไม่สามารถเปิดเสียงบรรยากาศได้ ลองแตะหน้าเว็บแล้วเปิดใหม่อีกครั้ง'));
        }
      }
    }
  }, [isOpen]);

  useEffect(() => () => {
    mixerRef.current?.stop();
    mixerRef.current = null;
  }, []);

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
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed z-50 backdrop-blur-2xl shadow-2xl border ${
            isMinimized 
              ? 'p-1.5 rounded-full flex items-center gap-1 cursor-grab active:cursor-grabbing premium-card border-white/20' 
              : 'w-80 rounded-[32px] p-5 premium-card border-white/20'
          }`}
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
              <div
                onPointerDown={(event) => dragControls.start(event)}
                className="cursor-grab touch-none px-2 opacity-40 transition-opacity hover:opacity-100 active:cursor-grabbing"
                aria-label="ลากแผงโหมดสมาธิ"
              >
                <GripHorizontal className="w-4 h-4 text-slate-400" />
              </div>
              
              {/* Expand Button */}
              <button 
                onClick={() => {
                  haptics.light();
                  setIsMinimized(false);
                }} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 dark:hover:bg-slate-800/40 transition-colors"
                title="ขยาย (Expand)"
              >
                <Headphones className={`w-4 h-4 ${(timerRunning || showLofi || rainVol > 0 || brownVol > 0) ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-sm font-bold display-font text-slate-700 dark:text-slate-300">
                  {timerRunning ? formatTime(timeLeft) : 'Zen'}
                </span>
              </button>

              {/* Close Button */}
              <button 
                onClick={() => {
                  haptics.medium();
                  handleClose();
                }} 
                className="p-2 rounded-full hover:bg-rose-500/10 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition-colors"
                title="ปิด (Close)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={(event) => dragControls.start(event)}
                    className="cursor-grab touch-none rounded-lg p-1 text-slate-400 hover:bg-white/10 active:cursor-grabbing"
                    aria-label="ลากแผงโหมดสมาธิ"
                  >
                    <GripHorizontal className="h-4 w-4" />
                  </button>
                  <h3 className="font-bold text-lg flex items-center gap-2 pointer-events-none display-font text-slate-800 dark:text-slate-100">
                    <Headphones className="w-5 h-5 text-indigo-500 animate-pulse" /> โหมดสมาธิ
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      haptics.light();
                      setIsMinimized(true);
                    }} 
                    className="p-1.5 rounded-full hover:bg-white/10 dark:hover:bg-slate-800/40 transition-colors text-slate-400"
                    title="พับเก็บ (Minimize)"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      haptics.medium();
                      handleClose();
                    }} 
                    className="p-1.5 rounded-full hover:bg-rose-500/10 dark:hover:bg-rose-950/30 transition-colors text-slate-400 hover:text-rose-500"
                    title="ปิด (Close)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Pomodoro Timer */}
              <div className={`p-4 rounded-2xl mb-4 text-center ${isDark ? 'bg-slate-900/50 border border-white/5' : 'bg-white/50 border border-white/40 shadow-inner shadow-slate-100'}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 display-font text-slate-500 dark:text-slate-400">
                  {isBreak ? 'เวลาพัก (Break)' : 'เวลาโฟกัส (Focus)'}
                </div>
                <div className={`text-4xl font-black font-mono mb-3 display-font bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`} style={gradientStyle}>
                  {formatTime(timeLeft)}
                </div>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => {
                      haptics.medium();
                      timerRunningRef.current = !timerRunning;
                      setTimerRunning(!timerRunning);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gradientClass} shadow-md display-font`}
                    style={gradientStyle}
                  >
                    {timerRunning ? 'หยุดพัก' : 'เริ่มจับเวลา'}
                  </button>
                  <button 
                    onClick={() => {
                      haptics.light();
                      setTimerRunning(false);
                      timerRunningRef.current = false;
                      setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
                    }}
                    className={`px-3 py-2 rounded-xl font-bold text-sm border display-font ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm'}`}
                  >
                    รีเซ็ต
                  </button>
                </div>
              </div>

              {/* Ambient Sounds */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 display-font text-slate-500 dark:text-slate-400">Ambient Sounds</div>
                  <button
                    type="button"
                    aria-pressed={effectsEnabled}
                    onClick={() => {
                      const next = !effectsEnabled;
                      setEffectsEnabled(next);
                      sounds.setEnabled(next);
                      haptics.light();
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${effectsEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}
                    title={effectsEnabled ? 'ปิดเสียงเอฟเฟกต์ของแอป' : 'เปิดเสียงเอฟเฟกต์ของแอป'}
                  >
                    {effectsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    เอฟเฟกต์
                  </button>
                </div>

                {audioError && (
                  <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-500">
                    {audioError}
                  </p>
                )}
                
                <div className="flex items-center gap-3" onClick={() => haptics.light()}>
                  <CloudRain className={`w-5 h-5 ${rainVol > 0 ? 'text-blue-400' : 'text-slate-400'}`} />
                  <input 
                    type="range" min="0" max="0.5" step="0.01" 
                    value={rainVol} 
                    onChange={(e) => setRainVol(parseFloat(e.target.value))}
                    aria-label="ระดับเสียงฝน"
                    aria-valuetext={`${Math.round(rainVol * 200)} เปอร์เซ็นต์`}
                    disabled={Boolean(audioError)}
                    className="w-full accent-blue-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">{Math.round(rainVol * 200)}%</span>
                </div>
                
                <div className="flex items-center gap-3" onClick={() => haptics.light()}>
                  <Flame className={`w-5 h-5 ${brownVol > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                  <input 
                    type="range" min="0" max="0.5" step="0.01" 
                    value={brownVol} 
                    onChange={(e) => setBrownVol(parseFloat(e.target.value))}
                    aria-label="ระดับเสียง Brown noise"
                    aria-valuetext={`${Math.round(brownVol * 200)} เปอร์เซ็นต์`}
                    disabled={Boolean(audioError)}
                    className="w-full accent-orange-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">{Math.round(brownVol * 200)}%</span>
                </div>
              </div>

              {/* Lofi Radio Toggle */}
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-900/40 border border-white/5' : 'bg-white/40 border border-white/40 shadow-sm'}`}>
                <button 
                  type="button"
                  aria-pressed={showLofi}
                  onClick={() => {
                    haptics.medium();
                    setShowLofi(!showLofi);
                  }}
                  className="w-full flex items-center justify-between font-bold text-sm group text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2 display-font">
                    <Radio className={`w-4 h-4 ${showLofi ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} /> 
                    Lofi Radio
                    <span className="text-[9px] font-medium text-slate-400">ออนไลน์</span>
                  </span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${showLofi ? 'bg-rose-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'}`}>
                    <motion.div 
                      layout 
                      className="absolute top-0.5 bottom-0.5 bg-white rounded-full w-4 shadow-sm" 
                      style={showLofi ? { right: '0.125rem' } : { left: '0.125rem' }}
                    />
                  </div>
                </button>
                {showLofi && (
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                    สตรีมผ่าน YouTube และต้องใช้อินเทอร์เน็ต หากไม่มีเสียงให้ตรวจระดับเสียงหรือสิทธิ์เล่นสื่อของเบราว์เซอร์
                  </p>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
