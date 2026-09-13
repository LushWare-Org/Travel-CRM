import { useEffect, useState } from 'react';
import { Menu, X, Compass } from 'lucide-react';
import PORTALS from '../config/portals';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Portals', href: '#portals' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur shadow-md' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 font-poppins font-bold text-lg text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Compass size={20} />
          </span>
          LushTravelCloud
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={PORTALS.client.url}
            className="text-sm font-semibold text-brand hover:text-primary-700 transition-colors"
          >
            Client Sign In
          </a>
          <a
            href={PORTALS.management.url}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-primary-700 transition-colors"
          >
            Management Sign In
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-slate-700"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-700"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            <a
              href={PORTALS.client.url}
              className="text-center rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand"
            >
              Client Sign In
            </a>
            <a
              href={PORTALS.management.url}
              className="text-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              Management Sign In
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
