import React from 'react';
import { Flame, Gift, Languages, RefreshCw, Share2, Trash2, Trophy, Volume2, VolumeX, Download } from 'lucide-react';
import { Language } from '../types/story';
import { I18N, formatIndianNumber } from '../utils/i18n';
import { BrandLogo } from './BrandLogo';
import { TejajiEmblem } from './TejajiEmblem';

interface TopHudProps {
  lang: Language;
  cameraActive: boolean;
  cameraFacing: 'environment' | 'user';
  isMuted: boolean;
  tuneEnabled: boolean;
  worldRecordCount: number;
  streakDays: number;
  isInstalled: boolean;
  cleanReelMode: boolean;
  isRecordingAR: boolean;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onToggleLang: () => void;
  onToggleMute: () => void;
  onToggleTune: () => void;
  onOpenRefer: () => void;
  onShareApp: () => void;
  onInstallApp: () => void;
  onClearNotes: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  lang,
  cameraActive,
  cameraFacing,
  isMuted,
  tuneEnabled,
  worldRecordCount,
  streakDays,
  isInstalled,
  cleanReelMode,
  isRecordingAR,
  onToggleCamera,
  onFlipCamera,
  onToggleLang,
  onToggleMute,
  onToggleTune,
  onOpenRefer,
  onShareApp,
  onInstallApp,
  onClearNotes,
}) => {
  const dict = I18N[lang];
  const formattedCount = formatIndianNumber(worldRecordCount);
  const hasGoldenAura = streakDays >= 3;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 px-2.5 sm:px-4 pt-[calc(var(--safe-top)+8px)] pb-2 bg-gradient-to-b from-[#000105]/95 via-[#020617]/72 to-transparent pointer-events-none transition-all duration-300 ${
        cleanReelMode || isRecordingAR
          ? 'opacity-0 -translate-y-3 pointer-events-none'
          : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="max-w-7xl mx-auto pointer-events-auto">
        {/* Row 1: Unclipped Brand Title (Top-Left) + Streak Flame & Sacred Tejaji Maharaj Emblem (Top-Right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <BrandLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div className="shrink-0">
              <h1 className="font-hud text-[13px] sm:text-base md:text-lg font-extrabold tracking-[0.06em] sm:tracking-[0.09em] bg-gradient-to-r from-[#fff5c0] via-[#f5c542] to-[#ffd666] bg-clip-text text-transparent whitespace-nowrap shrink-0 leading-tight">
                THE SECRET LENS
              </h1>
              <p className="text-[10px] sm:text-xs text-[#38e8ff] tracking-wide whitespace-nowrap">
                {lang === 'hi' ? 'दुनिया की बोलती हुई किताब · मुफ़्त AR' : 'The Talking Book of the World · Free AR'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Daily Explorer Streak Flame Badge */}
            <div
              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-extrabold whitespace-nowrap tabular-nums ${
                hasGoldenAura
                  ? 'border-[#ffe98a] bg-gradient-to-r from-[#422c04]/95 to-[#2c1d02]/95 text-[#fff4b8] shadow-[0_0_18px_rgba(245,197,66,0.68)]'
                  : 'border-[#ff9f43]/75 bg-[#291404]/92 text-[#ffd8a8] shadow-[0_0_12px_rgba(255,159,67,0.32)]'
              }`}
              title={hasGoldenAura ? dict.goldenAuraBadge : `${streakDays} ${dict.dayStreakSuffix}`}
            >
              <Flame className="w-3.5 h-3.5 text-[#ff9f43] fill-[#ff9f43] shrink-0" />
              <span>
                {streakDays} {dict.dayStreakSuffix}
              </span>
              {hasGoldenAura && <span className="text-[10px]">👑</span>}
            </div>

            {/* Top-Right Sacred Veer Tejaji Maharaj Golden Emblem */}
            <TejajiEmblem className="shrink-0" />
          </div>
        </div>

        {/* Row 2: Dedicated Wrapping Controls Bar so Brand Title is NEVER squeezed */}
        <nav
          className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-between gap-1.5"
          aria-label="HUD Controls"
        >
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {/* Camera ON / OFF Toggle */}
            <button
              type="button"
              onClick={onToggleCamera}
              className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                cameraActive
                  ? 'border-[#34f5a8]/70 bg-[#06241a]/90 text-[#b8ffe2] shadow-[0_0_12px_rgba(52,245,168,0.28)]'
                  : 'border-[#ff6b8b]/60 bg-[#240914]/90 text-[#ffc4d1]'
              }`}
              title="Toggle Live Camera Stream ON/OFF"
            >
              <span>{cameraActive ? dict.camOn : dict.camOff}</span>
            </button>

            {/* Front / Rear Camera Flip Button */}
            <button
              type="button"
              onClick={onFlipCamera}
              className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#f5c542]/75 bg-[#081229]/92 text-[#fff0a8] text-[11px] sm:text-xs font-extrabold whitespace-nowrap shadow-[0_0_12px_rgba(245,197,66,0.24)] hover:bg-[#172854] transition cursor-pointer"
              title="Flip Rear / Front Selfie Camera"
            >
              <RefreshCw className="w-3 h-3 text-[#38e8ff]" />
              <span>{dict.flipCamera}</span>
              <span className="text-[9px] px-1 py-[1px] rounded bg-[#f5c542]/20 text-[#fff4b8] border border-[#f5c542]/35">
                {cameraFacing === 'user' ? dict.selfieMode : dict.rearMode}
              </span>
            </button>

            {/* Tear-Jerking Peaceful Tune ON / OFF */}
            <button
              type="button"
              onClick={onToggleTune}
              className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                tuneEnabled
                  ? 'border-[#f5c542] bg-[#362809]/92 text-[#fff0a8] shadow-[0_0_14px_rgba(245,197,66,0.35)]'
                  : 'border-white/25 bg-[#081129]/90 text-[#9eb0d6]'
              }`}
              title="Toggle Emotional Ambient Tune"
            >
              <span>{tuneEnabled ? '🔊 Tune: ON' : '🔇 Tune: OFF'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {/* Hindi / EN Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-[11px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#f5c542]/20 transition cursor-pointer"
              title="Switch Hindi / English"
            >
              <Languages className="w-3.5 h-3.5 text-[#f5c542]" />
              <span>हिंदी / EN</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center px-2 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-xs font-bold hover:bg-[#f5c542]/20 transition cursor-pointer"
              title={isMuted ? 'Unmute Audio Whispers' : 'Mute Audio Whispers'}
              aria-label={isMuted ? 'Unmute Audio Whispers' : 'Mute Audio Whispers'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#ff6b8b]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#34f5a8]" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenRefer}
              className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#f5c542] bg-gradient-to-r from-[#2c2108]/92 to-[#1f1606]/92 text-[#fff0a8] text-[11px] sm:text-xs font-bold whitespace-nowrap shadow-[0_0_12px_rgba(245,197,66,0.28)] hover:brightness-110 transition cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-[#f5c542]" />
              <span>{dict.referShort}</span>
            </button>

            <button
              type="button"
              onClick={onShareApp}
              className="min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-[11px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#f5c542]/20 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#38e8ff]" />
              <span className="hidden sm:inline">{dict.share}</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={onInstallApp}
                className="min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#38e8ff]/50 bg-[#081129]/90 text-[#d6fbff] text-[11px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#38e8ff]/20 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#38e8ff]" />
                <span className="hidden sm:inline">{dict.install}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClearNotes}
              className="min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#ff4b6e]/45 bg-[#1a0a16]/90 text-[#ff9cb0] text-[11px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#ff4b6e]/25 transition cursor-pointer"
              title={dict.clearMy}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{dict.clearMy}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Glowing World Record Banner */}
      <div className="mt-1.5 mx-auto max-w-3xl pointer-events-auto rounded-lg border border-[#f5c542]/60 bg-gradient-to-r from-[#140d03]/92 via-[#241905]/94 to-[#140d03]/92 px-3 py-1 text-center shadow-[0_0_20px_rgba(245,197,66,0.2)]">
        <p className="text-[11px] sm:text-xs font-bold text-[#fff4b8] tracking-wide flex items-center justify-center gap-1.5 tabular-nums">
          <Trophy className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
          <span>
            {dict.worldRecordPrefix}: {formattedCount}+ {dict.worldRecordSuffix}
          </span>
        </p>
      </div>
    </header>
  );
};
