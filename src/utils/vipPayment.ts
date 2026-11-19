export const OWNER_METAMASK_ADDRESS = '0x7e180a6353fE135eE30785EB57F4b7791ABf3eB7';
export const VIP_STORAGE_KEY = 'tsl_vip_royal_eternal_v1';
const VALID_VIP_CODES = new Set(['ROYAL100', 'TEJAJI777']);

export interface VipLicenseState {
  unlocked: boolean;
  method?: 'metamask' | 'code' | 'txhash' | 'transak';
  txHash?: string;
  unlockedAt?: number;
}

export function loadVipLicense(): VipLicenseState {
  try {
    const raw = localStorage.getItem(VIP_STORAGE_KEY);
    if (!raw) return { unlocked: false };
    const parsed = JSON.parse(raw) as VipLicenseState;
    return parsed && typeof parsed.unlocked === 'boolean' ? parsed : { unlocked: false };
  } catch {
    return { unlocked: false };
  }
}

export function saveVipLicense(license: VipLicenseState): void {
  try {
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(license));
  } catch {
    // ignore quota error
  }
}

export function verifyVipCodeOrTx(rawInput: string): VipLicenseState | null {
  const cleaned = (rawInput || '').trim();
  if (!cleaned) return null;

  const upper = cleaned.toUpperCase();
  if (VALID_VIP_CODES.has(upper)) {
    const lic: VipLicenseState = {
      unlocked: true,
      method: 'code',
      txHash: upper,
      unlockedAt: Date.now(),
    };
    saveVipLicense(lic);
    return lic;
  }

  // Standard 66-character Ethereum / EVM transaction hash validation
  if (/^0x[a-fA-F0-9]{64}$/.test(cleaned)) {
    const lic: VipLicenseState = {
      unlocked: true,
      method: 'txhash',
      txHash: cleaned,
      unlockedAt: Date.now(),
    };
    saveVipLicense(lic);
    return lic;
  }

  return null;
}

export function buildTransakCheckoutUrl(currency: 'INR' | 'USD'): string {
  const params = new URLSearchParams({
    walletAddress: OWNER_METAMASK_ADDRESS,
    fiatCurrency: currency,
    fiatAmount: currency === 'INR' ? '49' : '1',
    cryptoCurrencyCode: 'ETH',
    disableWalletAddressForm: 'true',
  });
  return `https://global.transak.com/?${params.toString()}`;
}

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export async function sendMetaMaskVipPayment(): Promise<{
  ok: boolean;
  txHash?: string;
  error?: string;
}> {
  const win = window as unknown as { ethereum?: EthereumProvider };
  const ethereum = win.ethereum;
  if (!ethereum || typeof ethereum.request !== 'function') {
    return {
      ok: false,
      error: 'MetaMask wallet not detected in this browser. Scan the QR code or use Card / UPI checkout below.',
    };
  }

  try {
    const accounts = (await ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];
    const from = accounts?.[0];
    if (!from) {
      return { ok: false, error: 'No MetaMask account authorized.' };
    }

    // ~0.00038 ETH (~$1 USD / ₹49) direct transfer to owner's MetaMask wallet
    const txHash = (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: OWNER_METAMASK_ADDRESS,
          value: '0x159a4a6e3e800',
        },
      ],
    })) as string;

    if (txHash && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      saveVipLicense({
        unlocked: true,
        method: 'metamask',
        txHash,
        unlockedAt: Date.now(),
      });
      return { ok: true, txHash };
    }

    return { ok: false, error: 'Transaction was not completed.' };
  } catch (err) {
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'MetaMask transaction cancelled or failed.';
    return { ok: false, error: msg };
  }
}
