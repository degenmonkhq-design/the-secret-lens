import React from 'react';
import { Camera, Compass, Eye, FlaskConical, Plus, Square, Video } from 'lucide-react';
import { ARStory, Language, ProximityRadarInfo } from '../types/story';
import { I18N } from '../utils/i18n';

interface BottomHudProps {
  lang: Language;
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
  stories,
  userLat,
  userLng,
  radarInfo,
  gyroLabel,
  showGyroPermBtn,
  showCameraRetryBtn,
  simulate10mAway,
  cleanReelMode,
  cleanCountdown,
  isRecordingAR,
  recordCountdown,
  onRequestGyro,
  onRetryCamera,
  onToggleSimulate10m,
  onStartCleanReel,
  onExitCleanReel,
  onStartARRecord,
  onStopARRecord,
  onOpenCreate,
}) => {
  const dict = I18N[lang];
  const heat = radarInfo?.heatLevel ?? 0.25;
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
        className={`fixed left-0 right-0 bottom-0 z-30 px-3 sm:px-5 pt-2 pb-[calc(var(--safe-bottom)+12px)] pointer-events-none flex flex-col gap-2.5 transition-all duration-300 ${
          cleanReelMode || isRecordingAR
            ? 'opacity-0 translate-y-4 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full flex items-end justify-between gap-2.5">
          {/* Golden Heartbeat Sonar Radar + Hot & Cold Treasure Compass */}
          <div className="pointer-events-auto flex flex-col gap-1.5 min-w-0">
            {/* Discreet 3m Lock Simulator Toggle */}
            <button
              type="button"
              onClick={onToggleSimulate10m}
              className={`self-start min-h-[30px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
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
              className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[#030714]/92 border transition-all duration-300 min-w-0"
              style={{
                borderColor: `rgba(245, 197, 66, ${(0.35 + heat * 0.6).toFixed(2)})`,
                boxShadow: ringGlowShadow,
              }}
            >
              <div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 bg-[radial-gradient(circle,rgba(245,197,66,0.22)_0%,rgba(2,5,14,0.95)_70%)] overflow-hidden shrink-0 transition-all duration-300"
                style={{
                  borderColor: `rgba(255, 240, 168, ${(0.45 + heat * 0.55).toFixed(2)})`,
                  boxShadow: ringGlowShadow,
                }}
              >
                <div className="absolute inset-3.5 rounded-full border border-[#f5c542]/35" />
                <div
                  className="animate-radar-sweep absolute inset-0 rounded-full"
                  style={{
                    background:
                      'conic-gradient(from 0deg, rgba(245,197,66,0.6) 0deg, transparent 72deg)',
                  }}
                />
                {stories.slice(0, 12).map((s) => {
                  const rad = ((s.azimuth || 0) * Math.PI) / 180;
                  const r = Math.min(22, 6 + (Math.min(25, s.distanceMeters || 6) / 25) * 16);
                  const left = 27 + Math.sin(rad) * r;
                  const top = 27 - Math.cos(rad) * r;
                  return (
                    <span
                      key={s.id}
                      className={`absolute w-1.5 h-1.5 rounded-full ${
                        s.distanceMeters <= 3
                          ? 'bg-[#34f5a8] shadow-[0_0_8px_#34f5a8]'
                          : 'bg-[#f5c542] shadow-[0_0_6px_#f5c542]'
                      }`}
                      style={{ left: `${left}px`, top: `${top}px` }}
                    />
                  );
                })}
              </div>

              <div className="flex flex-col gap-0.5 text-xs min-w-0">
                <div className="font-hud text-[10px] sm:text-[11px] text-[#9eb0d6] tabular-nums truncate">
                  GPS: {userLat.toFixed(4)}° N, {userLng.toFixed(4)}° E
                </div>
                <div className="flex items-center gap-1.5 text-[#fff0a8] font-bold text-xs sm:text-sm">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#f5c542] bg-[#f5c542]/15 transition-transform duration-200 shrink-0"
                    style={{ transform: `rotate(${radarInfo ? radarInfo.relYaw : 0}deg)` }}
                  >
                    <Compass className="w-3.5 h-3.5 text-[#f5c542]" />
                  </span>
                  <span className="truncate tabular-nums">
                    {radarInfo
                      ? `${radarInfo.distanceMeters}m · ${radarInfo.directionArrow}`
                      : 'Scanning 3m Portals...'}
                  </span>
                </div>
                <div className="text-[11px] text-[#34f5a8] font-semibold truncate">
                  {radarInfo?.inPortalRange ? '💓 Heartbeat Lock · Within 3m' : gyroLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Right Utility Actions: Record AR Video / Reel + Clean Reel Mode */}
          <div className="pointer-events-auto flex flex-col items-end gap-2 shrink-0">
            {showGyroPermBtn && (
              <button
                type="button"
                onClick={onRequestGyro}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#f5c542]/50 bg-[#081129]/92 text-[#fff0a8] text-xs font-bold cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#f5c542]" />
                <span>Enable 3D Gyro</span>
              </button>
            )}
            {showCameraRetryBtn && (
              <button
                type="button"
                onClick={onRetryCamera}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#f5c542]/50 bg-[#081129]/92 text-[#fff0a8] text-xs font-bold cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#f5c542]" />
                <span>Enable Camera</span>
              </button>
            )}

            {/* Glowing Red-and-Gold Record AR Video / Reel Button */}
            <button
              type="button"
              onClick={isRecordingAR ? onStopARRecord : onStartARRecord}
              className={`min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                isRecordingAR
                  ? 'border-[#ff4b6e] bg-[#4a0c1b]/95 text-white shadow-[0_0_24px_rgba(255,75,110,0.65)]'
                  : 'border-[#f5c542] bg-gradient-to-r from-[#5a0d1d]/95 via-[#2a0a18]/95 to-[#4a3208]/95 text-[#fff0a8] shadow-[0_0_20px_rgba(255,75,110,0.35),0_0_12px_rgba(245,197,66,0.3)] hover:brightness-110'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b5c] shadow-[0_0_8px_#ff3b5c]" />
              <Video className="w-3.5 h-3.5 text-[#fff0a8]" />
              <span>
                {isRecordingAR ? `${dict.stopVideoBtn} (${formattedRecTime})` : dict.recordVideoBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={onStartCleanReel}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#38e8ff]/55 bg-[#061026]/92 text-[#d6fbff] text-xs font-bold shadow-[0_0_18px_rgba(56,232,255,0.22)] hover:bg-[#38e8ff]/20 transition cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-4 h-4 text-[#38e8ff]" />
              <span>{dict.cleanReel}</span>
            </button>
          </div>
        </div>

        {/* Magnetic Liquid-Gold Pin CTA */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onOpenCreate}
            className="pointer-events-auto min-h-[48px] inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#fff3b0] via-[#f5c542] to-[#d69214] text-[#1a1000] font-extrabold text-sm sm:text-base tracking-wide shadow-[0_10px_30px_rgba(245,197,66,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.6]" />
            <span>{dict.ctaText.replace(/^\+\s*/, '')}</span>
          </button>
        </div>
      </footer>
    </>
  );
};
