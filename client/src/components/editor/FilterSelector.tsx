import { useProjectStore } from '../../stores/project-store';
import { Palette } from 'lucide-react';

const FILTERS = [
  { id: null, label: 'None', preview: '' },
  { id: 'warm', label: 'Warm', preview: 'sepia(0.3) saturate(1.4)' },
  { id: 'cool', label: 'Cool', preview: 'saturate(0.8) hue-rotate(15deg)' },
  { id: 'bw', label: 'B&W', preview: 'grayscale(1)' },
  { id: 'vivid', label: 'Vivid', preview: 'saturate(1.8) contrast(1.1)' },
  { id: 'high-contrast', label: 'Hi-Con', preview: 'contrast(1.4) brightness(0.95)' },
  { id: 'vintage', label: 'Vintage', preview: 'sepia(0.5) contrast(0.9)' },
  { id: 'dramatic', label: 'Drama', preview: 'contrast(1.3) saturate(1.2) brightness(0.9)' },
  { id: 'fade', label: 'Fade', preview: 'contrast(0.85) brightness(1.15) saturate(0.7)' },
];

export default function FilterSelector() {
  const { editState, setFilter } = useProjectStore();

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
        <Palette size={14} />
        Filters
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.id ?? 'none'}
            onClick={() => setFilter(filter.id)}
            className={`flex-shrink-0 w-16 text-center rounded-lg p-1 border-2 transition-all ${
              editState.filter === filter.id
                ? 'border-brand-gold bg-brand-gold/10'
                : 'border-transparent hover:border-white/20'
            }`}
          >
            <div
              className="w-full aspect-square rounded-md bg-gradient-to-br from-brand-gold/40 to-brand-purple/40 mb-1"
              style={{ filter: filter.preview || 'none' }}
            />
            <span className="text-[10px]">{filter.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
