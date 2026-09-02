import type { ReactNode } from 'react';

interface FilterPanelShellProps {
  children: ReactNode;
}

/**
 * Outer fixed/mobile positioning for the packages and destinations filter
 * sidebars. Kept in one place because both pages' FiltersSidebar.tsx
 * previously duplicated this wrapper, both with the same bug: `top-0
 * z-modal` put the panel above *and* starting behind the sticky header
 * instead of below it. `top-[70px]` (the header's own height, see
 * LushHeader.tsx/Header.tsx `h-[70px]`) starts the panel below the header;
 * `z-prominent` keeps it below `z-header` so the header always wins.
 */
export default function FilterPanelShell({ children }: FilterPanelShellProps) {
  return (
    <div className="w-72 fixed top-[70px] left-0 max-h-[calc(100vh-70px)] z-prominent md:w-96 md:flex-shrink-0 md:fixed md:top-[70px] md:left-0 md:bottom-0 md:right-auto md:h-[calc(100vh-70px)] md:rounded-none 2xl:static 2xl:w-72 2xl:h-auto 2xl:inset-auto 2xl:rounded-2xl">
      {children}
    </div>
  );
}
