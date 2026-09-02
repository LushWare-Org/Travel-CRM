import { useState, useEffect } from "react";
import {
  MapPin,
  Calendar,
  Users,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  Plus,
  Trash2,
  Plane,
  Car,
  Ship,
  Train,
  Coffee,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { submitManualItineraryRequest } from "../../services/api/manualItinerary";
import { useAIItineraryGenerator } from "./hooks/useAIItineraryGenerator";
import { buildItineraryDayFromAIDay } from "./utils/formHelpers";
import type { DayAccommodation, DayMeals, ItineraryDay } from "./utils/formHelpers";
import { pluralize } from "../../lib/pluralize";
import DestinationSelector from "../../components/shared/DestinationSelector";
import LocationSelector from "../../components/shared/LocationSelector";
import ActivitySelector from "../../components/shared/ActivitySelector";
import { useAuth } from "../../contexts/AuthContext";
import DateRangeCalendar from "./components/DateRangeCalendar";

const transportOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "flight", label: "Flight", icon: Plane },
  { value: "train", label: "Train", icon: Train },
  { value: "bus", label: "Bus", icon: Car },
  { value: "car", label: "Car", icon: Car },
  { value: "boat", label: "Boat", icon: Ship },
  { value: "walk", label: "Walk", icon: Car },
  { value: "other", label: "Other", icon: Car },
];

const accommodationTypes: Array<{ value: string; label: string }> = [
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "guesthouse", label: "Guesthouse" },
  { value: "homestay", label: "Homestay" },
  { value: "camp", label: "Camp" },
  { value: "other", label: "Other" },
];

/** A destination option as emitted by DestinationSelector, or a bare label string. */
type DestinationLike = { value: string; label: string } | string | null;

/** Projects the display label from a destination option or bare string. */
const destLabel = (dest: DestinationLike): string => {
  if (dest && typeof dest === 'object') return dest.label;
  return typeof dest === 'string' ? dest : '';
};

/** Projects the option value from a destination option or bare string. */
const destValue = (dest: DestinationLike): string => {
  if (dest && typeof dest === 'object') return dest.value;
  return typeof dest === 'string' ? dest : '';
};

/** The day object serialized into the manual-itinerary request payload. */
interface ItineraryDayPayload {
  dayNumber: number;
  title: string;
  locations: string[];
  activities: string[];
  accommodation: DayAccommodation;
  meals: DayMeals;
  places: string[];
  notes: string;
  transport?: string;
}

export default function PlanYourTripContainer() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDest, setSelectedDest] = useState<DestinationLike>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(2);
  // Default preferences (not shown in UI, but used for generating default values)
  const defaultAccommodation = "4-star" as string;
  const defaultMealPlan = "breakfast" as string;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // Index of currently visible day (0-based)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences, setPreferences] = useState('');
  const aiGenerator = useAIItineraryGenerator<ItineraryDay>({
    hasExistingDays: () => itineraryDays.length > 0,
    mapDay: buildItineraryDayFromAIDay,
    onGenerated: (days) => {
      setItineraryDays(days);
      setCurrentDayIndex(0);
    },
  });

  // Prefill contact details for logged-in users
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name || "");
      setEmail((prev) => prev || user.email || "");
      setPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  const duration =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  // Clear itinerary days when duration becomes 0 or decreases
  useEffect(() => {
    if (duration === 0) {
      setItineraryDays([]);
      setCurrentDayIndex(0);
    } else {
      // If duration decreases, remove extra days
      setItineraryDays(prev => {
        if (prev.length > duration) {
          const trimmed = prev.slice(0, duration);
          // Adjust current day index if needed
          setCurrentDayIndex(currentIdx => {
            const maxIndex = Math.max(0, trimmed.length - 1);
            return currentIdx > maxIndex ? maxIndex : currentIdx;
          });
          return trimmed;
        }
        return prev;
      });
    }
  }, [duration]);

  // Handle adding a new day
  const handleAddDay = () => {
    const nextDayNumber = itineraryDays.length + 1;
    if (nextDayNumber <= duration) {
      const newDay: ItineraryDay = {
        dayNumber: nextDayNumber,
        title: `Day ${nextDayNumber}`,
        locations: [],
        activities: [],
        accommodation: {
          name: '',
          type: defaultAccommodation === '3-star' ? 'hotel' : defaultAccommodation === '4-star' ? 'hotel' : defaultAccommodation === '5-star' ? 'resort' : defaultAccommodation === 'boutique' ? 'guesthouse' : defaultAccommodation === 'villa' ? 'other' : 'hotel',
          rating: defaultAccommodation === '3-star' ? 3 : defaultAccommodation === '4-star' ? 4 : defaultAccommodation === '5-star' ? 5 : 0,
          address: '',
          contactNumber: '',
        },
        meals: {
          breakfast: defaultMealPlan === 'breakfast' || defaultMealPlan === 'half-board' || defaultMealPlan === 'full-board' || defaultMealPlan === 'all-inclusive',
          lunch: defaultMealPlan === 'half-board' || defaultMealPlan === 'full-board' || defaultMealPlan === 'all-inclusive',
          dinner: defaultMealPlan === 'full-board' || defaultMealPlan === 'all-inclusive',
        },
        transport: '',
        places: [],
        notes: '',
      };
      setItineraryDays([...itineraryDays, newDay]);
      setCurrentDayIndex(itineraryDays.length); // Show the newly added day
      // Scroll to top of the form section
      setTimeout(() => {
        const formElement = document.querySelector('[data-itinerary-form]');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // Handle removing a day
  const handleRemoveDay = (dayNumber: number) => {
    const filteredDays = itineraryDays.filter(day => day.dayNumber !== dayNumber);
    // Renumber remaining days
    const renumberedDays = filteredDays.map((day, index) => ({
      ...day,
      dayNumber: index + 1,
    }));
    setItineraryDays(renumberedDays);
    // Adjust current day index if needed
    if (currentDayIndex >= renumberedDays.length) {
      setCurrentDayIndex(Math.max(0, renumberedDays.length - 1));
    }
  };

  const handleDayChange = (dayNumber: number, field: string, value: unknown) => {
    setItineraryDays(prev =>
      prev.map(day =>
        day.dayNumber === dayNumber
          ? { ...day, [field]: value } as ItineraryDay
          : day
      )
    );
  };

  const handleDayNestedChange = (dayNumber: number, parentField: string, childField: string, value: unknown) => {
    setItineraryDays(prev =>
      prev.map(day =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              [parentField]: {
                ...day[parentField as keyof ItineraryDay] as object,
                [childField]: value,
              },
            } as ItineraryDay
          : day
      )
    );
  };

  const handleDestinationChange = (destination: { value: string; label: string }) => {
    setSelectedDest(destination);
    setValidationMsg('');
  };

  const next = () => {
    // validations
    if (step === 1 && !selectedDest) {
      setValidationMsg('Please choose a destination before continuing.');
      return;
    }
    if (step === 2 && (!startDate || !endDate)) {
      setValidationMsg('Please select travel dates before continuing.');
      return;
    }
    if (step === 3 && duration === 0) {
      setValidationMsg('Please select valid travel dates first.');
      return;
    }
    if (step === 4 && !email) {
      setValidationMsg('Please fill in your email address to submit.');
      return;
    }
    setValidationMsg('');
    if (step < 4) setStep(step + 1);
    else {
      handleSubmit();
    }
  };

  const back = () => step > 1 && setStep(step - 1);

  const handleSubmit = async () => {
    if (!email) {
      setValidationMsg('Please fill in your email address to submit.');
      return;
    }

    if (duration === 0 || itineraryDays.length === 0) {
      setValidationMsg('Please complete the itinerary planning first.');
      return;
    }

    setIsSubmitting(true);
    setValidationMsg('');

    try {
      // Extract destination info
      const destinationName = destLabel(selectedDest);
      const destinationValue = destValue(selectedDest);

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : '',
        destination: destinationName,
        destinationCountry: destinationValue,
        region: '',
        travelDate: startDate,
        endDate: endDate,
        numberOfTravelers: travelers,
        budget: '',
        message: preferences.trim(),
        days: itineraryDays.map(day => {
          const dayData: ItineraryDayPayload = {
            dayNumber: day.dayNumber,
            title: day.title || `Day ${day.dayNumber}`,
            locations: day.locations || [],
            activities: day.activities || [],
            accommodation: day.accommodation || {
              name: '',
              type: 'hotel',
              rating: 0,
              address: '',
              contactNumber: '',
            },
            meals: day.meals || {
              breakfast: false,
              lunch: false,
              dinner: false,
            },
            places: day.places || [],
            notes: day.notes || '',
          };

          // Only include transport if it has a valid value (not empty string)
          if (day.transport && day.transport.trim() !== '') {
            dayData.transport = day.transport;
          }

          return dayData;
        }),
      };

      await submitManualItineraryRequest(payload as Parameters<typeof submitManualItineraryRequest>[0]);
      setShowSuccess(true);
    } catch (error) {
      console.error('Failed to submit manual itinerary:', error);
      setValidationMsg(error instanceof Error ? error.message : 'Failed to submit your itinerary request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 font-body">
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 max-w-5xl">
        <form onSubmit={(e) => { e.preventDefault(); next(); }}>
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-8">
              <div className="flex items-start justify-between gap-1 sm:gap-2">
                {[1, 2, 3, 4].map((s, idx) => (
                  <div key={s} className="flex items-start" style={{ flex: s < 4 ? '1 1 0%' : '0 0 auto' }}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                          s <= step
                            ? 'bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {s}
                      </div>
                      <div className="mt-1 sm:mt-2 text-xs text-center text-gray-600 font-medium whitespace-nowrap">
                        {['Destination', 'Dates & Travelers', 'Plan Itinerary', 'Contact Info'][idx]}
                      </div>
                    </div>
                    {s < 4 && (
                      <div
                        className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 md:mx-4 mt-4 sm:mt-5 transition-all ${
                          s < step ? 'bg-gradient-to-r from-brand-600 to-brand-accent-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ==== STEP 1 : Destination ==== */}
          {step === 1 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-brand-500 to-brand-accent-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">
                  Where do you want to go?
                </h2>
              </div>

              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Select or type your destination
                </label>
                <DestinationSelector
                  value={selectedDest}
                  onChange={handleDestinationChange}
                  placeholder="Choose your destination..."
                />
              </div>

              {selectedDest && (
                <div className="mt-4 p-3 sm:p-4 bg-gradient-to-br from-brand-50 to-brand-accent-50 border border-brand-200 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-r from-brand-500 to-brand-accent-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm sm:text-lg">{destLabel(selectedDest)}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Destination selected</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==== STEP 2 : Dates & Travelers ==== */}
          {step === 2 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">
                  When & How Many?
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="relative">
                  <label className="block text-xs sm:text-sm font-semibold mb-2">Start Date</label>
                  <input
                    readOnly
                    type="text"
                    value={startDate || ""}
                    onClick={() => setShowCal(true)}
                    placeholder="Select start date"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white cursor-pointer"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs sm:text-sm font-semibold mb-2">End Date</label>
                  <input
                    readOnly
                    type="text"
                    value={endDate || ""}
                    onClick={() => setShowCal(true)}
                    placeholder="Select end date"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white cursor-pointer"
                    required
                  />
                </div>
                {showCal && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-4 z-dropdown">
                    <DateRangeCalendar
                      initialStart={startDate}
                      initialEnd={endDate}
                      onChange={(s, e) => { setStartDate(s); setEndDate(e); setShowCal(false); }}
                      onClose={() => setShowCal(false)}
                    />
                  </div>
                )}
              </div>

              {duration > 0 && (
                <div className="mt-4 p-3 sm:p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-center space-x-2">
                  <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-brand-600" />
                  <p className="text-xs sm:text-sm text-brand-800 font-semibold">
                    {pluralize(duration, 'Day')} / {pluralize(Math.max(duration - 1, 0), 'Night')}
                  </p>
                </div>
              )}

              <div className="mt-4 sm:mt-6">
                <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Travelers</label>
                <div className="flex items-center space-x-3 sm:space-x-6 bg-gray-50 rounded-xl p-3 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setTravelers(Math.max(1, travelers - 1))}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">{travelers}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Person(s)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTravelers(travelers + 1)}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Trip preferences (optional)</label>
                <textarea
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g., Include water sports, prefer beachside hotels, need vegetarian food options..."
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
          )}

          {/* ==== STEP 3 : Day-by-Day Itinerary ==== */}
          {step === 3 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-100 space-y-4 sm:space-y-6">
              <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 font-display">
                      Plan Your Itinerary
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                      {pluralize(duration, 'Day')} / {pluralize(Math.max(duration - 1, 0), 'Night')} in {destLabel(selectedDest) || 'destination'}
                    </p>
                  </div>
                </div>
              </div>

              {aiGenerator.error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-xs sm:text-sm font-medium">{aiGenerator.error}</p>
                </div>
              )}

              {duration === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">Please select travel dates first</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-sm sm:text-base text-brand-600 hover:text-brand-700 font-semibold"
                  >
                    Go to Dates & Travelers →
                  </button>
                </div>
              ) : itineraryDays.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Start planning your itinerary</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddDay}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white text-xs sm:text-sm rounded-xl hover:from-brand-600 hover:to-brand-accent-600 transition-all font-semibold shadow-md flex items-center gap-2"
                    >
                      <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                      Add Day 1
                    </button>
                    <button
                      type="button"
                      onClick={() => aiGenerator.generate({ destination: destLabel(selectedDest), duration, travelers, preferences: preferences || undefined })}
                      disabled={aiGenerator.isGenerating}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-white border-2 border-brand-500 text-brand-600 text-xs sm:text-sm rounded-xl hover:bg-brand-50 transition-all font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiGenerator.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                          Generate itinerary with AI
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6" data-itinerary-form>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => aiGenerator.generate({ destination: destLabel(selectedDest), duration, travelers, preferences: preferences || undefined })}
                      disabled={aiGenerator.isGenerating}
                      className="px-3 sm:px-4 py-2 bg-white border-2 border-brand-500 text-brand-600 text-xs sm:text-sm rounded-xl hover:bg-brand-50 transition-all font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiGenerator.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Regenerate with AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* Navigation and Progress - Only show if more than one day */}
                  {itineraryDays.length > 1 && (
                    <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-brand-50 to-brand-accent-50 rounded-xl border border-brand-200">
                      <button
                        type="button"
                        onClick={() => setCurrentDayIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentDayIndex === 0}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <ChevronLeft className="w-3 sm:w-4 h-3 sm:h-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        Day {itineraryDays[currentDayIndex].dayNumber} of {itineraryDays.length} ({duration} total)
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentDayIndex(prev => Math.min(itineraryDays.length - 1, prev + 1))}
                        disabled={currentDayIndex === itineraryDays.length - 1}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4" />
                      </button>
                    </div>
                  )}

                  {/* Progress Indicator - Show when only one day */}
                  {itineraryDays.length === 1 && (
                    <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-brand-50 to-brand-accent-50 rounded-xl border border-brand-200">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 text-center">
                        Day 1 of {duration} {duration > 1 && '(Click "Add Day 2" below to add more days)'}
                      </p>
                    </div>
                  )}

                  {/* Current Day Form - Only show one day at a time */}
                  {itineraryDays[currentDayIndex] && (
                    <div className="border-2 border-gray-200 rounded-xl bg-gray-50">
                      {/* Day Header — rounds its own top corners (instead of
                          the card wrapper clipping via overflow-hidden) so
                          the Locations field's LocationSelector dropdown,
                          further down this same card, is never clipped. */}
                      <div className="bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                        <h3 className="font-bold text-lg font-display">
                          Day {itineraryDays[currentDayIndex].dayNumber}
                        </h3>
                        {itineraryDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(itineraryDays[currentDayIndex].dayNumber)}
                            disabled={aiGenerator.isGenerating}
                            className="p-2 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove this day"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Day Content */}
                      <div className={`p-6 space-y-4 bg-white rounded-b-xl ${aiGenerator.isGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Title */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Day Title *
                          </label>
                          <input
                            type="text"
                            value={itineraryDays[currentDayIndex].title || ''}
                            onChange={(e) => handleDayChange(itineraryDays[currentDayIndex].dayNumber, 'title', e.target.value)}
                            placeholder={`e.g., Arrival in ${destLabel(selectedDest) || 'destination'}`}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Locations */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Locations to Visit
                          </label>
                          <LocationSelector
                            locations={itineraryDays[currentDayIndex].locations || []}
                            onChange={(locations) => handleDayChange(itineraryDays[currentDayIndex].dayNumber, 'locations', locations)}
                            destination={selectedDest}
                          />
                        </div>

                        {/* Activities */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Activities
                          </label>
                          <ActivitySelector
                            activities={itineraryDays[currentDayIndex].activities || []}
                            onChange={(activities) => handleDayChange(itineraryDays[currentDayIndex].dayNumber, 'activities', activities)}
                          />
                        </div>

                        {/* Accommodation */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Accommodation Name
                            </label>
                            <input
                              type="text"
                              value={itineraryDays[currentDayIndex].accommodation?.name || ''}
                              onChange={(e) => handleDayNestedChange(itineraryDays[currentDayIndex].dayNumber, 'accommodation', 'name', e.target.value)}
                              placeholder="e.g., Grand Hotel"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Accommodation Type
                            </label>
                            <select
                              value={itineraryDays[currentDayIndex].accommodation?.type || 'hotel'}
                              onChange={(e) => handleDayNestedChange(itineraryDays[currentDayIndex].dayNumber, 'accommodation', 'type', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                              {accommodationTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Meals */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Meals Included
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={itineraryDays[currentDayIndex].meals?.breakfast || false}
                                onChange={(e) => handleDayNestedChange(itineraryDays[currentDayIndex].dayNumber, 'meals', 'breakfast', e.target.checked)}
                                className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                              />
                              <span className="text-sm text-gray-700 flex items-center gap-1">
                                <Coffee className="w-4 h-4" /> Breakfast
                              </span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={itineraryDays[currentDayIndex].meals?.lunch || false}
                                onChange={(e) => handleDayNestedChange(itineraryDays[currentDayIndex].dayNumber, 'meals', 'lunch', e.target.checked)}
                                className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                              />
                              <span className="text-sm text-gray-700 flex items-center gap-1">
                                <UtensilsCrossed className="w-4 h-4" /> Lunch
                              </span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={itineraryDays[currentDayIndex].meals?.dinner || false}
                                onChange={(e) => handleDayNestedChange(itineraryDays[currentDayIndex].dayNumber, 'meals', 'dinner', e.target.checked)}
                                className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                              />
                              <span className="text-sm text-gray-700 flex items-center gap-1">
                                <UtensilsCrossed className="w-4 h-4" /> Dinner
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Transport */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Transport
                          </label>
                          <select
                            value={itineraryDays[currentDayIndex].transport || ''}
                            onChange={(e) => handleDayChange(itineraryDays[currentDayIndex].dayNumber, 'transport', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          >
                            <option value="">Select transport</option>
                            {transportOptions.map(opt => {
                              const Icon = opt.icon;
                              return (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Day Notes */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Day Notes
                          </label>
                          <textarea
                            rows={2}
                            value={itineraryDays[currentDayIndex].notes || ''}
                            onChange={(e) => handleDayChange(itineraryDays[currentDayIndex].dayNumber, 'notes', e.target.value)}
                            placeholder="Any special requests or notes for this day..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Day Button */}
                  {itineraryDays.length < duration && (
                    <div className="flex justify-center pt-4">
                      <button
                        type="button"
                        onClick={handleAddDay}
                        disabled={aiGenerator.isGenerating}
                        className="px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white rounded-xl hover:from-brand-600 hover:to-brand-accent-600 transition-all font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5" />
                        Add Day {itineraryDays.length + 1}
                      </button>
                    </div>
                  )}

                  {/* Info message when all days are added */}
                  {itineraryDays.length === duration && duration > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-green-700 text-sm font-medium text-center">
                        ✓ All {duration} days have been added to your itinerary
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ==== STEP 4 : Contact ==== */}
          {step === 4 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-display">Your Contact Details</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                      <span className="text-xs text-gray-500">(Optional)</span>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                      <span className="px-2 py-0.5 text-xs font-bold text-brand-600 bg-brand-100 rounded-full">Required</span>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-brand-500/30 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Phone Number</label>
                      <span className="text-xs text-gray-500">(Optional)</span>
                    </div>
                    <PhoneInput
                      international
                      defaultCountry="LK"
                      value={phone}
                      onChange={(value) => setPhone(value || '')}
                      className="phone-input-wrapper"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* full trip summary */}
                <div>
                  <div className="bg-gradient-to-br from-brand-50 to-brand-accent-50 rounded-2xl p-6 border border-brand-200 h-full">
                    <h3 className="font-bold mb-4 flex items-center text-lg">
                      <Check className="w-5 h-5 mr-2 text-brand-600" /> Trip Summary
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                      <div>
                        <div className="text-xs text-gray-500">Destination</div>
                        <div className="font-semibold">{destLabel(selectedDest) || '—'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Dates</div>
                        <div className="font-semibold">{startDate ? startDate : '—'} {startDate && endDate ? `→ ${endDate}` : ''}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Duration</div>
                        <div className="font-semibold">{duration} days</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Travelers</div>
                        <div className="font-semibold">{travelers}</div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Itinerary Days</div>
                        <div className="font-semibold">{itineraryDays.length} days planned</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==== Validation Message ==== */}
          {validationMsg && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm font-medium">{validationMsg}</p>
            </div>
          )}

          {/* ==== Navigation Buttons ==== */}
          <div className="flex gap-4 mt-10">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={
                isSubmitting ||
                (step === 1 && !selectedDest) ||
                (step === 2 && (!startDate || !endDate)) ||
                (step === 3 && duration === 0) ||
                (step === 4 && !email)
              }
              className={`flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                isSubmitting ||
                (step === 1 && !selectedDest) ||
                (step === 2 && (!startDate || !endDate)) ||
                (step === 3 && duration === 0) ||
                (step === 4 && !email)
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white hover:shadow-xl transform hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>{step === 4 ? "Submit Itinerary" : "Next"}</span>
                  {step < 4 && <ChevronRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-modal flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Successfully Submitted!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Your manual itinerary request has been submitted successfully! Our travel experts will review your itinerary and contact you soon at {email}.
              </p>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setStep(1);
                  setSelectedDest(null);
                  setStartDate('');
                  setEndDate('');
                  setTravelers(2);
                  setName('');
                  setEmail('');
                  setPhone('');
                  setItineraryDays([]);
                  setValidationMsg('');
                }}
                className="w-full px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
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
