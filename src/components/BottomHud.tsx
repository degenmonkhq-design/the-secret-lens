import React from 'react';
import { Camera, Compass, Crown, Eye, FlaskConical, Plus, Square, Video } from 'lucide-react';
import { AppMode, ARStory, Language, ProximityRadarInfo } from '../types/story';
import { I18N } from '../utils/i18n';

interface BottomHudProps {
  lang: Language;
  appMode: AppMode;
  stories: ARStory[];
  userLat: number;
  userLng: number;
  radarInfo: ProximityRadarInfo | null;
  gyroLabel: string;
  showGyroPermBtn: boolean;
  showCameraRetryBtn: boolean;
  simulate10mAway: boolean;
  cleanReelMode: boolean;
  cleanCountdown: number;
  isRecordingAR: boolean;
  recordCountdown: number;
  isVipUnlocked: boolean;
  onOpenVipModal: () => void;
  onSwitchMode: (mode: AppMode) => void;
  onRequestGyro: () => void;
  onRetryCamera: () => void;
  onToggleSimulate10m: () => void;
  onStartCleanReel: () => void;
  onExitCleanReel: () => void;
  onStartARRecord: () => void;
  onStopARRecord: () => void;
  onOpenCreate: () => void;
}

export const BottomHud: React.FC<BottomHudProps> = ({
  lang,
  appMode,
  stories,
  userLat,
  userLng,
  radarInfo,
  gyroLabel,
  showGyroPermBtn,
  showCameraRetryBtn,
  simulate10mAway,
  cleanReelMode,
  isRecordingAR,
  recordCountdown,
  isVipUnlocked,
  onOpenVipModal,
  onSwitchMode,
  onRequestGyro,
  onRetryCamera,
  onToggleSimulate10m,
  onStartCleanReel,
  onStartARRecord,
  onStopARRecord,
  onOpenCreate,
}) => {
  const dict = I18N[lang];
  const heat = radarInfo?.heatLevel ?? 0.25;
  const alignPct = radarInfo?.wallAlignmentPct ?? 0;
  const ringGlowShadow = `0 0 ${Math.round(12 + heat * 26)}px rgba(245, 197, 66, ${(0.25 + heat * 0.65).toFixed(2)})`;
  const formattedRecTime = `00:${String(recordCountdown).padStart(2, '0')}`;

  return (
    <>
      {/* Minimal Recording Stop Pill at top center when recording AR Video (HUD menus hidden) */}
      {isRecordingAR && (
        <div className="fixed top-[calc(var(--safe-top)+14px)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#ff4b6e] bg-[#1a050b]/94 shadow-[0_0_26px_rgba(255,75,110,0.6)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff4b6e] shadow-[0_0_8px_#ff4b6e]" />
          <span className="font-hud text-sm font-extrabold text-white tabular-nums">
            {formattedRecTime}
          </span>
          <button
            type="button"
            onClick={onStopARRecord}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff4b6e] text-white text-xs font-extrabold cursor-pointer"
          >
            <Square className="w-3 h-3 fill-white" />
            <span>{dict.stopVideoBtn}</span>
          </button>
        </div>
      )}

      <footer
        className={`fixed left-0 right-0 bottom-0 z-30 w-full max-w-full overflow-x-hidden box-border px-2 sm:px-5 pt-2 pb-[calc(var(--safe-bottom)+12px)] pointer-events-none flex flex-col gap-2 transition-all duration-300 ${
          cleanReelMode || isRecordingAR
            ? 'opacity-0 translate-y-4 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        {/* SECTION 1: COSMIC HOME DASHBOARD — Clean Floating Planets + Two Bold Liquid-Gold Action Buttons + VIP Eternal Pill */}
        {appMode === 'home' && (
          <div className="max-w-2xl mx-auto w-full min-w-0 flex flex-col items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onOpenVipModal}
              className="min-h-[34px] inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-[#f5c542]/75 bg-[#1b1404]/90 text-[#fff4b8] text-[11px] sm:text-xs font-extrabold shadow-[0_0_18px_rgba(245,197,66,0.3)] hover:brightness-110 transition cursor-pointer max-w-full"
            >
              <Crown className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
              <span className="truncate">
                {isVipUnlocked
                  ? '👑 VIP Royal Eternal Active · 100 Years Forever'
                  : '👑 Unlock VIP Royal Eternal ($1 / ₹49) · Star + 60s HD'}
              </span>
            </button>

            <div className="w-full min-w-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onSwitchMode('pin')}
                className="flex-1 min-h-[50px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#fff3b0] via-[#f5c542] to-[#d69214] text-[#1a1000] font-extrabold text-xs min-[390px]:text-sm sm:text-base tracking-wide shadow-[0_10px_34px_rgba(245,197,66,0.52)] hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
              >
                <span className="truncate">{dict.homePinCta}</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchMode('scan')}
                className="flex-1 min-h-[50px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-[#f5c542] bg-gradient-to-r from-[#09183c]/95 via-[#0e2658]/95 to-[#161b48]/95 text-[#fff4b8] font-extrabold text-xs min-[390px]:text-sm sm:text-base tracking-wide shadow-[0_10px_30px_rgba(56,232,255,0.28),0_0_20px_rgba(245,197,66,0.28)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
              >
                <span className="truncate">{dict.homeScanCta}</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: DEDICATED "PIN ON WALL / SPOT" FULL-SCREEN CAMERA BAR */}
        {appMode === 'pin' && (
          <div className="max-w-xl mx-auto w-full min-w-0 flex flex-col items-center gap-2 pointer-events-auto">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {showGyroPermBtn && (
                <button
                  type="button"
                  onClick={onRequestGyro}
                  className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#f5c542]/55 bg-[#081129]/92 text-[#fff0a8] text-xs font-bold cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#f5c542]" />
                  <span>Enable 3D Gyro</span>
                </button>
              )}
              {showCameraRetryBtn && (
                <button
                  type="button"
                  onClick={onRetryCamera}
                  className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#f5c542]/55 bg-[#081129]/92 text-[#fff0a8] text-xs font-bold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#f5c542]" />
                  <span>Enable Camera</span>
                </button>
              )}
            </div>

            <p className="text-[11px] sm:text-xs font-semibold text-[#fff4b8] bg-[#040917]/82 px-3 py-1 rounded-full border border-[#f5c542]/35 text-center max-w-full truncate">
              {dict.pinModeHint} · {gyroLabel}
            </p>

            <button
              type="button"
              onClick={onOpenCreate}
              className="w-full sm:w-auto min-w-[260px] max-w-full min-h-[52px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#fff3b0] via-[#f5c542] to-[#d69214] text-[#1a1000] font-extrabold text-sm sm:text-base tracking-wide shadow-[0_12px_34px_rgba(245,197,66,0.58)] hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.6] shrink-0" />
              <span className="truncate">{dict.pinWallBtn}</span>
            </button>
          </div>
        )}

        {/* SECTION 3: DEDICATED "SCAN & REVEAL" RADAR + VIDEO/REEL RECORDING */}
        {appMode === 'scan' && (
          <>
            <div className="max-w-7xl mx-auto w-full min-w-0 flex items-end justify-between gap-1.5 sm:gap-2.5">
              {/* Golden Heartbeat Sonar Radar + Hot & Cold Treasure Compass */}
              <div className="pointer-events-auto flex flex-col gap-1.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onToggleSimulate10m}
                  className={`self-start max-w-full min-h-[28px] sm:min-h-[30px] inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
                    simulate10mAway
                      ? 'border-[#ff9f43] bg-[#361c05]/92 text-[#ffd8a8] shadow-[0_0_12px_rgba(255,159,67,0.4)]'
                      : 'border-[#38e8ff]/35 bg-[#060d20]/88 text-[#9ec4ea] hover:border-[#38e8ff]/70'
                  }`}
                  title="Test 3-Meter GPS Proximity Lock Indoors"
                >
                  <FlaskConical className="w-3 h-3 text-[#38e8ff] shrink-0" />
                  <span className="truncate">{simulate10mAway ? dict.sim10mOn : dict.sim10mOff}</span>
                </button>

                <div
                  className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#030714]/92 border transition-all duration-300 w-full min-w-0"
                  style={{
                    borderColor: `rgba(245, 197, 66, ${(0.35 + heat * 0.6).toFixed(2)})`,
                    boxShadow: ringGlowShadow,
                  }}
                >
                  <div
                    className="relative w-11 h-11 min-[390px]:w-13 min-[390px]:h-13 sm:w-16 sm:h-16 rounded-full border-2 bg-[radial-gradient(circle,rgba(245,197,66,0.22)_0%,rgba(2,5,14,0.95)_70%)] overflow-hidden shrink-0 transition-all duration-300"
                    style={{
                      borderColor: `rgba(255, 240, 168, ${(0.45 + heat * 0.55).toFixed(2)})`,
                      boxShadow: ringGlowShadow,
                    }}
                  >
                    <div className="absolute inset-2.5 sm:inset-3.5 rounded-full border border-[#f5c542]/35" />
                    <div
                      className="animate-radar-sweep absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 0deg, rgba(245,197,66,0.6) 0deg, transparent 72deg)',
                      }}
                    />
                    {stories.slice(0, 12).map((s) => {
                      const rad = ((s.azimuth || 0) * Math.PI) / 180;
                      const r = Math.min(42, 12 + (Math.min(25, s.distanceMeters || 6) / 25) * 30);
                      const leftPct = 50 + Math.sin(rad) * r;
                      const topPct = 50 - Math.cos(rad) * r;
                      return (
                        <span
                          key={s.id}
                          className={`absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                            s.distanceMeters <= 4.0
                              ? 'bg-[#34f5a8] shadow-[0_0_8px_#34f5a8]'
                              : 'bg-[#f5c542] shadow-[0_0_6px_#f5c542]'
                          }`}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-0.5 text-[10.5px] sm:text-xs min-w-0 flex-1">
                    <div className="font-hud text-[9.5px] sm:text-[11px] text-[#9eb0d6] tabular-nums truncate">
                      GPS: {userLat.toFixed(4)}°, {userLng.toFixed(4)}°
                    </div>
                    <div className="flex items-center gap-1 text-[#fff0a8] font-bold text-[11px] sm:text-sm min-w-0">
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#f5c542] bg-[#f5c542]/15 transition-transform duration-200 shrink-0"
                        style={{ transform: `rotate(${radarInfo ? radarInfo.relYaw : 0}deg)` }}
                      >
                        <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f5c542]" />
                      </span>
                      <span className="truncate tabular-nums">
                        {radarInfo
                          ? `${radarInfo.distanceMeters}m · ${radarInfo.directionArrow}`
                          : 'Scanning 3m Portals...'}
                      </span>
                    </div>
                    {/* 0%-100% Akhand Triple-Lock Wall Alignment Meter */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#091533] overflow-hidden border border-[#f5c542]/25">
                        <div
                          className={`h-full transition-all duration-200 ${
                            radarInfo?.targetLocked
                              ? 'bg-gradient-to-r from-[#34f5a8] to-[#fff0a8]'
                              : 'bg-gradient-to-r from-[#38e8ff] to-[#f5c542]'
                          }`}
                          style={{ width: `${Math.max(4, Math.min(100, alignPct))}%` }}
                        />
                      </div>
                      <span
                        className={`font-hud text-[9.5px] font-extrabold tabular-nums shrink-0 ${
                          radarInfo?.targetLocked ? 'text-[#34f5a8]' : 'text-[#fff0a8]'
                        }`}
                      >
                        {radarInfo?.targetLocked ? '100% LOCKED' : `${alignPct}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Utility Actions: Record AR Video / Reel + Clean Reel Mode */}
              <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0 max-w-[44vw] sm:max-w-none">
                {showGyroPermBtn && (
                  <button
                    type="button"
                    onClick={onRequestGyro}
                    className="min-h-[34px] sm:min-h-[38px] max-w-full inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg border border-[#f5c542]/50 bg-[#081129]/92 text-[#fff0a8] text-[10.5px] sm:text-xs font-bold cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
                    <span className="truncate">Enable 3D Gyro</span>
                  </button>
                )}
                {showCameraRetryBtn && (
                  <button
                    type="button"
                    onClick={onRetryCamera}
                    className="min-h-[34px] sm:min-h-[38px] max-w-full inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg border border-[#f5c542]/50 bg-[#081129]/92 text-[#fff0a8] text-[10.5px] sm:text-xs font-bold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
                    <span className="truncate">Enable Camera</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={isRecordingAR ? onStopARRecord : onStartARRecord}
                  className={`min-h-[38px] sm:min-h-[42px] max-w-full inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border text-[10.5px] sm:text-xs font-extrabold transition cursor-pointer ${
                    isRecordingAR
                      ? 'border-[#ff4b6e] bg-[#4a0c1b]/95 text-white shadow-[0_0_24px_rgba(255,75,110,0.65)]'
                      : 'border-[#f5c542] bg-gradient-to-r from-[#5a0d1d]/95 via-[#2a0a18]/95 to-[#4a3208]/95 text-[#fff0a8] shadow-[0_0_20px_rgba(255,75,110,0.35),0_0_12px_rgba(245,197,66,0.3)] hover:brightness-110'
                  }`}
                >
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff3b5c] shadow-[0_0_8px_#ff3b5c] shrink-0" />
                  <Video className="w-3.5 h-3.5 text-[#fff0a8] shrink-0" />
                  <span className="truncate">
                    {isRecordingAR ? `${dict.stopVideoBtn} (${formattedRecTime})` : dict.recordVideoBtn}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onStartCleanReel}
                  className="min-h-[34px] sm:min-h-[38px] max-w-full inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl border border-[#38e8ff]/55 bg-[#061026]/92 text-[#d6fbff] text-[10.5px] sm:text-xs font-bold shadow-[0_0_18px_rgba(56,232,255,0.22)] hover:bg-[#38e8ff]/20 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#38e8ff] shrink-0" />
                  <span className="truncate">{dict.cleanReel}</span>
                </button>
              </div>
            </div>

            {/* Quick Switch to Pin Here */}
            <div className="flex justify-center w-full min-w-0">
              <button
                type="button"
                onClick={() => onSwitchMode('pin')}
                className="pointer-events-auto max-w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#fff3b0] via-[#f5c542] to-[#d69214] text-[#1a1000] font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_10px_28px_rgba(245,197,66,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.6] shrink-0" />
                <span className="truncate">{dict.pinWallBtn}</span>
              </button>
            </div>
          </>
        )}
      </footer>
    </>
  );
};
