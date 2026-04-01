// ==========================================
// Ru-Bric Plumbing Video Creator — Shared Types
// ==========================================

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'member';
  createdAt: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  status: 'draft' | 'rendering' | 'done';
  editState: EditState;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EditState {
  mediaFiles: MediaFileRef[];
  clips: Clip[];
  textOverlays: TextOverlay[];
  branding: BrandingConfig;
  music: MusicConfig | null;
  filter: string | null;
  adMode: boolean;
  cta: CTAConfig | null;
  contactBar: ContactBarConfig | null;
}

export interface MediaFileRef {
  id: string;
  type: 'video' | 'image';
  url: string;
  duration: number;
  thumbnail: string;
}

export interface Clip {
  id: string;
  mediaFileId: string;
  startTime: number;
  endTime: number;
  order: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  startTime: number;
  endTime: number;
  animation: 'none' | 'fade-in' | 'slide-up' | 'scale-in';
}

export interface BrandingConfig {
  showLogo: boolean;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showWatermark: boolean;
}

export interface MusicConfig {
  trackId: string;
  volume: number;
}

export interface CTAConfig {
  text: string;
  color: string;
  link: string;
  position: 'bottom-center' | 'bottom-right';
}

export interface ContactBarConfig {
  phone: string;
  website: string;
  show: boolean;
}

export interface MediaFile {
  id: string;
  projectId: string;
  type: 'video' | 'image';
  filePath: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: number;
}

export interface RenderJob {
  id: string;
  projectId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress: number;
  formats: string[];
  outputs: Record<string, string>;
  error: string | null;
  createdAt: number;
}

export interface Template {
  id: string;
  name: string;
  category: 'organic' | 'ad';
  description: string;
  config: TemplateConfig;
  thumbnail: string;
  sortOrder: number;
}

export interface TemplateConfig {
  clipSlots: TemplateClipSlot[];
  textOverlays: Omit<TextOverlay, 'id'>[];
  suggestedDuration: number;
  defaultFilter: string | null;
  adMode: boolean;
  defaultCTA: CTAConfig | null;
  defaultContactBar: ContactBarConfig | null;
}

export interface TemplateClipSlot {
  label: string;
  suggestedDuration: number;
  required: boolean;
}

export interface Settings {
  companyName: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
