import type { HeroMediaItem } from '../../config/media';

interface HeroBackgroundProps {
  item: HeroMediaItem;
  /** Default true; only HomeContainer's crossfading carousel passes false for inactive layers. */
  isActive?: boolean;
  /** True for the first/only visible layer -> loading="eager" fetchPriority="high". */
  eager?: boolean;
}

/** Every self-hosted `/lush/**.jpg` asset has a same-name `.webp` sibling
 * generated at ~55-66% of the JPEG's size (Phase 8 image-optimization pass) --
 * this derives that path rather than requiring two fields in the media
 * manifest. Non-`.jpg` sources (none currently, kept for safety) pass
 * through the `<img>` fallback unchanged with no `<source>`. */
const toWebp = (src: string): string | null => (src.endsWith('.jpg') ? src.replace(/\.jpg$/, '.webp') : null);

export default function HeroBackground({ item, isActive = true, eager = false }: HeroBackgroundProps) {
  const commonImgProps = {
    loading: eager ? ('eager' as const) : ('lazy' as const),
    decoding: eager ? ('auto' as const) : ('async' as const),
    ...(eager ? { fetchPriority: 'high' as const } : {}),
  };

  if (item.kind === 'video') {
    const posterWebp = toWebp(item.poster);
    return (
      <>
        <picture>
          {posterWebp && <source srcSet={posterWebp} type="image/webp" />}
          <img src={item.poster} alt="" className="absolute inset-0 w-full h-full object-cover" {...commonImgProps} />
        </picture>
        {isActive && (
          <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline preload="none">
            <source src={item.video} type="video/mp4" />
          </video>
        )}
      </>
    );
  }

  const webp = toWebp(item.src);
  return (
    <picture>
      {webp && <source srcSet={webp} type="image/webp" />}
      <img
        src={item.src}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${isActive ? 'animate-kenburns' : ''}`}
        {...commonImgProps}
      />
    </picture>
  );
}
