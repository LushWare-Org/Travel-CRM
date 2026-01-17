import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { fetchPackageById } from '../utils/packageApi';
import { submitCustomizationRequest } from '../utils/customizationApi';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import ActivitySelector from '../components/ActivitySelector';
import LocationSelector from '../components/LocationSelector';

const splitTextToList = (value) => {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const combineListToText = (list) => (Array.isArray(list) ? list.filter(Boolean).join('\n') : '');

const sanitizeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
};

const buildDayState = (day, index) => ({
  id: `day-${index + 1}`,
  dayNumber: day?.dayNumber || index + 1,
  title: day?.title || `Day ${index + 1}`,
  description: day?.description || '',
  activities: Array.isArray(day?.activities) ? day.activities : (typeof day?.activities === 'string' ? splitTextToList(day.activities) : []),
  locations: Array.isArray(day?.locations) ? day.locations : (typeof day?.locations === 'string' ? splitTextToList(day.locations) : []),
});

export default function CustomizePackage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [travelPrefs, setTravelPrefs] = useState({
    travelers: 2,
    travelDate: '',
  });

  const [overrides, setOverrides] = useState({
    duration: '',
    price: '',
    description: '',
    highlightsText: '',
    inclusionsText: '',
    exclusionsText: '',
    termsText: '',
  });

  const [message, setMessage] = useState('');
  const [dayOverrides, setDayOverrides] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Prefill contact details for logged-in users
  useEffect(() => {
    if (user) {
      setContact((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPackageById(id)
      .then((data) => {
        if (!isMounted) return;
        setPkg(data);

        const baseDuration = data?.duration_days || data?.raw?.duration || '';
        const baseDescription = data?.description || data?.raw?.description || '';
        const baseHighlights = data?.highlights || data?.raw?.highlights || [];
        const baseInclusions = data?.inclusions || data?.raw?.inclusions || [];
        const baseExclusions = data?.exclusions || data?.raw?.exclusions || [];
        const baseTerms = data?.raw?.terms || [];

        setOverrides({
          duration: sanitizeNumber(baseDuration),
          description: baseDescription,
          highlightsText: combineListToText(baseHighlights),
          inclusionsText: combineListToText(baseInclusions),
          exclusionsText: combineListToText(baseExclusions),
          termsText: combineListToText(baseTerms),
        });

        // Get itinerary days from raw data (includes activities and locations)
        const rawItinerary = data?.raw?.itinerary;
        const itineraryDays = rawItinerary?.days || data?.itinerary || [];
        
        const initialDays = Array.isArray(itineraryDays)
          ? itineraryDays.map((day, index) => buildDayState(day, index))
          : [];
        setDayOverrides(initialDays);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load package details');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const heroImage = useMemo(
    () => pkg?.image_url || pkg?.images?.[0] || 'https://via.placeholder.com/1200x800?text=Trip+Sky+Way',
    [pkg],
  );

  const handleDayChange = (index, field, value) => {
    setDayOverrides((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddDay = () => {
    setDayOverrides((prev) => {
      const nextIndex = prev.length + 1;
      return [
        ...prev,
        {
          id: `day-${nextIndex}`,
          dayNumber: nextIndex,
          title: `Day ${nextIndex}`,
          description: '',
          activities: [],
          locations: [],
        },
      ];
    });
  };

  const handleRemoveDay = (index) => {
    setDayOverrides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate email on step 1
      if (!contact.email || !contact.email.trim()) {
        alert('Please enter your email address to continue.');
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pkg) return;

    if (!contact.email) {
      alert('Please fill in your email address.');
      return;
    }

    const payload = {
      packageId: pkg.id || pkg._id || pkg?.raw?._id,
      name: contact.name?.trim() || '',
      email: contact.email.trim(),
      phone: contact.phone?.trim() || '',
      travelers: Number(travelPrefs.travelers) || 1,
      travelDate: travelPrefs.travelDate || undefined,
      message: message.trim(),
      overrides: {
        days: dayOverrides.map((day, index) => ({
          dayNumber: Number(day.dayNumber) || index + 1,
          activities: Array.isArray(day.activities) ? day.activities : splitTextToList(day.activities || ''),
          locations: Array.isArray(day.locations) ? day.locations : splitTextToList(day.locations || ''),
        })),
      },
    };

    setIsSubmitting(true);
    try {
      await submitCustomizationRequest(payload);
      const successMsg = 'Thank you! Our travel experts will connect with you shortly to finalize your customized itinerary.';
      setSuccessModalMessage(successMsg);
      setSuccessModalVisible(true);
    } catch (err) {
      alert(err.message || 'Unable to submit customization request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-semibold">Preparing customization experience...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
        <div className="max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Unable to Customize Package</h2>
          <p className="text-gray-600 mb-6">{error || 'The package you are trying to customize could not be found.'}</p>
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
          >
            Browse other packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to package
        </button>

        {/* Package Info Header - Full Width */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden mb-6 sm:mb-8">
          <div className="relative h-48 sm:h-64 md:h-80">
            <img
              src={heroImage}
              alt={pkg.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90 mb-2 sm:mb-3">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                <span className="font-semibold">Tailored Journey Request</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-3 line-clamp-2 sm:line-clamp-none">{pkg.title}</h1>
              <p className="text-white/90 text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-6 w-full break-words">
                {pkg.destination?.name || pkg.destinationRaw}, {pkg.destination?.country}
              </p>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 mt-2 sm:mt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-white/30">
                  <p className="text-xs text-white/80 uppercase tracking-wide mb-0.5 sm:mb-1">Duration</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{pkg.duration_days} Days</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-white/30">
                  <p className="text-xs text-white/80 uppercase tracking-wide mb-0.5 sm:mb-1">From</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(pkg.price_from)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What Happens Next - Full Width Info Card */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">What happens next?</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-orange-50 text-sm sm:text-base">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Your request reaches our lead management instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>A customized package is created for our sales team to refine.</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Expect a personalised proposal within 24 hours.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step-by-Step Form - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 lg:p-8">
                {/* Progress Indicator */}
                <div className="mb-8 sm:mb-10">
                  <div className="flex items-center justify-between mb-4">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all duration-300 ${
                              currentStep === step
                                ? 'bg-orange-600 text-white scale-110 shadow-lg'
                                : currentStep > step
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {currentStep > step ? (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              step
                            )}
                          </div>
                          <span className={`text-xs mt-1.5 sm:mt-2 font-medium text-center ${currentStep >= step ? 'text-black' : 'text-gray-400'}`}>
                            {step === 1 && 'Contact'}
                            {step === 2 && 'Travel'}
                            {step === 3 && 'Itinerary'}
                            {step === 4 && 'Notes'}
                            {step === 5 && 'Review'}
                          </span>
                        </div>
                        {step < 5 && (
                          <div
                            className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all duration-300 ${
                              currentStep > step ? 'bg-orange-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">
                      {currentStep === 1 && "Let's start with your contact info"}
                      {currentStep === 2 && "Tell us about your trip"}
                      {currentStep === 3 && "Customize your daily adventures"}
                      {currentStep === 4 && "Anything else we should know?"}
                      {currentStep === 5 && "Review & Submit"}
                    </h2>
                    <p className="text-xs sm:text-sm text-black/60">
                      {currentStep === 1 && "Only your email is required - everything else is optional!"}
                      {currentStep === 2 && "Help us personalize your experience (all optional)"}
                      {currentStep === 3 && "Share activities and locations for each day (optional)"}
                      {currentStep === 4 && "Special requirements or preferences (optional)"}
                      {currentStep === 5 && "Review your details and submit your request"}
                    </p>
                  </div>
                </div>

                {/* Step Content */}
                <div className="min-h-[300px] sm:min-h-[400px]">

                {/* Step 1: Contact Details */}
                {currentStep === 1 && (
                  <div className="mb-8 sm:mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-black mb-1">How can we reach you?</h3>
                      <p className="text-xs sm:text-sm text-black/60 mb-4 sm:mb-6">We'll send your customized itinerary to your email</p>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs sm:text-sm font-medium text-black">What's your name?</span>
                            <span className="text-xs text-black/40">(Optional)</span>
                          </div>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg border-2 border-black/10 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                            placeholder="Your name"
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs sm:text-sm font-medium text-black">What's your email?</span>
                            <span className="px-2 py-0.5 text-xs font-bold text-orange-600 bg-orange-100 rounded-full">Required</span>
                          </div>
                          <input
                            type="email"
                            required
                            value={contact.email}
                            onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg border-2 border-orange-500/30 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                            placeholder="your.email@example.com"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs sm:text-sm font-medium text-black">Phone number?</span>
                            <span className="text-xs text-black/40">(Optional - for faster communication)</span>
                          </div>
                          <PhoneInput
                            international
                            defaultCountry="LK"
                            value={contact.phone}
                            onChange={(value) => setContact((prev) => ({ ...prev, phone: value || '' }))}
                            className="phone-input-wrapper"
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Step 2: Travel Preferences */}
                {currentStep === 2 && (
                  <div className="mb-8 sm:mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-black mb-1">Tell us about your trip</h3>
                      <p className="text-xs sm:text-sm text-black/60 mb-4 sm:mb-6">Help us personalize your experience</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-black/5 hover:border-orange-500/30 transition-all shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-xs sm:text-sm font-semibold text-black">Travelers</label>
                              <p className="text-xs text-black/50">How many people?</p>
                            </div>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={travelPrefs.travelers}
                            onChange={(e) => setTravelPrefs((prev) => ({ ...prev, travelers: e.target.value }))}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg border-2 border-black/10 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                            placeholder="2"
                          />
                        </div>

                        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-black/5 hover:border-orange-500/30 transition-all shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2 sm:gap-3 mb-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-xs sm:text-sm font-semibold text-black">Preferred Date</label>
                              <p className="text-xs text-black/50">When do you want to travel?</p>
                            </div>
                          </div>
                          <input
                            type="date"
                            value={travelPrefs.travelDate}
                            onChange={(e) => setTravelPrefs((prev) => ({ ...prev, travelDate: e.target.value }))}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg border-2 border-black/10 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Step 3: Itinerary */}
                {currentStep === 3 && (
                  <div className="mb-8 sm:mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-black mb-1">Customize your daily adventures</h3>
                          <p className="text-xs sm:text-sm text-black/60">
                            Share activities and locations you'd like for each day (optional)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddDay}
                          className="px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white rounded-xl bg-orange-600 hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Day</span>
                        </button>
                      </div>
                  <div className="space-y-4 sm:space-y-5">
                    {dayOverrides.map((day, index) => (
                      <div key={day.id} className="border border-gray-200 rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-600 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-md flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold text-black">Day {index + 1}</h3>
                              {day.title && day.title !== `Day ${index + 1}` && (
                                <p className="text-xs sm:text-sm text-black/70 mt-0.5">{day.title}</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(index)}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-black hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-semibold text-black mb-2 flex items-center gap-2">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Activities
                            </label>
                            <ActivitySelector
                              activities={day.activities || []}
                              onChange={(activities) => handleDayChange(index, 'activities', activities)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-semibold text-black mb-2 flex items-center gap-2">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Locations / Stops
                            </label>
                            <LocationSelector
                              locations={day.locations || []}
                              onChange={(locations) => handleDayChange(index, 'locations', locations)}
                              destination={pkg.destination?.name || pkg.destinationRaw || ''}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {!dayOverrides.length && (
                      <div className="border-2 border-dashed border-black/20 rounded-2xl p-8 sm:p-12 text-center bg-gradient-to-br from-white to-orange-50/30">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-black/40 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-black font-medium mb-2 text-sm sm:text-base">No itinerary days added yet</p>
                        <p className="text-xs sm:text-sm text-black/70 mb-4">Click "Add Day" to start building your customized itinerary</p>
                        <button
                          type="button"
                          onClick={handleAddDay}
                          className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          Add Your First Day
                        </button>
                      </div>
                    )}
                    </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Step 4: Additional Notes */}
                {currentStep === 4 && (
                  <div className="mb-8 sm:mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-6">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-black mb-1">Anything else we should know?</h3>
                        <p className="text-xs sm:text-sm text-black/60 mb-4">Special occasions, dietary needs, accessibility requirements, or travel style preferences</p>
                        <textarea
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base border-2 border-black/10 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 resize-none bg-white shadow-sm hover:shadow-md"
                          placeholder="Share your thoughts, preferences, or any special requirements..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Review & Submit */}
                {currentStep === 5 && (
                  <div className="mb-8 sm:mb-10">
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 sm:p-8 border-2 border-orange-200">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-black mb-0.5 sm:mb-1">Review Your Request</h3>
                          <p className="text-xs sm:text-sm text-black/70">Everything looks good? Submit and we'll get started!</p>
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-black/10">
                          <h4 className="font-semibold text-black mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Contact Information
                          </h4>
                          <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                            <p><span className="font-medium">Name:</span> {contact.name || <span className="text-black/40">Not provided</span>}</p>
                            <p><span className="font-medium">Email:</span> {contact.email || <span className="text-red-500">Required</span>}</p>
                            <p><span className="font-medium">Phone:</span> {contact.phone || <span className="text-black/40">Not provided</span>}</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-black/10">
                          <h4 className="font-semibold text-black mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Travel Preferences
                          </h4>
                          <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                            <p><span className="font-medium">Travelers:</span> {travelPrefs.travelers || <span className="text-black/40">Not specified</span>}</p>
                            <p><span className="font-medium">Travel Date:</span> {travelPrefs.travelDate ? new Date(travelPrefs.travelDate).toLocaleDateString() : <span className="text-black/40">Not specified</span>}</p>
                          </div>
                        </div>

                        {dayOverrides.length > 0 && (
                          <div className="bg-white rounded-xl p-4 sm:p-5 border border-black/10">
                            <h4 className="font-semibold text-black mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Itinerary Days
                            </h4>
                            <p className="text-xs sm:text-sm"><span className="font-medium">{dayOverrides.length}</span> day(s) customized</p>
                          </div>
                        )}

                        {message && (
                          <div className="bg-white rounded-xl p-4 sm:p-5 border border-black/10">
                            <h4 className="font-semibold text-black mb-2 flex items-center gap-2 text-sm sm:text-base">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Additional Notes
                            </h4>
                            <p className="text-xs sm:text-sm text-black/80">{message}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-5 sm:p-6 text-white">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                          <h4 className="text-lg sm:text-xl font-bold">Ready to create your perfect trip?</h4>
                        </div>
                        <p className="text-orange-50 mb-4 sm:mb-6 text-xs sm:text-sm">
                          Our travel experts will review your preferences and send you a personalized itinerary within 24 hours.
                        </p>
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-orange-50 mb-5 sm:mb-6">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Expert travel consultants</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>24-hour response</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>100% personalized</span>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg text-orange-600 bg-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                              <span>Creating Your Request...</span>
                            </>
                          ) : (
                            <>
                              <span>Send My Request</span>
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base ${
                      currentStep === 1
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <div className="text-xs sm:text-sm text-black/60 text-center sm:text-center">
                    Step {currentStep} of {totalSteps}
                  </div>

                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                    >
                      Next
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="w-full sm:w-[100px]"></div>
                  )}
                </div>
              </form>
            </div>
        </div>

      {successModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300">
            <div className="px-8 py-10">
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Thank you!</h2>
              <p className="text-gray-700 text-center leading-relaxed">{successModalMessage}</p>
            </div>
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSuccessModalVisible(false);
                  navigate(`/package/${id}`);
                }}
                className="px-16 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-2xl hover:from-orange-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}


