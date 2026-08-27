import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, Globe, MessageSquare, Calendar, User, ArrowRight, Sparkles, Heart, Shield, Award, Loader2, Check } from 'lucide-react';
import { submitContactForm } from '../utils/contactApi';
import DestinationSelector from '../components/DestinationSelector';
import LocationSelector from '../components/LocationSelector';
import { useAuth } from '../context/AuthContext';
import BRANDING from '../config/branding';
import { HERO_TITLE, HERO_SUBTITLE, OFFICE_HOURS_TEXT } from '../content/contact';
import { HERO_VIDEOS } from '../config/media';

const heroVideo = HERO_VIDEOS.find((v) => v.id === 'v4');

export default function ContactUs() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    travelDate: '',
  });
  const [selectedDest, setSelectedDest] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeContact, setActiveContact] = useState(0);

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

  const contactMethods = [
    {
      icon: Phone,
      title: 'Call Us',
      info: BRANDING.contact.phone,
      subtext: BRANDING.contact.officeHours,
      color: 'from-blue-500 to-cyan-500',
      action: `tel:${BRANDING.contact.phone}`
    },
    {
      icon: Mail,
      title: 'Email Us',
      info: BRANDING.contact.email,
      subtext: 'We reply within 24 hours',
      color: 'from-purple-500 to-pink-500',
      action: `mailto:${BRANDING.contact.email}`
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      info: BRANDING.contact.address,
      subtext: 'By appointment only',
      color: 'from-brand-500 to-red-500',
      action: ''
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDestinationChange = (destination) => {
    setSelectedDest(destination);
    // Clear locations when destination changes
    setSelectedLocations([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields (Name, Email, Subject, and Message).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        travelDate: formData.travelDate || undefined,
        destination: selectedDest?.label || selectedDest?.value || selectedDest || undefined,
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
      setError(err.message || 'Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-20">
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src={heroVideo?.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/70 z-10" aria-hidden="true"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {HERO_TITLE}
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-accent-400 to-brand-accent-400">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 mb-20">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-5xl mx-auto">
          {contactMethods.slice(0,3).map((method, idx) => (
            <a
              key={idx}
              href={method.action}
              onMouseEnter={() => setActiveContact(idx)}
                className="group relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 overflow-hidden w-full max-w-md"
            >
              <div className="relative mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center transform shadow-lg`}>
                  <method.icon className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-brand-accent-600 transition-all duration-300">
                {method.title}
              </h3>
              <p className="text-md font-semibold text-gray-700 mb-1">{method.info}</p>
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
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
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
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Message Sent Successfully!</h3>
                  <p className="text-gray-600 mb-6">We'll get back to you shortly</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-8 py-3 bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
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
                    <div className="p-4 bg-gradient-to-br from-brand-50 to-brand-accent-50 border border-brand-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-brand-500 to-brand-accent-500 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{selectedDest.label || selectedDest.value || selectedDest}</p>
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
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-brand-600 to-brand-accent-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-accent-600 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100 shadow-lg">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
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
                    className={`flex justify-between items-center py-3 ${idx < OFFICE_HOURS_TEXT.rows.length - 1 ? 'border-b border-blue-200' : ''}`}
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