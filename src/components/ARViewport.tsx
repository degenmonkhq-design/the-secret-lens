import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Flag, Heart, Lock, MessageCircle, Mic, Sparkles } from 'lucide-react';
import { ARStory, Language, ProximityRadarInfo, VisualTargetSignature } from '../types/story';
import { I18N, formatCountdown } from '../utils/i18n';
import { calculateDistanceMeters, loadMediaBlob } from '../utils/mediaStorage';
import { triggerGentleHaptic } from '../utils/haptics';
import { sufiTune } from '../utils/sufiTune';
import { captureCenterTargetSignature, matchVisualTargetAt } from '../utils/visualTarget';
import { SecretLensScene } from '../three/SecretLensScene';

export interface ARRecorderControls {
  startRecording: (filter: 'mine' | 'all') => Promise<boolean>;
  stopRecording: () => void;
}

interface ARViewportProps {
  lang: Language;
  stories: ARStory[];
  userLat: number;
  userLng: number;
  cameraActive: boolean;
  cameraFacing: 'environment' | 'user';
  cameraStream: MediaStream | null;
  cleanReelMode: boolean;
  isRecordingAR: boolean;
  recordMessageFilter: 'mine' | 'all';
  streakDays: number;
  onSelectCard: (story: ARStory) => void;
  onReportCard: (story: ARStory) => void;
  onCenteredCard: (story: ARStory, relYaw: number) => void;
  onRadarUpdate: (info: ProximityRadarInfo | null) => void;
  onOrientationUpdate: (yaw: number, pitch: number, roll: number, label: string) => void;
  onCatchShootingStar: () => void;
  gyroRequestRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
  captureTargetRef: React.MutableRefObject<(() => VisualTargetSignature | null) | null>;
  recorderRef: React.MutableRefObject<ARRecorderControls | null>;
  onRecordTick: (secondsLeft: number) => void;
  onRecordComplete: (blob: Blob, mimeType: string) => void;
  onToast: (msg: string) => void;
}

export const ARViewport: React.FC<ARViewportProps> = ({
  lang,
  stories,
  userLat,
  userLng,
  cameraActive,
  cameraFacing,
  cameraStream,
  cleanReelMode,
  isRecordingAR,
  recordMessageFilter,
  streakDays,
  onSelectCard,
  onReportCard,
  onCenteredCard,
  onRadarUpdate,
  onOrientationUpdate,
  onCatchShootingStar,
  gyroRequestRef,
  captureTargetRef,
  recorderRef,
  onRecordTick,
  onRecordComplete,
  onToast,
}) => {
  const dict = I18N[lang];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cyberCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const threeSceneRef = useRef<SecretLensScene | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [resolvedMedia, setResolvedMedia] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [centeredId, setCenteredId] = useState<string | null>(null);
  const [liveYaw, setLiveYaw] = useState(0);
  const [livePitch, setLivePitch] = useState(0);
  const [visualMatchFlags, setVisualMatchFlags] = useState<Record<string, boolean>>({});

  const viewYawRef = useRef(0);
  const viewPitchRef = useRef(0);
  const viewRollRef = useRef(0);
  const targetYawRef = useRef(0);
  const targetPitchRef = useRef(0);
  const targetRollRef = useRef(0);
  const gyroBaseAlphaRef = useRef<number | null>(null);
  const visualMatchFlagsRef = useRef<Record<string, boolean>>({});
  const stardustRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; r: number }>
  >([]);
  const shootingStarsRef = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      active: false,
      waitFrames: 45 + i * 110,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      len: 150,
      life: 0,
    }))
  );

  const evaluatedStories = useMemo(() => {
    const visiblePool = isRecordingAR
      ? stories.filter((s) =>
          recordMessageFilter === 'mine' ? !s.isDemo : s.visibility !== 'private'
        )
      : stories;

    return visiblePool.map((s) => {
      const dist = calculateDistanceMeters(userLat, userLng, s.lat, s.lng);
      const relYaw = (((s.azimuth || 0) - liveYaw + 540) % 360) - 180;
      const relPitch = (s.elevation || 0) - livePitch;
      const inRange = dist <= 3.0;
      const hasVisualTarget = Boolean(s.visualTarget);
      const facingCompass = hasVisualTarget
        ? Math.abs(relYaw) <= 26 && Math.abs(relPitch) <= 26
        : Math.abs(relYaw) <= 46 && Math.abs(relPitch) <= 38;
      const visualOk =
        !hasVisualTarget || !cameraActive || visualMatchFlags[s.id] !== false;

      return {
        story: { ...s, distanceMeters: dist },
        dist,
        relYaw,
        relPitch,
        inRange,
        facingCompass,
        visualLocked: hasVisualTarget && cameraActive && visualMatchFlags[s.id] === true,
        materialized: inRange && facingCompass && visualOk,
      };
    });
  }, [
    stories,
    userLat,
    userLng,
    liveYaw,
    livePitch,
    isRecordingAR,
    recordMessageFilter,
    cameraActive,
    visualMatchFlags,
  ]);

  const evaluatedRef = useRef(evaluatedStories);
  evaluatedRef.current = evaluatedStories;

  const resolvedMediaRef = useRef(resolvedMedia);
  resolvedMediaRef.current = resolvedMedia;

  const cameraActiveRef = useRef(cameraActive);
  cameraActiveRef.current = cameraActive;

  const cameraFacingRef = useRef(cameraFacing);
  cameraFacingRef.current = cameraFacing;

  const activeRecordFilterRef = useRef<'mine' | 'all'>(recordMessageFilter);
  activeRecordFilterRef.current = recordMessageFilter;

  const isRecordingRef = useRef(isRecordingAR);
  isRecordingRef.current = isRecordingAR;

  const cleanReelRef = useRef(cleanReelMode);
  cleanReelRef.current = cleanReelMode;

  const streakDaysRef = useRef(streakDays);
  streakDaysRef.current = streakDays;

  const onCatchShootingStarRef = useRef(onCatchShootingStar);
  onCatchShootingStarRef.current = onCatchShootingStar;

  const nearestHiddenPortal = useMemo(() => {
    const hidden = evaluatedStories.filter((item) => !item.materialized);
    if (hidden.length === 0) return null;
    hidden.sort((a, b) => a.dist - b.dist);
    return hidden[0];
  }, [evaluatedStories]);

  const hasAnyMaterialized = useMemo(
    () => evaluatedStories.some((item) => item.materialized),
    [evaluatedStories]
  );

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Mount Three.js 3D Glowing Earth, Mystic Astrolabe, Swirling Nebula, Starfield & Orbital Rings
  useEffect(() => {
    const mount = threeMountRef.current;
    if (!mount) return;
    const scene = new SecretLensScene(mount, {
      cameraActive: cameraActiveRef.current,
      cameraFacing: cameraFacingRef.current,
      isRecording: isRecordingAR,
      targetYaw: targetYawRef.current,
      targetPitch: targetPitchRef.current,
      inPortalRange: false,
      heatLevel: 0.25,
      cleanReelMode,
    });
    threeSceneRef.current = scene;
    return () => {
      scene.dispose();
      threeSceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    captureTargetRef.current = () => {
      if (!cameraActiveRef.current || !videoRef.current) return null;
      return captureCenterTargetSignature(videoRef.current, cameraFacingRef.current === 'user');
    };
    return () => {
      captureTargetRef.current = null;
    };
  }, [captureTargetRef]);

  useEffect(() => {
    threeSceneRef.current?.setState({
      cameraActive,
      cameraFacing,
      isRecording: isRecordingAR || cleanReelMode,
      cleanReelMode,
    });
  }, [cameraActive, cameraFacing, isRecordingAR, cleanReelMode]);

  // Resolve IndexedDB media blobs & preload HTMLImageElements for composite canvas recorder
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const s of stories) {
        if (s.mediaData) {
          next[s.id] = s.mediaData;
        } else if (s.mediaIdbKey) {
          const blob = await loadMediaBlob(s.mediaIdbKey);
          if (blob) next[s.id] = blob;
        }

        const imgSrc = next[s.id];
        if (imgSrc && s.mediaType !== 'video' && !imageCacheRef.current.has(imgSrc)) {
          const img = new Image();
          img.src = imgSrc;
          imageCacheRef.current.set(imgSrc, img);
        }
        if (s.drawingData && !imageCacheRef.current.has(s.drawingData)) {
          const dImg = new Image();
          dImg.src = s.drawingData;
          imageCacheRef.current.set(s.drawingData, dImg);
        }
      }
      if (!cancelled) setResolvedMedia(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [stories]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Composite Offscreen Canvas AR Video Recorder (Camera + Deep Space + Selected Messages + Live Mic Voice ONLY)
  useEffect(() => {
    let mediaRecorder: MediaRecorder | null = null;
    let micStream: MediaStream | null = null;
    let recordDrawRaf = 0;
    let countdownTimer = 0;
    let isRecording = false;

    const cleanupMic = () => {
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
    };

    const stopRecording = () => {
      if (!isRecording) return;
      isRecording = false;
      window.clearInterval(countdownTimer);
      cancelAnimationFrame(recordDrawRaf);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {
          cleanupMic();
          sufiTune.resumeAfterRecording();
        }
      } else {
        cleanupMic();
        sufiTune.resumeAfterRecording();
      }
    };

    const startRecording = async (filter: 'mine' | 'all'): Promise<boolean> => {
      if (isRecording) return false;
      if (typeof MediaRecorder === 'undefined') {
        onToast('⚠️ Video recording is not supported in this browser.');
        return false;
      }

      activeRecordFilterRef.current = filter;
      isRecordingRef.current = true;

      // Strictly pause speaker ambient tune during video recording so it NEVER bleeds into the mic
      sufiTune.pauseForRecording();

      // Hide Earth, Saturn, moons, orbiting thoughts & astrolabe immediately in Three.js before capturing first frame
      threeSceneRef.current?.setState({ isRecording: true });

      const compCanvas = document.createElement('canvas');
      const isPortrait = window.innerHeight >= window.innerWidth;
      compCanvas.width = isPortrait ? 720 : 1280;
      compCanvas.height = isPortrait ? 1280 : 720;
      const ctx = compCanvas.getContext('2d');
      if (!ctx || typeof compCanvas.captureStream !== 'function') {
        isRecordingRef.current = false;
        sufiTune.resumeAfterRecording();
        threeSceneRef.current?.setState({ isRecording: false });
        onToast('⚠️ Canvas stream recording unavailable on this device.');
        return false;
      }

      const canvasStream = compCanvas.captureStream(30);
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));

      // Capture ONLY the user's live microphone voice (NEVER the background ambient tune)
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          micStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
        } catch {
          onToast('🎙️ Microphone denied — recording crisp deep-space AR video only.');
        }
      }

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const chosenMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      try {
        mediaRecorder = chosenMime
          ? new MediaRecorder(combinedStream, { mimeType: chosenMime })
          : new MediaRecorder(combinedStream);
      } catch {
        isRecordingRef.current = false;
        cleanupMic();
        canvasStream.getTracks().forEach((t) => t.stop());
        threeSceneRef.current?.setState({ isRecording: false });
        sufiTune.resumeAfterRecording();
        onToast('⚠️ Could not initialize video recorder.');
        return false;
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder?.mimeType || chosenMime || 'video/webm';
        const blob = new Blob(chunks, { type: finalMime });
        isRecordingRef.current = false;
        canvasStream.getTracks().forEach((t) => t.stop());
        cleanupMic();
        threeSceneRef.current?.setState({ isRecording: false });
        sufiTune.resumeAfterRecording();
        onRecordComplete(blob, finalMime);
      };

      isRecording = true;
      let secsLeft = 15;
      onRecordTick(secsLeft);

      const drawFrame = () => {
        if (!isRecording) return;
        const cw = compCanvas.width;
        const ch = compCanvas.height;
        ctx.clearRect(0, 0, cw, ch);

        // Layer 1: Live Camera (mirrored horizontally ONLY in Front Selfie mode) or Cosmic Cyber-Grid
        const camVid = videoRef.current;
        if (cameraActiveRef.current && camVid && camVid.readyState >= 2) {
          const vw = camVid.videoWidth || cw;
          const vh = camVid.videoHeight || ch;
          const scale = Math.max(cw / vw, ch / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          if (cameraFacingRef.current === 'user') {
            ctx.save();
            ctx.translate(cw, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(camVid, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
            ctx.restore();
          } else {
            ctx.drawImage(camVid, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
          }
        } else if (cyberCanvasRef.current) {
          ctx.drawImage(cyberCanvasRef.current, 0, 0, cw, ch);
        } else {
          ctx.fillStyle = '#04060d';
          ctx.fillRect(0, 0, cw, ch);
        }

        // Layer 1.5: Infinite Deep Space Starfield, Swirling Nebula & Fireflies (Earth & ribbons hidden!)
        const threeCanvas = threeSceneRef.current?.getCanvas();
        if (threeCanvas && threeCanvas.width > 0 && threeCanvas.height > 0) {
          ctx.drawImage(threeCanvas, 0, 0, cw, ch);
        }

        // Layer 2: Twinkling Stars, Golden Fireflies & Cosmic Wind Streaks
        if (fxCanvasRef.current) {
          ctx.drawImage(fxCanvasRef.current, 0, 0, cw, ch);
        }

        // Layer 3: Selected Materialized 3D AR Hologram Cards (filtered by 'mine' vs 'all') with smooth up-down levitation
        const scaleX = cw / Math.max(1, window.innerWidth);
        const scaleY = ch / Math.max(1, window.innerHeight);
        const nowFloatT = performance.now() * 0.0022;
        let cardIdx = 0;

        for (const item of evaluatedRef.current) {
          if (!item.materialized) continue;
          const s = item.story;
          if (activeRecordFilterRef.current === 'mine' && s.isDemo) continue;
          if (activeRecordFilterRef.current === 'all' && s.visibility === 'private') continue;

          const relYaw = (((s.azimuth || 0) - viewYawRef.current + 540) % 360) - 180;
          const relPitch = (s.elevation || 0) - viewPitchRef.current;
          const yawCone = s.visualTarget ? 28 : 55;
          if (Math.abs(relYaw) > yawCone) continue;

          const levitateY = s.visualTarget
            ? Math.sin(nowFloatT + cardIdx) * 2
            : Math.sin(nowFloatT + cardIdx * 1.45) * 12;
          cardIdx += 1;

          const cardScale = Math.max(0.72, 1 - Math.abs(relYaw) / 170);
          const cardW = 310 * cardScale;
          const cardH = 305 * cardScale;
          const cx =
            cw * 0.5 +
            (relYaw / (s.visualTarget ? 26 : 46)) * (window.innerWidth * 0.44) * scaleX;
          const cy =
            ch * 0.5 -
            (relPitch / (s.visualTarget ? 30 : 28)) * (window.innerHeight * 0.36) * scaleY +
            levitateY;

          const hasGoldenAura = !s.isDemo && (s.hasGoldenAura || streakDaysRef.current >= 3);

          ctx.save();
          ctx.translate(cx, cy);

          // Card surface
          ctx.fillStyle = s.isWish ? 'rgba(14, 24, 62, 0.90)' : 'rgba(8, 17, 42, 0.88)';
          ctx.strokeStyle = hasGoldenAura ? '#ffe98a' : '#f5c542';
          ctx.lineWidth = hasGoldenAura ? 3.5 : 2.5;
          if (hasGoldenAura) {
            ctx.shadowColor = '#f5c542';
            ctx.shadowBlur = 18;
          }
          ctx.beginPath();
          ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Top Rank & 3m Tag
          ctx.fillStyle = '#fff0a8';
          ctx.font = `bold ${Math.round(14 * cardScale)}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(s.rankBadge || '🌱 Explorer', -cardW / 2 + 14, -cardH / 2 + 24);
          ctx.fillStyle = '#34f5a8';
          ctx.textAlign = 'right';
          ctx.fillText(`${s.distanceMeters.toFixed(1)}m`, cardW / 2 - 14, -cardH / 2 + 24);

          // Media frame inside card
          const mX = -cardW / 2 + 14;
          const mY = -cardH / 2 + 36;
          const mW = cardW - 28;
          const mH = 148 * cardScale;
          const isLocked = s.visibility === 'private' || Boolean(s.unlockAt && Date.now() < s.unlockAt);

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(mX, mY, mW, mH, 14);
          ctx.clip();
          ctx.fillStyle = '#071430';
          ctx.fillRect(mX, mY, mW, mH);

          const mSrc = resolvedMediaRef.current[s.id] || s.mediaData;
          const cachedImg = mSrc ? imageCacheRef.current.get(mSrc) : null;
          if (!isLocked && cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            ctx.drawImage(cachedImg, mX, mY, mW, mH);
          }

          if (!isLocked && s.drawingData) {
            const dImg = imageCacheRef.current.get(s.drawingData);
            if (dImg && dImg.complete && dImg.naturalWidth > 0) {
              ctx.drawImage(dImg, mX, mY, mW, mH);
            }
          }

          if (isLocked) {
            ctx.fillStyle = 'rgba(4, 7, 17, 0.72)';
            ctx.fillRect(mX, mY, mW, mH);
            ctx.fillStyle = '#f5c542';
            ctx.textAlign = 'center';
            ctx.font = `bold ${Math.round(22 * cardScale)}px sans-serif`;
            ctx.fillText(s.visibility === 'private' ? '🔒 PRIVATE' : '⏳ CAPSULE', 0, mY + mH / 2 + 8);
          }
          ctx.restore();

          // Headline & Author
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.font = `bold ${Math.round(16 * cardScale)}px sans-serif`;
          ctx.fillText(s.headline.slice(0, 32), -cardW / 2 + 14, mY + mH + 28 * cardScale);
          ctx.fillStyle = '#9eb0d6';
          ctx.font = `${Math.round(13 * cardScale)}px sans-serif`;
          ctx.fillText(`✍️ ${s.author.slice(0, 26)}`, -cardW / 2 + 14, mY + mH + 54 * cardScale);

          ctx.restore();
        }

        recordDrawRaf = requestAnimationFrame(drawFrame);
      };

      mediaRecorder.start(250);
      drawFrame();

      countdownTimer = window.setInterval(() => {
        secsLeft -= 1;
        onRecordTick(Math.max(0, secsLeft));
        if (secsLeft <= 0) {
          stopRecording();
        }
      }, 1000);

      return true;
    };

    recorderRef.current = { startRecording, stopRecording };

    return () => {
      stopRecording();
      cleanupMic();
      recorderRef.current = null;
    };
  }, [recorderRef, onRecordTick, onRecordComplete, onToast]);

  const spawnStardust = (x: number, y: number, count = 4) => {
    for (let i = 0; i < count; i++) {
      stardustRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4 - 0.6,
        life: 1,
        r: Math.random() * 2.6 + 1,
      });
    }
  };

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null && e.beta === null) return;
      if (gyroBaseAlphaRef.current === null && e.alpha !== null) {
        gyroBaseAlphaRef.current = e.alpha;
      }
      const dAlpha =
        e.alpha !== null && gyroBaseAlphaRef.current !== null
          ? ((e.alpha - gyroBaseAlphaRef.current + 540) % 360) - 180
          : 0;
      targetYawRef.current = -dAlpha;
      targetPitchRef.current = Math.max(-75, Math.min(75, (e.beta ?? 65) - 65));
      targetRollRef.current = Math.max(-45, Math.min(45, e.gamma ?? 0));
      onOrientationUpdate(
        targetYawRef.current,
        targetPitchRef.current,
        targetRollRef.current,
        '3D Orientation Lock'
      );
    };

    gyroRequestRef.current = async () => {
      const DevOrient = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (DevOrient && typeof DevOrient.requestPermission === 'function') {
        try {
          const res = await DevOrient.requestPermission();
          if (res === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }
      return false;
    };

    const DevOrient = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (DevOrient && typeof DevOrient.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragYaw0 = 0;
    let dragPitch0 = 0;

    const pointToSegmentDist = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.ar-bubble-card') && !isRecordingRef.current && !cleanReelRef.current) {
        const stars = shootingStarsRef.current;
        for (const ms of stars) {
          if (!ms.active) continue;
          const speedMag = Math.hypot(ms.vx, ms.vy) || 1;
          const tailX = ms.x - (ms.vx / speedMag) * ms.len;
          const tailY = ms.y - (ms.vy / speedMag) * ms.len;
          if (pointToSegmentDist(e.clientX, e.clientY, ms.x, ms.y, tailX, tailY) <= 48) {
            ms.active = false;
            ms.waitFrames = 140;
            spawnStardust(e.clientX, e.clientY, 52);
            triggerGentleHaptic(18);
            onCatchShootingStarRef.current();
            return;
          }
        }
      }

      spawnStardust(e.clientX, e.clientY, 10);
      if (target?.closest('.ar-bubble-card')) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragYaw0 = targetYawRef.current;
      dragPitch0 = targetPitchRef.current;
    };

    const onPointerMove = (e: PointerEvent) => {
      spawnStardust(e.clientX, e.clientY, 2);
      if (isDragging) {
        targetYawRef.current = dragYaw0 + (e.clientX - dragStartX) * 0.22;
        targetPitchRef.current = Math.max(
          -60,
          Math.min(60, dragPitch0 - (e.clientY - dragStartY) * 0.18)
        );
        onOrientationUpdate(
          targetYawRef.current,
          targetPitchRef.current,
          targetRollRef.current,
          '3D Touch / Compass'
        );
      } else if (gyroBaseAlphaRef.current === null) {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        targetYawRef.current = nx * 24;
        targetPitchRef.current = -ny * 14;
        onOrientationUpdate(
          targetYawRef.current,
          targetPitchRef.current,
          targetRollRef.current,
          '3D Parallax / Drag'
        );
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const vp = viewportRef.current;
    vp?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      vp?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gyroRequestRef, onOrientationUpdate]);

  useEffect(() => {
    const cyberCanvas = cyberCanvasRef.current;
    const fxCanvas = fxCanvasRef.current;
    if (!cyberCanvas || !fxCanvas) return;

    const cyberCtx = cyberCanvas.getContext('2d');
    const fxCtx = fxCanvas.getContext('2d');
    if (!cyberCtx || !fxCtx) return;

    const resize = () => {
      cyberCanvas.width = window.innerWidth;
      cyberCanvas.height = window.innerHeight;
      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 130 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.3,
      tw: Math.random() * Math.PI * 2,
    }));

    const fireflies = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.45 - 0.12,
      r: Math.random() * 2.4 + 1.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const shootingStars = shootingStarsRef.current;

    let lastCompassTick = 0;
    let lastYawSyncTick = 0;
    let lastVisualCheckTick = 0;
    let lastCenteredId: string | null = null;
    let rafId = 0;

    const frame = (ts: number) => {
      const w = cyberCanvas.width;
      const h = cyberCanvas.height;

      cyberCtx.clearRect(0, 0, w, h);
      if (!cameraActive) {
        // Deep Pitch-Black & Midnight-Blue Space Universe (#000105 to #03091e) always active when Cam OFF
        const bg = cyberCtx.createRadialGradient(
          w * 0.48,
          h * 0.42,
          10,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.88
        );
        bg.addColorStop(0, '#03091e');
        bg.addColorStop(0.55, '#01040e');
        bg.addColorStop(1, '#000105');
        cyberCtx.fillStyle = bg;
        cyberCtx.fillRect(0, 0, w, h);

        // Subtle distant deep-space spiral galaxy wisps
        const galA = cyberCtx.createRadialGradient(w * 0.22, h * 0.28, 2, w * 0.22, h * 0.28, w * 0.22);
        galA.addColorStop(0, 'rgba(65, 118, 235, 0.14)');
        galA.addColorStop(0.5, 'rgba(26, 56, 130, 0.05)');
        galA.addColorStop(1, 'rgba(0, 1, 5, 0)');
        cyberCtx.fillStyle = galA;
        cyberCtx.fillRect(0, 0, w, h);

        stars.forEach((s, idx) => {
          s.tw += 0.022;
          const alpha = 0.32 + 0.58 * Math.sin(s.tw);
          cyberCtx.fillStyle =
            idx % 3 === 0 ? `rgba(205, 228, 255, ${alpha})` : `rgba(255, 248, 232, ${alpha})`;
          cyberCtx.beginPath();
          cyberCtx.arc(s.x * w, s.y * h, Math.min(1.15, s.r * 0.55), 0, Math.PI * 2);
          cyberCtx.fill();
        });
      }

      fxCtx.clearRect(0, 0, w, h);

      // Unified Reel Mode & Video Recording Mode both render the identical dark cosmic void
      const recordingNow = isRecordingRef.current || cleanReelRef.current;

      // Deep-space atmospheric vignette & pinpoint micro-stars over BOTH Rear & Selfie cameras
      if (cameraActive) {
        const edgeNebula = fxCtx.createRadialGradient(
          w * 0.5,
          h * 0.48,
          Math.min(w, h) * (recordingNow ? 0.16 : 0.24),
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.74
        );
        edgeNebula.addColorStop(0, recordingNow ? 'rgba(3, 7, 18, 0.12)' : 'rgba(5, 10, 24, 0)');
        edgeNebula.addColorStop(0.68, recordingNow ? 'rgba(6, 13, 34, 0.42)' : 'rgba(8, 16, 44, 0.22)');
        edgeNebula.addColorStop(1, recordingNow ? 'rgba(2, 4, 12, 0.68)' : 'rgba(2, 5, 16, 0.48)');
        fxCtx.fillStyle = edgeNebula;
        fxCtx.fillRect(0, 0, w, h);

        stars.forEach((s, idx) => {
          s.tw += 0.028;
          if (!recordingNow && idx % 3 === 0) return;
          const base = recordingNow ? 0.42 : 0.24;
          const alpha = base + 0.52 * Math.sin(s.tw);
          fxCtx.fillStyle =
            idx % 5 === 0
              ? `rgba(190, 224, 255, ${alpha})`
              : idx % 7 === 0
                ? `rgba(255, 224, 178, ${alpha})`
                : `rgba(255, 255, 255, ${alpha})`;
          fxCtx.beginPath();
          fxCtx.arc(
            s.x * w,
            s.y * h,
            Math.min(1.1, s.r * (recordingNow ? 0.58 : 0.48)),
            0,
            Math.PI * 2
          );
          fxCtx.fill();
        });
      }

      // Interactive Magical Shooting Stars (Tap any shooting star to trigger stardust & Wish Modal!)
      shootingStars.forEach((ms) => {
        if (!ms.active) {
          ms.waitFrames -= 1;
          if (ms.waitFrames <= 0) {
            ms.active = true;
            ms.life = 1;
            const fromLeft = Math.random() > 0.45;
            ms.x = fromLeft ? w * (0.1 + Math.random() * 0.28) : w * (0.62 + Math.random() * 0.28);
            ms.y = h * (0.14 + Math.random() * 0.26);
            const dir = fromLeft ? 1 : -1;
            ms.vx = dir * (5.2 + Math.random() * 2.6);
            ms.vy = 2.0 + Math.random() * 1.5;
            ms.len = 135 + Math.random() * 65;
          }
          return;
        }

        ms.x += ms.vx;
        ms.y += ms.vy;
        ms.life -= 0.011;
        if (ms.life <= 0 || ms.x < -180 || ms.x > w + 180 || ms.y > h + 180) {
          ms.active = false;
          ms.waitFrames = 90 + Math.floor(Math.random() * 130);
          return;
        }

        const speedMag = Math.hypot(ms.vx, ms.vy) || 1;
        const tailX = ms.x - (ms.vx / speedMag) * ms.len;
        const tailY = ms.y - (ms.vy / speedMag) * ms.len;

        const grad = fxCtx.createLinearGradient(ms.x, ms.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 248, 196, ${0.98 * ms.life})`);
        grad.addColorStop(0.28, `rgba(245, 197, 66, ${0.72 * ms.life})`);
        grad.addColorStop(0.6, `rgba(110, 224, 255, ${0.38 * ms.life})`);
        grad.addColorStop(1, 'rgba(120, 175, 255, 0)');
        fxCtx.strokeStyle = grad;
        fxCtx.lineWidth = 2.6;
        fxCtx.beginPath();
        fxCtx.moveTo(ms.x, ms.y);
        fxCtx.lineTo(tailX, tailY);
        fxCtx.stroke();

        // Luminous Shooting Star Core Halo
        const headGlow = fxCtx.createRadialGradient(ms.x, ms.y, 0.5, ms.x, ms.y, 12);
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${ms.life})`);
        headGlow.addColorStop(0.4, `rgba(255, 232, 138, ${0.72 * ms.life})`);
        headGlow.addColorStop(1, 'rgba(245, 197, 66, 0)');
        fxCtx.fillStyle = headGlow;
        fxCtx.beginPath();
        fxCtx.arc(ms.x, ms.y, 12, 0, Math.PI * 2);
        fxCtx.fill();
      });

      fireflies.forEach((f) => {
        f.x += f.vx;
        f.y += f.vy;
        f.phase += 0.04;
        if (f.x < 0) f.x = w;
        if (f.x > w) f.x = 0;
        if (f.y < 0) f.y = h;
        if (f.y > h) f.y = 0;
        const glow = 0.22 + 0.42 * Math.sin(f.phase);
        fxCtx.fillStyle = `rgba(255, 236, 172, ${glow})`;
        fxCtx.beginPath();
        fxCtx.arc(f.x, f.y, Math.min(1.3, f.r * 0.45), 0, Math.PI * 2);
        fxCtx.fill();
      });

      const dust = stardustRef.current;
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.032;
        if (p.life <= 0) {
          dust.splice(i, 1);
          continue;
        }
        fxCtx.fillStyle = `rgba(255, 245, 185, ${p.life})`;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        fxCtx.fill();
      }

      viewYawRef.current += (targetYawRef.current - viewYawRef.current) * 0.22;
      viewPitchRef.current += (targetPitchRef.current - viewPitchRef.current) * 0.22;
      viewRollRef.current += (targetRollRef.current - viewRollRef.current) * 0.22;

      if (ts - lastYawSyncTick > 85) {
        lastYawSyncTick = ts;
        setLiveYaw(viewYawRef.current);
        setLivePitch(viewPitchRef.current);
      }

      // 10 Hz Live Camera Pixel/Histogram Visual Target Matcher for Leaf/Wall Lock
      if (cameraActive && videoRef.current && ts - lastVisualCheckTick > 105) {
        lastVisualCheckTick = ts;
        const vid = videoRef.current;
        const mirrorX = cameraFacingRef.current === 'user';
        let changed = false;
        const nextFlags = { ...visualMatchFlagsRef.current };

        for (const item of evaluatedRef.current) {
          const s = item.story;
          if (!s.visualTarget) continue;
          if (item.dist > 3.0) continue;

          const relYaw = (((s.azimuth || 0) - viewYawRef.current + 540) % 360) - 180;
          const relPitch = (s.elevation || 0) - viewPitchRef.current;
          if (Math.abs(relYaw) > 28 || Math.abs(relPitch) > 28) {
            if (nextFlags[s.id] !== false) {
              nextFlags[s.id] = false;
              changed = true;
            }
            continue;
          }

          const normX = Math.max(0.08, Math.min(0.92, 0.5 + (relYaw / 26) * 0.48));
          const normY = Math.max(0.08, Math.min(0.92, 0.5 - (relPitch / 30) * 0.44));
          const score = matchVisualTargetAt(vid, s.visualTarget, normX, normY, mirrorX);
          const matched = score >= 0.40;
          if (nextFlags[s.id] !== matched) {
            nextFlags[s.id] = matched;
            changed = true;
          }
        }

        if (changed) {
          visualMatchFlagsRef.current = nextFlags;
          setVisualMatchFlags(nextFlags);
        }
      }

      let nearest: { story: ARStory; dist: number; relYaw: number; inRange: boolean } | null = null;
      let activeCenterItem: { story: ARStory; relYaw: number } | null = null;

      let bobIdx = 0;
      for (const item of evaluatedRef.current) {
        const { story, dist, materialized } = item;
        const relYaw = (((story.azimuth || 0) - viewYawRef.current + 540) % 360) - 180;
        const relPitch = (story.elevation || 0) - viewPitchRef.current;
        const relRoll = (story.rollGamma || 0) - viewRollRef.current;
        const absYaw = Math.abs(relYaw);

        if (!nearest || dist < nearest.dist || (dist === nearest.dist && absYaw < Math.abs(nearest.relYaw))) {
          nearest = { story, dist, relYaw, inRange: dist <= 3.0 };
        }

        if (!materialized) continue;
        const el = bubbleRefs.current.get(story.id);
        if (!el) continue;

        // Visual-locked items stay physically glued to the exact leaf/spot; demos gently float
        const levitateY = story.visualTarget
          ? Math.sin(ts * 0.002 + bobIdx) * 2.2
          : Math.sin(ts * 0.0022 + bobIdx * 1.45) * 11;
        bobIdx += 1;

        const yawDiv = story.visualTarget ? 26 : 46;
        const pitchDiv = story.visualTarget ? 30 : 28;
        const xPx = (relYaw / yawDiv) * (w * 0.48);
        const yPx = -(relPitch / pitchDiv) * (h * 0.44) + levitateY;
        const depthZ = Math.max(-220, 40 - absYaw * 3.2);
        const scale = Math.max(0.76, 1 - absYaw / 170);
        const opacity = absYaw > (story.visualTarget ? 28 : 55) ? 0 : Math.max(0.25, 1 - absYaw / 62);

        el.style.opacity = opacity.toFixed(2);
        el.style.pointerEvents = opacity < 0.2 ? 'none' : 'auto';
        el.style.zIndex = String(Math.round(200 - absYaw));
        el.style.transform = `translate3d(calc(-50% + ${xPx.toFixed(1)}px), calc(-50% + ${yPx.toFixed(1)}px), ${depthZ.toFixed(1)}px) rotateZ(${(relRoll * 0.28).toFixed(1)}deg) rotateY(${(-relYaw * 0.22).toFixed(1)}deg) rotateX(${(relPitch * 0.18).toFixed(1)}deg) scale(${scale.toFixed(3)})`;

        if (absYaw < 14 && Math.abs(relPitch) < 18) {
          activeCenterItem = { story, relYaw };
        }
      }

      threeSceneRef.current?.setState({
        targetYaw: targetYawRef.current,
        targetPitch: targetPitchRef.current,
        inPortalRange: nearest ? nearest.inRange : false,
        heatLevel: nearest ? Math.max(0.15, Math.min(1, 1 - nearest.dist / 16)) : 0.25,
      });

      if (activeCenterItem && activeCenterItem.story.id !== lastCenteredId) {
        lastCenteredId = activeCenterItem.story.id;
        setCenteredId(activeCenterItem.story.id);
        onCenteredCard(activeCenterItem.story, activeCenterItem.relYaw);
      } else if (!activeCenterItem && lastCenteredId !== null) {
        lastCenteredId = null;
        setCenteredId(null);
      }

      if (ts - lastCompassTick > 180) {
        lastCompassTick = ts;
        if (nearest) {
          const directionArrow =
            Math.abs(nearest.relYaw) < 16
              ? '⬆️ Facing Spot'
              : nearest.relYaw > 0
                ? '➡️ Turn Right'
                : '⬅️ Turn Left';
          const directionShort =
            Math.abs(nearest.relYaw) < 16 ? 'Ahead' : nearest.relYaw > 0 ? 'Right' : 'Left';
          const heatLevel = Math.max(0.15, Math.min(1, 1 - nearest.dist / 16));
          onRadarUpdate({
            storyId: nearest.story.id,
            distanceMeters: Math.round(nearest.dist),
            directionArrow,
            directionShort,
            category: nearest.story.category,
            relYaw: nearest.relYaw,
            inPortalRange: nearest.inRange,
            heatLevel,
          });
        } else {
          onRadarUpdate(null);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [cameraActive, onCenteredCard, onRadarUpdate]);

  const materializedItems = evaluatedStories.filter((item) => item.materialized);

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 overflow-hidden"
      style={{ perspective: '1100px' }}
    >
      <canvas ref={cyberCanvasRef} className="absolute inset-0 w-full h-full z-0" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-[1] transition-opacity duration-700 ${
          cameraActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
        }}
      />

      <div
        ref={threeMountRef}
        className="absolute inset-0 z-[2] pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 48%, rgba(2, 5, 14, 0.65) 100%), linear-gradient(to bottom, rgba(4, 6, 13, 0.72) 0%, transparent 20%, transparent 78%, rgba(4, 6, 13, 0.84) 100%)',
        }}
      />

      <div
        className={`absolute inset-3.5 z-[4] pointer-events-none border border-[#f5c542]/12 rounded-2xl transition-opacity duration-300 ${
          cleanReelMode || isRecordingAR ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-[#f5c542]/65 rounded-tl-xl" />
        <span className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-[#f5c542]/65 rounded-br-xl" />
      </div>

      {/* Sleek Ultra-Thin Golden Target Reticle (+) for Pinpoint Leaf / Object Aiming */}
      {!cleanReelMode && !isRecordingAR && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[12] pointer-events-none flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#f5c542]/75" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#f5c542]/75" />
            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#f5c542]/75" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#f5c542]/75" />
            <span className="absolute left-2 right-2 h-px bg-[#f5c542]/80 shadow-[0_0_6px_rgba(245,197,66,0.9)]" />
            <span className="absolute top-2 bottom-2 w-px bg-[#f5c542]/80 shadow-[0_0_6px_rgba(245,197,66,0.9)]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#fff4b8] shadow-[0_0_8px_#f5c542]" />
          </div>
        </div>
      )}

      {!cleanReelMode && !isRecordingAR && nearestHiddenPortal && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[18] pointer-events-none px-4 py-2 rounded-full border text-center transition-all duration-300 top-[154px] sm:top-[138px] max-w-[92vw] ${
            nearestHiddenPortal.inRange
              ? 'border-[#38e8ff]/75 bg-[#04112b]/92 shadow-[0_0_24px_rgba(56,232,255,0.38)]'
              : 'border-[#f5c542]/75 bg-[#050c22]/94 shadow-[0_0_26px_rgba(245,197,66,0.42)]'
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#fff0a8]">
            <Sparkles className="w-4 h-4 text-[#f5c542] shrink-0" />
            <span>
              {nearestHiddenPortal.inRange
                ? `${dict.turnToAlign} (${nearestHiddenPortal.relYaw > 0 ? '➡️ Turn Right' : '⬅️ Turn Left'})`
                : `${dict.secretDetectedPrefix} ${Math.max(4, Math.round(nearestHiddenPortal.dist))}m Away — ${dict.walkWithin3mSuffix}`}
            </span>
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {materializedItems.map(({ story: s }) => {
          const isPrivateLocked = s.visibility === 'private';
          const isCapsuleLocked = Boolean(s.unlockAt && nowMs < s.unlockAt);
          const isBlurred = isPrivateLocked || isCapsuleLocked;
          const mediaSrc = resolvedMedia[s.id] || s.mediaData;
          const hasAudio = Boolean(s.audioData || s.audioIdbKey);
          const isCentered = centeredId === s.id;
          const hasGoldenAura = !s.isDemo && (s.hasGoldenAura || streakDays >= 3);
          const replyCount = s.replies?.length || 0;

          return (
            <div
              key={s.id}
              ref={(el) => {
                if (el) bubbleRefs.current.set(s.id, el);
                else bubbleRefs.current.delete(s.id);
              }}
              onClick={() => onSelectCard(s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectCard(s);
              }}
              className={`ar-bubble-card animate-portal-open animate-float-bob absolute left-1/2 top-1/2 w-[224px] sm:w-[242px] pointer-events-auto cursor-pointer rounded-2xl p-2.5 text-[#f4f7ff] transition-[border-color,box-shadow] duration-200 ${
                hasGoldenAura
                  ? 'border-2 border-[#fff1a8] ring-2 ring-[#f5c542]/55 shadow-[0_18px_48px_rgba(0,0,0,0.84),0_0_38px_rgba(245,197,66,0.75),inset_0_0_14px_rgba(245,197,66,0.22)]'
                  : isCentered
                    ? 'border-[1.5px] border-[#fff0a8] shadow-[0_18px_46px_rgba(0,0,0,0.78),0_0_32px_rgba(245,197,66,0.52)]'
                    : 'border-[1.5px] border-[#f5c542]/50 shadow-[0_14px_40px_rgba(0,0,0,0.68),0_0_24px_rgba(245,197,66,0.22)]'
              }`}
              style={{
                background: s.isWish
                  ? 'linear-gradient(155deg, rgba(20, 32, 74, 0.94) 0%, rgba(6, 12, 32, 0.96) 100%)'
                  : 'linear-gradient(155deg, rgba(11, 22, 52, 0.92) 0%, rgba(4, 8, 20, 0.96) 100%)',
                transformOrigin: 'center center',
                willChange: 'transform, opacity',
              }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[11px]">
                <span className="font-bold text-[#fff0a8] truncate max-w-[130px]">
                  {hasGoldenAura ? `👑 ${s.rankBadge || 'Explorer'}` : s.rankBadge || '🌱 Explorer'}
                </span>
                <span className="font-hud text-[10px] text-[#34f5a8] tabular-nums shrink-0">
                  {s.visualTarget ? `🎯 ${s.distanceMeters.toFixed(1)}m` : `${s.distanceMeters.toFixed(1)}m · 3M`}
                </span>
              </div>

              <div className="relative w-full h-28 rounded-xl overflow-hidden bg-[radial-gradient(circle_at_center,#132856_0%,#060b18_100%)] border border-[#f5c542]/25 mb-2 flex items-center justify-center">
                {mediaSrc && s.mediaType === 'video' ? (
                  <video
                    src={mediaSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      isBlurred ? 'blur-md brightness-50 scale-110' : ''
                    }`}
                  />
                ) : mediaSrc ? (
                  <img
                    src={mediaSrc}
                    alt={s.headline}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${
                      isBlurred ? 'blur-md brightness-50 scale-110' : ''
                    }`}
                  />
                ) : s.drawingData ? null : (
                  <p
                    className={`px-3 text-xs text-[#d7e3ff] text-center line-clamp-3 ${
                      isBlurred ? 'blur-md brightness-50' : ''
                    }`}
                  >
                    {s.story.slice(0, 80)}...
                  </p>
                )}

                {s.drawingData && (
                  <img
                    src={s.drawingData}
                    alt="Neon Air Drawing"
                    className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_12px_rgba(245,197,66,0.9)] ${
                      isBlurred ? 'blur-md brightness-50' : ''
                    }`}
                  />
                )}

                {isPrivateLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#040711]/45 p-2 text-center">
                    <Lock className="w-7 h-7 text-[#f5c542] drop-shadow-[0_0_12px_rgba(245,197,66,0.9)]" />
                    <span className="font-hud text-[10px] tracking-wider text-[#fff0a8] bg-black/70 border border-[#f5c542] px-2.5 py-0.5 rounded-md">
                      PRIVATE PIN
                    </span>
                  </div>
                )}

                {!isPrivateLocked && isCapsuleLocked && s.unlockAt && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#040711]/45 p-2 text-center">
                    <Clock className="w-7 h-7 text-[#38e8ff] drop-shadow-[0_0_12px_rgba(56,232,255,0.85)]" />
                    <span className="font-hud text-[10px] tracking-wider text-[#fff0a8] bg-black/75 border border-[#f5c542] px-2.5 py-0.5 rounded-md tabular-nums">
                      {formatCountdown(s.unlockAt - nowMs)}
                    </span>
                  </div>
                )}

                {hasAudio && !isBlurred && (
                  <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 bg-[#040814]/85 border border-[#f5c542] text-[#fff0a8] rounded-md text-[10px] font-semibold px-1.5 py-0.5">
                    <Mic className="w-3 h-3 text-[#f5c542]" />
                    Spirit Echo
                  </span>
                )}
              </div>

              <h3 className="font-bold text-sm leading-snug text-white line-clamp-2 mb-1.5">
                {s.headline}
              </h3>

              <div className="flex items-center justify-between text-[11px] text-[#9eb0d6]">
                <span className="truncate max-w-[105px]">{s.author}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {replyCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[#38e8ff] font-bold tabular-nums">
                      <MessageCircle className="w-3 h-3" />
                      {replyCount}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Heart className="w-3 h-3 text-[#ff6b8b] fill-[#ff6b8b]" />
                    {s.reactions?.heart || 0}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportCard(s);
                    }}
                    className="p-1 -m-1 text-[#ff8099] hover:text-white transition cursor-pointer"
                    title="Report Story"
                    aria-label="Report Story"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <canvas ref={fxCanvasRef} className="absolute inset-0 w-full h-full z-[6] pointer-events-none" />
    </div>
  );
};
