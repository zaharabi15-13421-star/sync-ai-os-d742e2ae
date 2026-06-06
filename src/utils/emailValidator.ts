// Strict email validator + domain typo detection.
// Used by registration form to block invalid/typo emails.

export const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export type EmailFormatErrorKind =
  | "empty"
  | "too_long"
  | "no_at"
  | "no_local"
  | "no_domain"
  | "no_dot_in_domain"
  | "tld_too_short"
  | "tld_has_digits"
  | "general";

export interface EmailFormatResult {
  valid: boolean;
  errorKind?: EmailFormatErrorKind;
  message?: string;
}

const ERR_MESSAGES: Record<EmailFormatErrorKind, string> = {
  empty: "Please enter your email address",
  too_long: "Email address is too long (maximum 254 characters)",
  no_at: "Please include an @ in the email address",
  no_local: "Please enter something before the @ symbol",
  no_domain: "Please enter the domain after the @ symbol",
  no_dot_in_domain: "The domain part must contain at least one dot (e.g. gmail.com)",
  tld_too_short: "Please enter a complete email address (e.g. you@example.com)",
  tld_has_digits: "The part after the last dot should only contain letters",
  general: "Please enter a valid email address",
};

function fail(kind: EmailFormatErrorKind): EmailFormatResult {
  return { valid: false, errorKind: kind, message: ERR_MESSAGES[kind] };
}

export function validateEmailFormat(rawInput: string): EmailFormatResult {
  const email = (rawInput ?? "").trim();
  if (!email) return fail("empty");
  if (email.length > 254) return fail("too_long");

  // Dangerous chars
  if (/[\s<>()[\]\\;:",]/.test(email)) return fail("general");

  const atParts = email.split("@");
  if (atParts.length !== 2) return fail(email.includes("@") ? "general" : "no_at");

  const [local, domain] = atParts;
  if (!local) return fail("no_local");
  if (!domain) return fail("no_domain");

  // Local part
  if (local.length > 64) return fail("general");
  if (local.startsWith(".") || local.endsWith(".")) return fail("general");
  if (local.includes("..")) return fail("general");
  if (!/^[a-zA-Z0-9._%+\-]+$/.test(local)) return fail("general");

  // Domain
  if (domain.length < 4) return fail("no_dot_in_domain");
  if (!domain.includes(".")) return fail("no_dot_in_domain");
  if (domain.startsWith(".") || domain.endsWith(".")) return fail("general");
  if (domain.startsWith("-") || domain.endsWith("-")) return fail("general");
  if (domain.includes("..")) return fail("general");

  const labels = domain.split(".");
  for (const lab of labels) {
    if (lab.length < 1 || lab.length > 63) return fail("general");
    if (!/^[a-zA-Z0-9\-]+$/.test(lab)) return fail("general");
    if (lab.startsWith("-") || lab.endsWith("-")) return fail("general");
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || tld.length > 24) return fail("tld_too_short");
  if (!/^[a-zA-Z]+$/.test(tld)) return fail("tld_has_digits");

  if (!STRICT_EMAIL_REGEX.test(email)) return fail("general");

  return { valid: true };
}

// -----------------------------------------------------------------------------
// Typo detection
// -----------------------------------------------------------------------------

export const DOMAIN_TYPO_MAP: Readonly<Record<string, string>> = {
  // gmail
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaail.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmailo.com": "gmail.com",
  "gmaol.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmill.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmaim.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gmail.ocm": "gmail.com",
  // yahoo
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahho.com": "yahoo.com",
  "yaaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.cm": "yahoo.com",
  "yahoo.om": "yahoo.com",
  "yahoomail.com": "yahoo.com",
  // hotmail
  "hotmial.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmall.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "htomail.com": "hotmail.com",
  // outlook
  "outlok.com": "outlook.com",
  "outloot.com": "outlook.com",
  "outloook.com": "outlook.com",
  "outllook.com": "outlook.com",
  "otulook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.cm": "outlook.com",
  "outloo.com": "outlook.com",
  "oulook.com": "outlook.com",
  // icloud
  "iclod.com": "icloud.com",
  "icould.com": "icloud.com",
  "iclould.com": "icloud.com",
  "icloud.co": "icloud.com",
  // proton
  "protonmal.com": "protonmail.com",
  "protonmial.com": "protonmail.com",
  "proton.com": "protonmail.com",
};

export const POPULAR_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "protonmail.com",
  "live.com",
  "msn.com",
] as const;

export const WHITELIST_DOMAINS = new Set([
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.com.au",
  "hotmail.co.uk",
  "hotmail.co.in",
  "live.co.uk",
  "outlook.co.uk",
  "googlemail.com",
  "me.com",
  "mac.com",
  "ymail.com",
  "rocketmail.com",
  "aol.com",
  "aim.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  ...POPULAR_DOMAINS,
]);

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export interface TypoResult {
  isTypo: boolean;
  suggestedDomain?: string;
  suggestedEmail?: string;
}

export function detectEmailTypo(email: string): TypoResult {
  const at = email.lastIndexOf("@");
  if (at < 0) return { isTypo: false };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();

  if (WHITELIST_DOMAINS.has(domain)) return { isTypo: false };

  const mapped = DOMAIN_TYPO_MAP[domain];
  if (mapped) {
    return { isTypo: true, suggestedDomain: mapped, suggestedEmail: `${local}@${mapped}` };
  }

  // Fuzzy against popular
  let best: { dom: string; dist: number } | null = null;
  for (const pop of POPULAR_DOMAINS) {
    const d = levenshtein(domain, pop);
    if (d > 0 && d <= 2 && (best === null || d < best.dist)) best = { dom: pop, dist: d };
  }
  if (best) {
    return { isTypo: true, suggestedDomain: best.dom, suggestedEmail: `${local}@${best.dom}` };
  }

  return { isTypo: false };
}

export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwam.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "guerrillamail.info",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "maildrop.cc",
  "spamgourmet.com",
  "trashmail.at",
  "dispostable.com",
  "tempr.email",
  "fakeinbox.com",
  "getairmail.com",
  "spamfree24.org",
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return DISPOSABLE_DOMAINS.has(email.slice(at + 1).toLowerCase());
}
