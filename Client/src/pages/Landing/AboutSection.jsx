import { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Shield,
  Star,
  Heart,
  TrendingUp
} from 'lucide-react';

export default function AboutSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    customisation: 0,
    concierge: 0,
    visaSuccess: 0,
    travelers: 0
  });

  useEffect(() => {
    setIsVisible(true);

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = {
      customisation: 100,
      concierge: 24,
      visaSuccess: 100,
      travelers: 11000
    };

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedStats({
        customisation: Math.floor(targets.customisation * progress),
        concierge: Math.floor(targets.concierge * progress),
        visaSuccess: Math.floor(targets.visaSuccess * progress),
        travelers: Math.floor(targets.travelers * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(targets);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Users,
      title: "Expert Travel Consultants",
      description: "Personalized guidance from experienced travel professionals"
    },
    {
      icon: Shield,
      title: "Secure Bookings",
      description: "Safe and protected payment processing for peace of mind"
    },
    {
      icon: Heart,
      title: "Customer Satisfaction",
      description: "Rated 4.9/5 by thousands of happy travelers"
    },
    {
      icon: TrendingUp,
      title: "Best Price Guarantee",
      description: "Competitive rates with transparent pricing"
    }
  ];

  return (
    <section className="py-2 bg-white relative overflow-hidden">
      <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Banner */}
        <div className={`relative bg-gradient-to-r from-orange-500 via-orange-500 to-orange-500 rounded-3xl p-8 md:p-10 mb-20 overflow-hidden transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block">
            <svg width="70" height="100" viewBox="0 0 80 120" fill="none">
              <path d="M40 10C35 20 30 30 25 40C20 50 15 60 10 70C20 65 30 60 40 60C50 60 60 65 70 70C65 60 60 50 55 40C50 30 45 20 40 10Z" fill="currentColor" className="text-yellow-300"/>
            </svg>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 rotate-180 hidden lg:block">
            <svg width="70" height="100" viewBox="0 0 80 120" fill="none">
              <path d="M40 10C35 20 30 30 25 40C20 50 15 60 10 70C20 65 30 60 40 60C50 60 60 65 70 70C65 60 60 50 55 40C50 30 45 20 40 10Z" fill="currentColor" className="text-yellow-300"/>
            </svg>
          </div>

          <div className="relative">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-5">
                <Award className="w-10 h-10 text-yellow-300 mr-4" />
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  Why Choose TripSkyway?
                </h3>
              </div>
              <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto">
                Your gateway from India to amazing world holidays
              </p>

              {/* Google Rating Badge */}
              <div className={`mt-8 mb-12 flex justify-center transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-xl border border-gray-100">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-900 font-bold text-md">4.9</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm font-medium">(250k+ reviews)</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white">
                  {animatedStats.customisation}%
                </div>
                <h4 className="text-md font-semibold text-white mt-3">Easy Booking</h4>
              </div>

              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white">
                  {animatedStats.concierge}x7
                </div>
                <h4 className="text-md font-semibold text-white mt-3">On Trip Support</h4>
              </div>

              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white">
                  {animatedStats.visaSuccess}%
                </div>
                <h4 className="text-md font-semibold text-white mt-3">Satisfaction Rate</h4>
              </div>

              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white">
                  {animatedStats.travelers.toLocaleString()}+
                </div>
                <h4 className="text-md font-semibold text-white mt-3">Happy Customers</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        {/* <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-1000 delay-400 mb-16 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div> */}
      </div>
    </section>
  );
}