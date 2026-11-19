import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Clock,
  Compass,
  FolderOpen,
  Globe,
  Lock,
  Mic,
  MicOff,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { ARStory, Language, MediaKind, VisibilityMode, VisualTargetSignature } from '../types/story';
import { I18N } from '../utils/i18n';
import {
  compressImageFile,
  getInvitesCount,
  getVideoDuration,
  saveMediaBlob,
} from '../utils/mediaStorage';
import { containsAbuseOrSpam, getRankBadge } from '../utils/safety';
import { attachSpiritEcho } from '../utils/spiritAudio';
import { AirDrawPad } from './AirDrawPad';

interface CreationStudioModalProps {
  open: boolean;
  lang: Language;
  viewYaw: number;
  viewPitch: number;
  viewRoll: number;
  targetSnapshot: VisualTargetSignature | null;
  userLat: number;
  userLng: number;
  streakDays: number;
  onClose: () => void;
  onCreated: (story: ARStory) => void;
  onToast: (msg: string) => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const CreationStudioModal: React.FC<CreationStudioModalProps> = ({
  open,
  lang,
  viewYaw,
  viewPitch,
  viewRoll,
  targetSnapshot,
  userLat,
  userLng,
  streakDays,
  onClose,
  onCreated,
  onToast,
}) => {
  const dict = I18N[lang];
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Wisdom & Poetry');
  const [headline, setHeadline] = useState('');
  const [storyText, setStoryText] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode>('public');
  const [pin, setPin] = useState('');
  const [unlockAtStr, setUnlockAtStr] = useState('');

  const [mediaType, setMediaType] = useState<MediaKind>(null);
  const [mediaData, setMediaData] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState('');
  const [drawingData, setDrawingData] = useState<string | null>(null);

  const [audioData, setAudioData] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSecondsLeft, setRecSecondsLeft] = useState(15);

  const [isDictating, setIsDictating] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const liveCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      if (recognitionRef.current && isDictating) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [open, isDictating]);

  if (!open) return null;

  const words = storyText.trim() ? storyText.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const normalizedHeading = ((Math.round(viewYaw) % 360) + 360) % 360;

  const handleStoryChange = (val: string) => {
    const w = val.trim().split(/\s+/).filter(Boolean);
    if (w.length > 2000) {
      setStoryText(w.slice(0, 2000).join(' '));
      onToast('⚠️ Max 2,000 words reached!');
    } else {
      setStoryText(val);
    }
  };

  const toggleVoiceTyping = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      onToast('⚠️ Voice-to-Text not supported on this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    if (isDictating && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const rec = new SpeechRec();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsDictating(true);
      setSpeechStatus('Listening... Speak clearly');
    };
    rec.onresult = (event) => {
      let added = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          added += event.results[i][0].transcript + ' ';
        }
      }
      if (added) {
        setStoryText((prev) => {
          const merged = `${prev} ${added}`.trim();
          const w = merged.split(/\s+/).filter(Boolean);
          return w.length > 2000 ? w.slice(0, 2000).join(' ') : merged;
        });
      }
    };
    rec.onerror = () => {
      setIsDictating(false);
      setSpeechStatus('Mic stopped');
    };
    rec.onend = () => {
      setIsDictating(false);
      setSpeechStatus('');
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const processSelectedFile = async (e: React.ChangeEvent<HTMLInputElement>, sourceLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setMediaStatus(`Compressing ${sourceLabel} photo...`);
      try {
        const compressed = await compressImageFile(file, 720, 0.68);
        setMediaType('image');
        setMediaData(compressed);
        setMediaStatus(`${sourceLabel} Photo ready (${Math.round(compressed.length / 1024)} KB)`);
      } catch {
        onToast('⚠️ Could not process this image.');
        setMediaStatus('');
      }
    } else if (file.type.startsWith('video/')) {
      const duration = await getVideoDuration(file);
      if (duration > 10.6) {
        onToast('⚠️ Please keep video within 10 seconds.');
        e.target.value = '';
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        onToast('⚠️ Video file too large (max 16 MB for offline storage).');
        e.target.value = '';
        return;
      }
      setMediaStatus(`Preparing ${sourceLabel} 10s AR video...`);
      const reader = new FileReader();
      reader.onload = () => {
        setMediaType('video');
        setMediaData(String(reader.result || ''));
        setMediaStatus(`${sourceLabel} Video ready (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecording && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onToast('⚠️ Microphone recording unavailable on this device.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        if (recTimerRef.current) window.clearInterval(recTimerRef.current);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioData(String(reader.result || ''));
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
      setRecSecondsLeft(15);

      recTimerRef.current = window.setInterval(() => {
        setRecSecondsLeft((prev) => {
          if (prev <= 1) {
            if (recorder.state === 'recording') recorder.stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      onToast('⚠️ Microphone permission denied.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanAuthor = author.trim();
    const cleanHeadline = headline.trim();
    const cleanStory = storyText.trim();
    const cleanPin = pin.trim();

    if (!cleanAuthor || !cleanHeadline) {
      onToast('⚠️ Please fill in Author Name and Headline.');
      return;
    }

    if (!cleanStory && !mediaData && !audioData && !drawingData) {
      onToast('⚠️ Add a story, photo/video, Neon Air-Drawing, or voice whisper!');
      return;
    }

    const blocked = containsAbuseOrSpam(`${cleanAuthor} ${cleanHeadline} ${cleanStory}`);
    if (blocked) {
      onToast('🛡️ Blocked: Profanity, hate-speech, or spam is strictly prohibited.');
      return;
    }

    if (visibility === 'private' && !/^\d{4}$/.test(cleanPin)) {
      onToast('🔒 Enter a valid 4-digit numeric PIN!');
      return;
    }

    setSubmitting(true);
    try {
      let unlockAt: number | null = null;
      if (unlockAtStr) {
        const ts = new Date(unlockAtStr).getTime();
        if (ts > Date.now()) unlockAt = ts;
      }

      const id = `user_${Date.now()}`;
      let savedMediaData = mediaData;
      let mediaIdbKey: string | null = null;
      if (savedMediaData && savedMediaData.length > 220000) {
        mediaIdbKey = `m_${id}`;
        const ok = await saveMediaBlob(mediaIdbKey, savedMediaData);
        if (ok) savedMediaData = null;
      }

      let savedAudioData = audioData;
      let audioIdbKey: string | null = null;
      if (savedAudioData && savedAudioData.length > 180000) {
        audioIdbKey = `a_${id}`;
        const ok = await saveMediaBlob(audioIdbKey, savedAudioData);
        if (ok) savedAudioData = null;
      }

      const invites = getInvitesCount();
      const newCard: ARStory = {
        id,
        isDemo: false,
        author: cleanAuthor,
        rankBadge: getRankBadge(invites),
        category,
        headline: cleanHeadline,
        story: cleanStory || '(Multimedia AR Hologram)',
        visibility,
        pin: visibility === 'private' ? cleanPin : '',
        unlockAt,
        mediaType,
        mediaData: savedMediaData,
        mediaIdbKey,
        drawingData,
        audioData: savedAudioData,
        audioIdbKey,
        azimuth: Math.round(viewYaw),
        compassHeading: normalizedHeading,
        elevation: Math.round(viewPitch),
        rollGamma: Math.round(viewRoll),
        distanceMeters: 0,
        lat: userLat,
        lng: userLng,
        views: 1,
        reactions: { heart: 1, blessing: 0, mindblown: 0 },
        createdAt: Date.now(),
        hasGoldenAura: streakDays >= 3,
        replies: [],
        visualTarget: targetSnapshot || null,
      };

      onCreated(newCard);

      setAuthor('');
      setHeadline('');
      setStoryText('');
      setVisibility('public');
      setPin('');
      setUnlockAtStr('');
      setMediaType(null);
      setMediaData(null);
      setMediaStatus('');
      setDrawingData(null);
      setAudioData(null);
      if (liveCameraInputRef.current) liveCameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0b1634]/95 to-[#040712]/98 border-[1.5px] border-[#f5c542]/45 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_36px_rgba(245,197,66,0.16)] p-5">
        <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-[#f5c542]/25">
          <div>
            <h2 className="font-hud text-base sm:text-lg font-bold text-[#fff0a8]">
              {dict.createTitle}
            </h2>
            <p className="font-hud text-[11px] text-[#38e8ff] flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
              <Compass className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
              <span>
                3m Lock · {userLat.toFixed(5)}°, {userLng.toFixed(5)}° · α {normalizedHeading}° · β{' '}
                {Math.round(viewPitch)}° · γ {Math.round(viewRoll)}°
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#f5c542]/40 bg-white/5 text-[#fff0a8] flex items-center justify-center hover:bg-[#f5c542]/20 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {targetSnapshot?.thumbnailDataUrl && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#34f5a8]/45 bg-[#051a14]/85 px-3 py-2">
            <img
              src={targetSnapshot.thumbnailDataUrl}
              alt="Locked Center Reticle Target"
              className="w-10 h-10 rounded-lg object-cover border border-[#f5c542]/70 shrink-0"
            />
            <div className="min-w-0 text-xs">
              <p className="font-bold text-[#b8ffe2]">
                🎯 {lang === 'hi' ? 'सटीक विजुअल टारगेट लॉक कैप्चर हो गया!' : 'Pinpoint Visual + 3D Target Locked!'}
              </p>
              <p className="text-[11px] text-[#9ecdb8] truncate">
                {lang === 'hi'
                  ? 'यह संदेश इसी पत्ती / वस्तु और कोण पर चिपका रहेगा'
                  : 'Message stays anchored to this exact leaf / spot & camera angle'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#fff0a8] mb-1">
                {dict.authorLabel}
              </label>
              <input
                type="text"
                maxLength={40}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Aarav / आरव"
                required
                className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#f5c542]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#fff0a8] mb-1">
                {dict.catLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#f5c542]"
              >
                <option value="Wisdom & Poetry">Wisdom & Poetry</option>
                <option value="Love & Memory">Love & Memory</option>
                <option value="Secret Confession">Secret Confession</option>
                <option value="Time Capsule">Time Capsule</option>
                <option value="Blessing & Peace">Blessing & Peace</option>
                <option value="Urban Mystery">Urban Mystery</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#fff0a8] mb-1">
              {dict.headlineLabel}
            </label>
            <input
              type="text"
              maxLength={90}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="A secret locked at this exact spot..."
              required
              className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#f5c542]"
            />
          </div>

          {/* Dual Video & Photo Input */}
          <div>
            <label className="block text-xs font-bold text-[#fff0a8] mb-1.5">
              {dict.mediaUploadLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                ref={liveCameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => processSelectedFile(e, 'Live')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => liveCameraInputRef.current?.click()}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#f5c542] bg-gradient-to-r from-[#f5c542]/20 to-[#d4941c]/15 text-[#fff0a8] text-xs font-extrabold hover:bg-[#f5c542]/30 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#f5c542] shrink-0" />
                <span>{dict.recordLiveBtn}</span>
              </button>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => processSelectedFile(e, 'Gallery')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#38e8ff]/50 bg-[#0b1b42]/80 text-[#d6fbff] text-xs font-extrabold hover:bg-[#38e8ff]/20 transition cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-[#38e8ff] shrink-0" />
                <span>{dict.uploadGalleryBtn}</span>
              </button>
            </div>
            {mediaStatus && (
              <div className="flex items-center justify-between mt-1.5 text-xs text-[#34f5a8]">
                <span>{mediaStatus}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMediaType(null);
                    setMediaData(null);
                    setMediaStatus('');
                  }}
                  className="text-[#ff9cb0] underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Neon Air-Drawing / Signature Pad */}
          <AirDrawPad
            label={dict.airDrawLabel}
            value={drawingData}
            onChange={setDrawingData}
          />

          {/* 2,000-Word Story + Web Speech Mic */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-[#fff0a8]">{dict.storyLabel}</span>
              <span className="text-[#38e8ff] tabular-nums">{wordCount} / 2000 words</span>
            </div>
            <textarea
              value={storyText}
              onChange={(e) => handleStoryChange(e.target.value)}
              placeholder="Speak or write your heart out into eternity..."
              rows={3}
              className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-sm px-3 py-2.5 leading-relaxed focus:outline-none focus:border-[#f5c542] resize-y"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={toggleVoiceTyping}
                className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                  isDictating
                    ? 'border-[#ff4b6e] bg-[#ff4b6e]/25 text-[#ffd5de]'
                    : 'border-[#f5c542]/45 bg-[#0f1e44]/75 text-[#fff0a8] hover:bg-[#f5c542]/20'
                }`}
              >
                {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isDictating ? 'Stop Mic' : dict.voiceType}</span>
              </button>
              {speechStatus && <span className="text-xs text-[#9eb0d6]">{speechStatus}</span>}
            </div>
          </div>

          {/* 15s Spirit Echo Voice Recorder */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#fff0a8] mb-1">
              <Mic className="w-3.5 h-3.5" />
              <span>{dict.voiceRecLabel}</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                  isRecording
                    ? 'border-[#ff4b6e] bg-[#ff4b6e]/25 text-[#ffd5de]'
                    : 'border-[#f5c542]/45 bg-[#0f1e44]/75 text-[#fff0a8]'
                }`}
              >
                {isRecording ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[#ff6b8b]" />
                )}
                <span className="tabular-nums">
                  {isRecording
                    ? `Stop (${recSecondsLeft}s)`
                    : audioData
                      ? 'Re-record (15s)'
                      : 'Record Spirit Voice (15s)'}
                </span>
              </button>
              {audioData && (
                <button
                  type="button"
                  onClick={() => setAudioData(null)}
                  className="min-h-[40px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ff4b6e]/45 text-[#ff9cb0] text-xs font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            {audioData && (
              <audio
                ref={previewAudioRef}
                src={audioData}
                controls
                onPlay={() => {
                  if (previewAudioRef.current) attachSpiritEcho(previewAudioRef.current, 0);
                }}
                className="w-full h-8 mt-2"
              />
            )}
          </div>

          {/* Public vs Private PIN + Future Time Capsule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#fff0a8] mb-1">
                {dict.privacyLabel}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                    visibility === 'public'
                      ? 'bg-gradient-to-r from-[#f5c542] to-[#d4941c] text-[#180f00] border-[#fff0a8]'
                      : 'border-[#f5c542]/40 bg-[#0f1e44]/70 text-[#fff0a8]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                    visibility === 'private'
                      ? 'bg-gradient-to-r from-[#f5c542] to-[#d4941c] text-[#180f00] border-[#fff0a8]'
                      : 'border-[#f5c542]/40 bg-[#0f1e44]/70 text-[#fff0a8]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private (PIN)</span>
                </button>
              </div>
              {visibility === 'private' && (
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit PIN (e.g. 1234)"
                  required
                  className="w-full mt-2 rounded-xl border border-[#f5c542]/45 bg-[#030816]/90 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f5c542] tracking-widest"
                />
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#fff0a8] mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{dict.capsuleLabel}</span>
              </label>
              <input
                type="datetime-local"
                value={unlockAtStr}
                onChange={(e) => setUnlockAtStr(e.target.value)}
                className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#f5c542]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#fff1aa] via-[#f5c542] to-[#cf8c15] text-[#160e00] font-extrabold text-sm sm:text-base shadow-[0_10px_26px_rgba(245,197,66,0.42)] hover:brightness-105 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Pinning into 3m AR Portal...' : dict.pinSubmitBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
