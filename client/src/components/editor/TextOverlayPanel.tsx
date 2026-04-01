import { useState } from 'react';
import { Plus, Trash2, Type } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

const FONT_OPTIONS = ['Inter', 'Arial', 'Georgia', 'Impact', 'Courier New'];
const COLOR_OPTIONS = ['#FFFFFF', '#D4A534', '#1A1A4E', '#7B2D8E', '#FF4444', '#00CC66', '#000000'];

export default function TextOverlayPanel() {
  const { editState, addTextOverlay, updateTextOverlay, removeTextOverlay } = useProjectStore();
  const [newText, setNewText] = useState('');

  const handleAdd = () => {
    if (!newText.trim()) return;
    addTextOverlay({
      id: crypto.randomUUID(),
      text: newText.trim(),
      x: 0.1,
      y: 0.5,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.6)',
      startTime: 0,
      endTime: 999,
      animation: 'none',
    });
    setNewText('');
  };

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
        <Type size={14} />
        Text Overlays
      </h3>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add text..."
          className="input-field text-sm py-2"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="btn-primary py-2 px-3">
          <Plus size={16} />
        </button>
      </div>

      {editState.textOverlays.length > 0 && (
        <div className="space-y-2">
          {editState.textOverlays.map((overlay) => (
            <div key={overlay.id} className="bg-white/5 rounded-lg p-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={overlay.text}
                  onChange={(e) => updateTextOverlay(overlay.id, { text: e.target.value })}
                  className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => removeTextOverlay(overlay.id)}
                  className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex gap-1 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateTextOverlay(overlay.id, { color })}
                    className={`w-6 h-6 rounded-full border-2 ${
                      overlay.color === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={overlay.fontFamily}
                  onChange={(e) => updateTextOverlay(overlay.id, { fontFamily: e.target.value })}
                  className="bg-white/10 rounded px-2 py-1 text-xs flex-1"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input
                  type="range"
                  min={16}
                  max={120}
                  value={overlay.fontSize}
                  onChange={(e) => updateTextOverlay(overlay.id, { fontSize: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-gold"
                />
                <span className="text-xs text-white/40 w-8">{overlay.fontSize}</span>
              </div>

              <select
                value={overlay.animation}
                onChange={(e) => updateTextOverlay(overlay.id, { animation: e.target.value as any })}
                className="w-full bg-white/10 rounded px-2 py-1 text-xs"
              >
                <option value="none">No animation</option>
                <option value="fade-in">Fade in</option>
                <option value="slide-up">Slide up</option>
                <option value="scale-in">Scale in</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
