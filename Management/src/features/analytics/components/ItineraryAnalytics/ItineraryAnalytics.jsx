import { useState, useMemo } from "react";
import {
  TimeRangeFilter,
  StatCard,
  ChartContainer,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from "../Common";
import { MapPin, ShoppingCart, TrendingUp, Home, AlertCircle } from "lucide-react";
import useItineraryAnalytics from "../../hooks/useItineraryAnalytics.js";

/**
 * ItineraryAnalytics Component
 * Displays itinerary and booking statistics with real backend data
 */
const ItineraryAnalytics = () => {
  const [timeRange, setTimeRange] = useState("monthly");
  const {
    loading,
    error,
    overview,
    trendData,
    mostInquired,
    destinationPerformance,
    activityPreferences,
    hotelPreferences,
  } = useItineraryAnalytics(timeRange);

  // Line chart configuration
  const itineraryLines = [
    { dataKey: "inquiries", stroke: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", stroke: "#10b981", name: "Purchases" },
    { dataKey: "hotels", stroke: "#f59e0b", name: "Hotels Booked" },
  ];

  // Bar chart configuration for destinations
  const destinationBars = [
    { dataKey: "inquiries", fill: "#3b82f6", name: "Inquiries" },
    { dataKey: "purchases", fill: "#10b981", name: "Purchases" },
  ];

  // Calculate stats from overview data
  const stats = useMemo(() => {
    if (!overview) {
      return {
        totalItineraries: 0,
        mostInquired: 0,
        mostPurchased: 0,
        popularHotels: 0,
      };
    }

    // Extract counts from overview object
    const totalItineraries = overview.totalItineraries || 0;
    const mostInquiredCount = mostInquired?.[0]?.inquiries || 0;
    const mostPurchasedCount = mostInquired?.[0]?.purchases || 0;
    const popularHotelsCount = hotelPreferences?.length || 0;

    return {
      totalItineraries,
      mostInquired: mostInquiredCount,
      mostPurchased: mostPurchasedCount,
      popularHotels: popularHotelsCount,
    };
  }, [overview, mostInquired, hotelPreferences]);

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Itinerary Analytics</h2>
            <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Error Loading Analytics</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Itinerary Analytics</h2>
            <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
          </div>
          <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 animate-pulse" />
          ))}
        </div>

        <div className="bg-gray-200 rounded-lg h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Itinerary Analytics</h2>
          <p className="text-gray-600 mt-1">Most inquired and purchased packages and destinations</p>
        </div>
        <TimeRangeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MapPin}
          label="Total Itineraries"
          value={stats.totalItineraries.toString()}
          trend={overview?.trendPercentage || "+0%"}
          trendDirection={overview?.trendDirection || "neutral"}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Most Inquired"
          value={stats.mostInquired.toString()}
          trend={overview?.inquiriesTrend || "+0%"}
          trendDirection={overview?.inquiriesTrendDirection || "neutral"}
          color="green"
        />
        <StatCard
          icon={ShoppingCart}
          label="Most Purchased"
          value={stats.mostPurchased.toString()}
          trend={overview?.purchasesTrend || "+0%"}
          trendDirection={overview?.purchasesTrendDirection || "neutral"}
          color="purple"
        />
        <StatCard
          icon={Home}
          label="Popular Hotels"
          value={stats.popularHotels.toString()}
          trend={overview?.hotelsTrend || "+0%"}
          trendDirection={overview?.hotelsTrendDirection || "neutral"}
          color="orange"
        />
      </div>

      {/* Itinerary Trend Chart */}
      <ChartContainer
        title="Itinerary Performance Trend"
        description="Monthly inquiries, purchases, and hotel bookings"
      >
        {trendData && trendData.length > 0 ? (
          <LineChartComponent
            data={trendData}
            lines={itineraryLines}
            xAxisKey="month"
            height={350}
          />
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            No trend data available
          </div>
        )}
      </ChartContainer>

      {/* Additional breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Destination Performance"
          description="Most inquired vs purchased destinations"
        >
          {destinationPerformance && destinationPerformance.length > 0 ? (
            <BarChartComponent
              data={destinationPerformance}
              bars={destinationBars}
              xAxisKey="name"
              height={320}
              margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No destination data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Activity Preferences"
          description="Most inquired and purchased activities"
        >
          {activityPreferences && activityPreferences.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityPreferences.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{activity.inquiries || 0}</p>
                    <p className="text-xs text-gray-600">inquiries</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-bold text-green-600">{activity.purchases || 0}</p>
                    <p className="text-xs text-gray-600">purchased</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No activity data available
            </div>
          )}
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Hotels & Resorts Preference"
          description="Most booked accommodation types"
        >
          {hotelPreferences && hotelPreferences.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {hotelPreferences.map((hotel, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{hotel.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{hotel.inquiries || 0}</p>
                    <p className="text-xs text-gray-600">inquiries</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-bold text-green-600">{hotel.purchases || 0}</p>
                    <p className="text-xs text-gray-600">booked</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No hotel data available
            </div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Top Itineraries"
          description="Most inquired and purchased packages"
        >
          {mostInquired && mostInquired.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mostInquired.map((itinerary, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{itinerary.name}</p>
                    {itinerary.rating && (
                      <p className="text-xs text-gray-600">Rating: {itinerary.rating}★</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{itinerary.inquiries || 0}</p>
                    <p className="text-xs text-gray-600">inquiries</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-bold text-green-600">{itinerary.purchases || 0}</p>
                    <p className="text-xs text-gray-600">purchased</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No itinerary data available
            </div>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};

export default ItineraryAnalytics;
