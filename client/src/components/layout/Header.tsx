import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('rubric_token');
    localStorage.removeItem('rubric_user');
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-navy/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Ru-Bric" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-brand-gold text-lg">Ru-Bric Video</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings size={20} className="text-white/70" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut size={20} className="text-white/70" />
          </button>
        </div>
      </div>
    </header>
  );
}
