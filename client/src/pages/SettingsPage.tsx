import { useState, useEffect } from 'react';
import { Save, UserPlus, Users } from 'lucide-react';
import api from '../lib/api';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('Ru-Bric Plumbing');
  const [primaryColor, setPrimaryColor] = useState('#D4A534');
  const [secondaryColor, setSecondaryColor] = useState('#1A1A4E');
  const [accentColor, setAccentColor] = useState('#7B2D8E');
  const [saved, setSaved] = useState(false);

  // New member form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      if (data.companyName) setCompanyName(data.companyName);
      if (data.primaryColor) setPrimaryColor(data.primaryColor);
      if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
      if (data.accentColor) setAccentColor(data.accentColor);
    }).catch(() => {});

    api.get('/auth/users').then(({ data }) => {
      setMembers(data);
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      await api.put('/settings', { companyName, primaryColor, secondaryColor, accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName || !newMemberPin) return;
    try {
      await api.post('/auth/register', { name: newMemberName, pin: newMemberPin });
      setNewMemberName('');
      setNewMemberPin('');
      const { data } = await api.get('/auth/users');
      setMembers(data);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Company Branding */}
      <div className="card mb-4">
        <h2 className="font-semibold mb-3">Company Branding</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-white/60">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Secondary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-white/60">{secondaryColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-white/60">{accentColor}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Users size={18} />
          Team Members
        </h2>

        <div className="space-y-2 mb-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-semibold text-sm">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm flex-1">{member.name}</span>
              <span className="text-xs text-white/40 capitalize">{member.role}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-3">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
            <UserPlus size={14} />
            Add Team Member
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Name"
              className="input-field text-sm py-2 flex-1"
            />
            <input
              type="password"
              value={newMemberPin}
              onChange={(e) => setNewMemberPin(e.target.value)}
              placeholder="PIN"
              inputMode="numeric"
              maxLength={8}
              className="input-field text-sm py-2 w-24"
            />
            <button
              onClick={handleAddMember}
              disabled={!newMemberName || !newMemberPin}
              className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
