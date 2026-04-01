import { GripVertical, X } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

interface Props {
  onClipSelect: (clipId: string) => void;
}

export default function Timeline({ onClipSelect }: Props) {
  const { editState, removeClip, reorderClips, selectedClipId, setSelectedClipId } = useProjectStore();
  const clips = [...editState.clips].sort((a, b) => a.order - b.order);
  const mediaMap = new Map(editState.mediaFiles.map((m) => [m.id, m]));

  const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

  const handleMoveClip = (index: number, direction: -1 | 1) => {
    const newClips = [...clips];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newClips.length) return;
    [newClips[index], newClips[targetIndex]] = [newClips[targetIndex], newClips[index]];
    reorderClips(newClips.map((c, i) => ({ ...c, order: i })));
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/70">Timeline</h3>
        <span className="text-xs text-white/40">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} &middot; {formatTime(totalDuration)}
        </span>
      </div>

      {clips.length === 0 ? (
        <div className="py-6 text-center text-white/30 text-sm border-2 border-dashed border-white/10 rounded-lg">
          Tap a video in the Media Bin to add clips
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {clips.map((clip, index) => {
            const media = mediaMap.get(clip.mediaFileId);
            const clipDuration = clip.endTime - clip.startTime;
            const isSelected = selectedClipId === clip.id;

            return (
              <button
                key={clip.id}
                onClick={() => {
                  setSelectedClipId(isSelected ? null : clip.id);
                  onClipSelect(clip.id);
                }}
                className={`flex-shrink-0 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected ? 'border-brand-gold' : 'border-transparent hover:border-white/20'
                }`}
              >
                <div className="aspect-[9/16] bg-black/40 relative">
                  {media && (
                    <img
                      src={media.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute top-0.5 left-0.5 flex">
                    <span className="bg-black/60 text-[9px] px-1 rounded font-mono">
                      {index + 1}
                    </span>
                  </div>
                  <div className="absolute bottom-0.5 right-0.5">
                    <span className="bg-black/60 text-[9px] px-1 rounded font-mono">
                      {formatTime(clipDuration)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(clip.id);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
