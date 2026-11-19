import React from 'react';
import { Copy, Crown, Flame, Sprout, X } from 'lucide-react';
import { Language } from '../types/story';
import { I18N } from '../utils/i18n';
import { getRankBadge } from '../utils/safety';

interface ReferralHubModalProps {
  open: boolean;
  lang: Language;
  invites: number;
  onClose: () => void;
  onChallengeFriend: () => void;
  onCopyLink: () => void;
}

export const ReferralHubModal: React.FC<ReferralHubModalProps> = ({
  open,
  lang,
  invites,
  onClose,
  onChallengeFriend,
  onCopyLink,
}) => {
  if (!open) return null;

  const dict = I18N[lang];
  const currentBadge = getRankBadge(invites);
  const progressPct = Math.min(100, Math.max(8, (invites / 10) * 100));
  const refUrl = `${window.location.href.split('?')[0]}?ref=pioneer`;
  const waText = `🌍✨ I just pinned a 3D Hologram in the air using THE SECRET LENS (दुनिया की बोलती हुई किताब)! 100% Free AR World Record App. Join & unlock your message here: ${refUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0b1634]/95 to-[#040712]/98 border-[1.5px] border-[#f5c542]/45 shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-5">
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#f5c542]/25">
          <h2 className="font-hud text-base font-bold text-[#fff0a8]">{dict.referHubTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#f5c542]/40 bg-white/5 text-[#fff0a8] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-2">
          <div className="text-xl font-extrabold text-[#fff0a8]">{currentBadge}</div>
          <p className="text-sm text-[#9eb0d6] mt-1 tabular-nums">
            {dict.invitesCount}: <strong className="text-[#38e8ff]">{invites}</strong>
          </p>
          <div className="w-full h-3 rounded-full bg-white/10 border border-[#f5c542]/35 overflow-hidden my-3">
            <div
              className="h-full bg-gradient-to-r from-[#34f5a8] via-[#f5c542] to-[#fff1a8] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="p-2.5 rounded-xl border border-[#f5c542] bg-[#f5c542]/15 text-[#fff0a8] text-center text-xs">
            <Sprout className="w-5 h-5 mx-auto mb-1 text-[#34f5a8]" />
            <div className="font-bold">Explorer</div>
            <div className="text-[11px] text-[#9eb0d6]">0 Invites</div>
          </div>

          <div
            className={`p-2.5 rounded-xl border text-center text-xs ${
              invites >= 3
                ? 'border-[#f5c542] bg-[#f5c542]/15 text-[#fff0a8]'
                : 'border-white/15 bg-white/5 text-[#9eb0d6]'
            }`}
          >
            <Flame className="w-5 h-5 mx-auto mb-1 text-[#ff9f43]" />
            <div className="font-bold">Viral Hunter</div>
            <div className="text-[11px]">3+ Invites</div>
          </div>

          <div
            className={`p-2.5 rounded-xl border text-center text-xs ${
              invites >= 10
                ? 'border-[#f5c542] bg-[#f5c542]/15 text-[#fff0a8]'
                : 'border-white/15 bg-white/5 text-[#9eb0d6]'
            }`}
          >
            <Crown className="w-5 h-5 mx-auto mb-1 text-[#f5c542]" />
            <div className="font-bold">WR Legend</div>
            <div className="text-[11px]">10+ Invites</div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#9eb0d6] leading-relaxed mb-4">{dict.referDesc}</p>

        <div className="flex flex-col gap-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onChallengeFriend}
            className="w-full min-h-[46px] inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#fff1aa] via-[#f5c542] to-[#cf8c15] text-[#160e00] font-extrabold text-sm shadow-[0_10px_26px_rgba(245,197,66,0.4)] hover:brightness-105 transition"
          >
            📲 {dict.challengeBtn}
          </a>
          <button
            type="button"
            onClick={onCopyLink}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#f5c542]/45 bg-white/5 text-[#fff0a8] font-bold text-xs hover:bg-[#f5c542]/15 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Invite Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
