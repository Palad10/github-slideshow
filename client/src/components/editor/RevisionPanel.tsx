import { useState } from 'react';
import { Send, Sparkles, X, Clock, Type, Palette, Music, Image, Scissors, Megaphone, Check, Play } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

interface Revision {
  id: string;
  request: string;
  applied: string[];
  timestamp: number;
}

interface Props {
  onClose: () => void;
  onPreview: () => void;
  revisions: Revision[];
  setRevisions: (revisions: Revision[]) => void;
}

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
  { label: 'Make text bigger', icon: Type, action: 'text-bigger' },
  { label: 'Make text smaller', icon: Type, action: 'text-smaller' },
  { label: 'Add warm filter', icon: Palette, action: 'filter-warm' },
  { label: 'Add B&W filter', icon: Palette, action: 'filter-bw' },
  { label: 'Remove filter', icon: Palette, action: 'filter-none' },
  { label: 'Move logo top-left', icon: Image, action: 'logo-top-left' },
  { label: 'Move logo top-right', icon: Image, action: 'logo-top-right' },
  { label: 'Hide logo', icon: Image, action: 'logo-hide' },
  { label: 'Make clips shorter', icon: Scissors, action: 'clips-shorter' },
  { label: 'Add CTA button', icon: Megaphone, action: 'add-cta' },
  { label: 'Make it more dramatic', icon: Sparkles, action: 'dramatic' },
  { label: 'Make it brighter', icon: Sparkles, action: 'brighter' },
];

function applyRevision(
  request: string,
  store: ReturnType<typeof useProjectStore.getState>
): string[] {
  const lower = request.toLowerCase();
  const changes: string[] = [];

  // Text size changes
  if (lower.includes('text') && (lower.includes('bigger') || lower.includes('larger') || lower.includes('increase'))) {
    store.editState.textOverlays.forEach((o) => {
      store.updateTextOverlay(o.id, { fontSize: Math.min(o.fontSize + 12, 120) });
    });
    changes.push('Increased text size');
  }
  if (lower.includes('text') && (lower.includes('smaller') || lower.includes('decrease') || lower.includes('reduce'))) {
    store.editState.textOverlays.forEach((o) => {
      store.updateTextOverlay(o.id, { fontSize: Math.max(o.fontSize - 12, 16) });
    });
    changes.push('Decreased text size');
  }

  // Text color
  if (lower.includes('text') && lower.includes('white')) {
    store.editState.textOverlays.forEach((o) => store.updateTextOverlay(o.id, { color: '#FFFFFF' }));
    changes.push('Changed text color to white');
  }
  if (lower.includes('text') && lower.includes('gold')) {
    store.editState.textOverlays.forEach((o) => store.updateTextOverlay(o.id, { color: '#D4A534' }));
    changes.push('Changed text color to gold');
  }
  if (lower.includes('text') && lower.includes('black')) {
    store.editState.textOverlays.forEach((o) => store.updateTextOverlay(o.id, { color: '#000000' }));
    changes.push('Changed text color to black');
  }

  // Remove text
  if ((lower.includes('remove') || lower.includes('delete') || lower.includes('get rid of')) && lower.includes('text')) {
    const overlays = [...store.editState.textOverlays];
    overlays.forEach((o) => store.removeTextOverlay(o.id));
    changes.push(`Removed ${overlays.length} text overlay(s)`);
  }

  // Filters
  if (lower.includes('warm') && (lower.includes('filter') || lower.includes('look') || lower.includes('tone'))) {
    store.setFilter('warm');
    changes.push('Applied warm filter');
  }
  if ((lower.includes('black and white') || lower.includes('b&w') || lower.includes('b+w') || lower.includes('grayscale'))) {
    store.setFilter('bw');
    changes.push('Applied black & white filter');
  }
  if (lower.includes('dramatic') || lower.includes('intense') || lower.includes('cinematic')) {
    store.setFilter('dramatic');
    changes.push('Applied dramatic filter');
  }
  if (lower.includes('vivid') || lower.includes('colorful') || lower.includes('saturate')) {
    store.setFilter('vivid');
    changes.push('Applied vivid filter');
  }
  if (lower.includes('vintage') || lower.includes('retro') || lower.includes('old school')) {
    store.setFilter('vintage');
    changes.push('Applied vintage filter');
  }
  if (lower.includes('cool') && (lower.includes('filter') || lower.includes('tone') || lower.includes('look'))) {
    store.setFilter('cool');
    changes.push('Applied cool filter');
  }
  if ((lower.includes('remove') || lower.includes('no') || lower.includes('clear')) && lower.includes('filter')) {
    store.setFilter(null);
    changes.push('Removed filter');
  }
  if (lower.includes('bright') && (lower.includes('make') || lower.includes('more'))) {
    store.setFilter('fade');
    changes.push('Applied brighter look (fade filter)');
  }
  if (lower.includes('high contrast') || lower.includes('hi-con') || lower.includes('more contrast')) {
    store.setFilter('high-contrast');
    changes.push('Applied high contrast filter');
  }

  // Logo
  if (lower.includes('logo') && (lower.includes('hide') || lower.includes('remove') || lower.includes('no'))) {
    store.setBranding({ showLogo: false });
    changes.push('Hidden logo');
  }
  if (lower.includes('logo') && lower.includes('show')) {
    store.setBranding({ showLogo: true });
    changes.push('Showing logo');
  }
  if (lower.includes('logo') && lower.includes('top') && lower.includes('left')) {
    store.setBranding({ logoPosition: 'top-left', showLogo: true });
    changes.push('Moved logo to top-left');
  }
  if (lower.includes('logo') && lower.includes('top') && lower.includes('right')) {
    store.setBranding({ logoPosition: 'top-right', showLogo: true });
    changes.push('Moved logo to top-right');
  }
  if (lower.includes('logo') && lower.includes('bottom') && lower.includes('left')) {
    store.setBranding({ logoPosition: 'bottom-left', showLogo: true });
    changes.push('Moved logo to bottom-left');
  }
  if (lower.includes('logo') && lower.includes('bottom') && lower.includes('right')) {
    store.setBranding({ logoPosition: 'bottom-right', showLogo: true });
    changes.push('Moved logo to bottom-right');
  }

  // Clips
  if ((lower.includes('shorter') || lower.includes('trim') || lower.includes('cut down')) && (lower.includes('clip') || lower.includes('video'))) {
    store.editState.clips.forEach((c) => {
      const duration = c.endTime - c.startTime;
      if (duration > 3) {
        store.updateClip(c.id, { endTime: c.startTime + duration * 0.7 });
      }
    });
    changes.push('Shortened clips by 30%');
  }
  if ((lower.includes('longer') || lower.includes('extend')) && (lower.includes('clip') || lower.includes('video'))) {
    store.editState.clips.forEach((c) => {
      const duration = c.endTime - c.startTime;
      store.updateClip(c.id, { endTime: c.endTime + duration * 0.3 });
    });
    changes.push('Extended clips by 30%');
  }

  // CTA / Ad mode
  if ((lower.includes('add') || lower.includes('show')) && (lower.includes('cta') || lower.includes('call to action') || lower.includes('call now') || lower.includes('book'))) {
    store.setAdMode(true);
    const ctaText = lower.includes('book') ? 'Book Today' : lower.includes('quote') ? 'Get a Free Quote' : 'Call Now';
    store.setCTA({ text: ctaText, color: '#D4A534', link: '', position: 'bottom-center' });
    changes.push(`Added "${ctaText}" CTA button`);
  }
  if ((lower.includes('remove') || lower.includes('hide') || lower.includes('no')) && (lower.includes('cta') || lower.includes('call to action') || lower.includes('button'))) {
    store.setCTA(null);
    changes.push('Removed CTA button');
  }

  // Contact bar
  if ((lower.includes('add') || lower.includes('show')) && (lower.includes('contact') || lower.includes('phone number') || lower.includes('website'))) {
    store.setAdMode(true);
    store.setContactBar({ phone: store.editState.contactBar?.phone || '', website: store.editState.contactBar?.website || '', show: true });
    changes.push('Enabled contact info bar');
  }

  // Music
  if ((lower.includes('remove') || lower.includes('no') || lower.includes('mute')) && lower.includes('music')) {
    store.setMusic(null);
    changes.push('Removed background music');
  }

  // Add text
  if (lower.includes('add text') || lower.includes('add a text') || lower.includes('put text')) {
    const textMatch = request.match(/["""](.+?)["""]/);
    const text = textMatch ? textMatch[1] : 'New Text';
    store.addTextOverlay({
      id: crypto.randomUUID(),
      text,
      x: 0.1,
      y: 0.4,
      fontSize: 48,
      fontFamily: 'Impact',
      color: '#D4A534',
      backgroundColor: 'rgba(0,0,0,0.7)',
      startTime: 0,
      endTime: 999,
      animation: 'fade-in',
    });
    changes.push(`Added text: "${text}"`);
  }

  // If nothing matched
  if (changes.length === 0) {
    changes.push('Could not understand that request. Try using the quick suggestions below, or describe changes like "make text bigger", "add warm filter", "move logo to top-left", etc.');
  }

  return changes;
}

function applyQuickAction(action: string, store: ReturnType<typeof useProjectStore.getState>): string[] {
  switch (action) {
    case 'text-bigger':
      store.editState.textOverlays.forEach((o) => store.updateTextOverlay(o.id, { fontSize: Math.min(o.fontSize + 12, 120) }));
      return ['Increased text size'];
    case 'text-smaller':
      store.editState.textOverlays.forEach((o) => store.updateTextOverlay(o.id, { fontSize: Math.max(o.fontSize - 12, 16) }));
      return ['Decreased text size'];
    case 'filter-warm':
      store.setFilter('warm');
      return ['Applied warm filter'];
    case 'filter-bw':
      store.setFilter('bw');
      return ['Applied B&W filter'];
    case 'filter-none':
      store.setFilter(null);
      return ['Removed filter'];
    case 'logo-top-left':
      store.setBranding({ logoPosition: 'top-left', showLogo: true });
      return ['Moved logo to top-left'];
    case 'logo-top-right':
      store.setBranding({ logoPosition: 'top-right', showLogo: true });
      return ['Moved logo to top-right'];
    case 'logo-hide':
      store.setBranding({ showLogo: false });
      return ['Hidden logo'];
    case 'clips-shorter':
      store.editState.clips.forEach((c) => {
        const duration = c.endTime - c.startTime;
        if (duration > 3) store.updateClip(c.id, { endTime: c.startTime + duration * 0.7 });
      });
      return ['Shortened clips by 30%'];
    case 'add-cta':
      store.setAdMode(true);
      store.setCTA({ text: 'Call Now', color: '#D4A534', link: '', position: 'bottom-center' });
      return ['Added "Call Now" CTA button'];
    case 'dramatic':
      store.setFilter('dramatic');
      return ['Applied dramatic filter'];
    case 'brighter':
      store.setFilter('fade');
      return ['Applied brighter look'];
    default:
      return ['Unknown action'];
  }
}

export default function RevisionPanel({ onClose, onPreview, revisions, setRevisions }: Props) {
  const [input, setInput] = useState('');
  const store = useProjectStore();

  const handleSubmit = () => {
    if (!input.trim()) return;
    const applied = applyRevision(input, store);
    setRevisions([
      ...revisions,
      { id: crypto.randomUUID(), request: input, applied, timestamp: Date.now() },
    ]);
    setInput('');
  };

  const handleQuickAction = (action: string, label: string) => {
    const applied = applyQuickAction(action, store);
    setRevisions([
      ...revisions,
      { id: crypto.randomUUID(), request: label, applied, timestamp: Date.now() },
    ]);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-brand-navy">
        <button onClick={onClose} className="p-1">
          <X size={24} />
        </button>
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles size={18} className="text-brand-gold" />
          Request Changes
        </h2>
        <div className="w-8" />
      </div>

      {/* Revision history */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {revisions.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles size={32} className="mx-auto mb-3 text-brand-gold/40" />
            <p className="text-white/50 text-sm">Describe what you want changed</p>
            <p className="text-white/30 text-xs mt-1">
              e.g., "make text bigger", "add warm filter", "move logo to top-left"
            </p>
          </div>
        ) : (
          revisions.map((rev, i) => (
            <div key={rev.id} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-brand-gold font-bold">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{rev.request}</p>
                  <div className="mt-1 space-y-0.5">
                    {rev.applied.map((change, j) => (
                      <p key={j} className="text-xs text-brand-gold/80 flex items-center gap-1">
                        <Check size={10} />
                        {change}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick suggestions */}
      <div className="px-4 py-2 border-t border-white/5">
        <p className="text-[10px] text-white/30 mb-2">QUICK CHANGES</p>
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_SUGGESTIONS.map((sug) => (
            <button
              key={sug.action}
              onClick={() => handleQuickAction(sug.action, sug.label)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-white/60 hover:border-brand-gold/50 hover:text-brand-gold transition-colors flex items-center gap-1"
            >
              <sug.icon size={10} />
              {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-brand-navy">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type what you want changed..."
            className="input-field flex-1 text-sm py-2.5"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="btn-primary py-2.5 px-4 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        <button
          onClick={onPreview}
          className="btn-secondary w-full mt-2 py-2.5 text-sm flex items-center justify-center gap-2"
        >
          <Play size={16} />
          Preview Changes
        </button>
      </div>
    </div>
  );
}
