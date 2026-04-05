import { useState, useRef, useEffect } from 'react';
import { X, Plus, Scissors } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';
import type { MediaFileRef } from '../../types';

interface Props {
  media: MediaFileRef;
  onClose: () => void;
}

export default function ClipPicker({ media, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addClip, editState } = useProjectStore();
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(media.duration, 15));
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, []);

  const handleSetIn = () => {
    setStartTime(currentTime);
    if (endTime <= currentTime) setEndTime(Math.min(currentTime + 5, media.duration));
  };

  const handleSetOut = () => {
    setEndTime(currentTime);
    if (startTime >= currentTime) setStartTime(Math.max(currentTime - 5, 0));
  };

  const handleAddClip = () => {
    const nextOrder = editState.clips.length;
    addClip({
      id: crypto.randomUUID(),
      mediaFileId: media.id,
      startTime,
      endTime,
      order: nextOrder,
    });
    onClose();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;

  const clipDuration = endTime - startTime;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="p-1">
          <X size={24} />
        </button>
        <h2 className="font-semibold flex items-center gap-2">
          <Scissors size={18} className="text-brand-gold" />
          Pick a Clip
        </h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center bg-black p-2">
        <video
          ref={videoRef}
          src={media.url}
          className="max-w-full object-contain rounded-lg"
          style={{ maxHeight: '100%' }}
          controls
          playsInline
        />
      </div>

      <div className="flex-shrink-0 px-4 py-3 space-y-3 bg-brand-navy border-t border-white/10 safe-bottom">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-white/50">In: </span>
            <span className="text-brand-gold font-mono">{formatTime(startTime)}</span>
          </div>
          <div>
            <span className="text-white/50">Duration: </span>
            <span className="font-mono">{formatTime(clipDuration)}</span>
          </div>
          <div>
            <span className="text-white/50">Out: </span>
            <span className="text-brand-purple font-mono">{formatTime(endTime)}</span>
          </div>
        </div>

        <div className="relative h-10 bg-white/10 rounded-lg overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-brand-gold/30"
            style={{
              left: `${(startTime / media.duration) * 100}%`,
              width: `${((endTime - startTime) / media.duration) * 100}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{ left: `${(currentTime / media.duration) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={media.duration}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSetIn} className="btn-outline flex-1 py-2 text-sm">
            Set In Point
          </button>
          <button onClick={handleSetOut} className="btn-outline flex-1 py-2 text-sm">
            Set Out Point
          </button>
        </div>

        <button
          onClick={handleAddClip}
          disabled={clipDuration < 0.5}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          Add Clip ({formatTime(clipDuration)})
        </button>
      </div>
    </div>
  );
}
