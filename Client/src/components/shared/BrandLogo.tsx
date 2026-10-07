import BRANDING from '../../config/branding';

/**
 * The brand lockup — `LUSH` over `WARE` — cropped out of the square
 * `BRANDING.company.logoPath` master. Client/public/logo.png is a 1200x1200
 * canvas whose artwork only occupies x107-1091: the wordmark band at y298-673
 * and the second line of the name at y744-876. Rendering the master at header
 * scale therefore shows a mostly-empty transparent square with a ~17px
 * wordmark, so this tight crop is used wherever the logo renders small. Both
 * lines are kept: `WARE` is the second word of the name, not a tagline.
 */
const LOCKUP_PATH = '/logo-lockup.png';

/**
 * The lockup is ~1.70:1, so each variant fixes the artwork height and lets its
 * own box take the width from that (see `w-fit` below).
 *
 * `md` is the light chip the header and its mobile overlay render on the
 * near-black bar: the artwork is a green gradient whose dark end disappears on
 * those surfaces, so it sits on the brand-50 ground (#F0F7F3,
 * Client/src/index.css:51). `rail` is the same artwork with no ground and no
 * padding at all, for the login page's deep-green panel, where a light tile is
 * not wanted; against that ground the artwork's light end measures 6.21:1 and
 * its dark end 2.06:1, so the mark is deliberately dim along its lower half.
 *
 * The crop carries both lines, and `WARE` is 133 of the lockup's 579 px (~23%),
 * so its rendered size follows from the artwork height: `md` gives it ~9px,
 * `rail` ~18px. Dropping `md` to `h-9` was measured to render the hairline at
 * 1.8:1 against the tile at 1x — too faint — so `h-10` is the floor. In the
 * master `WARE`'s strokes are ~5px on 133px letters (3.8% of the glyph height,
 * vs 19.7% for `LUSH`), so it can only read as a light second line, never a
 * crisp one.
 */
const SIZES = {
  md: { tile: 'bg-brand-50 rounded-xl px-3.5 py-2', lockup: 'h-10' },
  rail: { tile: '', lockup: 'h-20' },
};

interface BrandLogoProps {
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * The brand logo. `md` renders it as a light rounded tile — the artwork's dark
 * end disappears on the app's near-black surfaces, so on the header bar it is
 * always shown on the brand-50 ground (#F0F7F3, Client/src/index.css:51).
 * `rail` renders the artwork bare, with no ground or padding, for the login
 * page's deep-green panel; the caller centres it in that panel.
 */
export default function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center justify-center ${SIZES[size].tile} ${className}`}
    >
      <img
        src={LOCKUP_PATH}
        alt={`${BRANDING.company.name} Logo`}
        className={`w-auto object-contain ${SIZES[size].lockup}`}
      />
    </span>
  );
}
