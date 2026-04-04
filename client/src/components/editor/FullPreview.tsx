import { useRef, useEffect, useCallback, useState } from 'react';
import { X, Play, Pause, RotateCcw, Check } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

const FILTER_MAP: Record<string, string> = {
  warm: 'sepia(0.3) saturate(1.4) brightness(1.05)',
  cool: 'saturate(0.8) brightness(1.1) hue-rotate(15deg)',
  bw: 'grayscale(1)',
  vivid: 'saturate(1.8) contrast(1.1)',
  'high-contrast': 'contrast(1.4) brightness(0.95)',
  vintage: 'sepia(0.5) contrast(0.9) brightness(1.1)',
  dramatic: 'contrast(1.3) saturate(1.2) brightness(0.9)',
  fade: 'contrast(0.85) brightness(1.15) saturate(0.7)',
};

interface Props {
  onClose: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
  revisionCount: number;
}

export default function FullPreview({ onClose, onApprove, onRequestRevision, revisionCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const animFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const { editState } = useProjectStore();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const clips = [...editState.clips].sort((a, b) => a.order - b.order);
  const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

  const getClipAtTime = useCallback(
    (time: number) => {
      let elapsed = 0;
      for (const clip of clips) {
        const clipDuration = clip.endTime - clip.startTime;
        if (time < elapsed + clipDuration) {
          return { clip, offsetInClip: time - elapsed };
        }
        elapsed += clipDuration;
      }
      return null;
    },
    [clips]
  );

  const getOrCreateVideo = (mediaId: string, url: string) => {
    let video = videoRefs.current.get(mediaId);
    if (!video) {
      video = document.createElement('video');
      video.src = url;
      video.playsInline = true;
      video.muted = true;
      video.preload = 'auto';
      videoRefs.current.set(mediaId, video);
    }
    return video;
  };

  const mediaMap = new Map(editState.mediaFiles.map((m) => [m.id, m]));

  const renderFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (clips.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No clips on timeline', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'start';
        return;
      }

      const clipInfo = getClipAtTime(time);
      if (!clipInfo) return;

      const media = mediaMap.get(clipInfo.clip.mediaFileId);
      if (!media) return;

      const video = getOrCreateVideo(media.id, media.url);
      const targetTime = clipInfo.clip.startTime + clipInfo.offsetInClip;
      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
      }

      ctx.save();
      if (editState.filter && FILTER_MAP[editState.filter]) {
        ctx.filter = FILTER_MAP[editState.filter];
      }
      const vw = video.videoWidth || canvas.width;
      const vh = video.videoHeight || canvas.height;
      const scale = Math.max(canvas.width / vw, canvas.height / vh);
      const x = (canvas.width - vw * scale) / 2;
      const y = (canvas.height - vh * scale) / 2;
      ctx.drawImage(video, x, y, vw * scale, vh * scale);
      ctx.restore();

      // Text overlays
      for (const overlay of editState.textOverlays) {
        if (time >= overlay.startTime && time <= overlay.endTime) {
          const ox = overlay.x * canvas.width;
          const oy = overlay.y * canvas.height;
          const fontSize = overlay.fontSize * (canvas.width / 1080);

          if (overlay.backgroundColor) {
            ctx.font = `bold ${fontSize}px ${overlay.fontFamily || 'Inter'}`;
            const metrics = ctx.measureText(overlay.text);
            const padding = 8;
            ctx.fillStyle = overlay.backgroundColor;
            ctx.roundRect(ox - padding, oy - padding, metrics.width + padding * 2, fontSize + padding * 2, 4);
            ctx.fill();
          }

          ctx.font = `bold ${fontSize}px ${overlay.fontFamily || 'Inter'}`;
          ctx.fillStyle = overlay.color;
          ctx.textBaseline = 'top';
          ctx.fillText(overlay.text, ox, oy);
        }
      }

      // Logo
      if (editState.branding.showLogo) {
        const logoImg = new Image();
        logoImg.src = '/logo.png';
        const logoSize = canvas.width * 0.12;
        const margin = 16;
        let lx = margin, ly = margin;
        const pos = editState.branding.logoPosition;
        if (pos.includes('right')) lx = canvas.width - logoSize - margin;
        if (pos.includes('bottom')) ly = canvas.height - logoSize - margin;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
        ctx.globalAlpha = 1;
      }

      // CTA
      if (editState.adMode && editState.cta) {
        const ctaH = 56;
        const ctaY = canvas.height - ctaH - 40;
        ctx.fillStyle = editState.cta.color || '#D4A534';
        ctx.roundRect(canvas.width * 0.1, ctaY, canvas.width * 0.8, ctaH, 12);
        ctx.fill();
        ctx.fillStyle = '#1A1A4E';
        ctx.font = `bold ${24 * (canvas.width / 1080)}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(editState.cta.text, canvas.width / 2, ctaY + ctaH / 2);
        ctx.textAlign = 'start';
      }

      // Contact bar
      if (editState.adMode && editState.contactBar?.show) {
        const barH = 36;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
        ctx.fillStyle = '#D4A534';
        ctx.font = `${14 * (canvas.width / 1080)}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = [editState.contactBar.phone, editState.contactBar.website].filter(Boolean).join('  |  ');
        ctx.fillText(text, canvas.width / 2, canvas.height - barH / 2);
        ctx.textAlign = 'start';
      }
    },
    [editState, getClipAtTime, mediaMap, clips]
  );

  useEffect(() => {
    renderFrame(currentTime);
  }, [currentTime, renderFrame]);

  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = performance.now() - currentTime * 1000;

    const animate = (ts: number) => {
      const elapsed = (ts - startTimeRef.current) / 1000;
      if (elapsed >= totalDuration) {
        setCurrentTime(0);
        setPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing, totalDuration]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-navy/80">
        <button onClick={onClose} className="p-1">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-sm">Preview</h2>
          {revisionCount > 0 && (
            <span className="text-[10px] text-brand-gold">Revision #{revisionCount}</span>
          )}
        </div>
        <div className="w-8" />
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-black px-2">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="max-h-full max-w-full rounded-lg"
          style={{ maxHeight: 'calc(100vh - 220px)' }}
        />
      </div>

      {/* Playback controls */}
      <div className="px-4 py-2 bg-brand-navy/80">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="p-2 bg-white/10 rounded-full"
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => { setPlaying(false); setCurrentTime(0); }}
            className="p-2 bg-white/10 rounded-full"
          >
            <RotateCcw size={18} />
          </button>
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.05}
            value={currentTime}
            onChange={(e) => {
              setPlaying(false);
              setCurrentTime(parseFloat(e.target.value));
            }}
            className="flex-1 accent-brand-gold"
          />
          <span className="text-xs font-mono text-white/60 w-16 text-right">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onRequestRevision}
            className="btn-outline flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Request Changes
          </button>
          <button
            onClick={onApprove}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Looks Good!
          </button>
        </div>
      </div>
    </div>
  );
}
