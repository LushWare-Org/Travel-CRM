import type { ReactNode } from 'react';

interface StickyToolbarProps {
  children: ReactNode;
}

/**
 * Sticky positioning shell for the packages/destinations page toolbars.
 * `top-[70px]` matches the header's actual height — both Toolbar.tsx copies
 * previously used `top-16` (64px), 6px short of the header's 70px, causing
 * a sliver of overlap at equal z-index once both were stuck.
 */
export default function StickyToolbar({ children }: StickyToolbarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 mb-4 md:mb-6 sticky top-[70px] z-header">
      {children}
    </div>
  );
}
