import { Megaphone, Phone, Globe, Zap } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

const CTA_PRESETS = [
  'Call Now',
  'Book Today',
  'Get a Free Quote',
  'Schedule Service',
  'Learn More',
  'Contact Us',
];

const URGENCY_TEXTS = [
  '$99 Drain Cleaning',
  '24/7 Emergency Service',
  'Limited Time Offer',
  'This Week Only',
  'Free Estimates',
  '10% Off First Service',
];

export default function AdModePanel() {
  const { editState, setAdMode, setCTA, setContactBar, addTextOverlay } = useProjectStore();

  return (
    <div className="bg-brand-navy-light rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Megaphone size={14} />
          Ad Mode
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editState.adMode}
            onChange={(e) => setAdMode(e.target.checked)}
            className="rounded accent-brand-gold"
          />
          <span className="text-xs">{editState.adMode ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      {editState.adMode && (
        <div className="space-y-4">
          {/* CTA Button */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Call-to-Action Button</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {CTA_PRESETS.map((text) => (
                <button
                  key={text}
                  onClick={() =>
                    setCTA({
                      text,
                      color: '#D4A534',
                      link: editState.cta?.link || '',
                      position: 'bottom-center',
                    })
                  }
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    editState.cta?.text === text
                      ? 'border-brand-gold bg-brand-gold/20 text-brand-gold'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            {editState.cta && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Phone size={12} className="text-white/40" />
                    <span className="text-[10px] text-white/40">Phone / Link</span>
                  </div>
                  <input
                    type="text"
                    value={editState.cta.link}
                    onChange={(e) => setCTA({ ...editState.cta!, link: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="input-field text-sm py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Info Bar */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={editState.contactBar?.show ?? false}
                onChange={(e) =>
                  setContactBar({
                    phone: editState.contactBar?.phone || '',
                    website: editState.contactBar?.website || '',
                    show: e.target.checked,
                  })
                }
                className="rounded accent-brand-gold"
              />
              <span className="text-xs">Show Contact Info Bar</span>
            </label>
            {editState.contactBar?.show && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Phone size={10} className="text-white/40" />
                    <span className="text-[10px] text-white/40">Phone</span>
                  </div>
                  <input
                    type="text"
                    value={editState.contactBar.phone}
                    onChange={(e) =>
                      setContactBar({ ...editState.contactBar!, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Globe size={10} className="text-white/40" />
                    <span className="text-[10px] text-white/40">Website</span>
                  </div>
                  <input
                    type="text"
                    value={editState.contactBar.website}
                    onChange={(e) =>
                      setContactBar({ ...editState.contactBar!, website: e.target.value })
                    }
                    placeholder="rubricplumbing.com"
                    className="input-field text-xs py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Add: Service Highlights */}
          <div>
            <label className="text-xs text-white/50 mb-1 flex items-center gap-1">
              <Zap size={12} />
              Quick Add: Service Highlights
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {URGENCY_TEXTS.map((text) => (
                <button
                  key={text}
                  onClick={() =>
                    addTextOverlay({
                      id: crypto.randomUUID(),
                      text,
                      x: 0.1,
                      y: 0.3,
                      fontSize: 56,
                      fontFamily: 'Impact',
                      color: '#D4A534',
                      backgroundColor: 'rgba(26,26,78,0.85)',
                      startTime: 0,
                      endTime: 999,
                      animation: 'scale-in',
                    })
                  }
                  className="text-xs px-2 py-1 rounded-full border border-brand-purple/40 hover:border-brand-purple text-brand-purple-light transition-colors"
                >
                  + {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
