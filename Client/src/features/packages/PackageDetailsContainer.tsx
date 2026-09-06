import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, Star, MapPin, Check, X, Calendar, Download, ChevronLeft, ChevronRight,
  Award, Sparkles, ChevronDown, Phone, Mail,
} from 'lucide-react';
import { fetchPackageById, submitReview, fetchPackageReviews } from '../../services/api/packages';
import type { NormalizedPackage } from '../../services/api/packages.transform';
import type { PdfPackageData } from './pdf/pdfService';
import { formatCurrency } from '../../lib/currency';
import { pluralize } from '../../lib/pluralize';
import { useElfsightWidget } from '../../lib/elfsight';
import { generateAndDownloadPDF as generateManagementPDF } from './pdf/pdfService';
import { useAuth } from '../../contexts/AuthContext';
import { submitBookingRequest } from '../../services/api/booking';
import { FALLBACK_IMAGE } from '../../config/media';
import BRANDING from '../../config/branding';
import BookingModal from './components/BookingModal';
import ReviewModal from './components/ReviewModal';
import type { BookingFormData } from './components/BookingModal';
import type { ReviewFormData } from './components/ReviewModal';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function PackageDetailsContainer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<NormalizedPackage | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [galleryLoadedUrls, setGalleryLoadedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '', email: '', phone: '', travelers: 1, travelDate: null, endDate: null, message: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionType, setSubmissionType] = useState('booking');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [reviewData, setReviewData] = useState<ReviewFormData>({
    name: '', email: '', rating: 0, comment: '',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
  const { user } = useAuth();
  const elRef = useElfsightWidget();

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    fetchPackageById(id)
      .then((packageData) => {
        if (!isMounted) return;
        setPkg(packageData);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unable to load package details');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    fetchPackageReviews(id, 50, 1)
      .then((reviewsData) => {
        if (!isMounted) return;
        const fetchedReviews = Array.isArray(reviewsData.reviews)
          ? reviewsData.reviews.map((review) => ({
              id: review.id,
              user_name: review.name || 'Traveler',
              rating: review.rating || 0,
              comment: review.comment || '',
              created_at: review.createdAt || new Date().toISOString(),
            }))
          : [];
        setReviews(fetchedReviews);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching reviews:', err);
        setReviews([]);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const heroImages = pkg?.images || [];
  useEffect(() => {
    if (!heroImages || heroImages.length <= 1 || isImageHovered) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = (prev + 1) % heroImages.length;
        return nextIndex;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [heroImages, isImageHovered]);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      // Step 1: Only email is required
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormErrors({});
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingBooking) return; // Double-submit guard: a disabled button alone can double-fire before React re-renders (fast repeat Enter/click).
    if (!pkg) return;

    // Validate final step
    const errors = validateStep(1);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setCurrentStep(1);
      return;
    }
    setFormErrors({});

    setIsSubmittingBooking(true);
    try {
      const formatDate = (date: Date | string | null): string => {
        if (!date) return '';
        if (typeof date === 'string') {
          // If it's already a string, try to parse it
          const parsed = new Date(date);
          if (isNaN(parsed.getTime())) return '';
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const packageId = pkg.id || pkg.raw?._id;
      if (!packageId) {
        throw new Error('Package id is missing; cannot submit this request');
      }

      const submissionData = {
        name: formData.name?.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone || undefined,
        travelers: Number(formData.travelers) || 1,
        travelDate: formatDate(formData.travelDate),
        endDate: formatDate(formData.endDate) || undefined,
        message: formData.message?.trim() || undefined,
        packageId,
      };
      
      if (submissionType === 'booking') {
        await submitBookingRequest(submissionData);
        setPkg((prevPkg) => {
          if (!prevPkg) return prevPkg;
          const updatedBookings = (prevPkg.bookings || 0) + 1;
          return {
            ...prevPkg,
            bookings: updatedBookings,
            raw: prevPkg.raw
              ? { ...prevPkg.raw, bookings: (prevPkg.raw.bookings || 0) + 1 }
              : prevPkg.raw,
          };
        });
      } else if (submissionType === 'lead') {
        await submitBookingRequest(submissionData);
      }

      setShowSuccessModal(true);
      setCurrentStep(1);
      setFormData({ name: '', email: '', phone: '', travelers: 1, travelDate: null, endDate: null, message: '' });
      
      setSubmissionType('booking');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        alert(err.message);
      } else {
        alert('Unable to submit your booking request right now. Please try again.');
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const downloadPDF = async () => {
    if (!pkg) return;
    setIsDownloading(true);
    try {
      // Get the package data - prefer raw (original API response) which has _id
      // If raw doesn't exist, use pkg but ensure it has the ID
      const packageData: NormalizedPackage['raw'] = pkg.raw || (pkg as unknown as NormalizedPackage['raw']);
      
      // Ensure the package has an ID for dynamic fetching
      // The PDF service will fetch the latest package data from API using this ID
      const packageWithId: PdfPackageData = {
        ...packageData,
        _id: packageData._id || packageData.id || id,
        id: packageData.id || packageData._id || id,
        category: packageData.category ?? undefined,
        difficulty: packageData.difficulty ?? undefined,
      };
      
      console.log('[PDF Download] Package ID:', packageWithId._id || packageWithId.id);
      console.log('[PDF Download] Package name:', packageWithId.name || packageWithId.title);
      
      // Use the same approach as management side - pass package with ID
      // The PDF service will fetch latest data dynamically
      await generateManagementPDF(packageWithId);
    } catch (error) {
      console.error('Failed to generate itinerary PDF via management service.', error);
      window.alert('Unable to generate the itinerary PDF right now. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };
  const markGalleryImageLoaded = (imgUrl: string) => {
    setGalleryLoadedUrls((prev) => (prev.includes(imgUrl) ? prev : [...prev, imgUrl]));
  };

  const handleReviewSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    if (!reviewData.name || !reviewData.rating || !reviewData.comment) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const newReview = await submitReview(id, reviewData);
      if (newReview) {
        setReviews([
          {
            id: newReview.id,
            user_name: newReview.name || 'Traveler',
            rating: newReview.rating,
            comment: newReview.comment,
            created_at: newReview.createdAt || new Date().toISOString(),
          },
          ...reviews,
        ]);
      }
      setReviewData({ name: '', email: '', rating: 0, comment: '' });
      setShowReviewModal(false);
      setShowReviewSuccess(true);
      setTimeout(() => setShowReviewSuccess(false), 4000);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar },
    { id: 'inclusions', label: 'What\'s Included', icon: Award },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-black text-gray-900 mb-4">Unable to load package</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="px-8 py-4 bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white rounded-2xl font-black hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Browse packages
          </button>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-black text-gray-900 mb-2">Package not found</h2>
          <p className="text-gray-600 mb-6">The package you're looking for may have been removed.</p>
          <button
            type="button"
            onClick={() => navigate('/packages')}
            className="px-8 py-4 bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white rounded-2xl font-black hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Explore packages
          </button>
        </div>
      </div>
    );
  }

  // A package with no gallery images still gets the shared brand fallback so the
  // hero never renders a blank media area.
  const images = heroImages.length > 0 ? heroImages : [FALLBACK_IMAGE];
  const galleryReady = images.every((imgUrl) => galleryLoadedUrls.includes(imgUrl));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        @keyframes horizontalScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 0.3; }
          50% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0.5;
          }
          90% { opacity: 0.3; }
          100% {
            transform: translateY(-100vh) translateX(100px);
            opacity: 0;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes seamlessTransition {
          0% {
            opacity: 1;
            transform: scale(1.05) translateX(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.08) translateX(0);
          }
          25% {
            opacity: 0;
            transform: scale(1.1) translateX(10%);
          }
          30% {
            opacity: 0;
            transform: scale(1.05) translateX(-10%);
          }
          100% {
            opacity: 0;
            transform: scale(1) translateX(0);
          }
        }
        @keyframes seamlessEnter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateX(-10%);
          }
          20% {
            opacity: 1;
            transform: scale(1.02) translateX(0);
          }
          100% {
            opacity: 1;
            transform: scale(1.05) translateX(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-float {
          animation: float linear infinite;
        }
        .ken-burns-active {
          animation: kenBurns 15s ease-out infinite;
        }
        .slide-horizontal {
          animation: horizontalScroll 1s ease-in-out;
        }
        .seamless-transition-out {
          animation: seamlessTransition 3.5s ease-out forwards;
        }
        .seamless-transition-in {
          animation: seamlessEnter 1.5s ease-out forwards;
        }

        /* Mobile-specific styles */
        @media (max-width: 1024px) {
          .section-tabs-mobile {
            flex-direction: column !important;
          }
          .section-tab-mobile {
            border-bottom: 1px solid #e5e7eb !important;
            border-radius: 0 !important;
            justify-content: flex-start !important;
          }
          .section-tab-mobile:last-child {
            border-bottom: none !important;
          }
          .section-tab-active-mobile {
            background: linear-gradient(135deg, #000 0%, #1f2937 100%) !important;
            color: white !important;
            border-left: 4px solid #f59e0b !important;
          }
          .itinerary-day-mobile {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          .itinerary-day-number-mobile {
            align-self: flex-start !important;
            margin-bottom: 0.5rem !important;
          }
          .itinerary-connector-mobile {
            display: none !important;
          }
          .inclusions-grid-mobile {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .reviews-header-mobile {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .reviews-rating-section-mobile {
            align-self: stretch !important;
            text-align: left !important;
          }
          .sidebar-sticky-mobile {
            position: relative !important;
            top: auto !important;
          }
          .pricing-card-mobile {
            padding: 1.5rem !important;
          }
          .pricing-title-mobile {
            font-size: 1.125rem !important;
          }
          .pricing-amount-mobile {
            font-size: 2.5rem !important;
          }
          .booking-buttons-mobile {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .assistance-card-mobile {
            padding: 1.5rem !important;
          }
          .assistance-contact-mobile {
            padding: 1rem !important;
            gap: 1rem !important;
          }
          .modal-max-height-mobile {
            max-height: 95vh !important;
          }
          .modal-padding-mobile {
            padding: 1.5rem !important;
          }
          .form-grid-mobile {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .form-input-mobile {
            padding: 0.875rem 1rem !important;
          }
          .review-modal-mobile {
            max-width: 95vw !important;
            margin: 1rem !important;
          }
          .success-modal-mobile {
            max-width: 90vw !important;
          }
        }

        @media (max-width: 640px) {
          .main-content-padding-sm {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 1rem !important;
          }
          .section-padding-sm {
            padding: 1.5rem !important;
          }
          .tabs-padding-sm {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .itinerary-padding-sm {
            padding: 1.25rem !important;
          }
          .inclusions-padding-sm {
            padding: 1.25rem !important;
          }
          .review-card-padding-sm {
            padding: 1.25rem !important;
          }
          .pricing-padding-sm {
            padding: 1.25rem !important;
          }
          .assistance-padding-sm {
            padding: 1.25rem !important;
          }
          .modal-header-padding-sm {
            padding: 1.5rem 1.25rem !important;
          }
          .modal-form-padding-sm {
            padding: 1.5rem 1.25rem !important;
          }
          .button-padding-sm {
            padding: 0.875rem 1rem !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div
        className="relative h-[70vh] lg:h-[83vh] overflow-hidden"
        onMouseEnter={() => setIsImageHovered(true)}
        onMouseLeave={() => setIsImageHovered(false)}
      >
        <div className="absolute inset-0">
          {images.map((img, idx) => {
            const isCurrent = idx === currentImageIndex;
            const isNext = idx === (currentImageIndex + 1) % images.length;
            const isPrevious = idx === (currentImageIndex - 1 + images.length) % images.length;
           
            return (
              <div
                key={idx}
                className={`
                  absolute inset-0 transition-all duration-1000 ease-out
                  ${isCurrent
                    ? 'opacity-100 z-raised ken-burns-active slide-horizontal seamless-transition-in'
                    : isNext || isPrevious
                      ? 'opacity-0 z-raised seamless-transition-out'
                      : 'opacity-0 scale-100 z-base'
                  }
                `}
              >
                <img
                  src={img}
                  alt={`${pkg.title} - ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onLoad={() => markGalleryImageLoaded(img)}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                    markGalleryImageLoaded(img);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
              </div>
            );
          })}
        </div>
        
        {/* Hero Content */}
        <div className={`relative z-lifted h-full flex items-end pb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
            {pkg.destination && (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full mb-6 transform hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4 text-brand-accent-400" />
                <span className="text-white/90 font-medium text-sm">
                  {pkg.destination.name}{pkg.destination.country && `, ${pkg.destination.country}`}
                </span>
              </div>
            )}
            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-none tracking-tight max-w-5xl">
              <span className="inline-block animate-fadeInUp">
                {pkg.title && pkg.title.split(' ').map((word, i) => (
                  <span
                    key={i}
                    className="inline-block mr-4 mb-2"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      textShadow: '0 4px 30px rgba(0,0,0,0.7)'
                    }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </h1>
            {/* Info Cards */}
           <div className="flex flex-wrap items-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{pluralize(pkg.duration_days, 'Day')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="w-5 h-5 text-brand-accent-400 fill-current" />
                <span className="font-medium">{pkg.rating > 0 ? pkg.rating.toFixed(1) : 'Not yet rated'}</span>
              </div>
              <span className="px-4 py-2 bg-brand-accent-500/95 text-brand-accent-950 rounded-full font-semibold capitalize">
                {pkg.category}
              </span>
            </div>
            </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-lifted animate-bounce">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-wider font-semibold">Scroll</span>
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-prominent w-10 lg:w-12 h-10 lg:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white hidden lg:flex"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-prominent w-10 lg:w-12 h-10 lg:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 text-white hidden lg:flex"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </>
        )}

        {!galleryReady && (
          <div
            data-testid="package-gallery-loading"
            aria-hidden="true"
            className="absolute inset-0 z-elevated flex items-center justify-center bg-brand-900"
          >
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 lg:px-8 -mt-6 lg:-mt-6 relative py-12 lg:py-20 z-raised main-content-padding-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-12 lg:pb-20">
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              
              {/* Section Tabs */}
              <div className="flex flex-col lg:flex-row border-b border-gray-200 section-tabs-mobile">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full lg:flex-1 flex items-center justify-start lg:justify-center gap-3 px-4 lg:px-6 py-4 lg:py-5 font-black transition-all duration-300 section-tab-mobile ${
                        activeSection === section.id
                          ? 'section-tab-active-mobile bg-gradient-to-r from-black to-gray-800 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="hidden sm:inline">{section.label}</span>
                      <span className="sm:hidden">{section.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 lg:p-10 section-padding-sm">
                {activeSection === 'overview' && (
                  <div className="space-y-6 lg:space-y-10">
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-brand-200">
                      <div className="flex items-center gap-3 mb-10">
                        <Award className="w-6 h-6 lg:w-8 lg:h-8 text-brand-600" />
                        <h3 className="text-2xl lg:text-3xl font-black text-black">{`Why Choose ${BRANDING.company.name}?`}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Expert Local Guides</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Authentic experiences with guides who know every corner</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Personalized Itineraries</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Customized journeys tailored to your preferences</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">Rated 4.9 on Google</p>
                            <p className="text-black text-xs lg:text-sm mt-1">Trusted by our happy travelers</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-green-600" />
                              </div>                          
                              <div>
                            <p className="font-bold text-black text-sm lg:text-base">24/7 Customer Support</p>
                            <p className="text-gray-600 text-xs lg:text-sm mt-1">Round-the-clock assistance on your journey</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm lg:text-base text-gray-700 leading-relaxed">{pkg.description}</p>
                    </div>
                    {pkg.highlights && pkg.highlights.length > 0 && (
                      <div>
                        <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 lg:mb-6">Premium Highlights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                          {pkg.highlights.map((h, i) => (
                            <div
                              key={i}
                              className="group relative bg-gray-50 rounded-2xl p-4 lg:p-5 hover:shadow-lg transition-all duration-300 border hover:border-brand-accent-300"
                            >
                              <div className="flex items-start gap-3 lg:gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-brand-accent-500 to-brand-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Check className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                                </div>
                                <p className="text-black font-semibold leading-relaxed flex-1 text-sm lg:text-base">{h}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeSection === 'itinerary' && (
                  <div className="space-y-4 lg:space-y-6">
                    {pkg.itinerary && pkg.itinerary.length > 0 ? (
                      <>
                        <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-6 lg:mb-8 bg-black bg-clip-text text-transparent">
                          Journey Timeline
                        </h2>
                        {pkg.itinerary.map((day, i) => (
                          <div key={i} className="group relative">
                            <div className="itinerary-day-mobile flex flex-col lg:flex-row gap-4 lg:gap-6">
                              <div className="relative flex-shrink-0 itinerary-day-number-mobile">
                                <div className="w-14 lg:w-16 h-14 lg:h-16 bg-gradient-to-br from-brand-accent-500 to-brand-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl lg:text-3xl shadow-lg group-hover:scale-110 transition-transform">
                                  {i + 1}
                                </div>
                                {i < pkg.itinerary.length - 1 && (
                                  <div className="itinerary-connector-mobile lg:absolute lg:top-20 lg:left-1/2 lg:-translate-x-1/2 w-1 h-12 lg:h-12 bg-gradient-to-b from-brand-300 to-transparent" />
                                )}
                              </div>
                              <div className="flex-1 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 lg:p-8 border border-gray-200 hover:border-brand-accent-300 hover:shadow-xl transition-all itinerary-padding-sm">
                                <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2 lg:mb-3">{day.title}</h3>
                                <p className="text-gray-700 leading-relaxed text-sm lg:text-base">{day.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2">Itinerary Coming Soon</h3>
                        <p className="text-gray-600 text-sm lg:text-base">Our travel experts are finalizing the day-by-day plan for this package — contact us for the latest details.</p>
                      </div>
                    )}
                  </div>
                )}
                {activeSection === 'inclusions' && (
                  <div className="space-y-6 lg:space-y-8">
                    <div className="inclusions-grid-mobile lg:grid-cols-2 grid gap-6 lg:gap-8">
                      {pkg.inclusions && pkg.inclusions.length > 0 && (
                        <div className="rounded-2xl p-5 lg:p-6 border border-gray-200 inclusions-padding-sm">
                          <div className="flex items-center gap-3 mb-4 lg:mb-6">
                            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">Inclusions</h3>
                          </div>
                          <ul className="space-y-3">
                            {pkg.inclusions.map((inc, i) => (
                              <li key={i} className="flex items-start gap-3 text-gray-700">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-600 flex items-center justify-center mt-0.5">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm lg:text-base">{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {pkg.exclusions && pkg.exclusions.length > 0 && (
                        <div className="rounded-2xl p-5 lg:p-6 border border-gray-200 inclusions-padding-sm">
                          <div className="flex items-center gap-3 mb-4 lg:mb-6">
                            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">Exclusions</h3>
                          </div>
                          <ul className="space-y-3">
                            {pkg.exclusions.map((exc, i) => (
                              <li key={i} className="flex items-start gap-3 text-gray-700">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center mt-0.5">
                                  <X className="w-4 h-4 text-red-600" />
                                </div>
                                <span className="text-sm lg:text-base">{exc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="rounded-3xl p-6 lg:p-8 border-2 border-brand-accent-200">
                      <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 lg:mb-6">Booking Terms</h3>
                      <div className="space-y-4 lg:space-y-5">
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-brand-accent-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Cancellation Policy</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">Free cancellation up to 48 hours before departure. Cancellations made within 48 hours will incur a 50% charge. No-shows will be charged 100% of the booking amount.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-brand-accent-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Payment Terms</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">A 30% deposit is required at the time of booking. The remaining balance must be paid 14 days before departure. We accept all major credit cards, bank transfers, and PayPal.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 lg:gap-4">
                          <div className="w-2 h-2 bg-brand-accent-500 rounded-full mt-2.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Group Bookings</h4>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">Special rates available for groups of 10 or more travelers. Contact our team for customized group packages and discounts.</p>
                          </div>
                        </div>
                        {pkg.termsAndConditions && (
                          <div className="flex items-start gap-3 lg:gap-4">
                            <div className="w-2 h-2 bg-brand-accent-500 rounded-full mt-2.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-black text-gray-900 mb-2 text-base lg:text-lg">Additional Terms</h4>
                              <p className="text-gray-700 leading-relaxed text-sm lg:text-base whitespace-pre-wrap">{pkg.termsAndConditions}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeSection === 'reviews' && (
                  <div className="space-y-4 lg:space-y-6">
                    <div className="mb-6 lg:mb-8">
                      <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Traveler Reviews</h2>
                      <p className="text-gray-600 text-sm lg:text-base">What our travelers say about this package</p>
                    </div>

                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="bg-white rounded-2xl p-5 lg:p-6 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-gray-900">{review.user_name}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < review.rating ? 'text-brand-accent-400 fill-current' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed text-sm lg:text-base mb-2">{review.comment}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-600">No reviews yet — be the first to share your experience!</p>
                      </div>
                    )}

                    {/* Elfsight */}
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100">
                      <div ref={elRef} className="elfsight-app-29a1900e-0181-4873-aac0-7b426c7a478b" data-elfsight-app-lazy></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky lg:sticky top-6 lg:top-24 space-y-4 lg:space-y-6 sidebar-sticky-mobile">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 pricing-card-mobile pricing-padding-sm">
                <div className="mb-4 lg:mb-6">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 pricing-title-mobile">Starting from</p>
                  <div className="flex items-baseline gap-2 pricing-amount-mobile">
                    <p className="text-4xl lg:text-5xl font-bold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                    <span className="text-gray-500 font-medium text-sm lg:text-base">/person</span>
                  </div>
                </div>
                <div className="booking-buttons-mobile space-y-3 lg:space-y-4">
                  <button
                    onClick={() => {
                      setSubmissionType('booking');
                      setShowBookingModal(true);
                    }}
                    className="w-full bg-brand-600 text-white py-3.5 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 button-padding-sm"
                  >
                    <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
                    Book Now
                  </button>
                  <button
                    onClick={() => navigate(`/package/${pkg.id}/customize`)}
                    className="w-full border-2 border-brand-accent-500 text-brand-accent-700 py-3.5 lg:py-4 rounded-xl font-semibold hover:bg-brand-accent-50 hover:border-brand-accent-600 transition-all flex items-center justify-center gap-2 button-padding-sm"
                  >
                    Customize Package
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl shadow-2xl p-6 lg:p-8 text-white assistance-card-mobile assistance-padding-sm">
                <h4 className="text-xl lg:text-2xl font-black mb-4 lg:mb-6">Need Assistance?</h4>
                <div className="space-y-3 lg:space-y-4">
                  <a
                    href={`tel:${BRANDING.contact.phone}`}
                    className="flex items-center gap-3 lg:gap-4 p-4 assistance-contact-mobile bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all block"
                  >
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-brand-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-accent-200 uppercase tracking-wide">Call Us</p>
                      <p className="font-black text-base lg:text-lg">{BRANDING.contact.phone}</p>
                    </div>
                  </a>
                  <a
                    href={`mailto:${BRANDING.contact.email}`}
                    className="flex items-center gap-3 lg:gap-4 p-4 assistance-contact-mobile bg-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/20 transition-all block"
                  >
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-accent-200 uppercase tracking-wide">Email Us</p>
                      <p className="font-black text-base lg:text-lg">{BRANDING.contact.email}</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBookingModal}
        formData={formData}
        formErrors={formErrors}
        currentStep={currentStep}
        isSubmittingBooking={isSubmittingBooking}
        setFormData={setFormData}
        setFormErrors={setFormErrors}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
        onClose={() => {
          setShowBookingModal(false);
          setCurrentStep(1);
          setFormErrors({});
        }}
      />

      {/* Review Modal - Mobile Responsive */}
      <ReviewModal
        open={showReviewModal}
        reviewData={reviewData}
        isSubmittingReview={isSubmittingReview}
        setReviewData={setReviewData}
        onSubmit={handleReviewSubmit}
        onClose={() => setShowReviewModal(false)}
      />

      {/* Success Modal - Mobile Responsive */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full success-modal-mobile p-6 lg:p-8">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-3">Booking Submitted Successfully!</h2>
              <p className="text-gray-600 mb-6 leading-relaxed text-sm lg:text-base">
                Thank you for your booking request. We'll review your details and contact you within 24 hours to confirm your adventure!
              </p>
              {isDownloading && (
                <div className="mb-4 p-4 bg-brand-accent-50 border-2 border-brand-accent-200 rounded-xl">
                  <p className="text-sm text-brand-accent-800 font-semibold flex items-center justify-center gap-2">
                    <Download className="w-5 h-5 animate-bounce" />
                    Downloading your itinerary PDF...
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      await downloadPDF();
                    } catch (error) {
                      console.error('Error downloading PDF:', error);
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full bg-gradient-to-r from-brand-accent-500 to-brand-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300 button-padding-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {isDownloading ? 'Downloading...' : 'Download Itinerary PDF'}
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowBookingModal(false);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all duration-300 button-padding-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Success */}
      {showReviewSuccess && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:right-6 z-overlay animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm mx-auto">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 lg:gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-white/20 backdrop-blur-sm">
                <Check className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm lg:text-base">Review Submitted!</p>
              <p className="text-sm text-white/90 mt-0.5 line-clamp-2">Thank you for sharing your experience.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}