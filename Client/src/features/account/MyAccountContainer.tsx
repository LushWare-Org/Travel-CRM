import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit2, Loader, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchUserBookings } from '../../services/api/booking';
import { fetchUserCustomizedPackages } from '../../services/api/customization';
import { fetchUserManualItineraries } from '../../services/api/manualItinerary';
import { updateProfile } from '../../services/api/account';
import { mergeStoredUser } from '../../services/auth/tokenStorage';
import ProfileEditModal from './components/ProfileEditModal';
import type { ProfileFormData, UpdateMessage } from './components/ProfileEditModal';
import RequestList from './components/RequestList';
import type { AccountTab, RequestCardItem } from './components/RequestList';

export default function MyAccountContainer() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<RequestCardItem[]>([]);
  const [customizedPackages, setCustomizedPackages] = useState<RequestCardItem[]>([]);
  const [manualItineraries, setManualItineraries] = useState<RequestCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>('bookings');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<UpdateMessage | null>(null);
  const [showStickySidebar, setShowStickySidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.querySelector('[data-main-content]');
      const sidebarFixed = document.querySelector<HTMLElement>('[data-sticky-sidebar]');
      const footer = document.querySelector('footer');

      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        const shouldShow = rect.top <= 100;
        setShowStickySidebar(shouldShow);
        if (sidebarFixed && footer) {
          const footerRect = footer.getBoundingClientRect();
          const sidebarHeight = sidebarFixed.offsetHeight;
          const sidebarTop = 96;

          if (footerRect.top < window.innerHeight) {
            const gap = 20;
            const maxTop = footerRect.top - sidebarHeight - gap;
            const newTop = Math.min(sidebarTop, maxTop);
            sidebarFixed.style.top = Math.max(0, newTop) + 'px';
          } else {
            sidebarFixed.style.top = sidebarTop + 'px';
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingsData, customizedData, manualData] = await Promise.all([
          fetchUserBookings().catch(err => {
            console.error('Error loading bookings:', err);
            return [];
          }),
          fetchUserCustomizedPackages().catch(err => {
            console.error('Error loading customized packages:', err);
            return [];
          }),
          fetchUserManualItineraries().catch(err => {
            console.error('Error loading manual itineraries:', err);
            return [];
          }),
        ]);
        setBookings((bookingsData as RequestCardItem[]) || []);
        setCustomizedPackages((customizedData as RequestCardItem[]) || []);
        setManualItineraries((manualData as RequestCardItem[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your requests');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const normalBookings = bookings.filter(booking => {
    const hasCustomizedReference = booking.notes && booking.notes.includes('CustomizedPackage:');
    return !booking.isCustomized && !hasCustomizedReference;
  });

  const customizedFromBookings = bookings.filter(booking => {
    return booking.notes && booking.notes.includes('CustomizedPackage:');
  }).map(booking => {
    const match = booking.notes?.match(/CustomizedPackage:([a-f0-9]+)/);
    return {
      ...booking,
      customizedPackageId: match ? match[1] : null,
      isFromBooking: true,
    };
  });

  const allCustomizedPackages = customizedPackages.length > 0
    ? customizedPackages
    : customizedFromBookings;

  let activeData: RequestCardItem[] = [];
  if (activeTab === 'bookings') {
    activeData = normalBookings;
  } else if (activeTab === 'customized') {
    activeData = allCustomizedPackages;
  } else if (activeTab === 'manual') {
    activeData = manualItineraries;
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setUpdateMessage(null);
    try {
      await updateProfile(formData);
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditMode(false);

      mergeStoredUser(formData);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Profile update error:', err);
      setUpdateMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
      setTimeout(() => setUpdateMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setUpdateMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="relative w-full py-28 overflow-visible">
        <div className="absolute inset-0">
          <video
            src="/v5.mp4"
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
        </div>
        <div className="relative z-raised max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ lineHeight: '1.15' }}
          >
            Welcome Back,{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-brand-400 via-brand-accent-400 to-brand-accent-400 bg-clip-text text-transparent">
                {user?.name || 'Traveler'}
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path
                  d="M2 10C50 2 100 2 150 6C200 10 250 10 298 4"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--brand-500)" />
                    <stop offset="100%" stopColor="var(--brand-accent-500)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>
          <p
            className={`text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Manage your bookings, customized packages, and travel plans all in one place
          </p>
        </div>

        {/* Tabs Overlay */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12 z-elevated">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-1 flex justify-center gap-2 flex-wrap w-fit">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-6 py-4 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-brand-400 to-brand-accent-500 text-black shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Regular Bookings ({normalBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('customized')}
              className={`px-6 py-3 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'customized'
                  ? 'bg-gradient-to-r from-brand-400 to-brand-accent-500 text-black shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Customized Packages ({allCustomizedPackages.length})
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-3 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-brand-400 to-brand-accent-500 text-black shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Trip Plans ({manualItineraries.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 py-12 pt-20">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          {showStickySidebar && (
            <div className={`hidden lg:block ${sidebarCollapsed ? 'w-20' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
              <div className="fixed w-80 left-4 z-header" style={{ paddingBottom: '1000px' }} data-sticky-sidebar>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-bold text-gray-900 truncate">{user?.name || 'Traveler'}</h2>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {sidebarCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Contact Info */}
                  {!sidebarCollapsed && (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          <Mail className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-600 font-semibold">Email:</p>
                            <p className="text-sm text-gray-900 truncate font-medium">{user?.email}</p>
                          </div>
                        </div>
                        {user?.phone && (
                          <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <Phone className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-600 font-semibold">Phone:</p>
                              <p className="text-sm text-gray-900 truncate font-medium">{user.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="w-full px-4 py-2 bg-black text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-4"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Profile
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {!showStickySidebar && (
            <div className={`hidden lg:block ${sidebarCollapsed ? 'w-20' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{user?.name || 'Traveler'}</h2>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Mail className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600 font-semibold">Email:</p>
                      <p className="text-sm text-gray-900 truncate font-medium">{user?.email}</p>
                    </div>
                  </div>
                  {user?.phone && (
                    <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <Phone className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-600 font-semibold">Phone:</p>
                        <p className="text-sm text-gray-900 truncate font-medium">{user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-4"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {/* Right Column */}
          <div className="flex-1 w-full lg:w-auto" data-main-content>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-12">My Requests</h2>

              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <Loader className="w-16 h-16 text-brand-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold text-lg">Loading your requests...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-12 text-center">
                  <p className="text-red-600 font-semibold text-lg mb-2">Error Loading Requests</p>
                  <p className="text-red-500">{error}</p>
                </div>
              ) : (
                <RequestList
                  activeTab={activeTab}
                  items={activeData}
                  onExplorePackages={() => navigate('/packages')}
                  onViewDetails={(packageId) => navigate(`/package/${packageId}`)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      {isEditMode && (
        <ProfileEditModal
          formData={formData}
          onChange={handleInputChange}
          onSave={handleSaveProfile}
          onCancel={handleCancel}
          isSaving={isSaving}
          updateMessage={updateMessage}
        />
      )}
    </div>
  );
}
