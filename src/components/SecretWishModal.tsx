import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ARStory, Language, VisualTargetSignature } from '../types/story';
import { I18N } from '../utils/i18n';
import { getInvitesCount } from '../utils/mediaStorage';
import { containsAbuseOrSpam, getRankBadge } from '../utils/safety';

interface SecretWishModalProps {
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
  onPinWish: (wishStory: ARStory) => void;
  onToast: (msg: string) => void;
}

export const SecretWishModal: React.FC<SecretWishModalProps> = ({
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
  onPinWish,
  onToast,
}) => {
  const dict = I18N[lang];
  const [author, setAuthor] = useState('');
  const [wishText, setWishText] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAuthor = author.trim() || 'Cosmic Stargazer';
    const cleanWish = wishText.trim();

    if (!cleanWish) {
      onToast('🌠 Write a wish before releasing it into the universe!');
      return;
    }

    const blocked = containsAbuseOrSpam(`${cleanAuthor} ${cleanWish}`);
    if (blocked) {
      onToast('🛡️ Blocked: Keep cosmic wishes kind, clean, and spam-free.');
      return;
    }

    const invites = getInvitesCount();
    const normalizedHeading = ((Math.round(viewYaw) % 360) + 360) % 360;
    const wishStory: ARStory = {
      id: `wish_${Date.now()}`,
      isDemo: false,
      isWish: true,
      hasGoldenAura: streakDays >= 3,
      author: cleanAuthor,
      rankBadge: getRankBadge(invites),
      category: '🌠 Secret Wish',
      headline: '🌠 Secret Wish Upon a Shooting Star',
      story: cleanWish,
      visibility: 'public',
      pin: '',
      unlockAt: null,
      mediaType: null,
      mediaData: null,
      drawingData: null,
      audioData: null,
      azimuth: Math.round(viewYaw),
      compassHeading: normalizedHeading,
      elevation: Math.round(viewPitch),
      rollGamma: Math.round(viewRoll),
      distanceMeters: 0,
      lat: userLat,
      lng: userLng,
      views: 1,
      reactions: { heart: 1, blessing: 1, mindblown: 0 },
      createdAt: Date.now(),
      replies: [],
      visualTarget: targetSnapshot || null,
    };

    onPinWish(wishStory);
    setWishText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0f1d45]/95 to-[#040814]/98 border-2 border-[#ffe98a]/75 shadow-[0_24px_64px_rgba(0,0,0,0.88),0_0_46px_rgba(245,197,66,0.34)] p-5">
        <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#f5c542]/30">
          <div>
            <h2 className="font-hud text-base sm:text-lg font-extrabold text-[#fff4b8] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f5c542] shrink-0" />
              <span>{dict.wishCaughtTitle}</span>
            </h2>
            <p className="text-xs text-[#b8cdf8] mt-1">{dict.wishCaughtSub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full border border-[#f5c542]/45 bg-white/5 text-[#fff0a8] flex items-center justify-center hover:bg-[#f5c542]/20 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              maxLength={40}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={dict.wishAuthorPlaceholder}
              className="w-full rounded-xl border border-[#f5c542]/40 bg-[#030816]/90 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#f5c542]"
            />
          </div>

          <div>
            <textarea
              maxLength={400}
              rows={4}
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder={dict.wishMessagePlaceholder}
              required
              className="w-full rounded-xl border border-[#f5c542]/40 bg-[#030816]/90 text-white text-sm px-3 py-2.5 leading-relaxed focus:outline-none focus:border-[#f5c542] resize-none"
            />
            <div className="text-right text-[11px] text-[#9eb0d6] mt-1 tabular-nums">
              {wishText.length} / 400
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#fff3b8] via-[#f5c542] to-[#d9951a] text-[#170e00] font-extrabold text-sm shadow-[0_10px_28px_rgba(245,197,66,0.45)] hover:brightness-105 active:scale-[0.99] transition cursor-pointer"
          >
            {dict.sendWishBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
