import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { fetchPackageById } from '../utils/packageApi';
import { submitCustomizationRequest } from '../utils/customizationApi';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';

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
  activitiesText: combineListToText(day?.activities),
  locationsText: combineListToText(day?.locations),
});

export default function CustomizePackage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        const initialDays = Array.isArray(data?.itinerary)
          ? data.itinerary.map((day, index) => buildDayState(day, index))
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
          activitiesText: '',
          locationsText: '',
        },
      ];
    });
  };

  const handleRemoveDay = (index) => {
    setDayOverrides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pkg) return;

    if (!contact.name || !contact.email || !travelPrefs.travelDate) {
      alert('Please fill in your name, email, and preferred travel date.');
      return;
    }

    const payload = {
      packageId: pkg.id || pkg._id || pkg?.raw?._id,
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      travelers: Number(travelPrefs.travelers) || 1,
      travelDate: travelPrefs.travelDate,
      message: message.trim(),
      overrides: {
        duration: overrides.duration !== '' ? Number(overrides.duration) : undefined,
        description: overrides.description || undefined,
        highlights: splitTextToList(overrides.highlightsText),
        inclusions: splitTextToList(overrides.inclusionsText),
        exclusions: splitTextToList(overrides.exclusionsText),
        terms: splitTextToList(overrides.termsText),
        days: dayOverrides.map((day, index) => ({
          dayNumber: Number(day.dayNumber) || index + 1,
          title: day.title?.trim() || `Day ${index + 1}`,
          description: day.description?.trim() || '',
          activities: splitTextToList(day.activitiesText),
          locations: splitTextToList(day.locationsText),
        })),
      },
    };

    setIsSubmitting(true);
    try {
      await submitCustomizationRequest(payload);
      alert('Thank you! Our travel experts will connect with you shortly to finalize your customized itinerary.');
      navigate(`/package/${id}`);
    } catch (err) {
      alert(err.message || 'Unable to submit customization request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
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
      <div className="max-w-6xl mx-auto px-4 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to package
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="relative h-48">
                <img
                  src={heroImage}
                  alt={pkg.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Tailored Journey Request
                  </div>
                  <h1 className="text-3xl font-bold text-white">{pkg.title}</h1>
                  <p className="text-white/80 text-sm mt-1">
                    Share your preferences and we will craft a personalized version of this itinerary for you.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-10">
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">1. Your Contact Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={contact.name}
                        onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Anthony Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contact.email}
                        onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone / WhatsApp</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="Enter your contact number"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">2. Travel Preferences</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Travelers</label>
                      <input
                        type="number"
                        min="1"
                        value={travelPrefs.travelers}
                        onChange={(e) => setTravelPrefs((prev) => ({ ...prev, travelers: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Start Date *</label>
                      <input
                        type="date"
                        required
                        value={travelPrefs.travelDate}
                        onChange={(e) => setTravelPrefs((prev) => ({ ...prev, travelDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">3. Package Adjustments</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Trip Duration (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={overrides.duration}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, duration: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Trip Overview / Theme</label>
                    <textarea
                      rows={4}
                      value={overrides.description}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Describe the experience you are looking for, or adjust the original overview.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">4. Experiences & Services</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Highlights to Include</label>
                      <textarea
                        rows={4}
                        value={overrides.highlightsText}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, highlightsText: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        placeholder="List each highlight on a new line"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Inclusions</label>
                      <textarea
                        rows={4}
                        value={overrides.inclusionsText}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, inclusionsText: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        placeholder="e.g., Airport transfers, Candle-light dinner"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Exclude / Avoid</label>
                      <textarea
                        rows={4}
                        value={overrides.exclusionsText}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, exclusionsText: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        placeholder="Share anything you want us to avoid"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Terms / Special Conditions</label>
                      <textarea
                        rows={4}
                        value={overrides.termsText}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, termsText: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        placeholder="Optional: payment, cancellation, or other expectations"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">5. Day-by-Day Preferences</h2>
                    <button
                      type="button"
                      onClick={handleAddDay}
                      className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200 transition"
                    >
                      Add a Day
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Adjust the experiences for each day or leave them as-is. Our team will refine the itinerary for you.
                  </p>
                  <div className="space-y-4">
                    {dayOverrides.map((day, index) => (
                      <div key={day.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/80">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div>
                              <input
                                type="text"
                                value={day.title}
                                onChange={(e) => handleDayChange(index, 'title', e.target.value)}
                                className="text-lg font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                              <div className="flex items-center gap-2 mt-1">
                                <label className="text-xs font-medium text-gray-500">Day Number</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={day.dayNumber}
                                  onChange={(e) => handleDayChange(index, 'dayNumber', e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(index)}
                            className="text-sm text-red-500 hover:text-red-700 transition"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                              Description
                            </label>
                            <textarea
                              rows={3}
                              value={day.description}
                              onChange={(e) => handleDayChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition resize-none bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Activities (one per line)
                              </label>
                              <textarea
                                rows={2}
                                value={day.activitiesText}
                                onChange={(e) => handleDayChange(index, 'activitiesText', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition resize-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Locations / Stops (one per line)
                              </label>
                              <textarea
                                rows={2}
                                value={day.locationsText}
                                onChange={(e) => handleDayChange(index, 'locationsText', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition resize-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!dayOverrides.length && (
                      <div className="border border-dashed border-blue-200 rounded-xl p-6 text-center text-sm text-blue-600 bg-blue-50/40">
                        No day-by-day edits yet. Click &ldquo;Add a Day&rdquo; to share specific preferences.
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">6. Additional Notes</h2>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Tell us anything else we should know—special occasions, travel style, favourite experiences..."
                  />
                </section>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Experienced travel experts on your side</p>
                      <p className="text-sm text-gray-600">
                        Once you submit, a dedicated sales representative will review your preferences and craft a tailor-made itinerary.
                      </p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-3 rounded-xl font-semibold text-white transition flex items-center gap-2 ${
                      isSubmitting
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300'
                    }`}
                  >
                    {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isSubmitting ? 'Submitting...' : 'Submit Customization Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <img src={heroImage} alt={pkg.title} className="w-full h-48 object-cover" />
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{pkg.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {pkg.destination?.name || pkg.destinationRaw}, {pkg.destination?.country}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase">Duration</p>
                    <p className="text-base font-semibold text-gray-900">{pkg.duration_days} Days</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase">From</p>
                    <p className="text-base font-semibold text-gray-900">{formatCurrency(pkg.price_from)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-900 font-semibold">What happens next?</p>
                  <ul className="mt-2 space-y-2 text-sm text-blue-800">
                    <li>• Your request reaches our lead management instantly.</li>
                    <li>• A customized package is created for our sales team to refine.</li>
                    <li>• Expect a personalised proposal within 24 hours.</li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


