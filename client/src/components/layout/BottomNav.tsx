import { NavLink } from 'react-router-dom';
import { Home, Camera, LayoutTemplate, FolderOpen } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/record', icon: Camera, label: 'Record' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-navy/95 backdrop-blur-sm border-t border-white/10 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-brand-gold' : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
