import { ARStory } from '../types/story';

export const STORAGE_KEY = 'tsl_stories_v2';
export const INVITE_KEY = 'tsl_invites_v1';
export const RECORD_KEY = 'tsl_world_record_v1';
export const REPORTED_KEY = 'tsl_reported_v1';
export const LANG_KEY = 'tsl_lang';
export const HUNDRED_YEARS_MS = Math.round(100 * 365.25 * 24 * 3600 * 1000);

const DB_NAME = 'tsl_media_db';
const DB_STORE = 'blobs';

export const DEFAULT_LAT = 25.3176;
export const DEFAULT_LNG = 82.9739;

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaBlob(key: string, dataUrl: string): Promise<boolean> {
  try {
    const db = await openMediaDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(dataUrl, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    return false;
  }
}

export async function loadMediaBlob(key: string): Promise<string | null> {
  try {
    const db = await openMediaDB();
    return await new Promise((res) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => res((req.result as string) || null);
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

export async function deleteMediaBlob(key: string): Promise<void> {
  try {
    const db = await openMediaDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
  } catch {
    // ignore cleanup failure
  }
}

export function compressImageFile(file: File, maxW = 720, quality = 0.68): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}

function makeCosmicArtwork(title: string, c1: string, c2: string, emoji: string): string {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 300;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  const g = ctx.createLinearGradient(0, 0, 480, 300);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 300);

  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = `rgba(255, 240, 175, ${Math.random() * 0.8 + 0.15})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 480, Math.random() * 300, Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(245, 197, 66, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(240, 140, 82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, 240, 160);

  ctx.fillStyle = '#fff4b8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(title, 240, 265);
  return c.toDataURL('image/jpeg', 0.78);
}

function makeSampleNeonDrawing(): string {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 220;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 360, 220);
  ctx.strokeStyle = '#fff0a8';
  ctx.shadowColor = '#f5c542';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Glowing golden infinity / heart-star air signature
  ctx.beginPath();
  ctx.moveTo(70, 120);
  ctx.bezierCurveTo(70, 62, 160, 62, 180, 112);
  ctx.bezierCurveTo(200, 162, 290, 162, 290, 106);
  ctx.bezierCurveTo(290, 52, 200, 52, 180, 112);
  ctx.bezierCurveTo(160, 168, 70, 168, 70, 120);
  ctx.stroke();

  // Golden star spark
  ctx.strokeStyle = '#38e8ff';
  ctx.shadowColor = '#38e8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(180, 24);
  ctx.lineTo(180, 56);
  ctx.moveTo(164, 40);
  ctx.lineTo(196, 40);
  ctx.stroke();

  return c.toDataURL('image/png');
}

function createCosmicChimeWav(): string {
  const sampleRate = 16000;
  const secs = 3.8;
  const numSamples = Math.floor(sampleRate * secs);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 1.1);
    const fadeIn = 0.5 - 0.5 * Math.cos(attack * Math.PI);
    const fadeOut = Math.exp(-Math.max(0, t - 0.8) * 1.15);
    const env = fadeIn * fadeOut;
    const sig =
      (Math.sin(2 * Math.PI * 130.81 * t) * 0.34 +
        Math.sin(2 * Math.PI * 196.0 * t) * 0.22 +
        Math.sin(2 * Math.PI * 246.94 * t) * 0.14 +
        Math.sin(2 * Math.PI * 293.66 * t) * 0.1) *
      env;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sig)) * 12000, true);
  }
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export function buildDefaultDemos(baseLat = DEFAULT_LAT, baseLng = DEFAULT_LNG): ARStory[] {
  const now = Date.now();
  const off1Lat = 0;
  const off1Lng = 0;
  const off2Lat = 0.000012;
  const off2Lng = -0.000012;
  const off3Lat = 0.000054; // ~6 meters away -> outside 3m sonar ring!
  const off3Lng = 0.000022;

  return [
    {
      id: 'demo_public_1',
      isDemo: true,
      demoOffsetLat: off1Lat,
      demoOffsetLng: off1Lng,
      author: 'Aanya · Varanasi',
      rankBadge: '👑 World Record Legend',
      category: 'Wisdom & Poetry',
      headline: 'दुनिया की बोलती हुई किताब · Echoes of Light',
      story:
        'जब हवा में अक्षर तैरते हैं, तो हर गली एक जीवित संग्रहालय बन जाती है।\n\nWelcome to THE SECRET LENS! You are standing inside this 3-meter portal. Look around through your camera—this golden hologram and neon air-drawing float right where they were pinned. Step 4 paces away and watch the portal vanish into pure sonar energy.',
      visibility: 'public',
      pin: '',
      unlockAt: null,
      mediaType: 'image',
      mediaData: makeCosmicArtwork('ECHOES OF LIGHT', '#0a1c47', '#3b1d0a', '🪔'),
      drawingData: makeSampleNeonDrawing(),
      audioData: createCosmicChimeWav(),
      azimuth: 0,
      compassHeading: 0,
      elevation: 4,
      distanceMeters: 0,
      lat: baseLat + off1Lat,
      lng: baseLng + off1Lng,
      views: 4281,
      reactions: { heart: 912, blessing: 640, mindblown: 318 },
      createdAt: now - 3600000,
      expiresAt: now + HUNDRED_YEARS_MS,
      isVip: true,
      hasGoldenAura: true,
    },
    {
      id: 'demo_private_2',
      isDemo: true,
      demoOffsetLat: off2Lat,
      demoOffsetLng: off2Lng,
      author: 'Kabir · Mystery Vault',
      rankBadge: '🔥 Viral Hunter',
      category: 'Secret Confession',
      headline: 'गोपनीय संदेश · Midnight Vault (PIN: 1234)',
      story:
        'You unlocked the secret vault!\n\nSometimes the most powerful words are meant only for the one soul who holds the key. Even across oceans and years, this invisible ink glows only when the right 4-digit code is spoken.',
      visibility: 'private',
      pin: '1234',
      unlockAt: null,
      mediaType: 'image',
      mediaData: makeCosmicArtwork('MIDNIGHT VAULT', '#140b2e', '#071836', '🗝️'),
      drawingData: null,
      audioData: null,
      azimuth: -34,
      compassHeading: 326,
      elevation: -6,
      distanceMeters: 2,
      lat: baseLat + off2Lat,
      lng: baseLng + off2Lng,
      views: 1840,
      reactions: { heart: 405, blessing: 211, mindblown: 190 },
      createdAt: now - 7200000,
    },
    {
      id: 'demo_capsule_3',
      isDemo: true,
      demoOffsetLat: off3Lat,
      demoOffsetLng: off3Lng,
      author: 'Humanity Archive',
      rankBadge: '🌱 Explorer',
      category: 'Time Capsule',
      headline: 'भविष्य के नाम पैगाम · Time-Capsule 2026',
      story:
        'Hello from the past! If you are reading this, you stepped within 3 meters AND the cosmic clock reached zero.',
      visibility: 'public',
      pin: '',
      unlockAt: now + 3 * 24 * 3600 * 1000 - 15000,
      mediaType: 'image',
      mediaData: makeCosmicArtwork('TIME CAPSULE', '#062134', '#1b1444', '⏳'),
      drawingData: null,
      audioData: null,
      azimuth: 36,
      compassHeading: 36,
      elevation: 8,
      distanceMeters: 6,
      lat: baseLat + off3Lat,
      lng: baseLng + off3Lng,
      views: 920,
      reactions: { heart: 188, blessing: 312, mindblown: 145 },
      createdAt: now - 5400000,
    },
  ];
}

export function reanchorDemosToFirstFix(
  stories: ARStory[],
  realLat: number,
  realLng: number
): ARStory[] {
  return stories.map((s) => {
    if (!s.isDemo || s.demoOffsetLat === undefined || s.demoOffsetLng === undefined) return s;
    const lat = realLat + s.demoOffsetLat;
    const lng = realLng + s.demoOffsetLng;
    return {
      ...s,
      lat,
      lng,
      distanceMeters: calculateDistanceMeters(realLat, realLng, lat, lng),
    };
  });
}

export function loadStories(): ARStory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demos = buildDefaultDemos();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
      return demos;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : buildDefaultDemos();
  } catch {
    return buildDefaultDemos();
  }
}

export function persistStories(stories: ARStory[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    return true;
  } catch {
    return false;
  }
}

export function getInvitesCount(): number {
  return parseInt(localStorage.getItem(INVITE_KEY) || '0', 10);
}

export function getWorldRecordCount(): number {
  return parseInt(localStorage.getItem(RECORD_KEY) || '1482910', 10);
}

export async function exportAllStoriesBackup(stories: ARStory[]): Promise<string> {
  const hydrated: ARStory[] = [];
  for (const s of stories) {
    let mediaData = s.mediaData;
    if (!mediaData && s.mediaIdbKey) {
      mediaData = await loadMediaBlob(s.mediaIdbKey);
    }
    let audioData = s.audioData;
    if (!audioData && s.audioIdbKey) {
      audioData = await loadMediaBlob(s.audioIdbKey);
    }
    const replies = s.replies
      ? await Promise.all(
          s.replies.map(async (r) => {
            let rAudio = r.audioData || null;
            if (!rAudio && r.audioIdbKey) {
              rAudio = await loadMediaBlob(r.audioIdbKey);
            }
            return { ...r, audioData: rAudio };
          })
        )
      : [];
    hydrated.push({
      ...s,
      mediaData,
      audioData,
      replies,
    });
  }

  return JSON.stringify(
    {
      app: 'THE SECRET LENS',
      version: 3,
      retention: '100 Years Forever',
      exportedAt: new Date().toISOString(),
      stories: hydrated,
    },
    null,
    2
  );
}

export async function importStoriesBackup(
  jsonText: string,
  currentStories: ARStory[]
): Promise<{ stories: ARStory[]; added: number; updated: number }> {
  const parsed = JSON.parse(jsonText) as { stories?: unknown } | ARStory[];
  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.stories)
      ? (parsed.stories as ARStory[])
      : null;

  if (!rawList) {
    throw new Error('Invalid THE SECRET LENS backup JSON format.');
  }

  const normalizedIncoming: ARStory[] = [];
  for (const item of rawList) {
    if (!item || typeof item.id !== 'string' || typeof item.lat !== 'number' || typeof item.lng !== 'number') {
      continue;
    }

    let mediaData = item.mediaData ?? null;
    let mediaIdbKey = item.mediaIdbKey ?? null;
    if (mediaData && mediaData.length > 220000) {
      const key = mediaIdbKey || `m_${item.id}`;
      const ok = await saveMediaBlob(key, mediaData);
      if (ok) {
        mediaIdbKey = key;
        mediaData = null;
      }
    }

    let audioData = item.audioData ?? null;
    let audioIdbKey = item.audioIdbKey ?? null;
    if (audioData && audioData.length > 180000) {
      const key = audioIdbKey || `a_${item.id}`;
      const ok = await saveMediaBlob(key, audioData);
      if (ok) {
        audioIdbKey = key;
        audioData = null;
      }
    }

    const replies = Array.isArray(item.replies)
      ? await Promise.all(
          item.replies.map(async (r) => {
            let rAudio = r.audioData ?? null;
            let rKey = r.audioIdbKey ?? null;
            if (rAudio && rAudio.length > 180000) {
              const k = rKey || `ra_${r.id}`;
              const ok = await saveMediaBlob(k, rAudio);
              if (ok) {
                rKey = k;
                rAudio = null;
              }
            }
            return { ...r, audioData: rAudio, audioIdbKey: rKey };
          })
        )
      : [];

    normalizedIncoming.push({
      ...item,
      mediaData,
      mediaIdbKey,
      audioData,
      audioIdbKey,
      replies,
    });
  }

  const byId = new Map<string, ARStory>();
  for (const existing of currentStories) {
    byId.set(existing.id, existing);
  }

  let added = 0;
  let updated = 0;
  for (const inc of normalizedIncoming) {
    if (byId.has(inc.id)) {
      updated += 1;
    } else {
      added += 1;
    }
    byId.set(inc.id, inc);
  }

  const merged = Array.from(byId.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  persistStories(merged);
  return { stories: merged, added, updated };
}

