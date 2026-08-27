import { useState } from 'react';
import { Check, Play, X } from 'lucide-react';
import { REVIEW_VIDEOS } from '../../../config/media';

export default function WhyChooseUs() {
  const [selectedVideo, setSelectedVideo] = useState<(typeof REVIEW_VIDEOS)[number] | null>(null);
  const videos = REVIEW_VIDEOS;

  const features = ['Personalized Itineraries', 'Expert Local Guides', 'Best Price Guarantee'];
  const featureDescriptions = [
    'Every journey is uniquely crafted to match your dreams and preferences',
    'Connect with authentic experiences through our expert local guides',
    'Transparent pricing with no hidden fees, your trust matters to us'
  ];

  return (
    <section className="py-12 bg-brand-dark-900 relative overflow-hidden font-opensans">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title Section */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-poppins">
            Why Travel With Us?
          </h2>
          <p className="text-lg text-white">
            We believe in creating unforgettable memories through perfectly curated travel experiences.
          </p>
        </div>

        {/* Alternating Pattern Section */}
        <div className="space-y-12">
          {videos.map((video, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Video - Left/Right */}
              <div className={index % 2 === 1 ? 'md:order-2' : 'md:order-1'}>
                <div className="relative overflow-hidden rounded-xl aspect-[16/9] bg-gray-700 hover:shadow-xl transition-all duration-300 group cursor-pointer max-w-sm">
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
                    className="absolute inset-0 flex items-center justify-center z-raised"
                  >
                    <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/50 transition-all duration-300">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Feature Text - Right/Left */}
              <div className={index % 2 === 1 ? 'md:order-1' : 'md:order-2'}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-row items-start gap-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold text-white mb-2 font-poppins text-left">
                        {features[index]}
                      </h3>
                      <p className="text-gray-300 text-sm text-left leading-relaxed">
                        {featureDescriptions[index]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Popup */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal p-4">
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
