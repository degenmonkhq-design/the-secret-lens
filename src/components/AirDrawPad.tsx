import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface AirDrawPadProps {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export const AirDrawPad: React.FC<AirDrawPadProps> = ({ label, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [inkColor, setInkColor] = useState<'#fff0a8' | '#38e8ff'>('#fff0a8');

  useEffect(() => {
    if (!value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      hasInkRef.current = false;
    }
  }, [value]);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    drawingRef.current = true;
    hasInkRef.current = true;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = inkColor;
    ctx.shadowColor = inkColor === '#fff0a8' ? '#f5c542' : '#38e8ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (canvasRef.current && hasInkRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasInkRef.current = false;
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-[#fff0a8]">
          <PenTool className="w-3.5 h-3.5 text-[#f5c542]" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInkColor('#fff0a8')}
            className={`w-6 h-6 rounded-full bg-[#f5c542] border-2 cursor-pointer ${
              inkColor === '#fff0a8' ? 'border-white scale-110' : 'border-transparent opacity-70'
            }`}
            title="Liquid Gold Neon"
            aria-label="Liquid Gold Neon"
          />
          <button
            type="button"
            onClick={() => setInkColor('#38e8ff')}
            className={`w-6 h-6 rounded-full bg-[#38e8ff] border-2 cursor-pointer ${
              inkColor === '#38e8ff' ? 'border-white scale-110' : 'border-transparent opacity-70'
            }`}
            title="Cosmic Cyan Neon"
            aria-label="Cosmic Cyan Neon"
          />
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/15 bg-white/5 text-[#d7e3ff] text-[11px] font-bold hover:bg-white/10 cursor-pointer"
          >
            <Eraser className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border border-[#f5c542]/40 bg-[radial-gradient(circle_at_center,#0a1738_0%,#030612_100%)] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={420}
          height={150}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-32 touch-none cursor-crosshair block"
        />
        {!value && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#9eb0d6]/70">
            Draw a glowing golden symbol or signature in air...
          </span>
        )}
      </div>
    </div>
  );
};
