import { create } from 'zustand';
import type { EditState, Clip, TextOverlay, MediaFileRef, CTAConfig, ContactBarConfig } from '../types';

const defaultEditState: EditState = {
  mediaFiles: [],
  clips: [],
  textOverlays: [],
  branding: {
    showLogo: true,
    logoPosition: 'bottom-right',
    showWatermark: false,
  },
  music: null,
  filter: null,
  adMode: false,
  cta: null,
  contactBar: null,
};

interface ProjectStore {
  projectId: string | null;
  title: string;
  editState: EditState;
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  isDirty: boolean;

  setProject: (id: string, title: string, editState: EditState) => void;
  resetProject: () => void;

  addMediaFile: (file: MediaFileRef) => void;
  removeMediaFile: (id: string) => void;

  addClip: (clip: Clip) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  reorderClips: (clips: Clip[]) => void;

  addTextOverlay: (overlay: TextOverlay) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;

  setBranding: (branding: Partial<EditState['branding']>) => void;
  setMusic: (music: EditState['music']) => void;
  setFilter: (filter: string | null) => void;

  setAdMode: (enabled: boolean) => void;
  setCTA: (cta: CTAConfig | null) => void;
  setContactBar: (bar: ContactBarConfig | null) => void;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedClipId: (id: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectId: null,
  title: '',
  editState: { ...defaultEditState },
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  isDirty: false,

  setProject: (id, title, editState) =>
    set({ projectId: id, title, editState, isDirty: false }),

  resetProject: () =>
    set({
      projectId: null,
      title: '',
      editState: { ...defaultEditState },
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      isDirty: false,
    }),

  addMediaFile: (file) =>
    set((s) => ({
      editState: { ...s.editState, mediaFiles: [...s.editState.mediaFiles, file] },
      isDirty: true,
    })),

  removeMediaFile: (id) =>
    set((s) => ({
      editState: {
        ...s.editState,
        mediaFiles: s.editState.mediaFiles.filter((f) => f.id !== id),
        clips: s.editState.clips.filter((c) => c.mediaFileId !== id),
      },
      isDirty: true,
    })),

  addClip: (clip) =>
    set((s) => ({
      editState: { ...s.editState, clips: [...s.editState.clips, clip] },
      isDirty: true,
    })),

  updateClip: (id, updates) =>
    set((s) => ({
      editState: {
        ...s.editState,
        clips: s.editState.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      },
      isDirty: true,
    })),

  removeClip: (id) =>
    set((s) => ({
      editState: {
        ...s.editState,
        clips: s.editState.clips.filter((c) => c.id !== id),
      },
      isDirty: true,
    })),

  reorderClips: (clips) =>
    set((s) => ({
      editState: { ...s.editState, clips },
      isDirty: true,
    })),

  addTextOverlay: (overlay) =>
    set((s) => ({
      editState: { ...s.editState, textOverlays: [...s.editState.textOverlays, overlay] },
      isDirty: true,
    })),

  updateTextOverlay: (id, updates) =>
    set((s) => ({
      editState: {
        ...s.editState,
        textOverlays: s.editState.textOverlays.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
      isDirty: true,
    })),

  removeTextOverlay: (id) =>
    set((s) => ({
      editState: {
        ...s.editState,
        textOverlays: s.editState.textOverlays.filter((t) => t.id !== id),
      },
      isDirty: true,
    })),

  setBranding: (branding) =>
    set((s) => ({
      editState: { ...s.editState, branding: { ...s.editState.branding, ...branding } },
      isDirty: true,
    })),

  setMusic: (music) =>
    set((s) => ({ editState: { ...s.editState, music }, isDirty: true })),

  setFilter: (filter) =>
    set((s) => ({ editState: { ...s.editState, filter }, isDirty: true })),

  setAdMode: (enabled) =>
    set((s) => ({ editState: { ...s.editState, adMode: enabled }, isDirty: true })),

  setCTA: (cta) =>
    set((s) => ({ editState: { ...s.editState, cta }, isDirty: true })),

  setContactBar: (bar) =>
    set((s) => ({ editState: { ...s.editState, contactBar: bar }, isDirty: true })),

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
}));
