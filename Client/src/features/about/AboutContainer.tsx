import { Compass, Globe, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { STORY_PARAGRAPHS, TEAM_MEMBERS } from '../../content/about';
import BRANDING from '../../config/branding';
import { HERO_MEDIA } from '../../config/media';
import HeroBackground from '../../components/shared/HeroBackground';

// content/about.js is an untyped JS module (checkJs: false); these interfaces
// describe the exact shapes this container consumes from it.
interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

interface AboutTab {
  id: 'story' | 'mission';
  label: string;
  icon: LucideIcon;
}

const teamMembers: TeamMember[] = TEAM_MEMBERS;
const storyParagraphs: string[] = STORY_PARAGRAPHS;

const heroMedia = HERO_MEDIA.find((m) => m.id === 'v3');

export default function AboutContainer() {
  const [activeTab, setActiveTab] = useState('story');
  // The hovered index was declared but never read in the original About.jsx;
  // keep the setter so the card hover handlers behave identically.
  const [, setHoveredMember] = useState<number | null>(null);

  const tabs: AboutTab[] = [
    { id: 'story', label: 'Our Story', icon: Globe },
    { id: 'mission', label: 'Mission & Vision', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50">
      <div className="relative h-[50vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/60 z-raised"></div>
        {heroMedia && <HeroBackground item={heroMedia} eager />}
        <div className="relative z-elevated h-full flex flex-col items-center justify-center text-white px-4">
          <div className="text-center max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Crafting Dream
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-accent-400 to-brand-accent-400">
                {`Journeys Since ${BRANDING.company.foundedYear}`}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Where passion meets expertise, creating extraordinary travel experiences that last a lifetime
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="flex justify-center mb-16 px-4 sm:px-0">
          <div className="inline-flex bg-white rounded-2xl shadow-lg p-2 gap-2 flex-col sm:flex-row w-full sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-brand-600 to-brand-accent-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-10 md:p-12 mb-20 mx-4 sm:mx-0">
          {activeTab === 'story' && (
            <div>
              <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-black">
                Our Journey Began with a Dream
              </h2>
              <div className="space-y-6 text-sm lg:text-base text-gray-700 leading-relaxed">
                {storyParagraphs.map((paragraph, idx) => (
                  <p key={idx} className="text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mission' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-50 border border-gray-300 p-8 rounded-2xl shadow-sm">
                <h3 className="text-3xl  font-bold mb-4 text-gray-900">Our Mission</h3>
                <p className="text-sm lg:text-base text-gray-700 leading-relaxed text-justify">
                  To inspire and enable meaningful travel experiences by combining local expertise with global reach. We're committed to making every journey seamless, memorable, and transformative, while maintaining the highest standards of service and sustainability.
                </p>
              </div>
              <div className="bg-blue-50 border border-gray-300 p-8 rounded-2xl shadow-sm">
                <h3 className="text-3xl font-bold mb-4 text-gray-900">Our Vision</h3>
                <p className="text-sm lg:text-base text-gray-700 leading-relaxed text-justify">
                  To become the world's most trusted travel companion, known for creating extraordinary experiences that connect people with places and cultures. We envision a future where responsible tourism enriches both travelers and destinations alike.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mb-20">
          <div className="text-center mb-16">
            <div className="inline-block">
            </div>
            <h2 className="text-4xl font-bold mb-8 text-gray-800 font-display">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Passionate professionals dedicated to turning your travel dreams into reality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="group relative"
                onMouseEnter={() => setHoveredMember(idx)}
                onMouseLeave={() => setHoveredMember(null)}
              >
                <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-500">
                  {/* Image Container */}
                  <div className="relative h-80 overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Info Container */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                    <div className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-accent-600 mb-3">
                      {member.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
