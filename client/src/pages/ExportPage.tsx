import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, Loader, AlertTriangle } from 'lucide-react';
import { FORMAT_PRESETS } from 'shared/formats';
import api from '../lib/api';

export default function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['youtube_shorts', 'instagram_reels', 'tiktok']);
  const [rendering, setRendering] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const toggleFormat = (key: string) => {
    setSelectedFormats((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    if (!projectId || selectedFormats.length === 0) return;
    setRendering(true);
    setError(null);
    try {
      const { data } = await api.post('/render', { projectId, formats: selectedFormats });
      setJobId(data.jobId);
    } catch {
      setError('Failed to start render. Try again.');
      setRendering(false);
    }
  };

  // Poll render status
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/render/${jobId}/status`);
        setProgress(data.progress);
        setStatus(data.status);
        if (data.status === 'done') {
          setOutputs(data.outputs || {});
          setRendering(false);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError(data.error || 'Render failed.');
          setRendering(false);
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  const organicFormats = Object.entries(FORMAT_PRESETS).filter(([, f]) => f.category === 'organic');
  const adFormats = Object.entries(FORMAT_PRESETS).filter(([, f]) => f.category === 'ad');

  return (
    <div className="fixed inset-0 bg-brand-navy z-40 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => navigate(`/editor/${projectId}`)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold">Export Video</h1>
      </div>

      <div className="flex-1 overflow-y-auto page-container">
        {status === 'done' ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Check size={48} className="mx-auto text-green-400 mb-3" />
              <h2 className="text-xl font-bold">Ready to Download!</h2>
              <p className="text-white/50 mt-1">Your videos are ready for posting</p>
            </div>
            {Object.entries(outputs).map(([format, url]) => (
              <a
                key={format}
                href={url}
                download
                className="btn-primary w-full flex items-center justify-center gap-2 block text-center"
              >
                <Download size={18} />
                {FORMAT_PRESETS[format]?.label || format}
              </a>
            ))}
          </div>
        ) : rendering ? (
          <div className="text-center py-12">
            <Loader size={40} className="mx-auto text-brand-gold animate-spin mb-4" />
            <h2 className="text-lg font-semibold mb-2">Rendering...</h2>
            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
              <div
                className="bg-brand-gold h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/50 text-sm">{progress}% complete</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/20 text-red-300 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <h2 className="text-sm font-semibold text-white/70 mb-2">Reels & Shorts</h2>
            <div className="space-y-2 mb-6">
              {organicFormats.map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => toggleFormat(key)}
                  className={`card w-full flex items-center gap-3 transition-colors ${
                    selectedFormats.includes(key)
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'hover:border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedFormats.includes(key) ? 'border-brand-gold bg-brand-gold' : 'border-white/30'
                  }`}>
                    {selectedFormats.includes(key) && <Check size={12} className="text-brand-navy" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-white/40">
                      {preset.width}x{preset.height} &middot; {preset.aspectRatio} &middot; {preset.maxDuration}s max
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <h2 className="text-sm font-semibold text-white/70 mb-2">Ad Formats</h2>
            <div className="space-y-2 mb-6">
              {adFormats.map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => toggleFormat(key)}
                  className={`card w-full flex items-center gap-3 transition-colors ${
                    selectedFormats.includes(key)
                      ? 'border-brand-purple bg-brand-purple/5'
                      : 'hover:border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedFormats.includes(key) ? 'border-brand-purple bg-brand-purple' : 'border-white/30'
                  }`}>
                    {selectedFormats.includes(key) && <Check size={12} className="text-white" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-white/40">
                      {preset.width}x{preset.height} &middot; {preset.aspectRatio}
                      {preset.recommendedDuration && ` · ~${preset.recommendedDuration}s recommended`}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              disabled={selectedFormats.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              Export {selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
