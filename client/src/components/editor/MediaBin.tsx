import { useRef } from 'react';
import { Plus, Film, Image, X } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';
import api from '../../lib/api';

interface Props {
  projectId: string;
  onSelectMedia: (mediaId: string) => void;
}

export default function MediaBin({ projectId, onSelectMedia }: Props) {
  const { editState, addMediaFile, removeMediaFile } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('projectId', projectId);

      try {
        const { data } = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        for (const media of data) {
          addMediaFile({
            id: media.id,
            type: media.type,
            url: `/api/media/${media.id}`,
            duration: media.duration || 0,
            thumbnail: `/api/media/${media.id}/thumbnail`,
          });
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white/70">Media Bin</h3>
        <span className="text-xs text-white/40">{editState.mediaFiles.length} files</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        onChange={handleAddMore}
        className="hidden"
      />

      <div className="grid grid-cols-3 gap-2">
        {editState.mediaFiles.map((media) => (
          <button
            key={media.id}
            onClick={() => onSelectMedia(media.id)}
            className="relative aspect-[9/16] bg-black/40 rounded-lg overflow-hidden group hover:ring-2 ring-brand-gold transition-all"
          >
            <img
              src={media.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {media.type === 'video' ? (
                <Film size={16} className="text-white/40 group-hover:text-white/80" />
              ) : (
                <Image size={16} className="text-white/40 group-hover:text-white/80" />
              )}
            </div>
            {media.type === 'video' && media.duration > 0 && (
              <div className="absolute bottom-1 right-1 bg-black/60 text-[10px] px-1 rounded">
                {Math.floor(media.duration / 60)}:{(Math.floor(media.duration) % 60).toString().padStart(2, '0')}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeMediaFile(media.id);
              }}
              className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-[9/16] bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:border-brand-gold/50 transition-colors"
        >
          <Plus size={20} className="text-white/40" />
          <span className="text-[10px] text-white/40">Add</span>
        </button>
      </div>
    </div>
  );
}
