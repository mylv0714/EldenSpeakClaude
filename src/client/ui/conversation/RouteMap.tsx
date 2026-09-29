import { useEffect, useRef } from 'react';
import { getMapImage } from '../../game/engine';
import { toMap } from '../../game/render/minimap';

/** Small map showing the route a lost tourist needs (directions practice). */
export function RouteMap({ points, height = 180 }: { points: { x: number; y: number }[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || points.length < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const map = getMapImage();
    const mp = points.map((p) => toMap(p.x, p.y));
    const xs = mp.map((p) => p.x);
    const ys = mp.map((p) => p.y);
    const pad = 30;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    const k = Math.min(w / (maxX - minX), h / (maxY - minY));
    const ox = (w - (maxX - minX) * k) / 2 - minX * k;
    const oy = (h - (maxY - minY) * k) / 2 - minY * k;
    ctx.fillStyle = '#4a90c2';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(map, ox, oy, map.width * k, map.height * k);
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    mp.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * k + ox, p.y * k + oy) : ctx.lineTo(p.x * k + ox, p.y * k + oy)));
    ctx.stroke();
    const start = mp[0];
    const end = mp[mp.length - 1];
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(start.x * k + ox, start.y * k + oy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '18px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍', end.x * k + ox, end.y * k + oy - 6);
  }, [points]);

  return <canvas ref={ref} className="w-full rounded-xl border border-white/10" style={{ height }} />;
}
