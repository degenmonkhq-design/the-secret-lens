import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Eye,
  Film,
  Flag,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { ARStory, Language, Reactions, StoryReply } from '../types/story';
import { I18N, formatCountdown } from '../utils/i18n';
import {
  getInvitesCount,
  loadMediaBlob,
  saveMediaBlob,
} from '../utils/mediaStorage';
import { generateAndDownloadReelPoster } from '../utils/posterGenerator';
import { containsAbuseOrSpam, getRankBadge } from '../utils/safety';
import { attachSpiritEcho } from '../utils/spiritAudio';

interface ReaderModalProps {
  story: ARStory | null;
  lang: Language;
  unlockedIds: Set<string>;
  worldRecordCount: number;
  userLat: number;
  userLng: number;
  onUnlockSuccess: (id: string) => void;
  onClose: () => void;
  onReact: (id: string, type: keyof Reactions) => void;
  onAddReply: (storyId: string, reply: StoryReply) => void;
  onReport: (story: ARStory) => void;
  onRequestDelete: (story: ARStory) => void;
  onToast: (msg: string) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  story,
  lang,
  unlockedIds,
  worldRecordCount,
  userLat,
  userLng,
  onUnlockSuccess,
  onClose,
  onReact,
  onAddReply,
  onReport,
  onRequestDelete,
  onToast,
}) => {
  const dict = I18N[lang];
  const [pinInput, setPinInput] = useState('');
  const [resolvedMedia, setResolvedMedia] = useState<string | null>(null);
  const [resolvedAudio, setResolvedAudio] = useState<string | null>(null);
  const [resolvedReplyAudios, setResolvedReplyAudios] = useState<Record<string, string>>({});
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioSecs, setAudioSecs] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(() => Array(26).fill(24));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [exporting, setExporting] = useState(false);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyAudioData, setReplyAudioData] = useState<string | null>(null);
  const [isRecordingReply, setIsRecordingReply] = useState(false);
  const [replyRecSecsLeft, setReplyRecSecsLeft] = useState(15);
  const [replySubmitting, setReplySubmitting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const replyRecorderRef = useRef<MediaRecorder | null>(null);
  const replyRecTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPinInput('');
    setIsAudioPlaying(false);
    setAudioSecs(0);
    setReplyOpen(false);
    setReplyText('');
    setReplyAudioData(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (replyRecorderRef.current?.state === 'recording') {
      replyRecorderRef.current.stop();
    }

    if (!story) return;

    let cancelled = false;
    (async () => {
      let m = story.mediaData;
      if (!m && story.mediaIdbKey) m = await loadMediaBlob(story.mediaIdbKey);
      let a = story.audioData;
      if (!a && story.audioIdbKey) a = await loadMediaBlob(story.audioIdbKey);

      const replyMap: Record<string, string> = {};
      for (const r of story.replies || []) {
        if (r.audioData) replyMap[r.id] = r.audioData;
        else if (r.audioIdbKey) {
          const blob = await loadMediaBlob(r.audioIdbKey);
          if (blob) replyMap[r.id] = blob;
        }
      }

      if (!cancelled) {
        setResolvedMedia(m || null);
        setResolvedAudio(a || null);
        setResolvedReplyAudios(replyMap);
      }
    })();

    return () => {
      cancelled = true;
      if (replyRecTimerRef.current) window.clearInterval(replyRecTimerRef.current);
    };
  }, [story]);

  useEffect(() => {
    if (!story?.unlockAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [story?.unlockAt]);

  useEffect(() => {
    if (!isAudioPlaying) {
      setBarHeights(Array(26).fill(22));
      return;
    }
    const id = window.setInterval(() => {
      setBarHeights(Array.from({ length: 26 }, () => 20 + Math.random() * 78));
    }, 110);
    return () => window.clearInterval(id);
  }, [isAudioPlaying]);

  if (!story) return null;

  const isPrivateLocked = story.visibility === 'private' && !unlockedIds.has(story.id);
  const isCapsuleLocked = Boolean(story.unlockAt && nowMs < story.unlockAt);

  const handleUnlockPin = () => {
    if (pinInput.trim() === story.pin) {
      onUnlockSuccess(story.id);
      onToast('🔓 Hologram Unlocked!');
    } else {
      onToast('❌ Wrong 4-digit PIN!');
    }
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      attachSpiritEcho(audio, 0);
      audio.play().catch(() => {});
      setIsAudioPlaying(true);
    } else {
      audio.pause();
      setIsAudioPlaying(false);
    }
  };

  const handleDownloadPoster = async () => {
    if (isPrivateLocked || isCapsuleLocked) {
      onToast('🔒 Unlock this hologram first to export its Reel Card!');
      return;
    }
    setExporting(true);
    try {
      const outcome = await generateAndDownloadReelPoster(
        story,
        resolvedMedia,
        worldRecordCount,
        userLat,
        userLng
      );
      onToast(
        outcome === 'shared'
          ? '🎬 9:16 Reel Card Shared & Saved!'
          : '🎬 9:16 Reel / Story Card Downloaded!'
      );
    } catch {
      onToast('⚠️ Could not generate poster on this device.');
    } finally {
      setExporting(false);
    }
  };

  const toggleReplyVoiceRecording = async () => {
    if (isRecordingReply && replyRecorderRef.current?.state === 'recording') {
      replyRecorderRef.current.stop();
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
      replyRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        if (replyRecTimerRef.current) window.clearInterval(replyRecTimerRef.current);
        setIsRecordingReply(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setReplyAudioData(String(reader.result || ''));
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingReply(true);
      setReplyRecSecsLeft(15);

      replyRecTimerRef.current = window.setInterval(() => {
        setReplyRecSecsLeft((prev) => {
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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || replySubmitting) return;
    const cleanAuthor = replyAuthor.trim() || 'Explorer';
    const cleanText = replyText.trim();
    if (!cleanText && !replyAudioData) {
      onToast('💬 Write a reply message or record a 15s voice whisper!');
      return;
    }
    const blocked = containsAbuseOrSpam(`${cleanAuthor} ${cleanText}`);
    if (blocked) {
      onToast('🛡️ Blocked: Keep replies respectful and spam-free.');
      return;
    }

    setReplySubmitting(true);
    try {
      const replyId = `rep_${Date.now()}`;
      let savedAudio = replyAudioData;
      let audioIdbKey: string | null = null;
      if (savedAudio && savedAudio.length > 150000) {
        audioIdbKey = `r_${replyId}`;
        const ok = await saveMediaBlob(audioIdbKey, savedAudio);
        if (ok) savedAudio = null;
      }
      const newReply: StoryReply = {
        id: replyId,
        author: cleanAuthor,
        rankBadge: getRankBadge(getInvitesCount()),
        text: cleanText || '(Voice Whisper Reply)',
        audioData: savedAudio,
        audioIdbKey,
        createdAt: Date.now(),
      };
      onAddReply(story.id, newReply);
      setReplyText('');
      setReplyAudioData(null);
      setReplyOpen(false);
    } finally {
      setReplySubmitting(false);
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
        <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-[#f5c542]/25">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#fff0a8] mb-0.5">
              {story.rankBadge || '🌱 Explorer'} · {story.category}
            </p>
            <h2 className="font-hud text-base sm:text-lg font-bold text-[#fff4b8] leading-snug">
              {story.headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full border border-[#f5c542]/40 bg-white/5 text-[#fff0a8] flex items-center justify-center hover:bg-[#f5c542]/20 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isPrivateLocked ? (
          <div className="py-6 px-2 text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-[#f5c542] drop-shadow-[0_0_12px_rgba(245,197,66,0.75)]" />
            <h3 className="text-lg font-bold text-[#fff0a8] mb-1">{dict.pinGateTitle}</h3>
            <p className="text-sm text-[#9eb0d6] mb-4">
              {story.id === 'demo_private_2'
                ? 'Demo Hint: Enter PIN 1234 to decrypt this secret hologram.'
                : 'Enter the 4-digit PIN to decrypt this memory.'}
            </p>
            <div className="flex items-center justify-center gap-2 max-w-xs mx-auto mb-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="PIN"
                className="w-36 text-center font-hud font-extrabold tracking-[0.35em] rounded-xl border border-[#f5c542]/45 bg-[#030816]/90 text-white py-2.5 px-3 focus:outline-none focus:border-[#f5c542]"
              />
              <button
                type="button"
                onClick={handleUnlockPin}
                className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-[#f5c542] to-[#d4941c] text-[#180f00] font-extrabold text-sm cursor-pointer"
              >
                {dict.unlockBtn}
              </button>
            </div>
          </div>
        ) : isCapsuleLocked && story.unlockAt ? (
          <div className="py-6 px-2 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-[#38e8ff] drop-shadow-[0_0_12px_rgba(56,232,255,0.75)]" />
            <h3 className="text-lg font-bold text-[#38e8ff] mb-1">{dict.capsuleGateTitle}</h3>
            <p className="text-sm text-[#9eb0d6] mb-3">{dict.capsuleGateSub}</p>
            <div className="font-hud inline-block text-base font-bold text-[#fff0a8] bg-black/70 border border-[#f5c542] px-5 py-2.5 rounded-xl tabular-nums mb-4">
              {formatCountdown(story.unlockAt - nowMs)}
            </div>
          </div>
        ) : (
          <div>
            {(resolvedMedia || story.drawingData) && (
              <div className="relative w-full rounded-2xl overflow-hidden bg-[#040814] border border-[#f5c542]/35 mb-3 max-h-80 flex items-center justify-center">
                {resolvedMedia && story.mediaType === 'video' ? (
                  <video src={resolvedMedia} controls playsInline className="w-full max-h-80 object-contain" />
                ) : resolvedMedia ? (
                  <img
                    src={resolvedMedia}
                    alt={story.headline}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-80 object-contain"
                  />
                ) : null}

                {story.drawingData && (
                  <img
                    src={story.drawingData}
                    alt="Neon Air Drawing"
                    className={`${
                      resolvedMedia ? 'absolute inset-0 pointer-events-none' : ''
                    } w-full max-h-80 object-contain drop-shadow-[0_0_14px_rgba(245,197,66,0.9)]`}
                  />
                )}
              </div>
            )}

            {resolvedAudio && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b1838]/85 border border-[#f5c542]/40 mb-3">
                <audio
                  ref={audioRef}
                  src={resolvedAudio}
                  onTimeUpdate={() => setAudioSecs(Math.floor(audioRef.current?.currentTime || 0))}
                  onEnded={() => setIsAudioPlaying(false)}
                />
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f5c542] to-[#d4941c] text-[#180f00] font-extrabold text-xs cursor-pointer shrink-0"
                >
                  {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAudioPlaying ? 'Pause' : 'Spirit Echo'}</span>
                </button>
                <div className="flex-1 h-8 flex items-center gap-1">
                  {barHeights.map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-[#d4941c] to-[#fff0a8] transition-all duration-100"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <span className="font-hud text-xs text-[#fff0a8] tabular-nums">
                  {Math.floor(audioSecs / 60)}:{String(audioSecs % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-[#9eb0d6] mb-2">
              <span>{story.author}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye className="w-3.5 h-3.5 text-[#38e8ff]" />
                {story.views} Views
              </span>
            </div>

            <div className="text-sm sm:text-base leading-relaxed text-[#edf2ff] whitespace-pre-wrap bg-[#030814]/65 border border-white/10 rounded-2xl p-4 mb-4 max-h-64 overflow-y-auto select-text">
              {story.story}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onReact(story.id, 'heart')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#f5c542]/35 bg-white/5 text-white text-xs font-bold hover:bg-[#f5c542]/20 active:scale-105 transition cursor-pointer tabular-nums"
                >
                  <Heart className="w-3.5 h-3.5 text-[#ff6b8b] fill-[#ff6b8b]" />
                  <span>{dict.heart}</span>
                  <span>{story.reactions?.heart || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReact(story.id, 'blessing')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#f5c542]/35 bg-white/5 text-white text-xs font-bold hover:bg-[#f5c542]/20 active:scale-105 transition cursor-pointer tabular-nums"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#fff0a8]" />
                  <span>{dict.blessing}</span>
                  <span>{story.reactions?.blessing || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReact(story.id, 'mindblown')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#f5c542]/35 bg-white/5 text-white text-xs font-bold hover:bg-[#f5c542]/20 active:scale-105 transition cursor-pointer tabular-nums"
                >
                  <Flame className="w-3.5 h-3.5 text-[#ff9f43]" />
                  <span>{dict.mindblown}</span>
                  <span>{story.reactions?.mindblown || 0}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onReport(story)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ff4b6e]/40 text-[#ff98ad] text-xs font-bold hover:bg-[#ff4b6e]/20 transition cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{dict.report}</span>
              </button>
            </div>

            {/* Reply / Duet Secret Story Chain at the Same 3-Meter Spot (Public Unlocked Stories) */}
            {story.visibility === 'public' && (
              <div className="mb-4 pt-3 border-t border-[#38e8ff]/25">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#38e8ff] flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#f5c542] shrink-0" />
                    <span>
                      {dict.repliesHeading} ({story.replies?.length || 0})
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReplyOpen((prev) => !prev)}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#38e8ff]/75 bg-[#082246]/90 text-[#d4f8ff] text-xs font-extrabold hover:bg-[#103468] transition cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#38e8ff]" />
                    <span>{dict.addReplyBtn}</span>
                  </button>
                </div>

                {replyOpen && (
                  <form
                    onSubmit={handleSubmitReply}
                    className="mb-3 p-3 rounded-2xl border border-[#38e8ff]/45 bg-[#051129]/90 space-y-2.5"
                  >
                    <input
                      type="text"
                      maxLength={40}
                      value={replyAuthor}
                      onChange={(e) => setReplyAuthor(e.target.value)}
                      placeholder={dict.wishAuthorPlaceholder}
                      className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-xs sm:text-sm px-3 py-2 focus:outline-none focus:border-[#38e8ff]"
                    />
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={dict.replyPlaceholder}
                      className="w-full rounded-xl border border-[#f5c542]/35 bg-[#030816]/90 text-white text-xs sm:text-sm px-3 py-2 focus:outline-none focus:border-[#38e8ff] resize-none"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleReplyVoiceRecording()}
                        className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold cursor-pointer ${
                          isRecordingReply
                            ? 'border-[#ff4b6e] bg-[#ff4b6e]/25 text-[#ffd5de]'
                            : 'border-[#f5c542]/45 bg-[#0f1e44]/75 text-[#fff0a8]'
                        }`}
                      >
                        {isRecordingReply ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 text-[#ff6b8b]" />
                        )}
                        <span className="tabular-nums">
                          {isRecordingReply
                            ? `Stop (${replyRecSecsLeft}s)`
                            : replyAudioData
                              ? 'Re-record 15s Voice'
                              : '+15s Voice Whisper'}
                        </span>
                      </button>

                      <button
                        type="submit"
                        disabled={replySubmitting}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#38e8ff] to-[#1aa2e8] text-[#021226] font-extrabold text-xs cursor-pointer disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{replySubmitting ? 'Pinning...' : dict.submitReplyBtn}</span>
                      </button>
                    </div>
                  </form>
                )}

                {story.replies && story.replies.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {story.replies.map((rep) => {
                      const repAudioSrc = resolvedReplyAudios[rep.id] || rep.audioData;
                      return (
                        <div
                          key={rep.id}
                          className="rounded-xl border border-white/15 bg-[#061128]/85 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1 text-[11px]">
                            <span className="font-bold text-[#fff0a8]">
                              {rep.rankBadge} · {rep.author}
                            </span>
                            <span className="text-[#8ba2cf]">
                              {new Date(rep.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[#e7efff] whitespace-pre-wrap leading-relaxed">
                            {rep.text}
                          </p>
                          {repAudioSrc && (
                            <audio src={repAudioSrc} controls className="w-full h-7 mt-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            disabled={exporting}
            onClick={handleDownloadPoster}
            className="flex-1 min-w-[200px] min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#fff0a8] bg-gradient-to-r from-[#fff1a8] to-[#f5c542] text-[#160d00] font-extrabold text-sm cursor-pointer disabled:opacity-60"
          >
            <Film className="w-4 h-4" />
            <span>{exporting ? 'Generating 9:16 Poster...' : dict.downloadReel}</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestDelete(story)}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#ff4b6e]/65 bg-[#ff4b6e]/20 text-[#ffb8c6] font-bold text-sm hover:bg-[#ff4b6e]/30 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{dict.deleteMsg}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
