import React, { useEffect, useState } from 'react';
import { Copy, Download, Share2, X } from 'lucide-react';
import { ConfirmPromptState } from '../types/story';

interface ConfirmDialogProps {
  state: ConfirmPromptState | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ state, onClose, onToast }) => {
  const [pinVal, setPinVal] = useState('');

  useEffect(() => {
    setPinVal('');
  }, [state]);

  if (!state) return null;

  const handleConfirm = async () => {
    if (state.requirePin && pinVal.trim() !== state.requirePin) {
      onToast('❌ Incorrect 4-digit PIN. Action cancelled.');
      return;
    }
    await state.onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#02050e]/92 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0b1634] to-[#040712] border border-[#f5c542]/50 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-hud text-base font-bold text-[#fff0a8]">{state.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/15 text-[#9eb0d6] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#e5ecff] leading-relaxed mb-4">{state.message}</p>

        {state.requirePin && (
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinVal}
            onChange={(e) => setPinVal(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Enter 4-digit PIN"
            className="w-full mb-4 text-center font-hud tracking-[0.35em] rounded-xl border border-[#f5c542]/45 bg-[#030816] text-white py-2.5 px-3 focus:outline-none focus:border-[#f5c542]"
          />
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[42px] rounded-xl border border-white/20 bg-white/5 text-[#d7e3ff] text-sm font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 min-h-[42px] rounded-xl text-sm font-extrabold cursor-pointer ${
              state.danger
                ? 'bg-[#ff4b6e] text-white'
                : 'bg-gradient-to-r from-[#fff1aa] to-[#f5c542] text-[#160e00]'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface InstallGuideModalProps {
  open: boolean;
  isIOS: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  isIOS,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0b1634] to-[#040712] border border-[#f5c542]/50 p-5 text-center shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f5c542]/25">
          <h3 className="font-hud text-base font-bold text-[#fff0a8] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#38e8ff]" />
            <span>Install THE SECRET LENS</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#f5c542]/40 text-[#fff0a8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#e5ecff] leading-relaxed mb-4">
          Add <strong>THE SECRET LENS</strong> to your Home Screen for full-screen AR launch with zero browser bars.
        </p>

        <div className="text-left rounded-2xl border border-[#f5c542]/30 bg-white/5 p-3.5 text-xs sm:text-sm space-y-2 mb-4">
          {isIOS ? (
            <div>
              <strong>iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> button in the Safari toolbar, then scroll down and tap <strong>Add to Home Screen</strong>.
            </div>
          ) : (
            <>
              <div>
                <strong>Android / Chrome:</strong> Tap the <strong>⋮ Menu</strong> and select <strong>Install App</strong> or <strong>Add to Home screen</strong>.
              </div>
              <div>
                <strong>iPhone / Safari:</strong> Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#fff1aa] to-[#f5c542] text-[#160e00] font-extrabold text-sm cursor-pointer"
        >
          Got It / समझ गया
        </button>
      </div>
    </div>
  );
};

interface ShareAppModalProps {
  open: boolean;
  onClose: () => void;
  onCopyUrl: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ open, onClose, onCopyUrl }) => {
  if (!open) return null;

  const shareText =
    'Experience THE SECRET LENS (दुनिया की बोलती हुई किताब) — 100% Free Cinema-Grade 3D AR App!';
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${window.location.href}`)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02050e]/92 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0b1634] to-[#040712] border border-[#f5c542]/50 p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#f5c542]/25">
          <h3 className="font-hud text-base font-bold text-[#fff0a8] flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#38e8ff]" />
            <span>Share THE SECRET LENS</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#f5c542]/40 text-[#fff0a8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full min-h-[44px] inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#fff1aa] to-[#f5c542] text-[#160e00] font-extrabold text-sm"
          >
            📲 Share on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              onCopyUrl();
              onClose();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#f5c542]/40 bg-white/5 text-[#fff0a8] font-bold text-sm cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Copy App Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
