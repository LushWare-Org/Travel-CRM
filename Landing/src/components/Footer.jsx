import { Compass } from 'lucide-react';
import PORTALS from '../config/portals';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2 font-poppins font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <Compass size={16} />
          </span>
          LushTravelCloud
        </a>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-500">
          <a href="#features" className="hover:text-brand transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-brand transition-colors">How it works</a>
          <a href={PORTALS.management.url} className="hover:text-brand transition-colors">Management Portal</a>
          <a href={PORTALS.client.url} className="hover:text-brand transition-colors">Client Site</a>
        </div>

        <p className="text-sm text-slate-400">&copy; {year} LushTravelCloud. All rights reserved.</p>
      </div>
    </footer>
  );
}
