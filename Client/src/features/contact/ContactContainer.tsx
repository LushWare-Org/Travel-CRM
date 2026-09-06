import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { submitContactForm } from '../../services/api/contact';
import DestinationSelector from '../../components/shared/DestinationSelector';
import LocationSelector from '../../components/shared/LocationSelector';
import { useAuth } from '../../contexts/AuthContext';
import BRANDING from '../../config/branding';
import { HERO_TITLE, HERO_SUBTITLE, OFFICE_HOURS_TEXT } from '../../content/contact';
import { HERO_MEDIA } from '../../config/media';
import HeroBackground from '../../components/shared/HeroBackground';

const heroMedia = HERO_MEDIA.find((m) => m.id === 'v4');

/** A destination option as emitted by DestinationSelector. */
interface DestinationOption {
  value: string;
  label: string;
}

/** Raw form field state (pre-trim/pre-submit). */
interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  travelDate: string;
}

/** Payload sent to the POST /leads/website-contact endpoint. */
export type ContactFormPayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  travelDate?: string;
  destination?: string;
  destinationCountry?: string;
  locations?: string;
};

interface ContactMethod {
  icon: LucideIcon;
  title: string;
  info: string;
  subtext: string;
  action: string;
}

export default function ContactContainer() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    travelDate: '',
  });
  const [selectedDest, setSelectedDest] = useState<DestinationOption | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill contact details for logged-in users
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

  const contactMethods: ContactMethod[] = [
    {
      icon: Phone,
      title: 'Call Us',
      info: BRANDING.contact.phone,
      subtext: BRANDING.contact.officeHours,
      action: `tel:${BRANDING.contact.phone}`,
    },
    {
      icon: Mail,
      title: 'Email Us',
      info: BRANDING.contact.email,
      subtext: 'We reply within 24 hours',
      action: `mailto:${BRANDING.contact.email}`,
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      info: BRANDING.contact.address,
      subtext: 'By appointment only',
      action: '',
    },
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDestinationChange = (destination: DestinationOption) => {
    setSelectedDest(destination);
    // Clear locations when destination changes
    setSelectedLocations([]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields (Name, Email, Subject, and Message).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // `selectedDest` is always a { value, label } option here, so the
      // label/value fallbacks cover every reachable state.
      const payload: ContactFormPayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        travelDate: formData.travelDate || undefined,
        destination: selectedDest?.label || selectedDest?.value || undefined,
        destinationCountry: selectedDest?.value || undefined,
        locations: selectedLocations.length > 0 ? selectedLocations.join(', ') : undefined,
      };

      await submitContactForm(payload);

      setSubmitted(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        travelDate: '',
      });
      setSelectedDest(null);
      setSelectedLocations([]);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-20">
        {heroMedia && <HeroBackground item={heroMedia} eager />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/70 z-raised" aria-hidden="true"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-elevated">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {HERO_TITLE}
              <span className="block text-brand-accent-300">
                {HERO_SUBTITLE}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-12">
              Have questions? Ready to book? Our travel experts are just a message away
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-elevated mb-20">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-5xl mx-auto">
          {contactMethods.slice(0, 3).map((method, idx) => (
            <a
              key={idx}
              href={method.action}
              className="group relative bg-white rounded-2xl p-8 border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors duration-300 w-full max-w-md"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
                  <method.icon className="w-8 h-8 text-brand-600" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors duration-300">
                {method.title}
              </h3>
              <p className="text-sm font-semibold text-gray-700 mb-1">{method.info}</p>
              <p className="text-sm text-gray-500">{method.subtext}</p>
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="w-6 h-6 text-brand-600" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-200">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Send Us a Message
                </h2>
                <p className="text-lg text-gray-600">
                  Fill out the form below and we'll get back to you within 24 hours
                </p>
              </div>

              {submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Message Sent Successfully!</h3>
                  <p className="text-gray-600 mb-6">We'll get back to you shortly</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors duration-300"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Your Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-gray-900"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-gray-900"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-gray-900"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Travel Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="date"
                          name="travelDate"
                          value={formData.travelDate}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Destination
                      </label>
                      <DestinationSelector
                        value={selectedDest}
                        onChange={handleDestinationChange}
                        placeholder="Choose your destination..."
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Subject *
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                        <input
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-gray-900"
                          placeholder="How can we help?"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Show selected destination confirmation */}
                  {selectedDest && (
                    <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{selectedDest.label || selectedDest.value}</p>
                          <p className="text-sm text-gray-600">Destination selected</p>
                        </div>
                      </div>

                      {/* Location Selector */}
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Specific Locations (Optional)
                        </label>
                        <LocationSelector
                          locations={selectedLocations}
                          onChange={setSelectedLocations}
                          destination={selectedDest}
                        />
                      </div>
                    </div>
                  )}

                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-brand-600 focus:ring-2 focus:ring-brand-200 transition-all outline-none resize-none text-gray-900"
                      placeholder="Tell us about your dream vacation..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full group bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative px-8 py-5 flex items-center justify-center space-x-3">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </>
                      )}
                    </div>
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Office Hours Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{OFFICE_HOURS_TEXT.title}</h3>
                  <p className="text-gray-600">{OFFICE_HOURS_TEXT.subtitle}</p>
                </div>
              </div>
              <div className="space-y-3">
                {OFFICE_HOURS_TEXT.rows.map((row, idx) => (
                  <div
                    key={row.days}
                    className={`flex justify-between items-center py-3 ${idx < OFFICE_HOURS_TEXT.rows.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <span className="font-semibold text-gray-700">{row.days}</span>
                    <span className={`font-bold ${row.hours === 'Closed' ? 'text-red-700' : 'text-gray-900'}`}>{row.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
