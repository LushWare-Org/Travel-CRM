import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import BRANDING from '../../../config/branding';

/**
 * Same visual language as WhatsAppButton (fixed position, fade-in-after-1s,
 * hover scale) — a phone-blue palette instead of WhatsApp green.
 */
const CallButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <a
      href={`tel:${BRANDING.contact.phone}`}
      aria-label="Call us"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 rounded-full shadow-xl p-4 flex items-center justify-center transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${isHovered ? 'scale-110 shadow-2xl' : 'scale-100 hover:scale-105'}`}
      style={{
        boxShadow: isHovered
          ? '0 20px 40px 0 rgba(59, 130, 246, 0.4), 0 0 30px 0 rgba(59, 130, 246, 0.3)'
          : '0 8px 32px 0 rgba(59, 130, 246, 0.3), 0 4px 16px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <Phone className={`w-[26px] h-[26px] text-white drop-shadow-sm transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`} fill="white" />
    </a>
  );
};

export default CallButton;
