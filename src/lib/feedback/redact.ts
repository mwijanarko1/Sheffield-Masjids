const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6 = /\b(?:[A-Fa-f0-9]{1,4}:){3,7}[A-Fa-f0-9]{1,4}\b/g;

// Order matters: header-like and URL userinfo patterns run before generic tokens.
const RULES: ReadonlyArray<[RegExp, string]> = [
  [/\b(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*[:=]\s*[^\n]+/gi, "[redacted-header]"],
  [/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, "[redacted-credential]"],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/gi, "[redacted-credential]@"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[redacted-token]"],
  [
    /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|passwd|session(?:id)?|sig(?:nature)?)\s*[=:]\s*[^\s&"',;]+/gi,
    "[redacted-secret]",
  ],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]"],
  [/(?:\+44|\b0)\s?\d(?:[\s-]?\d){8,10}\b/g, "[redacted-phone]"],
  [IPV4, "[redacted-ip]"],
  [IPV6, "[redacted-ip]"],
  // Long opaque strings that mix letters and digits. Hyphenated slugs stay readable.
  [/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g, "[redacted-token]"],
];

export type Redaction = { text: string; changed: boolean };

export function redactText(input: string): Redaction {
  let text = input;
  for (const [pattern, replacement] of RULES) {
    text = text.replace(pattern, replacement);
  }
  return { text, changed: text !== input };
}
