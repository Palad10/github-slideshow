import { useState, useRef } from 'react';
import { Music, Play, Pause, Volume2 } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

const TRACKS = [
  { id: 'none', name: 'No Music', file: null },
  { id: 'upbeat-work', name: 'Upbeat Work', file: '/music/upbeat-work.mp3' },
  { id: 'chill-groove', name: 'Chill Groove', file: '/music/chill-groove.mp3' },
  { id: 'corporate', name: 'Corporate', file: '/music/corporate.mp3' },
  { id: 'energetic', name: 'Energetic', file: '/music/energetic.mp3' },
  { id: 'inspiring', name: 'Inspiring', file: '/music/inspiring.mp3' },
];

export default function MusicPicker() {
  const { editState, setMusic } = useProjectStore();
  const [previewTrack, setPreviewTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (trackId: string, file: string | null) => {
    if (previewTrack === trackId) {
      audioRef.current?.pause();
      setPreviewTrack(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    if (file) {
      const audio = new Audio(file);
      audio.volume = 0.5;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewTrack(null);
      audioRef.current = audio;
      setPreviewTrack(trackId);
    }
  };

  const handleSelect = (trackId: string) => {
    if (trackId === 'none') {
      setMusic(null);
    } else {
      setMusic({ trackId, volume: editState.music?.volume ?? 0.5 });
    }
  };

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
        <Music size={14} />
        Background Music
      </h3>

      <div className="space-y-1">
        {TRACKS.map((track) => {
          const isSelected = editState.music?.trackId === track.id || (!editState.music && track.id === 'none');
          return (
            <button
              key={track.id}
              onClick={() => handleSelect(track.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isSelected ? 'bg-brand-gold/20 text-brand-gold' : 'hover:bg-white/5'
              }`}
            >
              {track.file && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview(track.id, track.file);
                  }}
                  className="p-1"
                >
                  {previewTrack === track.id ? <Pause size={14} /> : <Play size={14} />}
                </button>
              )}
              <span className="text-sm flex-1 text-left">{track.name}</span>
              {isSelected && <div className="w-2 h-2 bg-brand-gold rounded-full" />}
            </button>
          );
        })}
      </div>

      {editState.music && (
        <div className="flex items-center gap-2 mt-2 px-2">
          <Volume2 size={14} className="text-white/40" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={editState.music.volume}
            onChange={(e) => setMusic({ ...editState.music!, volume: parseFloat(e.target.value) })}
            className="flex-1 accent-brand-gold"
          />
        </div>
      )}
    </div>
  );
}
