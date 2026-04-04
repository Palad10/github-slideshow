import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Save, Eye } from 'lucide-react';
import { useProjectStore } from '../stores/project-store';
import api from '../lib/api';
import MediaBin from '../components/editor/MediaBin';
import ClipPicker from '../components/editor/ClipPicker';
import Timeline from '../components/editor/Timeline';
import PreviewCanvas from '../components/editor/PreviewCanvas';
import TextOverlayPanel from '../components/editor/TextOverlayPanel';
import FilterSelector from '../components/editor/FilterSelector';
import MusicPicker from '../components/editor/MusicPicker';
import BrandingPanel from '../components/editor/BrandingPanel';
import AdModePanel from '../components/editor/AdModePanel';
import FullPreview from '../components/editor/FullPreview';
import RevisionPanel from '../components/editor/RevisionPanel';
import type { MediaFileRef } from '../types';

type EditorTab = 'clips' | 'text' | 'style' | 'ad';

interface Revision {
  id: string;
  request: string;
  applied: string[];
  timestamp: number;
}

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setProject, editState, isDirty, title } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EditorTab>('clips');
  const [clipPickerMedia, setClipPickerMedia] = useState<MediaFileRef | null>(null);
  const [saving, setSaving] = useState(false);

  // Preview & Revision state
  const [showPreview, setShowPreview] = useState(false);
  const [showRevisionPanel, setShowRevisionPanel] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  useEffect(() => {
    if (!projectId) return;
    api.get(`/projects/${projectId}`).then(({ data }) => {
      const editState = typeof data.editState === 'string'
        ? JSON.parse(data.editState)
        : data.editState;
      setProject(data.id, data.title, editState);
      setLoading(false);
    }).catch(() => {
      navigate('/');
    });
  }, [projectId, setProject, navigate]);

  const handleSave = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}`, {
        title,
        editState: JSON.stringify(editState),
      });
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  }, [projectId, editState, title]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(handleSave, 5000);
    return () => clearTimeout(timer);
  }, [isDirty, handleSave]);

  const handleSelectMedia = (mediaId: string) => {
    const media = editState.mediaFiles.find((m) => m.id === mediaId);
    if (media) setClipPickerMedia(media);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'clips', label: 'Clips' },
    { id: 'text', label: 'Text' },
    { id: 'style', label: 'Style' },
    { id: 'ad', label: 'Ad' },
  ];

  return (
    <div className="fixed inset-0 bg-brand-navy z-40 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-brand-navy">
        <button onClick={() => navigate('/')} className="p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold truncate flex-1 mx-2 text-center">{title || 'Untitled'}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 text-white/60 hover:text-white"
          >
            <Save size={18} className={saving ? 'animate-pulse text-brand-gold' : ''} />
          </button>
          <button
            onClick={() => {
              handleSave();
              setShowPreview(true);
            }}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={() => {
              handleSave();
              navigate(`/export/${projectId}`);
            }}
            className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-shrink-0 px-2 py-2" style={{ maxHeight: '45vh' }}>
        <PreviewCanvas />
      </div>

      {/* Timeline */}
      <div className="flex-shrink-0 px-2 pb-2">
        <Timeline onClipSelect={() => {}} />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {activeTab === 'clips' && (
          <MediaBin projectId={projectId!} onSelectMedia={handleSelectMedia} />
        )}
        {activeTab === 'text' && <TextOverlayPanel />}
        {activeTab === 'style' && (
          <>
            <FilterSelector />
            <MusicPicker />
            <BrandingPanel />
          </>
        )}
        {activeTab === 'ad' && <AdModePanel />}
      </div>

      {/* Clip picker modal */}
      {clipPickerMedia && (
        <ClipPicker media={clipPickerMedia} onClose={() => setClipPickerMedia(null)} />
      )}

      {/* Full Preview modal */}
      {showPreview && (
        <FullPreview
          revisionCount={revisions.length}
          onClose={() => setShowPreview(false)}
          onApprove={() => {
            setShowPreview(false);
            handleSave();
            navigate(`/export/${projectId}`);
          }}
          onRequestRevision={() => {
            setShowPreview(false);
            setShowRevisionPanel(true);
          }}
        />
      )}

      {/* Revision Panel */}
      {showRevisionPanel && (
        <RevisionPanel
          revisions={revisions}
          setRevisions={setRevisions}
          onClose={() => setShowRevisionPanel(false)}
          onPreview={() => {
            setShowRevisionPanel(false);
            setShowPreview(true);
          }}
        />
      )}
    </div>
  );
}
