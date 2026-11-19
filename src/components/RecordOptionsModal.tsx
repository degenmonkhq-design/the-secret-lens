import React from 'react';
import { Globe2, Mic, User, Video, X } from 'lucide-react';
import { Language } from '../types/story';

export type RecordMessageFilter = 'mine' | 'all';

interface RecordOptionsModalProps {
  open: boolean;
  lang: Language;
  recordingKind?: 'video' | 'reel';
  personalNotesCount: number;
  onSelectMode: (filter: RecordMessageFilter) => void;
  onClose: () => void;
}

export const RecordOptionsModal: React.FC<RecordOptionsModalProps> = ({
  open,
  lang,
  recordingKind = 'video',
  personalNotesCount,
  onSelectMode,
  onClose,
}) => {
  if (!open) return null;

  const isReel = recordingKind === 'reel';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0b1634] to-[#040712] border-[1.5px] border-[#f5c542]/55 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.9),0_0_36px_rgba(245,197,66,0.18)]">
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#f5c542]/25">
          <h3 className="font-hud text-sm sm:text-base font-bold text-[#fff0a8] flex items-center gap-2">
            <Video className="w-4 h-4 text-[#ff4b6e]" />
            <span>
              {lang === 'hi'
                ? isReel
                  ? 'AR रील रिकॉर्डिंग विकल्प'
                  : 'AR वीडियो रिकॉर्डिंग विकल्प'
                : isReel
                  ? 'Choose AR Reel Recording View'
                  : 'Choose AR Video Recording View'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#f5c542]/40 text-[#fff0a8] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#b7c8eb] leading-relaxed mb-4 flex items-start gap-2">
          <Mic className="w-4 h-4 text-[#34f5a8] shrink-0 mt-0.5" />
          <span>
            {lang === 'hi'
              ? 'केवल आपकी असली आवाज़ (माइक) रिकॉर्ड होगी — बैकग्राउंड धुन अपने-आप म्यूट रहेगी ताकि आप आसानी से Reels गाना जोड़ सकें।'
              : 'Records ONLY your real microphone voice (background tune is excluded & paused) so you can add any Reel music later.'}
          </span>
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onSelectMode('mine')}
            className="w-full min-h-[54px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-[1.5px] border-[#f5c542] bg-gradient-to-r from-[#2b1e06] to-[#121933] text-left shadow-[0_0_20px_rgba(245,197,66,0.22)] hover:brightness-110 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[#f5c542]/20 border border-[#f5c542]/50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#fff0a8]" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[#fff4b8]">
                  👤 केवल मेरा मैसेज / Only My Messages
                </div>
                <div className="text-[11px] text-[#9eb0d6]">
                  {personalNotesCount > 0
                    ? `${personalNotesCount} personal AR note(s) visible`
                    : 'Hides demo & other users’ cards'}
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('all')}
            className="w-full min-h-[54px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[#38e8ff]/55 bg-gradient-to-r from-[#091c3d] to-[#060d20] text-left shadow-[0_0_18px_rgba(56,232,255,0.16)] hover:brightness-110 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[#38e8ff]/15 border border-[#38e8ff]/45 flex items-center justify-center shrink-0">
                <Globe2 className="w-4 h-4 text-[#38e8ff]" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[#d6fbff]">
                  🌍 सबके मैसेज / All Messages
                </div>
                <div className="text-[11px] text-[#9eb0d6]">
                  Shows all nearby public floating AR messages
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
