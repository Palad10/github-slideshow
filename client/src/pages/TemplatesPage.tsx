import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Megaphone, Play } from 'lucide-react';
import api from '../lib/api';
import type { TemplateConfig } from '../types';

interface TemplateItem {
  id: string;
  name: string;
  category: 'organic' | 'ad';
  description: string;
  config: TemplateConfig;
  color: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'before-after',
    name: 'Before & After',
    category: 'organic',
    description: 'Show the transformation — before the fix, after the fix',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Before footage', suggestedDuration: 5, required: true },
        { label: 'After footage', suggestedDuration: 5, required: true },
      ],
      textOverlays: [
        { text: 'BEFORE', x: 0.1, y: 0.15, fontSize: 64, fontFamily: 'Impact', color: '#FF4444', startTime: 0, endTime: 5, animation: 'fade-in' },
        { text: 'AFTER', x: 0.1, y: 0.15, fontSize: 64, fontFamily: 'Impact', color: '#00CC66', startTime: 5, endTime: 10, animation: 'fade-in' },
      ],
      suggestedDuration: 10,
      defaultFilter: null,
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  {
    id: 'quick-tip',
    name: 'Quick Tip',
    category: 'organic',
    description: 'Share a quick plumbing tip with your audience',
    color: '#7B2D8E',
    config: {
      clipSlots: [
        { label: 'Demo footage', suggestedDuration: 12, required: true },
      ],
      textOverlays: [
        { text: 'PLUMBING TIP', x: 0.1, y: 0.08, fontSize: 48, fontFamily: 'Impact', color: '#D4A534', startTime: 0, endTime: 3, animation: 'slide-up' },
        { text: 'Follow for more tips!', x: 0.1, y: 0.85, fontSize: 32, fontFamily: 'Inter', color: '#FFFFFF', startTime: 8, endTime: 15, animation: 'fade-in' },
      ],
      suggestedDuration: 15,
      defaultFilter: null,
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  {
    id: 'promo-sale',
    name: 'Promo / Sale',
    category: 'organic',
    description: 'Promote a special offer or seasonal deal',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Service footage', suggestedDuration: 8, required: true },
      ],
      textOverlays: [
        { text: 'SPECIAL OFFER', x: 0.1, y: 0.1, fontSize: 56, fontFamily: 'Impact', color: '#D4A534', backgroundColor: 'rgba(26,26,78,0.9)', startTime: 0, endTime: 10, animation: 'scale-in' },
      ],
      suggestedDuration: 10,
      defaultFilter: null,
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  {
    id: 'team-spotlight',
    name: 'Team Spotlight',
    category: 'organic',
    description: 'Introduce a team member to your audience',
    color: '#7B2D8E',
    config: {
      clipSlots: [
        { label: 'Team member footage', suggestedDuration: 12, required: true },
      ],
      textOverlays: [
        { text: 'MEET THE TEAM', x: 0.1, y: 0.08, fontSize: 48, fontFamily: 'Impact', color: '#D4A534', startTime: 0, endTime: 4, animation: 'slide-up' },
        { text: '[Name] - [Role]', x: 0.1, y: 0.8, fontSize: 36, fontFamily: 'Inter', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.6)', startTime: 2, endTime: 12, animation: 'fade-in' },
      ],
      suggestedDuration: 12,
      defaultFilter: null,
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    category: 'organic',
    description: 'Share a happy customer review',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Job footage / customer', suggestedDuration: 10, required: true },
      ],
      textOverlays: [
        { text: '"Great service!"', x: 0.08, y: 0.3, fontSize: 44, fontFamily: 'Georgia', color: '#FFFFFF', backgroundColor: 'rgba(26,26,78,0.85)', startTime: 1, endTime: 9, animation: 'fade-in' },
        { text: '⭐⭐⭐⭐⭐', x: 0.3, y: 0.5, fontSize: 36, fontFamily: 'Inter', color: '#D4A534', startTime: 2, endTime: 10, animation: 'scale-in' },
      ],
      suggestedDuration: 10,
      defaultFilter: 'warm',
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  {
    id: 'time-lapse',
    name: 'Time-Lapse',
    category: 'organic',
    description: 'Show a job from start to finish in a sped-up time-lapse',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Time-lapse footage (full job)', suggestedDuration: 15, required: true },
        { label: 'Finished result close-up', suggestedDuration: 5, required: false },
      ],
      textOverlays: [
        { text: 'TIME-LAPSE', x: 0.1, y: 0.08, fontSize: 52, fontFamily: 'Impact', color: '#D4A534', backgroundColor: 'rgba(0,0,0,0.7)', startTime: 0, endTime: 3, animation: 'scale-in' },
        { text: '⏱️ Start to Finish', x: 0.1, y: 0.18, fontSize: 28, fontFamily: 'Inter', color: '#FFFFFF', startTime: 1, endTime: 4, animation: 'fade-in' },
        { text: 'THE RESULT ⬇️', x: 0.15, y: 0.08, fontSize: 44, fontFamily: 'Impact', color: '#00CC66', startTime: 15, endTime: 20, animation: 'slide-up' },
        { text: 'Ru-Bric Plumbing', x: 0.15, y: 0.85, fontSize: 28, fontFamily: 'Inter', color: '#D4A534', startTime: 0, endTime: 20, animation: 'fade-in' },
      ],
      suggestedDuration: 20,
      defaultFilter: null,
      adMode: false,
      defaultCTA: null,
      defaultContactBar: null,
    },
  },
  // AD TEMPLATES
  {
    id: 'service-promo-ad',
    name: 'Service Promo Ad',
    category: 'ad',
    description: 'Bold pricing + call to action for a specific service',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Service demo footage', suggestedDuration: 12, required: true },
      ],
      textOverlays: [
        { text: '$99 DRAIN CLEANING', x: 0.05, y: 0.25, fontSize: 60, fontFamily: 'Impact', color: '#D4A534', backgroundColor: 'rgba(26,26,78,0.9)', startTime: 0, endTime: 15, animation: 'scale-in' },
        { text: 'Licensed & Insured', x: 0.15, y: 0.55, fontSize: 28, fontFamily: 'Inter', color: '#FFFFFF', startTime: 2, endTime: 15, animation: 'fade-in' },
      ],
      suggestedDuration: 15,
      defaultFilter: null,
      adMode: true,
      defaultCTA: { text: 'Call Now', color: '#D4A534', link: '', position: 'bottom-center' },
      defaultContactBar: { phone: '', website: '', show: true },
    },
  },
  {
    id: 'emergency-ad',
    name: 'Emergency Services Ad',
    category: 'ad',
    description: 'Urgency-driven ad for emergency plumbing',
    color: '#FF4444',
    config: {
      clipSlots: [
        { label: 'Emergency/repair footage', suggestedDuration: 10, required: true },
      ],
      textOverlays: [
        { text: '24/7 EMERGENCY SERVICE', x: 0.05, y: 0.2, fontSize: 56, fontFamily: 'Impact', color: '#FF4444', backgroundColor: 'rgba(0,0,0,0.8)', startTime: 0, endTime: 12, animation: 'scale-in' },
        { text: 'We Come To You — Fast!', x: 0.1, y: 0.45, fontSize: 32, fontFamily: 'Inter', color: '#FFFFFF', startTime: 1, endTime: 12, animation: 'slide-up' },
      ],
      suggestedDuration: 15,
      defaultFilter: 'dramatic',
      adMode: true,
      defaultCTA: { text: 'Call Now', color: '#FF4444', link: '', position: 'bottom-center' },
      defaultContactBar: { phone: '', website: '', show: true },
    },
  },
  {
    id: 'seasonal-deal-ad',
    name: 'Seasonal Deal Ad',
    category: 'ad',
    description: 'Limited time seasonal promotion',
    color: '#D4A534',
    config: {
      clipSlots: [
        { label: 'Service footage', suggestedDuration: 12, required: true },
      ],
      textOverlays: [
        { text: 'LIMITED TIME OFFER', x: 0.1, y: 0.12, fontSize: 48, fontFamily: 'Impact', color: '#FF4444', startTime: 0, endTime: 3, animation: 'scale-in' },
        { text: 'SPRING SPECIAL', x: 0.1, y: 0.3, fontSize: 56, fontFamily: 'Impact', color: '#D4A534', backgroundColor: 'rgba(26,26,78,0.9)', startTime: 1, endTime: 15, animation: 'slide-up' },
        { text: 'This Week Only!', x: 0.2, y: 0.55, fontSize: 32, fontFamily: 'Inter', color: '#FFFFFF', startTime: 3, endTime: 15, animation: 'fade-in' },
      ],
      suggestedDuration: 15,
      defaultFilter: 'vivid',
      adMode: true,
      defaultCTA: { text: 'Book Today', color: '#D4A534', link: '', position: 'bottom-center' },
      defaultContactBar: { phone: '', website: '', show: true },
    },
  },
  {
    id: 'testimonial-ad',
    name: 'Testimonial Ad',
    category: 'ad',
    description: 'Customer review with call-to-action',
    color: '#7B2D8E',
    config: {
      clipSlots: [
        { label: 'Customer / job footage', suggestedDuration: 12, required: true },
      ],
      textOverlays: [
        { text: '"Best plumber in town!"', x: 0.08, y: 0.25, fontSize: 44, fontFamily: 'Georgia', color: '#FFFFFF', backgroundColor: 'rgba(26,26,78,0.85)', startTime: 0, endTime: 12, animation: 'fade-in' },
        { text: '⭐⭐⭐⭐⭐', x: 0.3, y: 0.45, fontSize: 36, fontFamily: 'Inter', color: '#D4A534', startTime: 1, endTime: 12, animation: 'scale-in' },
        { text: '- Happy Customer', x: 0.3, y: 0.55, fontSize: 24, fontFamily: 'Inter', color: '#FFFFFF', startTime: 2, endTime: 12, animation: 'fade-in' },
      ],
      suggestedDuration: 15,
      defaultFilter: 'warm',
      adMode: true,
      defaultCTA: { text: 'Get a Free Quote', color: '#D4A534', link: '', position: 'bottom-center' },
      defaultContactBar: { phone: '', website: '', show: true },
    },
  },
  {
    id: 'brand-awareness-ad',
    name: 'Brand Awareness Ad',
    category: 'ad',
    description: 'Logo, services, and contact info showcase',
    color: '#1A1A4E',
    config: {
      clipSlots: [
        { label: 'Team / work footage', suggestedDuration: 15, required: true },
      ],
      textOverlays: [
        { text: 'RU-BRIC PLUMBING', x: 0.1, y: 0.15, fontSize: 52, fontFamily: 'Impact', color: '#D4A534', startTime: 0, endTime: 15, animation: 'fade-in' },
        { text: 'Drain Cleaning • Repairs • Installs', x: 0.05, y: 0.5, fontSize: 28, fontFamily: 'Inter', color: '#FFFFFF', backgroundColor: 'rgba(26,26,78,0.8)', startTime: 2, endTime: 15, animation: 'slide-up' },
        { text: 'Licensed • Insured • Trusted', x: 0.1, y: 0.6, fontSize: 24, fontFamily: 'Inter', color: '#7B2D8E', startTime: 4, endTime: 15, animation: 'fade-in' },
      ],
      suggestedDuration: 15,
      defaultFilter: null,
      adMode: true,
      defaultCTA: { text: 'Contact Us', color: '#D4A534', link: '', position: 'bottom-center' },
      defaultContactBar: { phone: '', website: '', show: true },
    },
  },
];

export default function TemplatesPage() {
  const [tab, setTab] = useState<'organic' | 'ad'>('organic');
  const navigate = useNavigate();

  const handleSelect = async (template: TemplateItem) => {
    try {
      const { data } = await api.post('/projects', {
        title: template.name,
        editState: JSON.stringify({
          mediaFiles: [],
          clips: [],
          textOverlays: template.config.textOverlays.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
          })),
          branding: { showLogo: true, logoPosition: 'bottom-right', showWatermark: false },
          music: null,
          filter: template.config.defaultFilter,
          adMode: template.config.adMode,
          cta: template.config.defaultCTA,
          contactBar: template.config.defaultContactBar,
        }),
      });
      navigate(`/upload?project=${data.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const filtered = TEMPLATES.filter((t) => t.category === tab);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-4">Templates</h1>

      <div className="flex bg-white/5 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('organic')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            tab === 'organic' ? 'bg-brand-gold text-brand-navy' : 'text-white/60'
          }`}
        >
          <Clapperboard size={16} />
          Reels & Shorts
        </button>
        <button
          onClick={() => setTab('ad')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            tab === 'ad' ? 'bg-brand-purple text-white' : 'text-white/60'
          }`}
        >
          <Megaphone size={16} />
          Ads
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className="card w-full text-left hover:border-brand-gold/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: template.color + '30' }}
              >
                {template.category === 'ad' ? (
                  <Megaphone size={22} style={{ color: template.color }} />
                ) : (
                  <Play size={22} style={{ color: template.color }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{template.name}</p>
                <p className="text-sm text-white/50 mt-0.5">{template.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                    {template.config.clipSlots.length} clip{template.config.clipSlots.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                    ~{template.config.suggestedDuration}s
                  </span>
                  {template.config.adMode && (
                    <span className="text-[10px] bg-brand-purple/30 text-brand-purple-light px-2 py-0.5 rounded-full">
                      Ad
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
