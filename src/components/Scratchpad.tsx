import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Edit2, Eraser, Check } from 'lucide-react';

interface ScratchpadProps {
  onClose: () => void;
  isDark: boolean;
}

export default function Scratchpad({ onClose, isDark }: ScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(isDark ? '#e2e8f0' : '#475569');

  useEffect(() => {
    Promise.resolve().then(() => {
      setColor(isDark ? '#e2e8f0' : '#475569');
    });
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? (isDark ? '#1e293b' : '#faf5ff') : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : 3.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col rounded-3xl overflow-hidden pointer-events-none">
      {/* Tools bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 z-50 pointer-events-auto shadow-2xl">
        <button
          type="button"
          onClick={() => setTool('pen')}
          className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
          title="ดินสอเขียน"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
          title="ยางลบ"
        >
          <Eraser className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 transition-all"
          title="ล้างหน้าจอ"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-white/10" />
        {/* Color Dots Selection */}
        <div className="flex items-center gap-1.5">
          {[
            isDark ? '#e2e8f0' : '#475569', // Slate/White
            '#a855f7',                      // Purple
            '#f43f5e',                      // Rose Red
            '#06b6d4'                       // Cyan
          ].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className="w-4 h-4 rounded-full border border-white/20 transition-all hover:scale-125 focus:outline-none"
              style={{ 
                backgroundColor: c, 
                boxShadow: color === c ? '0 0 0 2px rgba(255, 255, 255, 0.8)' : 'none' 
              }}
              title="เปลี่ยนสีปากกา"
            />
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all"
          title="เสร็จสิ้น"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full cursor-crosshair pointer-events-auto bg-transparent"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
