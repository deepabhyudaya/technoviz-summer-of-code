/**
 * Image URL detection utilities
 * Detects image URLs in text content for auto-embedding
 */

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)(?:\?.*)?$/i;

const IMAGE_DOMAINS = [
  "utfs.io/f/",
  "ucarecdn.com/",
  "res.cloudinary.com/",
  "pbs.twimg.com/media/",
  "media.discordapp.net/attachments/",
  "cdn.discordapp.com/attachments/",
  "i.imgur.com/",
  "media.giphy.com/media/",
  "media0.giphy.com/media/",
  "media1.giphy.com/media/",
  "media2.giphy.com/media/",
  "media3.giphy.com/media/",
  "media4.giphy.com/media/",
  "cdn.jsdelivr.net/gh/twitter/twemoji",
];

/**
 * Check if a URL points to an image based on extension or known CDN domains
 */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  // Must start with http/https
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  
  if (IMAGE_EXTENSIONS.test(url)) return true;
  
  // Also trust known image CDN domains even if they lack an extension
  return IMAGE_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Extract all image URLs from text content
 * Supports multiple URLs in a single message
 */
export function extractImageUrls(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  
  // Match URLs in text
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  // Filter to only image URLs
  return matches.filter(isImageUrl);
}

/**
 * Get the first image URL from text, or null if none found
 */
export function getFirstImageUrl(text: string): string | null {
  const urls = extractImageUrls(text);
  return urls[0] || null;
}

/**
 * Check if text contains any image URLs
 */
export function hasImageUrls(text: string): boolean {
  return extractImageUrls(text).length > 0;
}
