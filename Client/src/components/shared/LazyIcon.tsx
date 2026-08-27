import { useState, useEffect } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

interface LazyIconProps extends Omit<LucideProps, 'size'> {
  /** Name of the lucide-react icon to render (e.g. 'ChevronDown'). */
  name: string;
  /** Icon size in pixels. */
  size?: number;
}

export default function LazyIcon({ name, size = 16, ...props }: LazyIconProps) {
  const [Icon, setIcon] = useState<LucideIcon | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('lucide-react')
      .then(mod => {
        // The dynamic-import module type only exposes concrete named exports;
        // the requested name may not exist in it, so look it up as a record.
        // The module namespace also carries `default`/`icons` (not icons),
        // which is why the cast must go through `unknown`.
        const icon = (mod as unknown as Record<string, LucideIcon | undefined>)[name];
        if (!cancelled && icon) {
          setIcon(() => icon);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [name]);

  if (!Icon) {
    return (
      <span 
        className={props.className} 
        style={{ display: 'inline-block', width: size, height: size }} 
      />
    );
  }

  return <Icon size={size} {...props} />;
}
