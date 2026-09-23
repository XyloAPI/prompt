/**
 * Minimal image shape for gallery cards. Full DB rows (`Image`) and
 * slim client-index rows (`IndexImage`) are both assignable to this.
 */
export type CardImage = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  url: string;
  width?: number | null;
  height?: number | null;
  blurDataUrl?: string | null;
  prompt?: string | null;
  downloads?: number | null;
};
