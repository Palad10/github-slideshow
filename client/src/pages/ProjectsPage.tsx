import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Trash2, Plus } from 'lucide-react';
import api from '../lib/api';
import type { Project } from '../types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadProjects = () => {
    api.get('/projects').then(({ data }) => {
      setProjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(loadProjects, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its media?')) return;
    await api.delete(`/projects/${id}`);
    setProjects((p) => p.filter((proj) => proj.id !== id));
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Projects</h1>
        <button
          onClick={() => navigate('/')}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-1"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <Video size={48} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40">No projects yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/editor/${project.id}`)}
              className="card w-full flex items-center gap-3 hover:border-brand-gold/50 transition-colors"
            >
              <div className="w-16 h-20 bg-black/30 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Video size={20} className="text-white/20" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{project.title}</p>
                <p className="text-xs text-white/40 mt-1">
                  {new Date(project.createdAt).toLocaleDateString()} &middot;{' '}
                  {project.status === 'draft' ? 'Draft' : project.status === 'rendering' ? 'Rendering...' : 'Done'}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0"
              >
                <Trash2 size={18} className="text-red-400" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
