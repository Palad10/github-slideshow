import { useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
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

export default function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const animFrameRef = useRef<number>();
  const {
    editState,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
  } = useProjectStore();

  const clips = [...editState.clips].sort((a, b) => a.order - b.order);
  const mediaMap = new Map(editState.mediaFiles.map((m) => [m.id, m]));

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

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const clipInfo = getClipAtTime(currentTime);
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
      if (currentTime >= overlay.startTime && currentTime <= overlay.endTime) {
        const ox = overlay.x * canvas.width;
        const oy = overlay.y * canvas.height;
        const fontSize = overlay.fontSize * (canvas.width / 1080);

        if (overlay.backgroundColor) {
          ctx.font = `bold ${fontSize}px ${overlay.fontFamily || 'Inter'}`;
          const metrics = ctx.measureText(overlay.text);
          const padding = 8;
          ctx.fillStyle = overlay.backgroundColor;
          ctx.roundRect(
            ox - padding,
            oy - fontSize - padding,
            metrics.width + padding * 2,
            fontSize + padding * 2,
            4
          );
          ctx.fill();
        }

        ctx.font = `bold ${fontSize}px ${overlay.fontFamily || 'Inter'}`;
        ctx.fillStyle = overlay.color;
        ctx.textBaseline = 'top';
        ctx.fillText(overlay.text, ox, oy - fontSize);
      }
    }

    // Logo branding
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

    // CTA overlay (ad mode)
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

    // Contact bar (ad mode)
    if (editState.adMode && editState.contactBar?.show) {
      const barH = 36;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
      ctx.fillStyle = '#D4A534';
      ctx.font = `${14 * (canvas.width / 1080)}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = [editState.contactBar.phone, editState.contactBar.website]
        .filter(Boolean)
        .join('  |  ');
      ctx.fillText(text, canvas.width / 2, canvas.height - barH / 2);
      ctx.textAlign = 'start';
    }
  }, [currentTime, editState, getClipAtTime, mediaMap]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  useEffect(() => {
    if (!isPlaying) return;

    let lastTs = performance.now();
    const animate = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const next = currentTime + dt;
      if (next >= totalDuration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(next);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTime, totalDuration, setCurrentTime, setIsPlaying]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        className="w-full aspect-[9/16]"
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-black/60 rounded-full"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.05}
            value={currentTime}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTime(parseFloat(e.target.value));
            }}
            className="w-full accent-brand-gold"
          />
        </div>
        <span className="text-xs font-mono bg-black/60 px-2 py-1 rounded">
          {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
