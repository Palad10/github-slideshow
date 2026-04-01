import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Plus, X, CheckCircle, AlertCircle, Film } from 'lucide-react';
import api from '../lib/api';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  thumbnail: string | null;
  mediaId: string | null;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const navigate = useNavigate();

  const generateThumbnail = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        if (file.type.startsWith('image/')) {
          resolve(URL.createObjectURL(file));
        } else {
          resolve(null);
        }
        return;
      }
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 284;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(null);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const newFiles: UploadFile[] = [];
    for (const file of selected) {
      const thumb = await generateThumbnail(file);
      newFiles.push({
        file,
        id: crypto.randomUUID(),
        progress: 0,
        status: 'pending',
        thumbnail: thumb,
        mediaId: null,
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    if (!projectId) return;
    setUploading(true);

    for (const uploadFile of files) {
      if (uploadFile.status === 'done') continue;

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
      );

      try {
        const formData = new FormData();
        formData.append('files', uploadFile.file);
        formData.append('projectId', projectId);

        const { data } = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: pct } : f))
            );
          },
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'done', progress: 100, mediaId: data[0]?.id }
              : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
        );
      }
    }

    setUploading(false);
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done');
  const hasFiles = files.length > 0;

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-2">Upload Footage</h1>
      <p className="text-white/50 mb-6">Select multiple videos and photos from your job site</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {!hasFiles ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="card w-full py-16 flex flex-col items-center gap-3 border-2 border-dashed border-white/20 hover:border-brand-gold/50 transition-colors"
        >
          <Upload size={40} className="text-brand-gold" />
          <p className="font-medium">Tap to select videos & photos</p>
          <p className="text-white/40 text-sm">You can select multiple files at once</p>
        </button>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {files.map((f) => (
              <div key={f.id} className="card flex items-center gap-3">
                <div className="w-12 h-16 bg-black/30 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {f.thumbnail ? (
                    <img src={f.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film size={16} className="text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{f.file.name}</p>
                  <p className="text-xs text-white/40">
                    {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  {f.status === 'uploading' && (
                    <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-gold rounded-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {f.status === 'done' ? (
                    <CheckCircle size={20} className="text-green-400" />
                  ) : f.status === 'error' ? (
                    <AlertCircle size={20} className="text-red-400" />
                  ) : f.status === 'uploading' ? (
                    <span className="text-xs text-brand-gold font-medium">{f.progress}%</span>
                  ) : (
                    <button onClick={() => removeFile(f.id)} className="p-1">
                      <X size={18} className="text-white/40" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline w-full mb-3 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add More Files
          </button>

          {!allDone ? (
            <button
              onClick={uploadAll}
              disabled={uploading || files.every((f) => f.status === 'done')}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={18} />
              {uploading ? 'Uploading...' : `Upload ${files.filter((f) => f.status !== 'done').length} file(s)`}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/editor/${projectId}`)}
              className="btn-primary w-full"
            >
              Continue to Editor
            </button>
          )}
        </>
      )}
    </div>
  );
}
