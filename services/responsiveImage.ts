export type ResponsiveImageAttrs = {
  srcSet?: string;
  sizes?: string;
};

const LOCAL_COVER_RE = /^\/covers\/.+\.(jpg|jpeg|png)$/i;

export const getResponsiveCoverAttrs = (url: string): ResponsiveImageAttrs => {
  const clean = String(url || '').trim();
  if (!LOCAL_COVER_RE.test(clean)) return {};

  const base = clean.replace(/\.(jpg|jpeg|png)$/i, '');
  return {
    srcSet: `${base}@sm.webp 480w, ${base}@md.webp 768w, ${base}@lg.webp 1200w`,
    sizes: '(max-width: 768px) calc(100vw - 2rem), (max-width: 1280px) calc(50vw - 3rem), 32vw',
  };
};
