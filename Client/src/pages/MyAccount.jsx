import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, ArrowRight, Loader, Star, Edit2, Save, X, Mail, Phone, Package, Compass, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUserBookings } from '../utils/bookingApi';
import { fetchUserCustomizedPackages } from '../utils/customizationApi';
import { fetchUserManualItineraries } from '../utils/manualItineraryApi';
import { formatCurrency } from '../utils/currency';

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [customizedPackages, setCustomizedPackages] = useState([]);
  const [manualItineraries, setManualItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);
  const [showStickySidebar, setShowStickySidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.querySelector('[data-main-content]');
      const sidebarFixed = document.querySelector('[data-sticky-sidebar]');
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
        setBookings(bookingsData || []);
        setCustomizedPackages(customizedData || []);
        setManualItineraries(manualData || []);
      } catch (err) {
        setError(err.message || 'Failed to load your requests');
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </span>
    );
  };

  const normalBookings = bookings.filter(booking => {
    const hasCustomizedReference = booking.notes && booking.notes.includes('CustomizedPackage:');
    return !booking.isCustomized && !hasCustomizedReference;
  });
  
  const customizedFromBookings = bookings.filter(booking => {
    return booking.notes && booking.notes.includes('CustomizedPackage:');
  }).map(booking => {
    const match = booking.notes.match(/CustomizedPackage:([a-f0-9]+)/);
    return {
      ...booking,
      customizedPackageId: match ? match[1] : null,
      isFromBooking: true,
    };
  });
  
  const allCustomizedPackages = customizedPackages.length > 0 
    ? customizedPackages 
    : customizedFromBookings;
  
  let activeData = [];
  if (activeTab === 'bookings') {
    activeData = normalBookings;
  } else if (activeTab === 'customized') {
    activeData = allCustomizedPackages;
  } else if (activeTab === 'manual') {
    activeData = manualItineraries;
  }

  const handleInputChange = (e) => {
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
      const authData = JSON.parse(localStorage.getItem('tsw_auth') || '{}');
      const token = authData?.token;
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const baseUrl = 'http://localhost:5000/api/v1';
      const response = await fetch(`${baseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update profile');
      }
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditMode(false);
      
      const updatedAuthData = { ...authData, user: { ...authData.user, ...formData } };
      localStorage.setItem('tsw_auth', JSON.stringify(updatedAuthData));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Profile update error:', err);
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update profile' });
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ lineHeight: '1.15' }}
          >
            Welcome Back,{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
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
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#eab308" />
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
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12 z-20">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-1 flex justify-center gap-2 flex-wrap w-fit">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-6 py-4 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Regular Bookings ({normalBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('customized')}
              className={`px-6 py-3 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'customized'
                  ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Customized Packages ({allCustomizedPackages.length})
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-3 font-bold text-sm md:text-base whitespace-nowrap rounded-xl transition-all ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black shadow-lg'
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
              <div className="fixed w-80 left-4 z-40" style={{ paddingBottom: '1000px' }} data-sticky-sidebar>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
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
                          <Mail className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-md text-gray-600 font-semibold">Email:</p>
                            <p className="text-md text-gray-900 truncate font-medium">{user?.email}</p>
                          </div>
                        </div>
                        {user?.phone && (
                          <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <Phone className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-md text-gray-600 font-semibold">Phone: </p>
                              <p className="text-md text-gray-900 truncate font-medium">{user.phone}</p>
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{user?.name || 'Traveler'}</h2>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Mail className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-md text-gray-600 font-semibold">Email:</p>
                      <p className="text-md text-gray-900 truncate font-medium">{user?.email}</p>
                    </div>
                  </div>
                  {user?.phone && (
                    <div className="flex items-start gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      <Phone className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-md text-gray-600 font-semibold">Phone: </p>
                        <p className="text-md text-gray-900 truncate font-medium">{user.phone}</p>
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
                <Loader className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-semibold text-lg">Loading your requests...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-12 text-center">
              <p className="text-red-600 font-semibold text-lg mb-2">Error Loading Requests</p>
              <p className="text-red-500">{error}</p>
            </div>
          ) : activeData.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
              <div className="mb-6">
                <Calendar className="w-20 h-20 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {activeTab === 'bookings' && 'No Regular Bookings'}
                {activeTab === 'customized' && 'No Customized Packages'}
                {activeTab === 'manual' && 'No Trip Plans'}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {activeTab === 'bookings' && "You haven't made any regular bookings yet. Start planning your next adventure!"}
                {activeTab === 'customized' && "You haven't created any customized packages yet. Create your perfect trip!"}
                {activeTab === 'manual' && "You haven't created any trip plans yet. Plan your journey with us!"}
              </p>
              <button
                onClick={() => navigate('/packages')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Explore Packages
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeData.map((item) => (
                <div
                  key={item._id || item.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl hover:border-orange-300 transition-all duration-300"
                >
                  <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                    {item.package?.images?.[0]?.url || item.coverImage?.url || item.images?.[0]?.url ? (
                      <>
                        <img
                          src={item.package?.images?.[0]?.url || item.coverImage?.url || item.images?.[0]?.url}
                          alt={item.package?.name || item.name || 'Trip'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(activeTab === 'bookings' ? item.bookingStatus : item.status || 'pending')}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl px-4 py-2">
                      <p className="text-xs text-gray-600 font-semibold">
                        {activeTab === 'bookings' ? 'Total Amount' : activeTab === 'customized' ? 'Price per Person' : 'Duration'}
                      </p>
                      <p className="text-2xl font-black text-orange-600">
                        {activeTab === 'bookings' && formatCurrency(item.totalAmount)}
                        {activeTab === 'customized' && formatCurrency(item.price)}
                        {activeTab === 'manual' && `${item.days?.length || 0} Days`}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {activeTab === 'bookings' && (item.package?.name || item.packageName || 'Package')}
                      {activeTab === 'customized' && (item.name || 'Customized Package')}
                      {activeTab === 'manual' && (item.lead?.name || 'Trip Plan')}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {activeTab === 'bookings' && (item.package?.destination || item.destination || 'N/A')}
                        {activeTab === 'customized' && (item.destination || 'N/A')}
                        {activeTab === 'manual' && (item.lead?.destination || 'N/A')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6 py-4 border-t border-b border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                          {activeTab === 'bookings' ? 'Travel Date' : activeTab === 'customized' ? 'Duration' : 'Days'}
                        </p>
                        <div className="flex items-center gap-1 text-gray-900 font-bold">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">
                            {activeTab === 'bookings' && (
                              item.travelDate
                                ? new Date(item.travelDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'N/A'
                            )}
                            {activeTab === 'customized' && `${item.duration} days`}
                            {activeTab === 'manual' && `${item.days?.length || 0} days`}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                          {activeTab === 'bookings' ? 'Travelers' : 'Group Size'}
                        </p>
                        <div className="flex items-center gap-1 text-gray-900 font-bold">
                          <Users className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">
                            {activeTab === 'bookings' && (item.numberOfTravelers || 1)}
                            {activeTab === 'customized' && (item.maxGroupSize || 'Any')}
                            {activeTab === 'manual' && (item.lead?.numberOfTravelers || 1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                        {activeTab === 'bookings' ? 'Payment Status' : 'Request Status'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            activeTab === 'bookings'
                              ? item.paymentStatus === 'paid'
                                ? 'bg-green-500'
                                : item.paymentStatus === 'partial'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              : item.status === 'confirmed' || item.status === 'completed'
                              ? 'bg-green-500'
                              : item.status === 'pending'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }`}
                        />
                        <span className="font-semibold text-gray-900 text-sm capitalize">
                          {activeTab === 'bookings' && (item.paymentStatus || 'Pending')}
                          {(activeTab === 'customized' || activeTab === 'manual') && (item.status || 'Pending')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-6">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>
                        {activeTab === 'bookings' && 'Booked on'} {(activeTab === 'customized' || activeTab === 'manual') && 'Created on'}{' '}
                        {item.createdAt || item.travelDate
                          ? new Date(item.createdAt || item.travelDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </span>
                    </div>
                    {activeTab === 'bookings' && (
                      <button
                        onClick={() => {
                          navigate(`/package/${item.package?._id || item.package?.id}`);
                        }}
                        className="w-full px-4 py-3 bg-black text-white rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile */}
      {isEditMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-2xl font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="px-8 py-6">
              {updateMessage && (
                <div className={`mb-6 p-4 rounded-xl text-sm ${updateMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                  {updateMessage.text}
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 px-8 py-6 flex gap-4 rounded-b-3xl border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
  );
}