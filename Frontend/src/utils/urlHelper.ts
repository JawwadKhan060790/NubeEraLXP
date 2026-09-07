/**
 * Utility to resolve media URLs.
 * Handles both absolute URLs (stored in DB) and relative paths (new implementation).
 */
export const resolveMediaUrl = (url: string | undefined | null): string => {
  if (!url) return '';

  // If it's already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Handle YouTube links
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return url;
  }

  let baseUrl = '';
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  if (envUrl) {
    baseUrl = envUrl.replace(/\/api$/, '');
  } else {
    // Fallback for local development if VITE_API_URL is not set
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      baseUrl = `${window.location.protocol}//${window.location.hostname}:5001`;
    }
  }

  if (baseUrl) {
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  }

  // Final fallback to relative path
  return url;
};

/**
 * Returns a high-quality category-specific Unsplash fallback image when product thumbnails are null or broken.
 */
export const getProductFallbackImage = (categoryName?: string, title?: string): string => {
  const cat = (categoryName || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (cat.includes('robot') || t.includes('robot') || t.includes('lego') || t.includes('vex') || t.includes('sphero') || t.includes('bot')) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('arduino') || cat.includes('microcontroller') || t.includes('arduino') || t.includes('mega') || t.includes('esp32') || t.includes('board') || t.includes('dev')) {
    return 'https://images.unsplash.com/photo-1608564697071-ddf911d837e5?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('sensor') || cat.includes('module') || t.includes('sensor') || t.includes('dht') || t.includes('pir') || t.includes('mpu')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('ai') || cat.includes('machine') || cat.includes('learning') || t.includes('nvidia') || t.includes('jetson') || t.includes('coral') || t.includes('camera') || t.includes('neural')) {
    return 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('stem') || cat.includes('education') || cat.includes('kit') || t.includes('science') || t.includes('crate') || t.includes('circuits')) {
    return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80';
};

/**
 * Returns a beautifully styled, gender-based default avatar SVG as a data URI.
 */
export const getDefaultAvatar = (gender?: string | null): string => {
  const g = (gender || '').toLowerCase().trim();
  
  const maleAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23E0F2FE"/><path d="M50 25c-8.3 0-15 6.7-15 15 0 7.5 5.5 13.8 12.8 14.8.7.1 1.4.2 2.2.2s1.5-.1 2.2-.2c7.3-1 12.8-7.3 12.8-14.8 0-8.3-6.7-15-15-15z" fill="%230284C7"/><path d="M50 58c-16.6 0-30 11.4-30 25.5 0 1.4 1.1 2.5 2.5 2.5h55c1.4 0 2.5-1.1 2.5-2.5C80 69.4 66.6 58 50 58z" fill="%230284C7"/><path d="M35 34c0-3.5 3.5-7.5 15-7.5s15 4 15 7.5c0 0-4-4.5-15-4.5S35 34 35 34z" fill="%230369A1"/></svg>`;

  const femaleAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23FCE7F3"/><path d="M50 22c-10 0-18 8-18 18 0 8 3 13 5 18h26c2-5 5-10 5-18 0-10-8-18-18-18z" fill="%23BE185D"/><path d="M50 26c-7.2 0-13 5.8-13 13 0 6.5 4.8 12 11.1 12.9.6.1 1.2.1 1.9.1s1.3 0 1.9-.1C58.2 51 63 45.5 63 39c0-7.2-5.8-13-13-13z" fill="%23F472B6"/><path d="M37 32c3-4 8-5 13-5s10 1 13 5c-1-3.5-5-5.5-13-5.5s-12 2-13 5.5z" fill="%23BE185D"/><path d="M50 58c-16.6 0-30 11.4-30 25.5 0 1.4 1.1 2.5 2.5 2.5h55c1.4 0 2.5-1.1 2.5-2.5C80 69.4 66.6 58 50 58z" fill="%23DB2777"/></svg>`;

  const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="%23F1F5F9"/><path d="M50 25c-8.3 0-15 6.7-15 15 0 7.5 5.5 13.8 12.8 14.8.7.1 1.4.2 2.2.2s1.5-.1 2.2-.2c7.3-1 12.8-7.3 12.8-14.8 0-8.3-6.7-15-15-15z" fill="%2364748B"/><path d="M50 58c-16.6 0-30 11.4-30 25.5 0 1.4 1.1 2.5 2.5 2.5h55c1.4 0 2.5-1.1 2.5-2.5C80 69.4 66.6 58 50 58z" fill="%2364748B"/></svg>`;

  if (g === 'male') return maleAvatar;
  if (g === 'female') return femaleAvatar;
  return defaultAvatar;
};
