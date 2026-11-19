import React from 'react';
import { Download, Film, Share2, X } from 'lucide-react';
import { Language } from '../types/story';
import { I18N } from '../utils/i18n';

interface RecordedVideoModalProps {
  videoUrl: string | null;
  videoBlob: Blob | null;
  mimeType: string;
  lang: Language;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const RecordedVideoModal: React.FC<RecordedVideoModalProps> = ({
  videoUrl,
  videoBlob,
  mimeType,
  lang,
  onClose,
  onToast,
}) => {
  if (!videoUrl || !videoBlob) return null;

  const dict = I18N[lang];
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const fileName = `the-secret-lens-ar-${Date.now()}.${ext}`;

  const triggerDownload = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('⬇️ AR Video saved to your device!');
  };

  const handleShareVideo = async () => {
    const file = new File([videoBlob], fileName, { type: mimeType || 'video/webm' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'THE SECRET LENS 🌍 | AR Hologram Video',
          text: 'Captured floating 3D AR memories in the sky with THE SECRET LENS! ✨',
          files: [file],
        });
        onToast('📲 Video shared!');
        return;
      } catch {
        // fallback below if cancelled or blocked
      }
    }

    // Fallback: download file + open WhatsApp share text link
    triggerDownload();
    onToast('⬇️ Video downloaded! Opening WhatsApp share link...');
  };

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `🌍✨ I just captured a floating 3D AR Hologram Video on THE SECRET LENS (दुनिया की बोलती हुई किताब)! Try it free: ${window.location.href}`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/94 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0b1634]/98 to-[#040712]/98 border-[1.5px] border-[#f5c542]/55 shadow-[0_24px_64px_rgba(0,0,0,0.9),0_0_40px_rgba(245,197,66,0.2)] p-5">
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#f5c542]/25">
          <h2 className="font-hud text-base sm:text-lg font-bold text-[#fff0a8] flex items-center gap-2">
            <Film className="w-5 h-5 text-[#f5c542]" />
            <span>{dict.videoReadyTitle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#f5c542]/40 bg-white/5 text-[#fff0a8] flex items-center justify-center hover:bg-[#f5c542]/20 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full rounded-2xl overflow-hidden bg-black border border-[#f5c542]/35 mb-4 flex items-center justify-center max-h-[52dvh]">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            className="w-full max-h-[52dvh] object-contain"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={triggerDownload}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#fff1aa] via-[#f5c542] to-[#d69214] text-[#160e00] font-extrabold text-sm shadow-[0_10px_24px_rgba(245,197,66,0.4)] hover:brightness-105 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{dict.saveVideoBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleShareVideo}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#38e8ff]/60 bg-[#0b1f48] text-[#d6fbff] font-extrabold text-sm hover:bg-[#38e8ff]/20 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#38e8ff]" />
            <span>{dict.shareVideoBtn}</span>
          </button>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[40px] inline-flex items-center justify-center rounded-xl border border-[#34f5a8]/40 bg-[#34f5a8]/10 text-[#34f5a8] font-bold text-xs hover:bg-[#34f5a8]/20 transition"
          >
            📲 Open WhatsApp Status / Invite Link
          </a>
        </div>
      </div>
    </div>
  );
};
