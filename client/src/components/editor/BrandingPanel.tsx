import { Image } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

const POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
] as const;

export default function BrandingPanel() {
  const { editState, setBranding } = useProjectStore();

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
        <Image size={14} />
        Branding
      </h3>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editState.branding.showLogo}
            onChange={(e) => setBranding({ showLogo: e.target.checked })}
            className="rounded accent-brand-gold"
          />
          <span className="text-sm">Show Ru-Bric logo</span>
        </label>

        {editState.branding.showLogo && (
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((pos) => (
              <button
                key={pos.value}
                onClick={() => setBranding({ logoPosition: pos.value })}
                className={`text-xs py-2 px-3 rounded-lg border transition-colors ${
                  editState.branding.logoPosition === pos.value
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editState.branding.showWatermark}
            onChange={(e) => setBranding({ showWatermark: e.target.checked })}
            className="rounded accent-brand-gold"
          />
          <span className="text-sm">Add watermark</span>
        </label>
      </div>
    </div>
  );
}
