import { useEffect, useRef, useState } from 'react';
import { Check, Play, X } from 'lucide-react';

export default function WhyChooseUs() {
  const whyRef = useRef(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videos] = useState([
    { name: "Thailand Tour", location: "Thailand", file: "/reviews/maldives7.mp4" },
    { name: "Bali Tour", location: "Bali", file: "/reviews/mauritius.mp4" },
    { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives1.mp4" },
  ]);

  const features = ['Personalized Itineraries', 'Expert Local Guides', 'Best Price Guarantee', '24/7 Customer Support'];
  const featureDescriptions = [
    'Every journey is uniquely crafted to match your dreams and preferences',
    'Connect with authentic experiences through our expert local guides',
    'Transparent pricing with no hidden fees, your trust matters to us',
    'Round-the-clock assistance ensures you are never alone on your journey'
  ];

  return (
    <section className="py-12 bg-[#012a4a] relative overflow-hidden font-opensans" ref={whyRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-poppins">
            Why Travel With Us?
          </h2>
          <p className="text-lg text-white">
            We believe in creating unforgettable memories through perfectly curated travel experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {videos.map((video, index) => (
            <div key={index} className="flex flex-col">
              <div className="relative overflow-hidden rounded-2xl aspect-[16/9] bg-gray-700 hover:shadow-2xl transition-all duration-300 group cursor-pointer">
                <video
                  src={video.file}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  controlsList="nodownload"
                  style={{ pointerEvents: 'none' }}
                />
                <div className="absolute inset-0 bg-black/20 transition-all duration-300"></div>
                {/* Play Icon */}
                <button
                  onClick={() => setSelectedVideo(video)}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/50 transition-all duration-300">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, idx) => (
            <div key={idx} className="flex flex-row items-start gap-4 group">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2 font-poppins text-left">{item}</h3>
                <p className="text-gray-300 text-sm text-left">
                  {featureDescriptions[idx]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Popup */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                src={selectedVideo.file}
                className="w-full h-auto"
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}