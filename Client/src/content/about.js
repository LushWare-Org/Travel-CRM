// Per-company marketing content for the About page.
// Edit these arrays to tailor the site for each company.

import { Users, Globe, Award, Star, Heart, Shield, Compass, Plane } from 'lucide-react';
export const STORY_PARAGRAPHS = [
  'We are a premier travel agency specializing in providing exceptional travel experiences to our clients. With a wealth of knowledge and expertise in the travel industry, we are committed to delivering unparalleled service and value to every customer.',
  "Whether you're looking for a romantic getaway, an adventure-packed vacation, or a relaxing beach retreat, we've got you covered. With a wide range of travel packages and customizable itineraries, you're sure to find the perfect vacation to suit your individual preferences and budget.",
  'Customer satisfaction is of the utmost importance to us. When you contact our agency, you can expect personalized attention and exceptional service from a team of experienced travel professionals. Our commitment to customer service extends throughout your entire travel experience, ensuring that your trip is everything you hoped it would be and more.',
  "So whether you're planning a weekend getaway or a month-long excursion, let us help you make the most of your travel experience. With our expertise and dedication to excellence, you can rest assured that your vacation will be remembered.",
];

export const STATS = [
  { icon: Users, number: '50K+', label: 'Happy Travelers', color: 'from-brand-500 to-red-500' },
  { icon: Globe, number: '100+', label: 'Destinations', color: 'from-blue-500 to-cyan-500' },
  { icon: Award, number: '15+', label: 'Years Experience', color: 'from-purple-500 to-pink-500' },
  { icon: Star, number: '4.9', label: 'Average Rating', color: 'from-brand-accent-500 to-brand-500' },
];

export const VALUES = [
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

export const TEAM_MEMBERS = [
  {
    name: 'Rajesh Kumar',
    role: 'Founder & CEO',
    image: 'https://i.postimg.cc/T24bpv6W/pexels-photo-1467300.jpg',
    bio: 'Visionary leader with 15+ years in travel industry',
    social: { linkedin: '#', twitter: '#', email: 'rajesh@lushware.org' }
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
    bio: 'Crafting unforgettable journeys since 2021',
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
