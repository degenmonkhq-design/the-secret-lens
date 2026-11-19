export type Language = 'en' | 'hi';

export type AppMode = 'home' | 'pin' | 'scan';

export type VisibilityMode = 'public' | 'private';

export type MediaKind = 'image' | 'video' | null;

export interface Reactions {
  heart: number;
  blessing: number;
  mindblown: number;
}

export interface StoryReply {
  id: string;
  author: string;
  rankBadge: string;
  text: string;
  audioData?: string | null;
  audioIdbKey?: string | null;
  createdAt: number;
}

export interface VisualTargetSignature {
  thumbnailDataUrl?: string;
  ghostOutlineDataUrl?: string;
  gridRgb: number[];
  colorHist: number[];
}

export interface ARStory {
  id: string;
  isDemo: boolean;
  demoOffsetLat?: number;
  demoOffsetLng?: number;
  author: string;
  rankBadge: string;
  category: string;
  headline: string;
  story: string;
  visibility: VisibilityMode;
  pin: string;
  unlockAt: number | null;
  mediaType: MediaKind;
  mediaData: string | null;
  mediaIdbKey?: string | null;
  drawingData?: string | null;
  audioData: string | null;
  audioIdbKey?: string | null;
  azimuth: number;
  compassHeading: number;
  hasTrueCompass?: boolean;
  elevation: number;
  rollGamma?: number;
  distanceMeters: number;
  lat: number;
  lng: number;
  views: number;
  reactions: Reactions;
  createdAt: number;
  expiresAt?: number;
  hasGoldenAura?: boolean;
  isVip?: boolean;
  vipTxHash?: string;
  isGiftBox?: boolean;
  isAnonymous?: boolean;
  isWish?: boolean;
  replies?: StoryReply[];
  visualTarget?: VisualTargetSignature | null;
}

export interface ConfirmPromptState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  requirePin?: string;
  onConfirm: () => void | Promise<void>;
}

export interface ProximityRadarInfo {
  storyId: string;
  distanceMeters: number;
  directionArrow: '⬅️ Turn Left' | '➡️ Turn Right' | '⬆️ Facing Spot';
  directionShort: 'Left' | 'Right' | 'Ahead';
  category: string;
  relYaw: number;
  inPortalRange: boolean;
  heatLevel: number; // 0 to 1 intensity boost as user gets closer
  wallAlignmentPct: number; // 0 to 100 Akhand Triple-Lock Alignment
  targetLocked: boolean;
}
