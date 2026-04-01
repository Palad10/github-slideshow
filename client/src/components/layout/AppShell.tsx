import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-brand-navy">
      <Header />
      <main className="pt-14 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
