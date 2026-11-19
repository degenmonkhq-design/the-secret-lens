import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  X,
} from 'lucide-react';
import { Language } from '../types/story';
import { I18N } from '../utils/i18n';
import {
  OWNER_METAMASK_ADDRESS,
  VipLicenseState,
  buildTransakCheckoutUrl,
  sendMetaMaskVipPayment,
  verifyVipCodeOrTx,
} from '../utils/vipPayment';

interface VipUpgradeModalProps {
  open: boolean;
  lang: Language;
  vipLicense: VipLicenseState;
  onUnlocked: (license: VipLicenseState) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({
  open,
  lang,
  vipLicense,
  onUnlocked,
  onClose,
  onToast,
}) => {
  const dict = I18N[lang];
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verifyInput, setVerifyInput] = useState('');
  const [busyMetaMask, setBusyMetaMask] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(`ethereum:${OWNER_METAMASK_ADDRESS}`, {
      width: 220,
      margin: 1,
      color: {
        dark: '#081129',
        light: '#fff9e6',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const transakUrl = buildTransakCheckoutUrl(currency);

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(OWNER_METAMASK_ADDRESS);
      onToast('📋 Owner MetaMask Address copied!');
    } catch {
      onToast(`📋 Wallet: ${OWNER_METAMASK_ADDRESS}`);
    }
  };

  const handleDirectMetaMask = async () => {
    if (busyMetaMask) return;
    setBusyMetaMask(true);
    try {
      const res = await sendMetaMaskVipPayment();
      if (res.ok && res.txHash) {
        onUnlocked({
          unlocked: true,
          method: 'metamask',
          txHash: res.txHash,
          unlockedAt: Date.now(),
        });
        onToast('👑 VIP Royal Eternal Unlocked Forever via MetaMask!');
        onClose();
      } else {
        onToast(`⚠️ ${res.error || 'MetaMask payment unavailable.'}`);
      }
    } finally {
      setBusyMetaMask(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lic = verifyVipCodeOrTx(verifyInput);
    if (!lic) {
      onToast('❌ Enter a valid Ethereum txHash (0x...) or VIP code.');
      return;
    }
    onUnlocked(lic);
    setVerifyInput('');
    onToast('👑 VIP Royal Eternal Permanently Unlocked!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] bg-[#02050e]/94 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#171206]/98 via-[#0b1530]/98 to-[#040712]/98 border-2 border-[#f5c542] shadow-[0_24px_70px_rgba(0,0,0,0.88),0_0_46px_rgba(245,197,66,0.28)] p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[#f5c542]/35">
          <div>
            <h2 className="font-hud text-sm sm:text-base font-extrabold text-[#fff4b8] flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#f5c542] shrink-0" />
              <span>{dict.vipTitle}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[#38e8ff] mt-0.5 font-semibold">
              {lang === 'hi'
                ? 'एक बार ₹49 / $1 — जीवनभर VIP रॉयल अमर यादें'
                : 'One-Time Lifetime Upgrade · 100 Years Forever Retention'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full border border-[#f5c542]/45 bg-white/5 text-[#fff0a8] flex items-center justify-center hover:bg-[#f5c542]/20 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unlocked Status Banner */}
        {vipLicense.unlocked && (
          <div className="mb-3 rounded-2xl border border-[#34f5a8] bg-[#06241a]/92 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-[#b8ffe2] font-bold">
            <CheckCircle2 className="w-5 h-5 text-[#34f5a8] shrink-0" />
            <div className="min-w-0">
              <div>👑 VIP Royal Eternal Active Forever!</div>
              {vipLicense.txHash && (
                <div className="text-[10px] text-[#8ef7cc] truncate font-mono">
                  Ref: {vipLicense.txHash}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIP Perks Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3.5 text-[11px] sm:text-xs">
          <div className="rounded-xl border border-[#f5c542]/35 bg-[#1b1506]/75 p-2.5 flex items-start gap-2">
            <Crown className="w-4 h-4 text-[#f5c542] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#fff4b8]">3D Diamond-Gold Temple Portal</div>
              <div className="text-[10px] text-[#d9c78f]">Ornate royal crown frame</div>
            </div>
          </div>
          <div className="rounded-xl border border-[#f5c542]/35 bg-[#1b1506]/75 p-2.5 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#ff85a9] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#fff4b8]">Rose-Petal Rain + Fireworks</div>
              <div className="text-[10px] text-[#d9c78f]">+ Divine temple-chime shimmer</div>
            </div>
          </div>
          <div className="rounded-xl border border-[#f5c542]/35 bg-[#1b1506]/75 p-2.5 flex items-start gap-2">
            <Star className="w-4 h-4 text-[#ffe98a] fill-[#ffe98a] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#fff4b8]">Named Golden Star</div>
              <div className="text-[10px] text-[#d9c78f]">Your star shines in Cosmic Home</div>
            </div>
          </div>
          <div className="rounded-xl border border-[#f5c542]/35 bg-[#1b1506]/75 p-2.5 flex items-start gap-2">
            <Video className="w-4 h-4 text-[#38e8ff] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#fff4b8]">60-Second HD Video</div>
              <div className="text-[10px] text-[#d9c78f]">100 Years Forever Archive</div>
            </div>
          </div>
        </div>

        {/* 1. Global Card / UPI / Apple Pay Checkout via Transak */}
        <div className="rounded-2xl border border-[#f5c542]/45 bg-[#09142e]/85 p-3 mb-3">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-extrabold text-[#fff0a8] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#f5c542]" />
              <span>Global Card / UPI / Apple Pay</span>
            </span>
            <div className="inline-flex rounded-xl border border-[#f5c542]/45 bg-[#040917] p-0.5 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  currency === 'INR'
                    ? 'bg-gradient-to-r from-[#fff1aa] to-[#f5c542] text-[#180f00]'
                    : 'text-[#d7e3ff]'
                }`}
              >
                🇮🇳 INR ₹49
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-gradient-to-r from-[#fff1aa] to-[#f5c542] text-[#180f00]'
                    : 'text-[#d7e3ff]'
                }`}
              >
                🇺🇸 USD $1
              </button>
            </div>
          </div>

          <a
            href={transakUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#fff3b0] via-[#f5c542] to-[#d69214] text-[#180f00] font-extrabold text-xs sm:text-sm shadow-[0_8px_24px_rgba(245,197,66,0.42)] hover:brightness-105 transition"
          >
            <span>
              💳 Pay with Card / UPI / Apple Pay ({currency === 'INR' ? '₹49 INR' : '$1 USD'})
            </span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>

        {/* 2. Direct MetaMask Auto-Unlock + Scannable QR */}
        <div className="rounded-2xl border border-[#38e8ff]/40 bg-[#050d22]/90 p-3 mb-3 space-y-2.5">
          <button
            type="button"
            disabled={busyMetaMask}
            onClick={() => void handleDirectMetaMask()}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#ff9f43]/75 bg-gradient-to-r from-[#3a1d06] to-[#231003] text-[#ffe1b8] font-extrabold text-xs sm:text-sm hover:brightness-110 transition cursor-pointer disabled:opacity-60"
          >
            <span>
              {busyMetaMask
                ? '🦊 Awaiting MetaMask Confirmation...'
                : '🦊 Pay Directly via MetaMask (Instant Auto-Unlock)'}
            </span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            {qrDataUrl && (
              <div className="p-2 rounded-2xl bg-[#fff9e6] border-2 border-[#f5c542] shrink-0 shadow-[0_0_20px_rgba(245,197,66,0.3)]">
                <img
                  src={qrDataUrl}
                  alt="Scan Owner MetaMask QR Code"
                  className="w-28 h-28 sm:w-32 sm:h-32 block"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 w-full space-y-2 text-center sm:text-left">
              <div className="text-[11px] font-bold text-[#38e8ff]">
                Scannable Global MetaMask QR (ETH / Polygon / Base)
              </div>
              <div className="rounded-lg bg-[#030712] border border-[#f5c542]/30 px-2.5 py-1.5 font-mono text-[10px] text-[#fff0a8] break-all select-all">
                {OWNER_METAMASK_ADDRESS}
              </div>
              <button
                type="button"
                onClick={() => void handleCopyWallet()}
                className="w-full sm:w-auto min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#f5c542]/55 bg-[#121e42] text-[#fff0a8] text-xs font-extrabold hover:bg-[#1a2c5e] transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#f5c542]" />
                <span>📋 Copy Wallet Address</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Backup Verification Input (txHash or ROYAL100 / TEJAJI777) */}
        <form onSubmit={handleVerifySubmit} className="rounded-2xl border border-white/15 bg-[#040917]/90 p-3">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#fff0a8] mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#34f5a8]" />
            <span>Verify Transaction Hash (0x...) or VIP Unlock Code</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Paste 0x... txHash or ROYAL100 / TEJAJI777"
              className="flex-1 min-w-0 rounded-xl border border-[#f5c542]/35 bg-[#020611] text-white text-xs px-3 py-2.5 focus:outline-none focus:border-[#f5c542]"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 rounded-xl bg-gradient-to-r from-[#34f5a8] to-[#12b878] text-[#031910] font-extrabold text-xs cursor-pointer shrink-0"
            >
              Unlock VIP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
