/**
 * Mock data for Lead Analytics
 * This data will be replaced with actual API calls in production
 */

export const leadTrendData = [
  { month: "Jan", new: 45, contacted: 32, interested: 18, converted: 12 },
  { month: "Feb", new: 52, contacted: 38, interested: 24, converted: 16 },
  { month: "Mar", new: 48, contacted: 35, interested: 22, converted: 14 },
  { month: "Apr", new: 61, contacted: 45, interested: 30, converted: 20 },
  { month: "May", new: 55, contacted: 40, interested: 28, converted: 18 },
  { month: "Jun", new: 67, contacted: 50, interested: 35, converted: 24 },
];

export const leadByCategoryData = [
  { name: "Adventure", value: 285, inquiries: 450 },
  { name: "Honeymoon", value: 198, inquiries: 320 },
  { name: "Family", value: 215, inquiries: 380 },
  { name: "Corporate", value: 125, inquiries: 220 },
  { name: "Budget", value: 165, inquiries: 290 },
  { name: "Luxury", value: 160, inquiries: 280 },
];

export const leadByStatusData = [
  { name: "New", value: 248 },
  { name: "Contacted", value: 392 },
  { name: "Interested", value: 256 },
  { name: "Negotiating", value: 124 },
  { name: "Converted", value: 128 },
];

export const leadByCountryData = [
  { country: "India", leads: 342, conversion: 18 },
  { country: "Sri Lanka", leads: 287, conversion: 22 },
  { country: "Pakistan", leads: 245, conversion: 15 },
  { country: "Bangladesh", leads: 198, conversion: 12 },
  { country: "Nepal", leads: 176, conversion: 14 },
];

export const leadByPriceRangeData = [
  { range: "₹50K-₹2L", value: 156 },
  { range: "₹2L-₹5L", value: 234 },
  { range: "₹5L-₹10L", value: 328 },
  { range: "₹10L-₹25L", value: 412 },
  { range: "₹25L+", value: 118 },
];

export const leadByDestinationData = [
  { destination: "Thailand", leads: 342, conversion: 24, inquiries: 580 },
  { destination: "Indonesia", leads: 287, conversion: 21, inquiries: 520 },
  { destination: "Vietnam", leads: 245, conversion: 19, inquiries: 480 },
  { destination: "Philippines", leads: 198, conversion: 17, inquiries: 420 },
  { destination: "Malaysia", leads: 176, conversion: 20, inquiries: 380 },
  { destination: "Cambodia", leads: 145, conversion: 15, inquiries: 340 },
];
