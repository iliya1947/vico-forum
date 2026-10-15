export const PROFILE_BIO_LIMIT = 500;
export const PROFILE_URL_LIMIT = 2048;

export interface ProfileFields {
  bio: string;
  githubUrl: string | null;
  websiteUrl: string | null;
}

export interface ForumProfile extends ProfileFields {
  id: string;
  name: string;
  image: string | null;
  joinedAt: Date;
  role: { slug: string; displayName: string; isSystem: boolean };
  messageCount: number;
  bestAnswerCount: number;
}

export class InvalidProfileError extends Error {}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value || value.length > PROFILE_URL_LIMIT || (/\s/u.test(value) || Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function validateProfileFields(input: ProfileFields): ProfileFields {
  const bio = input.bio.trim();
  if (Array.from(bio).length > PROFILE_BIO_LIMIT || Array.from(bio).some((char) => { const code = char.charCodeAt(0); return code === 127 || (code < 32 && ![9, 10, 13].includes(code)); })) {
    throw new InvalidProfileError('invalid biography');
  }
  const link = (value: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const safe = safeHttpUrl(trimmed);
    if (!safe || safe.length > PROFILE_URL_LIMIT) throw new InvalidProfileError('invalid profile link');
    return safe;
  };
  let githubUrl = link(input.githubUrl);
  if (githubUrl) {
    const url = new URL(githubUrl);
    if (url.hostname !== 'github.com' || url.port || url.search || url.hash || !/^\/[a-z\d][a-z\d-]{0,38}\/?$/i.test(url.pathname)) {
      throw new InvalidProfileError('invalid GitHub profile');
    }
    githubUrl = `https://github.com/${url.pathname.split('/')[1]}`;
  }
  return { bio, githubUrl, websiteUrl: link(input.websiteUrl) };
}
