import type { HeroMediaItem } from '../../config/media';

interface HeroBackgroundProps {
  item: HeroMediaItem;
  /** Default true; only HomeContainer's crossfading carousel passes false for inactive layers. */
  isActive?: boolean;
  /** True for the first/only visible layer -> loading="eager" fetchPriority="high". */
  eager?: boolean;
}

export default function HeroBackground({ item, isActive = true, eager = false }: HeroBackgroundProps) {
  const commonImgProps = {
    loading: eager ? ('eager' as const) : ('lazy' as const),
    decoding: eager ? ('auto' as const) : ('async' as const),
    ...(eager ? { fetchPriority: 'high' as const } : {}),
  };

  if (item.kind === 'video') {
    return (
      <>
        <img src={item.poster} alt="" className="absolute inset-0 w-full h-full object-cover" {...commonImgProps} />
        {isActive && (
          <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline preload="none">
            <source src={item.video} type="video/mp4" />
          </video>
        )}
      </>
    );
  }

  return (
    <img
      src={item.src}
      alt=""
      className={`absolute inset-0 w-full h-full object-cover ${isActive ? 'animate-kenburns' : ''}`}
      {...commonImgProps}
    />
  );
}
