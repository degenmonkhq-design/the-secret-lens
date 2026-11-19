import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { ARRecorderControls, ARViewport } from './components/ARViewport';
import { BottomHud } from './components/BottomHud';
import { BRAND_LOGO_SVG_STRING } from './components/BrandLogo';
import { CreationStudioModal } from './components/CreationStudioModal';
import { ReaderModal } from './components/ReaderModal';
import { RecordMessageFilter, RecordOptionsModal } from './components/RecordOptionsModal';
import { RecordedVideoModal } from './components/RecordedVideoModal';
import { ReferralHubModal } from './components/ReferralHubModal';
import { ScanIntroOverlay } from './components/ScanIntroOverlay';
import { SecretWishModal } from './components/SecretWishModal';
import { TopHud } from './components/TopHud';
import { BackupVaultModal, ConfirmDialog, InstallGuideModal, ShareAppModal } from './components/UtilityModals';
import { VipUpgradeModal } from './components/VipUpgradeModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  AppMode,
  ARStory,
  ConfirmPromptState,
  Language,
  ProximityRadarInfo,
  Reactions,
  StoryReply,
  VisualTargetSignature,
} from './types/story';
import { I18N } from './utils/i18n';
import {
  DEFAULT_LAT,
  DEFAULT_LNG,
  INVITE_KEY,
  LANG_KEY,
  RECORD_KEY,
  REPORTED_KEY,
  deleteMediaBlob,
  exportAllStoriesBackup,
  getInvitesCount,
  getWorldRecordCount,
  importStoriesBackup,
  loadMediaBlob,
  loadStories,
  persistStories,
  reanchorDemosToFirstFix,
} from './utils/mediaStorage';
import { getRankBadge } from './utils/safety';
import { attachSpiritEcho } from './utils/spiritAudio';
import { sufiTune } from './utils/sufiTune';
import { triggerGentleHaptic } from './utils/haptics';
import { getOrInitDailyStreak, recordDailyExplorerAction } from './utils/streakStorage';
import { VipLicenseState, loadVipLicense } from './utils/vipPayment';

export const OWNER_METAMASK_ADDRESS = '0x7e180a6353fE135eE30785EB57F4b7791ABf3eB7';
const TUNE_PREF_KEY = 'tsl_tune_enabled_v1';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'hi' ? 'hi' : 'en';
  });

  const [stories, setStories] = useState<ARStory[]>(() => loadStories());
  const [reportedIds, setReportedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(REPORTED_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [worldRecordCount, setWorldRecordCount] = useState<number>(() => getWorldRecordCount());
  const [invites, setInvites] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const cur = getInvitesCount();
    if (params.get('ref') && cur === 0) {
      localStorage.setItem(INVITE_KEY, '1');
      return 1;
    }
    return cur;
  });

  const [tuneEnabled, setTuneEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(TUNE_PREF_KEY);
    return saved !== 'false';
  });
  const hasUserInteractedRef = useRef(false);

  const [appMode, setAppMode] = useState<AppMode>('home');
  const [scanVisible, setScanVisible] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const userManuallyTurnedCamOffRef = useRef(false);
  const [showCameraRetryBtn, setShowCameraRetryBtn] = useState(false);

  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);
  const [gpsTick, setGpsTick] = useState(0);
  const [simulate10mAway, setSimulate10mAway] = useState(false);
  const hasRealGpsAnchoredRef = useRef(false);

  const [radarInfo, setRadarInfo] = useState<ProximityRadarInfo | null>(null);
  const [gyroLabel, setGyroLabel] = useState('3D Gyro + Compass Active');
  const [showGyroPermBtn, setShowGyroPermBtn] = useState(false);

  const viewYawRef = useRef(0);
  const viewPitchRef = useRef(0);
  const viewRollRef = useRef(0);
  const trueCompassRef = useRef<number | null>(null);
  const gyroRequestRef = useRef<(() => Promise<boolean>) | null>(null);
  const captureTargetRef = useRef<(() => VisualTargetSignature | null) | null>(null);
  const recorderRef = useRef<ARRecorderControls | null>(null);

  const [isRecordingAR, setIsRecordingAR] = useState(false);
  const [recordOptionsOpen, setRecordOptionsOpen] = useState(false);
  const [pendingRecordKind, setPendingRecordKind] = useState<'video' | 'reel'>('video');
  const [recordMessageFilter, setRecordMessageFilter] = useState<RecordMessageFilter>('all');
  const [recordCountdown, setRecordCountdown] = useState(15);
  const [recordedVideo, setRecordedVideo] = useState<{
    url: string;
    blob: Blob;
    mimeType: string;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAutoPlayedIdRef = useRef<string | null>(null);
  const lastVibeTickRef = useRef(0);
  const wasInPortalRef = useRef(false);

  const [cleanReelMode, setCleanReelMode] = useState(false);
  const [cleanCountdown, setCleanCountdown] = useState(15);
  const cleanTimerRef = useRef<number | null>(null);

  const [streakDays, setStreakDays] = useState<number>(() => getOrInitDailyStreak());
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [pendingTargetSnapshot, setPendingTargetSnapshot] =
    useState<VisualTargetSignature | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [readerStoryId, setReaderStoryId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const [referOpen, setReferOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [vipLicense, setVipLicense] = useState<VipLicenseState>(() => loadVipLicense());
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmPromptState | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const showToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3100);
  }, []);

  // Auto-start velvet-soft ambient rain & pad at 12% volume on first tap anywhere
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;
      sufiTune.setEnabled(tuneEnabled);
    };

    const handleButtonHaptic = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, [role="button"]')) {
        triggerGentleHaptic(10);
      }
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerdown', handleButtonHaptic, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleButtonHaptic);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [tuneEnabled]);

  useEffect(() => {
    return () => {
      sufiTune.stop();
    };
  }, []);

  useEffect(() => {
    document.title = 'THE SECRET LENS 🌍 | World Record AR';
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BRAND_LOGO_SVG_STRING)}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = dataUrl;
  }, []);

  useEffect(() => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch(() => {});
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraActive(false);
      setShowCameraRetryBtn(true);
      return false;
    }

    // Smoothly stop previous camera stream tracks before opening flipped lens
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facing } },
          audio: false,
        });
      } catch {
        // Graceful fallback for laptops / single-camera devices
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraFacing(facing);
      setCameraActive(true);
      setShowCameraRetryBtn(false);
      return true;
    } catch {
      setCameraActive(false);
      setShowCameraRetryBtn(true);
      return false;
    }
  }, []);

  const handleToggleCamera = useCallback(async () => {
    if (cameraActive) {
      userManuallyTurnedCamOffRef.current = true;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      setCameraStream(null);
      setCameraActive(false);
      setShowCameraRetryBtn(false);
      showToast('🚫 Cam: OFF — Deep Black-Blue Cosmos & 3m AR Active');
    } else {
      userManuallyTurnedCamOffRef.current = false;
      const ok = await startCamera(cameraFacing);
      if (ok) {
        showToast(
          cameraFacing === 'user'
            ? '📷 Cam: ON (Selfie AR Mode)'
            : '📷 Cam: ON (Rear World AR)'
        );
      } else {
        showToast('⚠️ Camera permission unavailable — Deep Space AR stays active!');
      }
    }
  }, [cameraActive, cameraFacing, startCamera, showToast]);

  const handleFlipCamera = useCallback(async () => {
    userManuallyTurnedCamOffRef.current = false;
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    const ok = await startCamera(nextFacing);
    if (ok) {
      showToast(
        nextFacing === 'user'
          ? '🤳 Front Selfie AR Mode Active (Mirror-Corrected)'
          : '📷 Rear World AR Camera Active'
      );
    } else {
      showToast('⚠️ Could not switch camera lens on this device.');
    }
  }, [cameraFacing, startCamera, showToast]);

  const handleSwitchMode = useCallback(
    (nextMode: AppMode) => {
      setAppMode(nextMode);
      if (nextMode === 'home') {
        ambientAudioRef.current?.pause();
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((track) => track.stop());
          cameraStreamRef.current = null;
        }
        setCameraStream(null);
        setCameraActive(false);
        setShowCameraRetryBtn(false);
        return;
      }

      if (!cameraActive && !userManuallyTurnedCamOffRef.current) {
        void startCamera(cameraFacing);
      }
    },
    [cameraActive, cameraFacing, startCamera]
  );

  const handleToggleSimulate10m = useCallback(() => {
    setSimulate10mAway((prev) => {
      const next = !prev;
      showToast(
        next
          ? '🧪 Simulating 10m Away — 3m Proximity Lock HID all messages!'
          : '🎯 Back inside real GPS zone — messages within 3m reveal!'
      );
      return next;
    });
  }, [showToast]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setScanVisible(false);
    }, 1400);

    const DevOrient = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (DevOrient && typeof DevOrient.requestPermission === 'function') {
      setShowGyroPermBtn(true);
    }

    return () => {
      window.clearTimeout(t);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const heartbeatId = window.setInterval(() => {
      setGpsTick((prev) => (prev + 1) % 1000000);
    }, 1000);

    if (!navigator.geolocation) {
      return () => window.clearInterval(heartbeatId);
    }

    const applyFix = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserLat(lat);
      setUserLng(lng);
      setGpsTick((prev) => (prev + 1) % 1000000);

      if (!hasRealGpsAnchoredRef.current) {
        hasRealGpsAnchoredRef.current = true;
        setStories((prev) => {
          const updated = reanchorDemosToFirstFix(prev, lat, lng);
          persistStories(updated);
          return updated;
        });
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      applyFix,
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 }
    );

    let polling = false;
    const pollId = window.setInterval(() => {
      if (polling) return;
      polling = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          polling = false;
          applyFix(pos);
        },
        () => {
          polling = false;
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 4500 }
      );
    }, 2500);

    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(pollId);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (appMode !== 'scan' || !radarInfo?.inPortalRange) {
      if (ambientAudioRef.current && !ambientAudioRef.current.paused) {
        ambientAudioRef.current.pause();
      }
    }

    if (
      appMode !== 'scan' ||
      !radarInfo ||
      typeof navigator === 'undefined' ||
      typeof navigator.vibrate !== 'function'
    ) {
      return;
    }

    const now = Date.now();
    if (radarInfo.inPortalRange) {
      if (!wasInPortalRef.current) {
        wasInPortalRef.current = true;
        navigator.vibrate([50, 60, 80, 60, 120]);
      }
      return;
    }

    wasInPortalRef.current = false;
    const dist = radarInfo.distanceMeters;
    if (dist > 15) return;

    const intervalMs = dist <= 8 ? 1150 : 2300;
    if (now - lastVibeTickRef.current >= intervalMs) {
      lastVibeTickRef.current = now;
      if (dist <= 8) {
        navigator.vibrate([85, 85, 95]);
      } else {
        navigator.vibrate([60, 120, 60]);
      }
    }
  }, [appMode, radarInfo]);

  useEffect(() => {
    ambientAudioRef.current = new Audio();
    return () => {
      ambientAudioRef.current?.pause();
    };
  }, []);

  const visibleStories = useMemo(
    () => stories.filter((s) => !reportedIds.includes(s.id)),
    [stories, reportedIds]
  );

  const activeReaderStory = useMemo(
    () => stories.find((s) => s.id === readerStoryId) || null,
    [stories, readerStoryId]
  );

  const handleToggleTune = () => {
    const next = !tuneEnabled;
    hasUserInteractedRef.current = true;
    setTuneEnabled(next);
    localStorage.setItem(TUNE_PREF_KEY, String(next));
    sufiTune.setEnabled(next);
    showToast(next ? '🔊 Tune: ON (15% Soulful Violin & Piano)' : '🔇 Tune: OFF');
  };

  const handleToggleLang = () => {
    const next: Language = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    showToast(next === 'hi' ? '🇮🇳 हिंदी भाषा सक्रिय' : '🌍 English Language Active');
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next && ambientAudioRef.current) {
      ambientAudioRef.current.pause();
    }
    showToast(next ? '🔇 Voice Whispers Muted' : '🔊 Spirit Echo Whisper Enabled');
  };

  const playCardWhisper = useCallback(
    async (card: ARStory, relYaw: number) => {
      if (isMuted || card.visibility === 'private' || card.isDemo) return;
      if (card.unlockAt && Date.now() < card.unlockAt) return;
      if (readerStoryId || createOpen) return;

      let src = card.audioData;
      if (!src && card.audioIdbKey) src = await loadMediaBlob(card.audioIdbKey);
      if (!src || !ambientAudioRef.current) return;

      if (lastAutoPlayedIdRef.current === card.id && !ambientAudioRef.current.paused) {
        attachSpiritEcho(ambientAudioRef.current, relYaw / 45);
        return;
      }
      lastAutoPlayedIdRef.current = card.id;
      ambientAudioRef.current.src = src;
      ambientAudioRef.current.volume = 0.65;
      attachSpiritEcho(ambientAudioRef.current, relYaw / 45);
      ambientAudioRef.current.play().catch(() => {});
    },
    [isMuted, readerStoryId, createOpen]
  );

  const bumpDailyStreak = useCallback(() => {
    const info = recordDailyExplorerAction();
    setStreakDays(info.count);
    if (info.justIncremented && info.unlockedGoldenAura) {
      showToast('👑 3-Day Streak Unlocked! Golden Aura Frame active on your cards!');
    }
  }, [showToast]);

  const handleSelectCard = (card: ARStory) => {
    ambientAudioRef.current?.pause();
    bumpDailyStreak();
    if (
      !(card.visibility === 'private' && !unlockedIds.has(card.id)) &&
      !(card.unlockAt && Date.now() < card.unlockAt)
    ) {
      setStories((prev) => {
        const updated = prev.map((s) =>
          s.id === card.id ? { ...s, views: (s.views || 0) + 1 } : s
        );
        persistStories(updated);
        return updated;
      });
    }
    setReaderStoryId(card.id);
  };

  const handleUnlockSuccess = (id: string) => {
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setStories((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, views: (s.views || 0) + 1 } : s));
      persistStories(updated);
      return updated;
    });
  };

  const handleReact = (id: string, type: keyof Reactions) => {
    setStories((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const reactions = s.reactions || { heart: 0, blessing: 0, mindblown: 0 };
        return {
          ...s,
          reactions: { ...reactions, [type]: (reactions[type] || 0) + 1 },
        };
      });
      persistStories(updated);
      return updated;
    });
  };

  const handleAddReply = (storyId: string, reply: StoryReply) => {
    bumpDailyStreak();
    setStories((prev) => {
      const updated = prev.map((s) =>
        s.id === storyId ? { ...s, replies: [...(s.replies || []), reply] } : s
      );
      persistStories(updated);
      return updated;
    });
    setWorldRecordCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(RECORD_KEY, String(next));
      return next;
    });
    showToast('💬 Reply Secret attached to this 3m portal!');
  };

  const handleReportCard = (card: ARStory) => {
    setConfirmState({
      title: '🚩 Report AR Story',
      message: 'Report this AR story for abuse or spam and hide it from your sky?',
      confirmLabel: 'Report & Hide',
      danger: true,
      onConfirm: () => {
        setReportedIds((prev) => {
          const next = prev.includes(card.id) ? prev : [...prev, card.id];
          localStorage.setItem(REPORTED_KEY, JSON.stringify(next));
          return next;
        });
        if (readerStoryId === card.id) setReaderStoryId(null);
        showToast('🚩 Story reported & hidden from your view.');
      },
    });
  };

  const handleRequestDelete = (card: ARStory) => {
    const needsPin = card.visibility === 'private' && !unlockedIds.has(card.id);
    setConfirmState({
      title: '🗑️ Delete Message',
      message: needsPin
        ? 'Enter the 4-digit PIN to permanently delete this Private hologram.'
        : 'Delete this AR message permanently from the sky?',
      confirmLabel: 'Delete',
      danger: true,
      requirePin: needsPin ? card.pin : undefined,
      onConfirm: async () => {
        if (card.mediaIdbKey) await deleteMediaBlob(card.mediaIdbKey);
        if (card.audioIdbKey) await deleteMediaBlob(card.audioIdbKey);
        for (const r of card.replies || []) {
          if (r.audioIdbKey) await deleteMediaBlob(r.audioIdbKey);
        }
        setStories((prev) => {
          const updated = prev.filter((s) => s.id !== card.id);
          persistStories(updated);
          return updated;
        });
        setReaderStoryId(null);
        showToast('🗑️ Message deleted from AR sky.');
      },
    });
  };

  const handleClearMyNotes = () => {
    const userNotes = stories.filter((s) => !s.isDemo);
    if (userNotes.length === 0) {
      showToast('ℹ️ No personal notes to clear (Demo sky is active).');
      return;
    }
    setConfirmState({
      title: '🧹 Clear My Notes',
      message: `Delete all ${userNotes.length} of your created AR messages? Pre-loaded demo stories remain safe.`,
      confirmLabel: 'Clear All',
      danger: true,
      onConfirm: async () => {
        for (const s of userNotes) {
          if (s.mediaIdbKey) await deleteMediaBlob(s.mediaIdbKey);
          if (s.audioIdbKey) await deleteMediaBlob(s.audioIdbKey);
          for (const r of s.replies || []) {
            if (r.audioIdbKey) await deleteMediaBlob(r.audioIdbKey);
          }
        }
        setStories((prev) => {
          const updated = prev.filter((s) => s.isDemo);
          persistStories(updated);
          return updated;
        });
        showToast('🧹 All your personal notes cleared!');
      },
    });
  };

  const handleCreatedStory = (newCard: ARStory) => {
    bumpDailyStreak();
    setStories((prev) => {
      const updated = [newCard, ...prev];
      const ok = persistStories(updated);
      if (!ok) {
        showToast('⚠️ Storage nearly full! Consider clearing old notes.');
      }
      return updated;
    });
    setWorldRecordCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(RECORD_KEY, String(next));
      return next;
    });
    setCreateOpen(false);
    showToast(
      newCard.isVip
        ? '👑 VIP Royal Eternal Memory Pinned for 100 Years! Named Star added to Cosmic Sky!'
        : '🧱 Pinned for 100 Years Forever to this wall & 3m GPS! Tap "Scan & Reveal" to view.'
    );
  };

  const handleCatchShootingStar = useCallback(() => {
    setPendingTargetSnapshot(captureTargetRef.current?.() || null);
    setWishModalOpen(true);
    showToast('🌠 Shooting Star Caught! Make a Secret Wish!');
  }, [showToast]);

  const handleOpenCreateModal = () => {
    setPendingTargetSnapshot(captureTargetRef.current?.() || null);
    setCreateOpen(true);
  };

  const handlePinSecretWish = (wishCard: ARStory) => {
    bumpDailyStreak();
    setStories((prev) => {
      const updated = [wishCard, ...prev];
      persistStories(updated);
      return updated;
    });
    setWorldRecordCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(RECORD_KEY, String(next));
      return next;
    });
    showToast('🌠 Secret Wish released into this 3m portal!');
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'THE SECRET LENS 🌍 | World Record AR',
      text: 'Experience THE SECRET LENS (दुनिया की बोलती हुई किताब) — 100% Free Cinema-Grade 3D AR App!',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fallback
      }
    }
    setShareOpen(true);
  };

  const handleInstallApp = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) showToast('📲 THE SECRET LENS Installed!');
    } else {
      setInstallOpen(true);
    }
  };

  const handleExportBackupJson = async () => {
    try {
      const jsonStr = await exportAllStoriesBackup(stories);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `the-secret-lens-100yr-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('💾 100-Year Eternal JSON Memory Backup Downloaded!');
    } catch {
      showToast('⚠️ Could not export backup file.');
    }
  };

  const handleImportBackupJson = async (jsonText: string) => {
    try {
      const res = await importStoriesBackup(jsonText, stories);
      setStories(res.stories);
      showToast(`✅ Restored ${res.added} new + ${res.updated} existing AR memories!`);
    } catch {
      showToast('❌ Invalid backup JSON file.');
    }
  };

  const handleChallengeFriend = () => {
    const nextInvites = invites + 1;
    setInvites(nextInvites);
    localStorage.setItem(INVITE_KEY, String(nextInvites));
    const newRank = getRankBadge(nextInvites);
    setStories((prev) => {
      const updated = prev.map((s) => (s.isDemo ? s : { ...s, rankBadge: newRank }));
      persistStories(updated);
      return updated;
    });
    showToast(`🎉 Invite tracked! Current Rank: ${newRank}`);
  };

  const handleCopyInviteLink = async () => {
    const refUrl = `${window.location.href.split('?')[0]}?ref=pioneer`;
    try {
      await navigator.clipboard.writeText(refUrl);
      showToast('🔗 Invite link copied!');
    } catch {
      showToast('🔗 Share link ready in browser bar.');
    }
  };

  const handleStartCleanReel = () => {
    if (isRecordingAR) return;
    setPendingRecordKind('reel');
    setRecordOptionsOpen(true);
  };

  const handleExitCleanReel = () => {
    if (cleanTimerRef.current) window.clearInterval(cleanTimerRef.current);
    setCleanReelMode(false);
    recorderRef.current?.stopRecording();
  };

  const handleOpenRecordChoice = () => {
    if (isRecordingAR) return;
    setPendingRecordKind('video');
    setRecordOptionsOpen(true);
  };

  const handleStartARRecordWithFilter = async (filter: RecordMessageFilter) => {
    setRecordMessageFilter(filter);
    setRecordOptionsOpen(false);
    setIsRecordingAR(true);
    setCleanReelMode(true);
    setRecordCountdown(15);
    setCleanCountdown(15);
    const started = await recorderRef.current?.startRecording(filter);
    if (started) {
      showToast(
        filter === 'mine'
          ? '🔴 Recording Your Messages + Deep Space Tunnel + Live Mic (15s)...'
          : '🔴 Recording All Messages + Deep Space Tunnel + Live Mic (15s)...'
      );
    } else {
      setIsRecordingAR(false);
      setCleanReelMode(false);
    }
  };

  const handleStopARRecord = () => {
    setCleanReelMode(false);
    recorderRef.current?.stopRecording();
  };

  const handleRecordComplete = useCallback((blob: Blob, mimeType: string) => {
    setIsRecordingAR(false);
    setCleanReelMode(false);
    const url = URL.createObjectURL(blob);
    setRecordedVideo({ url, blob, mimeType });
  }, []);

  const handleCloseRecordedModal = () => {
    if (recordedVideo?.url) {
      URL.revokeObjectURL(recordedVideo.url);
    }
    setRecordedVideo(null);
  };

  const handleRequestGyro = async () => {
    if (gyroRequestRef.current) {
      const granted = await gyroRequestRef.current();
      if (granted) {
        setShowGyroPermBtn(false);
        showToast('🧭 3D Gyroscope Activated!');
      } else {
        showToast('ℹ️ Using 3D Touch/Drag Parallax.');
      }
    }
  };

  const handleOrientationUpdate = useCallback(
    (
      yaw: number,
      pitch: number,
      roll: number,
      label: string,
      trueCompassHeading: number | null = null
    ) => {
      viewYawRef.current = yaw;
      viewPitchRef.current = pitch;
      viewRollRef.current = roll;
      if (trueCompassHeading !== null) {
        trueCompassRef.current = trueCompassHeading;
      }
      setGyroLabel(label);
    },
    []
  );

  const dict = I18N[lang];
  const effectiveUserLat = simulate10mAway ? userLat + 0.000095 : userLat;

  return (
    <main className="relative w-screen max-w-full h-[100dvh] overflow-hidden overflow-x-hidden box-border select-none">
      <ScanIntroOverlay
        visible={scanVisible}
        title={dict.scanTitle}
        subtitle={dict.scanSub}
      />

      <ARViewport
        lang={lang}
        appMode={appMode}
        stories={visibleStories}
        userLat={effectiveUserLat}
        userLng={userLng}
        gpsTick={gpsTick}
        cameraActive={cameraActive}
        cameraFacing={cameraFacing}
        cameraStream={cameraStream}
        cleanReelMode={cleanReelMode}
        isRecordingAR={isRecordingAR}
        recordMessageFilter={recordMessageFilter}
        streakDays={streakDays}
        onSelectCard={handleSelectCard}
        onReportCard={handleReportCard}
        onCenteredCard={playCardWhisper}
        onRadarUpdate={setRadarInfo}
        onOrientationUpdate={handleOrientationUpdate}
        onCatchShootingStar={handleCatchShootingStar}
        gyroRequestRef={gyroRequestRef}
        captureTargetRef={captureTargetRef}
        recorderRef={recorderRef}
        onRecordTick={setRecordCountdown}
        onRecordComplete={handleRecordComplete}
        onToast={showToast}
      />

      <TopHud
        lang={lang}
        appMode={appMode}
        cameraActive={cameraActive}
        cameraFacing={cameraFacing}
        isMuted={isMuted}
        tuneEnabled={tuneEnabled}
        worldRecordCount={worldRecordCount}
        streakDays={streakDays}
        isVipUnlocked={vipLicense.unlocked}
        isInstalled={isInstalled}
        cleanReelMode={cleanReelMode}
        isRecordingAR={isRecordingAR}
        onSwitchMode={handleSwitchMode}
        onOpenVipModal={() => setVipModalOpen(true)}
        onToggleCamera={() => void handleToggleCamera()}
        onFlipCamera={() => void handleFlipCamera()}
        onToggleLang={handleToggleLang}
        onToggleMute={handleToggleMute}
        onToggleTune={handleToggleTune}
        onOpenRefer={() => setReferOpen(true)}
        onOpenBackup={() => setBackupOpen(true)}
        onShareApp={handleShareApp}
        onInstallApp={handleInstallApp}
        onClearNotes={handleClearMyNotes}
      />

      <BottomHud
        lang={lang}
        appMode={appMode}
        stories={visibleStories}
        userLat={effectiveUserLat}
        userLng={userLng}
        radarInfo={radarInfo}
        gyroLabel={gyroLabel}
        showGyroPermBtn={showGyroPermBtn}
        showCameraRetryBtn={showCameraRetryBtn}
        simulate10mAway={simulate10mAway}
        cleanReelMode={cleanReelMode}
        cleanCountdown={cleanCountdown}
        isRecordingAR={isRecordingAR}
        recordCountdown={recordCountdown}
        isVipUnlocked={vipLicense.unlocked}
        onOpenVipModal={() => setVipModalOpen(true)}
        onSwitchMode={handleSwitchMode}
        onRequestGyro={handleRequestGyro}
        onRetryCamera={() => {
          userManuallyTurnedCamOffRef.current = false;
          void startCamera(cameraFacing);
        }}
        onToggleSimulate10m={handleToggleSimulate10m}
        onStartCleanReel={handleStartCleanReel}
        onExitCleanReel={handleExitCleanReel}
        onStartARRecord={handleOpenRecordChoice}
        onStopARRecord={handleStopARRecord}
        onOpenCreate={handleOpenCreateModal}
      />

      {!isOnline && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full bg-amber-500/90 px-3.5 py-1.5 text-xs font-bold text-[#140c00] shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Local AR Sky Active</span>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 pointer-events-none w-[min(92vw,420px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-2.5 rounded-2xl bg-[#070f24]/95 border border-[#f5c542] text-[#fff0a8] font-bold text-xs sm:text-sm text-center shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
          >
            {t.text}
          </div>
        ))}
      </div>

      <CreationStudioModal
        open={createOpen}
        lang={lang}
        viewYaw={viewYawRef.current}
        viewPitch={viewPitchRef.current}
        viewRoll={viewRollRef.current}
        trueCompassHeading={trueCompassRef.current}
        targetSnapshot={pendingTargetSnapshot}
        userLat={userLat}
        userLng={userLng}
        streakDays={streakDays}
        isVipUnlocked={vipLicense.unlocked}
        vipTxHash={vipLicense.txHash}
        onOpenVipModal={() => setVipModalOpen(true)}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreatedStory}
        onExportBackup={handleExportBackupJson}
        onToast={showToast}
      />

      <SecretWishModal
        open={wishModalOpen}
        lang={lang}
        viewYaw={viewYawRef.current}
        viewPitch={viewPitchRef.current}
        viewRoll={viewRollRef.current}
        trueCompassHeading={trueCompassRef.current}
        targetSnapshot={pendingTargetSnapshot}
        userLat={userLat}
        userLng={userLng}
        streakDays={streakDays}
        onClose={() => setWishModalOpen(false)}
        onPinWish={handlePinSecretWish}
        onToast={showToast}
      />

      <ReaderModal
        story={activeReaderStory}
        lang={lang}
        unlockedIds={unlockedIds}
        worldRecordCount={worldRecordCount}
        userLat={userLat}
        userLng={userLng}
        onUnlockSuccess={handleUnlockSuccess}
        onClose={() => setReaderStoryId(null)}
        onReact={handleReact}
        onAddReply={handleAddReply}
        onReport={handleReportCard}
        onRequestDelete={handleRequestDelete}
        onToast={showToast}
      />

      <RecordOptionsModal
        open={recordOptionsOpen}
        lang={lang}
        recordingKind={pendingRecordKind}
        personalNotesCount={stories.filter((s) => !s.isDemo).length}
        onSelectMode={(f) => void handleStartARRecordWithFilter(f)}
        onClose={() => setRecordOptionsOpen(false)}
      />

      <RecordedVideoModal
        videoUrl={recordedVideo?.url || null}
        videoBlob={recordedVideo?.blob || null}
        mimeType={recordedVideo?.mimeType || 'video/webm'}
        lang={lang}
        onClose={handleCloseRecordedModal}
        onToast={showToast}
      />

      <ReferralHubModal
        open={referOpen}
        lang={lang}
        invites={invites}
        onClose={() => setReferOpen(false)}
        onChallengeFriend={handleChallengeFriend}
        onCopyLink={handleCopyInviteLink}
      />

      <BackupVaultModal
        open={backupOpen}
        lang={lang}
        storyCount={stories.length}
        onClose={() => setBackupOpen(false)}
        onExportJson={handleExportBackupJson}
        onImportJson={handleImportBackupJson}
      />

      <InstallGuideModal
        open={installOpen}
        isIOS={isIOS}
        onClose={() => setInstallOpen(false)}
      />

      <ShareAppModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onCopyUrl={handleCopyInviteLink}
      />

      <VipUpgradeModal
        open={vipModalOpen}
        lang={lang}
        vipLicense={vipLicense}
        onUnlocked={(lic) => setVipLicense(lic)}
        onClose={() => setVipModalOpen(false)}
        onToast={showToast}
      />

      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
        onToast={showToast}
      />
    </main>
  );
}
