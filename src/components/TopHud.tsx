import React from 'react';
import {
  ArrowLeft,
  Crown,
  Download,
  Eye,
  Flame,
  Gift,
  HardDriveDownload,
  Languages,
  RefreshCw,
  Share2,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppMode, Language } from '../types/story';
import { I18N, formatIndianNumber } from '../utils/i18n';
import { BrandLogo } from './BrandLogo';
import { TejajiEmblem } from './TejajiEmblem';

interface TopHudProps {
  lang: Language;
  appMode: AppMode;
  cameraActive: boolean;
  cameraFacing: 'environment' | 'user';
  isMuted: boolean;
  tuneEnabled: boolean;
  worldRecordCount: number;
  streakDays: number;
  isVipUnlocked: boolean;
  isInstalled: boolean;
  cleanReelMode: boolean;
  isRecordingAR: boolean;
  onSwitchMode: (mode: AppMode) => void;
  onOpenVipModal: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onToggleLang: () => void;
  onToggleMute: () => void;
  onToggleTune: () => void;
  onOpenRefer: () => void;
  onOpenBackup: () => void;
  onShareApp: () => void;
  onInstallApp: () => void;
  onClearNotes: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  lang,
  appMode,
  cameraActive,
  cameraFacing,
  isMuted,
  tuneEnabled,
  worldRecordCount,
  streakDays,
  isVipUnlocked,
  isInstalled,
  cleanReelMode,
  isRecordingAR,
  onSwitchMode,
  onOpenVipModal,
  onToggleCamera,
  onFlipCamera,
  onToggleLang,
  onToggleMute,
  onToggleTune,
  onOpenRefer,
  onOpenBackup,
  onShareApp,
  onInstallApp,
  onClearNotes,
}) => {
  const dict = I18N[lang];
  const formattedCount = formatIndianNumber(worldRecordCount);
  const hasGoldenAura = streakDays >= 3;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 w-full max-w-full overflow-x-hidden box-border px-2 sm:px-4 pt-[calc(var(--safe-top)+6px)] pb-1.5 bg-gradient-to-b from-[#000105]/95 via-[#020617]/74 to-transparent pointer-events-none transition-all duration-300 ${
        cleanReelMode || isRecordingAR
          ? 'opacity-0 -translate-y-3 pointer-events-none'
          : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full min-w-0 pointer-events-auto">
        {/* Row 1: Unclipped Brand Title (Top-Left) + Streak Flame & Sacred Tejaji Maharaj Emblem (Top-Right) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {appMode !== 'home' && (
              <button
                type="button"
                onClick={() => onSwitchMode('home')}
                className="min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#f5c542]/65 bg-[#081229]/95 text-[#fff0a8] text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap hover:bg-[#162752] transition cursor-pointer shrink-0"
                title={dict.homeModeShort}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#f5c542]" />
                <span className="hidden min-[380px]:inline">{dict.homeModeShort}</span>
              </button>
            )}
            <BrandLogo className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 sm:w-9 sm:h-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="font-hud text-[11px] min-[390px]:text-[12.5px] sm:text-base md:text-lg font-extrabold tracking-[0.03em] min-[390px]:tracking-[0.05em] sm:tracking-[0.09em] bg-gradient-to-r from-[#fff5c0] via-[#f5c542] to-[#ffd666] bg-clip-text text-transparent whitespace-nowrap leading-tight">
                THE SECRET LENS
              </h1>
              <p className="text-[9.5px] sm:text-xs text-[#38e8ff] tracking-wide truncate">
                {lang === 'hi' ? 'दुनिया की बोलती हुई किताब · मुफ़्त AR' : 'The Talking Book of the World · Free AR'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Daily Explorer Streak Flame Badge */}
            <div
              className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border text-[9.5px] min-[390px]:text-[10px] sm:text-xs font-extrabold whitespace-nowrap tabular-nums ${
                hasGoldenAura
                  ? 'border-[#ffe98a] bg-gradient-to-r from-[#422c04]/95 to-[#2c1d02]/95 text-[#fff4b8] shadow-[0_0_18px_rgba(245,197,66,0.68)]'
                  : 'border-[#ff9f43]/75 bg-[#291404]/92 text-[#ffd8a8] shadow-[0_0_12px_rgba(255,159,67,0.32)]'
              }`}
              title={hasGoldenAura ? dict.goldenAuraBadge : `${streakDays} ${dict.dayStreakSuffix}`}
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff9f43] fill-[#ff9f43] shrink-0" />
              <span>
                {streakDays}{' '}
                <span className="hidden min-[380px]:inline">{dict.dayStreakSuffix}</span>
                <span className="min-[380px]:hidden">D</span>
              </span>
              {hasGoldenAura && <span className="text-[9px] sm:text-[10px]">👑</span>}
            </div>

            {/* Top-Right Sacred Veer Tejaji Maharaj Golden Emblem */}
            <TejajiEmblem className="shrink-0" />
          </div>
        </div>

        {/* Row 2: Dedicated Clean Controls Bar */}
        <nav
          className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-between gap-1 sm:gap-1.5 w-full min-w-0"
          aria-label="HUD Controls"
        >
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 min-w-0 max-w-full">
            {appMode !== 'home' && (
              <>
                {/* Camera ON / OFF Toggle */}
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className={`min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
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
                  className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border border-[#f5c542]/75 bg-[#081229]/92 text-[#fff0a8] text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap shadow-[0_0_12px_rgba(245,197,66,0.24)] hover:bg-[#172854] transition cursor-pointer"
                  title="Flip Rear / Front Selfie Camera"
                >
                  <RefreshCw className="w-3 h-3 text-[#38e8ff]" />
                  <span>{dict.flipCamera}</span>
                  <span className="text-[9px] px-1 py-[1px] rounded bg-[#f5c542]/20 text-[#fff4b8] border border-[#f5c542]/35">
                    {cameraFacing === 'user' ? dict.selfieMode : dict.rearMode}
                  </span>
                </button>
              </>
            )}

            {appMode === 'pin' && (
              <button
                type="button"
                onClick={() => onSwitchMode('scan')}
                className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border border-[#38e8ff]/65 bg-[#051833]/92 text-[#d6fbff] text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap hover:bg-[#38e8ff]/20 transition cursor-pointer"
              >
                <Eye className="w-3 h-3 text-[#38e8ff]" />
                <span>Scan & Reveal</span>
              </button>
            )}

            {/* Tear-Jerking Peaceful Tune ON / OFF */}
            <button
              type="button"
              onClick={onToggleTune}
              className={`min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                tuneEnabled
                  ? 'border-[#f5c542] bg-[#362809]/92 text-[#fff0a8] shadow-[0_0_14px_rgba(245,197,66,0.35)]'
                  : 'border-white/25 bg-[#081129]/90 text-[#9eb0d6]'
              }`}
              title="Toggle Emotional Ambient Tune"
            >
              <span>{tuneEnabled ? `🔊 ${dict.tuneOn}` : `🔇 ${dict.tuneOff}`}</span>
            </button>

            {/* VIP Royal Eternal ($1 / ₹49) Quick Access */}
            <button
              type="button"
              onClick={onOpenVipModal}
              className={`min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[10.5px] sm:text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                isVipUnlocked
                  ? 'border-[#fff1a8] bg-gradient-to-r from-[#5a3d06] to-[#2e1e03] text-[#fff4b8] shadow-[0_0_16px_rgba(245,197,66,0.45)]'
                  : 'border-[#f5c542]/80 bg-[#251904]/92 text-[#ffe58f] shadow-[0_0_12px_rgba(245,197,66,0.28)] hover:brightness-110'
              }`}
              title={dict.vipTitle}
            >
              <Crown className="w-3 h-3 text-[#f5c542] shrink-0" />
              <span>{isVipUnlocked ? '👑 VIP' : dict.vipNavBtn}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 min-w-0 max-w-full">
            {/* Hindi / EN Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-[10.5px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#f5c542]/20 transition cursor-pointer"
              title="Switch Hindi / English"
            >
              <Languages className="w-3.5 h-3.5 text-[#f5c542]" />
              <span>हिंदी / EN</span>
            </button>

            {appMode !== 'pin' && (
              <button
                type="button"
                onClick={onToggleMute}
                className="min-h-[32px] sm:min-h-[34px] min-w-[32px] inline-flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-xs font-bold hover:bg-[#f5c542]/20 transition cursor-pointer"
                title={isMuted ? 'Unmute Audio Whispers' : 'Mute Audio Whispers'}
                aria-label={isMuted ? 'Unmute Audio Whispers' : 'Mute Audio Whispers'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#ff6b8b]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#34f5a8]" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBackup}
              className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#34f5a8]/55 bg-[#051a14]/90 text-[#b8ffe2] text-[10.5px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#34f5a8]/20 transition cursor-pointer"
              title={dict.backupTitle}
            >
              <HardDriveDownload className="w-3.5 h-3.5 text-[#34f5a8]" />
              <span className="hidden min-[380px]:inline">{dict.backupShort}</span>
            </button>

            {appMode === 'home' && (
              <>
                <button
                  type="button"
                  onClick={onOpenRefer}
                  className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border border-[#f5c542] bg-gradient-to-r from-[#2c2108]/92 to-[#1f1606]/92 text-[#fff0a8] text-[10.5px] sm:text-xs font-bold whitespace-nowrap shadow-[0_0_12px_rgba(245,197,66,0.28)] hover:brightness-110 transition cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5 text-[#f5c542]" />
                  <span>{dict.referShort}</span>
                </button>

                <button
                  type="button"
                  onClick={onShareApp}
                  className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#f5c542]/40 bg-[#081129]/90 text-[#fff0a8] text-[10.5px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#f5c542]/20 transition cursor-pointer"
                  aria-label={dict.share}
                >
                  <Share2 className="w-3.5 h-3.5 text-[#38e8ff]" />
                  <span className="hidden sm:inline">{dict.share}</span>
                </button>

                {!isInstalled && (
                  <button
                    type="button"
                    onClick={onInstallApp}
                    className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#38e8ff]/50 bg-[#081129]/90 text-[#d6fbff] text-[10.5px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#38e8ff]/20 transition cursor-pointer"
                    aria-label={dict.install}
                  >
                    <Download className="w-3.5 h-3.5 text-[#38e8ff]" />
                    <span className="hidden sm:inline">{dict.install}</span>
                  </button>
                )}
              </>
            )}

            {appMode !== 'pin' && (
              <button
                type="button"
                onClick={onClearNotes}
                className="min-h-[32px] sm:min-h-[34px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#ff4b6e]/45 bg-[#1a0a16]/90 text-[#ff9cb0] text-[10.5px] sm:text-xs font-bold whitespace-nowrap hover:bg-[#ff4b6e]/25 transition cursor-pointer"
                title={dict.clearMy}
                aria-label={dict.clearMy}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{dict.clearMy}</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Glowing World Record Banner (Home Dashboard only so Pin/Scan cameras stay ultra-clean) */}
      {appMode === 'home' && (
        <div className="mt-1.5 mx-auto max-w-3xl w-full min-w-0 pointer-events-auto rounded-lg border border-[#f5c542]/60 bg-gradient-to-r from-[#140d03]/92 via-[#241905]/94 to-[#140d03]/92 px-2.5 sm:px-3 py-1 text-center shadow-[0_0_20px_rgba(245,197,66,0.2)]">
          <p className="text-[10px] sm:text-xs font-bold text-[#fff4b8] tracking-wide flex items-center justify-center gap-1.5 tabular-nums truncate">
            <Trophy className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
            <span className="truncate">
              {dict.worldRecordPrefix}: {formattedCount}+ {dict.worldRecordSuffix}
            </span>
          </p>
        </div>
      )}
    </header>
  );
};
