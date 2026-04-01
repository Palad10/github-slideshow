import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Camera, LayoutTemplate, Upload } from 'lucide-react';
import api from '../lib/api';
import type { Project } from '../types';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(({ data }) => {
      setProjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleNewProject = async (source: 'record' | 'upload' | 'template') => {
    if (source === 'template') {
      navigate('/templates');
      return;
    }
    try {
      const { data } = await api.post('/projects', { title: 'Untitled Video' });
      navigate(source === 'record' ? `/record?project=${data.id}` : `/upload?project=${data.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">What are we making?</h1>
        <p className="text-white/50 mt-1">Create a new video or continue editing</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => handleNewProject('record')}
          className="card flex flex-col items-center gap-2 py-5 hover:border-brand-gold/50 transition-colors"
        >
          <Camera size={28} className="text-brand-gold" />
          <span className="text-sm font-medium">Record</span>
        </button>
        <button
          onClick={() => handleNewProject('upload')}
          className="card flex flex-col items-center gap-2 py-5 hover:border-brand-gold/50 transition-colors"
        >
          <Upload size={28} className="text-brand-gold" />
          <span className="text-sm font-medium">Upload</span>
        </button>
        <button
          onClick={() => handleNewProject('template')}
          className="card flex flex-col items-center gap-2 py-5 hover:border-brand-gold/50 transition-colors"
        >
          <LayoutTemplate size={28} className="text-brand-gold" />
          <span className="text-sm font-medium">Template</span>
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Projects</h2>
        <button
          onClick={() => navigate('/projects')}
          className="text-brand-gold text-sm font-medium"
        >
          See all
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <Video size={40} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40">No projects yet</p>
          <p className="text-white/30 text-sm mt-1">Tap Record or Upload to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {projects.slice(0, 6).map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/editor/${project.id}`)}
              className="card text-left hover:border-brand-gold/50 transition-colors"
            >
              <div className="aspect-[9/16] bg-black/30 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Video size={24} className="text-white/20" />
                )}
              </div>
              <p className="text-sm font-medium truncate">{project.title}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {project.status === 'draft' ? 'Draft' : project.status === 'rendering' ? 'Rendering...' : 'Done'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
