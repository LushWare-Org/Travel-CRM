import { useState } from 'react';
import { Globe, Heart, Shield, Award, Users, Compass, Plane, Star, Mail, Linkedin, Twitter } from 'lucide-react';

export default function AboutUs() {
  const [activeTab, setActiveTab] = useState('story');
  const [hoveredMember, setHoveredMember] = useState(null);

  const stats = [
    { icon: Users, number: '50K+', label: 'Happy Travelers', color: 'from-orange-500 to-red-500' },
    { icon: Globe, number: '100+', label: 'Destinations', color: 'from-blue-500 to-cyan-500' },
    { icon: Award, number: '15+', label: 'Years Experience', color: 'from-purple-500 to-pink-500' },
    { icon: Star, number: '4.9', label: 'Average Rating', color: 'from-yellow-500 to-orange-500' },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Passion for Travel',
      description: 'We live and breathe travel, bringing authentic experiences to every journey we craft.',
      gradient: 'from-red-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Your safety is our priority. We ensure secure bookings and reliable travel partners.',
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      icon: Compass,
      title: 'Personalized Journeys',
      description: 'Every traveler is unique. We tailor experiences that match your dreams perfectly.',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      icon: Plane,
      title: '24/7 Support',
      description: 'Around the clock assistance wherever you are in the world. We\'ve got your back.',
      gradient: 'from-purple-500 to-violet-500'
    },
  ];

  const team = [
    {
      name: 'Rajesh Kumar',
      role: 'Founder & CEO',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Visionary leader with 15+ years in travel industry',
      social: { linkedin: '#', twitter: '#', email: 'rajesh@tripskyway.com' }
    },
    {
      name: 'Priya Sharma',
      role: 'Head of Operations',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Expert in streamlining travel experiences globally',
    },
    {
      name: 'Amit Patel',
      role: 'Lead Travel Designer',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Crafting unforgettable journeys since 2010',
    },
    {
      name: 'Sneha Reddy',
      role: 'Customer Experience Manager',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Passionate about creating memorable moments',
    },
    {
      name: 'Vikram Singh',
      role: 'International Relations Head',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Building bridges across continents',
    },
    {
      name: 'Anjali Mehta',
      role: 'Marketing Director',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Storyteller bringing destinations',
    },
    {
      name: 'Karan Desai',
      role: 'Technology Lead',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Innovating the future of travel tech',
    },
    {
      name: 'Meera Iyer',
      role: 'Sustainability Officer',
      image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
      bio: 'Champion of responsible tourism',
    },
  ];

  const tabs = [
    { id: 'story', label: 'Our Story', icon: Globe },
    { id: 'mission', label: 'Mission & Vision', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      <div className="relative h-[50vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/60 z-10"></div>
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/v5.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-white px-4">
          <div className="text-center max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Crafting Dream
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400">
                Journeys Since 2010
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Where passion meets expertise, creating extraordinary travel experiences that last a lifetime
            </p>
          </div>
        </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="flex justify-center mb-16">
          <div className="inline-flex bg-white rounded-2xl shadow-lg p-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-white shadow-md'
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
        <div className="bg-white rounded-3xl shadow-lg p-12 mb-20">
          {activeTab === 'story' && (
            <div>
              <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-black">
                Our Journey Began with a Dream
              </h2>
              <div className="space-y-6 text-md text-gray-700 leading-relaxed">
                <p>
                  TripSkyway is a premier travel agency specializing in providing exceptional travel experiences to its clients. With a wealth of knowledge and expertise in the travel industry, TripSkyway is committed to delivering unparalleled service and value to every customer.
                </p>
                <p>
                  Whether you’re looking for a romantic getaway, an adventure-packed vacation, or a relaxing beach retreat, TripSkyway has you covered. With a wide range of travel packages and customizable itineraries, you’re sure to find the perfect vacation to suit your individual preferences and budget.                
                  </p>
                <p>
                  At TripSkyway, customer satisfaction is of the utmost importance. When you contact the agency, you can expect personalized attention and exceptional service from a team of experienced travel professionals. The agency’s commitment to customer service extends throughout your entire travel experience, ensuring that your trip is everything you hoped it would be and more.
                </p>
                <p>
                  So whether you’re planning a weekend getaway or a month-long excursion, let TripSkyway help you make the most of your travel experience. With their expertise and dedication to excellence, you can rest assured that your vacation will be remembered.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'mission' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-50 border border-gray-300 p-8 rounded-2xl shadow-sm">
                  <h3 className="text-3xl  font-bold mb-4 text-gray-900">Our Mission</h3>
                  <p className="text-md text-gray-700 leading-relaxed">
                    To inspire and enable meaningful travel experiences by combining local expertise with global reach. We're committed to making every journey seamless, memorable, and transformative, while maintaining the highest standards of service and sustainability.
                  </p>
                </div>
                <div className="bg-blue-50 border border-gray-300 p-8 rounded-2xl shadow-sm">
                  <h3 className="text-3xl font-bold mb-4 text-gray-900">Our Vision</h3>
                  <p className="text-md text-gray-700 leading-relaxed">
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
            <h2 className="text-4xl font-bold mb-8 text-gray-800 font-poppins">
             Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Passionate professionals dedicated to turning your travel dreams into reality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, idx) => (
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
                    <div className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-600 mb-3">
                      {member.role}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
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