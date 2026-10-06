/**
 * The Cuilby mark: the owner's water-drop mascot. The raster in public/brand is
 * the owner's transparent logo, trimmed and padded square by
 * referensi/tools/make-brand.mjs. A plain <img> (not next/image) keeps small
 * sizes from rendering blank.
 */
export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img src="/brand/cuilby-mark.webp" width={size} height={size} alt="" aria-hidden="true" className={className} decoding="async" />
  );
}
