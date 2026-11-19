const BLOCKED_TERMS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'slut',
  'whore',
  'cunt',
  'dick',
  'porn',
  'nude',
  'rape',
  'kill yourself',
  'terrorist',
  'nazi',
  'madarchod',
  'bhenchod',
  'bhosdike',
  'chutiya',
  'gandu',
  'harami',
  'kamina',
  'randi',
  'lodu',
  'lauda',
  'chut',
  'bsdk',
  'मादरचोद',
  'बहनचोद',
  'भोसड़ी',
  'चूतिया',
  'गांडू',
  'हरामी',
  'रंडी',
  'कमीना',
  'लौड़ा',
  'चूत',
  'buy now',
  'free bitcoin',
  'crypto giveaway',
  'click here http',
  'xxx',
  'sex chat',
];

export function containsAbuseOrSpam(text: string): string | null {
  const lower = (text || '').toLowerCase();
  for (const term of BLOCKED_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = /^[a-z0-9\s]+$/.test(term)
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(escaped, 'i');
    if (regex.test(lower)) return term;
  }
  if (/(.)\1{14,}/.test(lower)) return 'spam repetition';
  if ((lower.match(/https?:\/\//g) || []).length > 1) return 'spam links';
  return null;
}

export function getRankBadge(invites: number): string {
  if (invites >= 10) return '👑 World Record Legend';
  if (invites >= 3) return '🔥 Viral Hunter';
  return '🌱 Explorer';
}
