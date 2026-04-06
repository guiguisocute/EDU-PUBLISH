const R2_MEDIA_PREFIXES = Object.freeze(['attachments', 'img', 'covers']);

const R2_MEDIA_PREFIX_SET = new Set(R2_MEDIA_PREFIXES);

const safeDecodeUriComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeSitePath = (siteUrl) => {
  const clean = String(siteUrl || '').trim().replace(/\\/g, '/');
  if (!clean.startsWith('/')) {
    throw new Error(`Site URL must start with '/': ${siteUrl}`);
  }

  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Site URL is empty: ${siteUrl}`);
  }

  const prefix = segments[0];
  if (!R2_MEDIA_PREFIX_SET.has(prefix)) {
    throw new Error(`Unsupported R2 media prefix: ${prefix}`);
  }

  return segments.map((segment) => {
    const decoded = safeDecodeUriComponent(segment);
    if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) {
      throw new Error(`Invalid R2 media path segment: ${segment}`);
    }
    return decoded;
  });
};

const normalizePublicBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const siteUrlToR2Key = (siteUrl) => normalizeSitePath(siteUrl)
  .map((segment) => encodeURIComponent(segment))
  .join('/');

const siteUrlToR2PublicUrl = (siteUrl, publicBaseUrl) => {
  const base = normalizePublicBaseUrl(publicBaseUrl);
  if (!base) {
    throw new Error('R2 public base URL is required');
  }
  return `${base}/${siteUrlToR2Key(siteUrl)}`;
};

export {
  R2_MEDIA_PREFIXES,
  normalizePublicBaseUrl,
  siteUrlToR2Key,
  siteUrlToR2PublicUrl,
};
