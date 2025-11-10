import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Search, MapPin, Calendar, Users, DollarSign, Star, Edit, Eye, Download, Image as ImageIcon, Briefcase, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";

const ItineraryGeneration = () => {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  const [editPackageData, setEditPackageData] = useState(null);
  const [nightsInput, setNightsInput] = useState("");
  const [showItinerary, setShowItinerary] = useState(false);
  const [isItinerarySubmitted, setIsItinerarySubmitted] = useState(false);

  const [packages, setPackages] = useState([
    {
      id: 1,
      name: "Paris Romance Getaway",
      category: "Honeymoon",
      region: "Europe",
      duration: "5 Days / 4 Nights",
      price: "$2,499",
      rating: 4.8,
      reviews: 24,
      destinations: ["Paris", "Versailles"],
      activities: ["Eiffel Tower Tour", "Seine River Cruise", "Louvre Museum"],
      accommodation: "4-Star Hotel",
      transport: "Flight + Transfers",
      images: [],
      status: "published",
      createdDate: "2024-08-15",
      updatedDate: "2024-10-18",
      bookings: 8,
      description: "Experience the magic of Paris with your loved one. Romantic dinners, iconic landmarks, and unforgettable memories.",
      itinerary: {
        first_day: "Arrival in Paris, check-in at hotel, evening Seine River Cruise",
        middle_days: {
          day_1: "Eiffel Tower tour and romantic dinner",
          day_2: "Louvre Museum visit and city exploration",
          day_3: "Day trip to Versailles Palace",
        },
        last_day: "Morning shopping, departure",
      },
      itineraryTitles: {
        first_day: "Arrival Day",
        middle_days: {
          day_1: "Day 1: Paris Landmarks",
          day_2: "Day 2: Art & Culture",
          day_3: "Day 3: Versailles Excursion",
        },
        last_day: "Departure Day",
      },
    },
    {
      id: 2,
      name: "Bali Family Adventure",
      category: "Family",
      region: "Asia",
      duration: "7 Days / 6 Nights",
      price: "$1,899",
      rating: 4.6,
      reviews: 18,
      destinations: ["Bali", "Ubud", "Seminyak"],
      activities: ["Beach Activities", "Temple Tours", "Rice Terrace Trekking", "Water Sports"],
      accommodation: "3-Star Resort",
      transport: "Flight + Transfers",
      images: [],
      status: "published",
      createdDate: "2024-07-20",
      updatedDate: "2024-10-17",
      bookings: 12,
      description: "Perfect family vacation with beaches, culture, and adventure. Kid-friendly activities and comfortable accommodations.",
      itinerary: {
        first_day: "Arrival in Bali, check-in at resort",
        middle_days: {
          day_1: "Beach activities in Seminyak",
          day_2: "Temple tours in Ubud",
          day_3: "Rice terrace trekking",
          day_4: "Water sports day",
          day_5: "Cultural village visit",
        },
        last_day: "Free morning, departure",
      },
      itineraryTitles: {
        first_day: "Arrival Day",
        middle_days: {
          day_1: "Day 1: Beach Fun",
          day_2: "Day 2: Cultural Exploration",
          day_3: "Day 3: Nature Trek",
          day_4: "Day 4: Adventure Sports",
          day_5: "Day 5: Village Life",
        },
        last_day: "Departure Day",
      },
    },
    {
      id: 3,
      name: "Dubai Luxury Escape",
      category: "Corporate",
      region: "Middle East",
      duration: "4 Days / 3 Nights",
      price: "$3,299",
      rating: 4.9,
      reviews: 32,
      destinations: ["Dubai", "Abu Dhabi"],
      activities: ["Desert Safari", "Burj Khalifa", "Shopping Mall Tour", "Beach Resort"],
      accommodation: "5-Star Luxury Hotel",
      transport: "Flight + Premium Transfers",
      images: [],
      status: "published",
      createdDate: "2024-06-10",
      updatedDate: "2024-10-16",
      bookings: 15,
      description: "Luxury experience in Dubai with world-class hotels, shopping, and entertainment.",
      itinerary: {
        first_day: "Arrival in Dubai, check-in at luxury hotel",
        middle_days: {
          day_1: "Desert safari experience",
          day_2: "Burj Khalifa visit and shopping",
        },
        last_day: "Beach resort relaxation, departure",
      },
      itineraryTitles: {
        first_day: "Arrival Day",
        middle_days: {
          day_1: "Day 1: Desert Adventure",
          day_2: "Day 2: City Highlights",
        },
        last_day: "Departure Day",
      },
    },
    {
      id: 4,
      name: "Tokyo Cultural Journey",
      category: "Adventure",
      region: "Asia",
      duration: "6 Days / 5 Nights",
      price: "$2,199",
      rating: 4.7,
      reviews: 21,
      destinations: ["Tokyo", "Kyoto", "Osaka"],
      activities: ["Temple Visits", "Traditional Tea Ceremony", "Sumo Wrestling", "Street Food Tour"],
      accommodation: "4-Star Hotel",
      transport: "Flight + JR Pass",
      images: [],
      status: "draft",
      createdDate: "2024-09-01",
      updatedDate: "2024-10-19",
      bookings: 0,
      description: "Immerse yourself in Japanese culture with temples, traditions, and modern cities.",
      itinerary: {
        first_day: "Arrival in Tokyo, hotel check-in",
        middle_days: {
          day_1: "Temple visits in Tokyo",
          day_2: "Traditional tea ceremony",
          day_3: "Sumo wrestling event",
          day_4: "Street food tour in Osaka",
        },
        last_day: "Free morning, departure",
      },
      itineraryTitles: {
        first_day: "Arrival Day",
        middle_days: {
          day_1: "Day 1: Tokyo Temples",
          day_2: "Day 2: Cultural Experience",
          day_3: "Day 3: Sumo Spectacle",
          day_4: "Day 4: Osaka Food Tour",
        },
        last_day: "Departure Day",
      },
    },
    {
      id: 5,
      name: "Maldives Paradise Resort",
      category: "Honeymoon",
      region: "Asia",
      duration: "5 Days / 4 Nights",
      price: "$4,599",
      rating: 5.0,
      reviews: 45,
      destinations: ["Maldives", "Male"],
      activities: ["Snorkeling", "Diving", "Island Hopping", "Spa & Wellness"],
      accommodation: "5-Star Water Bungalow",
      transport: "Flight + Speedboat",
      images: [],
      status: "published",
      createdDate: "2024-05-15",
      updatedDate: "2024-10-15",
      bookings: 22,
      description: "Ultimate tropical paradise with crystal-clear waters and luxury accommodations.",
      itinerary: {
        first_day: "Arrival in Maldives, transfer to resort",
        middle_days: {
          day_1: "Snorkeling adventure",
          day_2: "Diving excursion",
          day_3: "Island hopping tour",
        },
        last_day: "Spa day, departure",
      },
      itineraryTitles: {
        first_day: "Arrival Day",
        middle_days: {
          day_1: "Day 1: Underwater Exploration",
          day_2: "Day 2: Deep Dive",
          day_3: "Day 3: Island Adventure",
        },
        last_day: "Departure Day",
      },
    },
  ]);

  const categoryColors = {
    Honeymoon: "bg-pink-100 text-pink-800",
    Family: "bg-green-100 text-green-800",
    Adventure: "bg-orange-100 text-orange-800",
    Corporate: "bg-blue-100 text-blue-800",
  };

  const statusColors = {
    published: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800",
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Itinerary Handling
  const handleNightsInputChange = (e, setFormData) => {
    setNightsInput(e.target.value);
    setFormData((prev) => ({ ...prev, duration: `${parseInt(e.target.value) + 1} Days / ${e.target.value} Nights` }));
  };

  const handleConfirmNights = (formData, setFormData, showAlert = true) => {
    const newNights = parseInt(nightsInput, 10);
    if (isNaN(newNights) || newNights <= 0) {
      Swal.fire("Error", "Please enter a valid number of nights", "error");
      return;
    }

    const totalDays = newNights + 1;
    const desiredMiddleCount = Math.max(0, newNights - 1);
    const currentMiddle = formData.itinerary?.middle_days || {};
    const middleKeys = Object.keys(currentMiddle)
      .map((key) => parseInt(key.split("_")[1], 10))
      .filter((num) => !isNaN(num));
    const currentMax = middleKeys.length > 0 ? Math.max(...middleKeys) : 0;

    let newItinerary = { ...formData.itinerary, middle_days: { ...currentMiddle } };
    let newItineraryTitles = { ...formData.itineraryTitles, middle_days: { ...formData.itineraryTitles?.middle_days } };

    if (desiredMiddleCount > currentMax) {
      for (let i = currentMax + 1; i <= desiredMiddleCount; i++) {
        const key = `day_${i}`;
        newItinerary.middle_days[key] = "";
        newItineraryTitles.middle_days[key] = `Day ${i} Title`;
      }
    } else if (desiredMiddleCount < currentMax) {
      for (let i = desiredMiddleCount + 1; i <= currentMax; i++) {
        const key = `day_${i}`;
        delete newItinerary.middle_days[key];
        delete newItineraryTitles.middle_days[key];
      }
    }

    setFormData((prev) => ({
      ...prev,
      itinerary: newItinerary,
      itineraryTitles: newItineraryTitles,
      duration: `${newNights + 1} Days / ${newNights} Nights`,
    }));
    setNightsInput(newNights.toString());
    if (showAlert) {
      Swal.fire("Success", "Night count confirmed and itinerary updated", "success");
    }
  };

  const handleItineraryChange = (e, section, dayKey, setFormData) => {
    const value = e.target.value;
    if (section === "middle_days" && dayKey) {
      setFormData((prevData) => ({
        ...prevData,
        itinerary: {
          ...prevData.itinerary,
          middle_days: {
            ...prevData.itinerary.middle_days,
            [dayKey]: value,
          },
        },
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        itinerary: {
          ...prevData.itinerary,
          [section]: value,
        },
      }));
    }
  };

  const handleItineraryTitleChange = (e, section, dayKey, setFormData) => {
    const value = e.target.value;
    if (section === "middle_days" && dayKey) {
      setFormData((prevData) => ({
        ...prevData,
        itineraryTitles: {
          ...prevData.itineraryTitles,
          middle_days: {
            ...prevData.itineraryTitles.middle_days,
            [dayKey]: value,
          },
        },
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        itineraryTitles: {
          ...prevData.itineraryTitles,
          [section]: value,
        },
      }));
    }
  };

  const handleImageUpload = async (e, setFormData) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const loadingUrl = URL.createObjectURL(file);
      setFormData((prevData) => ({
        ...prevData,
        images: [...(prevData.images || []), loadingUrl],
      }));

      try {
        const formDataImage = new FormData();
        formDataImage.append("image", file);
        const response = await fetch(
          "https://api.imgbb.com/1/upload?key=4e08e03047ee0d48610586ad270e2b39",
          { method: "POST", body: formDataImage }
        );
        if (!response.ok) throw new Error("Image upload failed");
        const data = await response.json();
        const uploadedUrl = data.data.url;

        setFormData((prevData) => ({
          ...prevData,
          images: (prevData.images || []).map((url) =>
            url === loadingUrl ? uploadedUrl : url
          ),
        }));
      } catch (error) {
        Swal.fire("Error", "Failed to upload image", "error");
      }
    }
  };

  const handleRemoveImage = (index, setFormData) => {
    setFormData((prevData) => ({
      ...prevData,
      images: (prevData.images || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmitItinerary = (formData, setFormData) => {
    const errors = {};
    if (!formData.itinerary.first_day) errors.first_day = "Arrival day itinerary is required.";
    if (!formData.itinerary.last_day) errors.last_day = "Departure day itinerary is required.";
    Object.keys(formData.itinerary.middle_days).forEach((dayKey) => {
      if (!formData.itinerary.middle_days[dayKey]) {
        errors[dayKey] = `Itinerary for ${dayKey} is required.`;
      }
    });

    if (Object.keys(errors).length > 0) {
      Swal.fire("Error", "Please fill out all required itinerary fields.", "error");
      return;
    }

    setShowItinerary(true);
    setIsItinerarySubmitted(true);
    Swal.fire("Success", "Itinerary submitted successfully.", "success");
  };

  const handleResetItinerary = (setFormData) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: { first_day: "", middle_days: {}, last_day: "" },
      itineraryTitles: { first_day: "", middle_days: {}, last_day: "" },
    }));
    setNightsInput("");
    setShowItinerary(false);
    setIsItinerarySubmitted(false);
  };

  const handleEditPackage = (pkg) => {
    setEditPackageData({
      ...pkg,
      itinerary: { ...pkg.itinerary },
      itineraryTitles: { ...pkg.itineraryTitles },
      images: [...(pkg.images || [])],
    });
    setNightsInput(parseInt(pkg.duration.split("/")[1].trim()) || "");
    setShowEditPackageDialog(true);
    setShowItinerary(true); 
    setIsItinerarySubmitted(true);
  };

  const handleSaveEditPackage = () => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === editPackageData.id ? { ...editPackageData, updatedDate: new Date().toISOString().split("T")[0] } : pkg
      )
    );
    setShowEditPackageDialog(false);
    setEditPackageData(null);
    Swal.fire("Success", "Package updated successfully.", "success");
  };

  const handleDownload = (pkg) => {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7;

    const addHeader = () => {
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 255);
      doc.text("Trip Sky Way.", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Your Ultimate Travel Partner", pageWidth / 2, 30, { align: "center" });
      doc.setDrawColor(0, 0, 255);
      doc.line(margin, 35, pageWidth - margin, 35);
    };

    const addFooter = () => {
      doc.setDrawColor(0, 0, 255);
      doc.line(margin, pageHeight - 27, pageWidth - margin, pageHeight - 27);
      doc.setFontSize(10);
      doc.text("Contact us: info@tripskyway.com | +1-800-TRAVEL", pageWidth / 2, pageHeight - 10, { align: "center" });
    };

    const needPage = (requiredHeight) => {
      const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY : undefined;
    };

    // Start first page
    addHeader();
    let yPos = 50;

    const ensureSpace = (h) => {
      if (yPos + h > pageHeight - margin - 20) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 50;
      }
    };

    // Title
    doc.setFontSize(18);
    ensureSpace(10);
    doc.text(pkg.name, margin, yPos);
    yPos += 12;

    // Description
    doc.setFontSize(12);
    ensureSpace(lineHeight + 10);
    doc.text("Description:", margin, yPos);
    yPos += 6;
    const descriptionLines = doc.splitTextToSize(pkg.description || "", contentWidth);
    ensureSpace(descriptionLines.length * lineHeight + 4);
    doc.text(descriptionLines, margin, yPos);
    yPos += descriptionLines.length * lineHeight + 8;

    // Details list
    const details = [
      `Category: ${pkg.category}`,
      `Region: ${pkg.region}`,
      `Duration: ${pkg.duration}`,
      `Price: ${pkg.price}`,
      `Destinations: ${pkg.destinations?.join(", ")}`,
      `Activities: ${pkg.activities?.join(", ")}`,
      `Accommodation: ${pkg.accommodation}`,
      `Transport: ${pkg.transport}`,
    ];

    details.forEach((line) => {
      ensureSpace(lineHeight + 4);
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    yPos += 6;

    // Itinerary header
    ensureSpace(lineHeight + 6);
    doc.setFontSize(14);
    doc.text("Day-wise Itinerary", margin, yPos);
    yPos += 10;
    doc.setFontSize(12);

    // Arrival Day
    const writeSection = (title, text) => {
      const titleHeight = 14;
      const textLines = doc.splitTextToSize(text || "", contentWidth);
      const required = titleHeight + textLines.length * lineHeight + 8;
      ensureSpace(required);
      // Title block background
      doc.setFillColor(173, 216, 230);
      doc.rect(margin, yPos, contentWidth, 10, "F");
      doc.setTextColor(0, 0, 0);
      doc.text(title || "", margin + 5, yPos + 7);
      yPos += 15;
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * lineHeight + 8;
    };

    writeSection(pkg.itineraryTitles.first_day || "Arrival Day", pkg.itinerary.first_day || "");

    Object.keys(pkg.itinerary.middle_days || {})
      .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10))
      .forEach((dayKey) => {
        const title = pkg.itineraryTitles.middle_days?.[dayKey] || `Day ${dayKey.split("_")[1]}`;
        const text = pkg.itinerary.middle_days?.[dayKey] || "";
        writeSection(title, text);
      });

    writeSection(pkg.itineraryTitles.last_day || "Departure Day", pkg.itinerary.last_day || "");

    // Footer on last page
    addFooter();

    doc.save(`${pkg.name}_Itinerary.pdf`);
    Swal.fire("Success", `Itinerary for ${pkg.name} downloaded as PDF.`, "success");
  };

  const handleDeletePackage = (id) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;

    Swal.fire({
      title: `Delete ${pkg.name}?`,
      text: "This will permanently remove the package.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e3342f",
    }).then((result) => {
      if (result.isConfirmed) {
        setPackages((prev) => prev.filter((p) => p.id !== id));
        setSelectedPackage((prev) => (prev && prev.id === id ? null : prev));
        if (editPackageData && editPackageData.id === id) {
          setEditPackageData(null);
          setShowEditPackageDialog(false);
        }
        if (showNewPackageDialog) setShowNewPackageDialog(false);

        Swal.fire("Deleted", `${pkg.name} has been deleted.`, "success");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-s z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Itinerary Generation</h1>
              <p className="text-gray-600 mt-1">Create and manage travel packages and itineraries</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewPackageDialog(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Package
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Total Packages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{packages.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Published</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{packages.filter((p) => p.status === "published").length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{packages.reduce((sum, p) => sum + p.bookings, 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Avg. Rating</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">4.8★</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search packages by name or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col group">
              <div
                className={`h-40 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform ${
                  (pkg.images && pkg.images.length > 0) ? 'bg-gray-100' : 'bg-gray-300'
                }`}
                style={pkg.images && pkg.images.length > 0 ? { backgroundImage: `url(${pkg.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!(pkg.images && pkg.images.length > 0) && <ImageIcon className="w-12 h-12 text-white opacity-50" />}
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[pkg.status]}`}>
                  {pkg.status}
                </span>
              </div>

              <div className="p-4 pb-2">
                <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[pkg.category]}`}>{pkg.category}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{pkg.region}</span>
                </div>
              </div>

              <div className="flex-1 px-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {pkg.destinations.join(", ")}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    {pkg.accommodation}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{pkg.rating}</span>
                    <span className="text-xs text-gray-500">({pkg.reviews})</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{pkg.price}</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                  <Users className="w-4 h-4" />
                  {pkg.bookings} bookings
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedPackage(pkg)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEditPackage(pkg)}
                    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownload(pkg)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-indigo-600 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id)}
                    className="flex-1 px-1 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <br />
              </div>
            </div>
          ))}
        </div>

        {/* Package Detail Modal */}
        {selectedPackage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPackage.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedPackage.description}</p>
                </div>
                <button onClick={() => setSelectedPackage(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedPackage.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Region</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedPackage.region}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedPackage.duration}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price</label>
                    <p className="text-sm font-bold text-blue-600 mt-1">{selectedPackage.price}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Destinations</label>
                  <div className="flex gap-2">
                    {selectedPackage.destinations.map((dest, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {dest}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Activities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPackage.activities.map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>
                     <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Images</label>
                  <div className="flex space-x-2 mt-2">
                    {(selectedPackage.images || []).map((image, index) => (
                      <img key={index} src={image} alt={`Package Image ${index}`} className="w-24 h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">Day-wise Itinerary</label>
                  <div className="space-y-3">
                    <div className="border p-4 rounded-md bg-blue-100">
                      <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">Arrival Day</h4>
                      <p className="font-bold mt-2">{selectedPackage.itineraryTitles.first_day}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedPackage.itinerary.first_day}</p>
                    </div>
                    {Object.keys(selectedPackage.itinerary.middle_days)
                      .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10))
                      .map((dayKey) => (
                        <div key={dayKey} className="border p-4 rounded-md bg-blue-100">
                          <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">{`Day ${dayKey.split("_")[1]}`}</h4>
                          <p className="font-bold mt-2">{selectedPackage.itineraryTitles.middle_days[dayKey]}</p>
                          <p className="text-sm text-gray-600 mt-1">{selectedPackage.itinerary.middle_days[dayKey]}</p>
                        </div>
                      ))}
                    <div className="border p-4 rounded-md bg-blue-100">
                      <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">Departure Day</h4>
                      <p className="font-bold mt-2">{selectedPackage.itineraryTitles.last_day}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedPackage.itinerary.last_day}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Package Dialog */}
        {showNewPackageDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create New Travel Package</h2>
                  <p className="text-gray-600 mt-1">Build a new itinerary with destinations, activities, and pricing</p>
                </div>
                <button
                  onClick={() => setShowNewPackageDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <NewEditPackageForm
                  formData={{
                    id: packages.length + 1,
                    name: "",
                    description: "",
                    duration: "",
                    price: "",
                    category: "",
                    region: "",
                    destinations: [],
                    activities: [],
                    accommodation: "",
                    transport: "",
                    images: [],
                    status: "draft",
                    createdDate: new Date().toISOString().split("T")[0],
                    updatedDate: new Date().toISOString().split("T")[0],
                    bookings: 0,
                    rating: 0,
                    reviews: 0,
                    itinerary: { first_day: "", middle_days: {}, last_day: "" },
                    itineraryTitles: { first_day: "", middle_days: {}, last_day: "" },
                  }}
                  packagesLength={packages.length}
                  setFormData={(data) =>
                    setPackages((prev) => [
                      ...prev,
                      { ...data, id: packages.length + 1, createdDate: new Date().toISOString().split("T")[0] },
                    ])
                  }
                  onSave={() => {
                    setShowNewPackageDialog(false);
                    Swal.fire("Success", "New package created successfully.", "success");
                  }}
                  onCancel={() => setShowNewPackageDialog(false)}
                  handleNightsInputChange={handleNightsInputChange}
                  handleConfirmNights={handleConfirmNights}
                  handleItineraryChange={handleItineraryChange}
                  handleItineraryTitleChange={handleItineraryTitleChange}
                  handleImageUpload={handleImageUpload}
                  handleRemoveImage={handleRemoveImage}
                  handleSubmitItinerary={handleSubmitItinerary}
                  handleResetItinerary={handleResetItinerary}
                  nightsInput={nightsInput}
                  setNightsInput={setNightsInput}
                  showItinerary={showItinerary}
                  setShowItinerary={setShowItinerary}
                  isItinerarySubmitted={isItinerarySubmitted}
                  setIsItinerarySubmitted={setIsItinerarySubmitted}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Package Dialog */}
        {showEditPackageDialog && editPackageData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Travel Package</h2>
                  <p className="text-gray-600 mt-1">Update package details and itinerary</p>
                </div>
                <button
                  onClick={() => setShowEditPackageDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <NewEditPackageForm
                  formData={editPackageData}
                  packagesLength={packages.length}
                  setFormData={setEditPackageData}
                  onSave={handleSaveEditPackage}
                  onCancel={() => setShowEditPackageDialog(false)}
                  handleNightsInputChange={handleNightsInputChange}
                  handleConfirmNights={handleConfirmNights}
                  handleItineraryChange={handleItineraryChange}
                  handleItineraryTitleChange={handleItineraryTitleChange}
                  handleImageUpload={handleImageUpload}
                  handleRemoveImage={handleRemoveImage}
                  handleSubmitItinerary={handleSubmitItinerary}
                  handleResetItinerary={handleResetItinerary}
                  nightsInput={nightsInput}
                  setNightsInput={setNightsInput}
                  showItinerary={showItinerary}
                  setShowItinerary={setShowItinerary}
                  isItinerarySubmitted={isItinerarySubmitted}
                  setIsItinerarySubmitted={setIsItinerarySubmitted}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// New/Edit Package Form Component
const NewEditPackageForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  packagesLength,
  handleNightsInputChange,
  handleConfirmNights,
  handleItineraryChange,
  handleItineraryTitleChange,
  handleImageUpload,
  handleRemoveImage,
  handleSubmitItinerary,
  handleResetItinerary,
  nightsInput,
  setNightsInput,
  showItinerary,
  setShowItinerary,
  isItinerarySubmitted,
  setIsItinerarySubmitted,
}) => {
  const [localData, setLocalData] = useState(() => ({ ...formData }));

  useEffect(() => {
    setLocalData({ ...formData });
  }, [formData]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof handleConfirmNights === "function") {
        try {
          handleConfirmNights(localData, setLocalData, false);
        } catch (err) {
          console.warn("handleConfirmNights failed:", err);
        }
      }
    }, 250);

    return () => clearTimeout(t);
  }, [nightsInput]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "destinations" || name === "activities") {
      setLocalData((prev) => ({ ...prev, [name]: value === "" ? [] : value.split(",").map((item) => item.trim()) }));
    } else {
      setLocalData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        name="name"
        value={localData.name}
        onChange={handleInputChange}
        placeholder="Package Name"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <textarea
        placeholder="Package Description"
        value={localData.description}
        onChange={handleInputChange}
        name="description"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <div className="grid grid-cols-2 gap-4">
        <select
          name="category"
          value={localData.category}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Category</option>
          <option>Honeymoon</option>
          <option>Family</option>
          <option>Adventure</option>
          <option>Corporate</option>
        </select>
        <select
          name="region"
          value={localData.region}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Region</option>
          <option>Europe</option>
          <option>Asia</option>
          <option>Middle East</option>
          <option>Americas</option>
          <option>Africa</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          value={nightsInput}
          onChange={(e) => handleNightsInputChange(e, setLocalData)}
          placeholder="Number of Nights"
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="text"
          name="price"
          value={localData.price}
          onChange={handleInputChange}
          placeholder="Price (e.g., $2,499)"
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <input
        type="text"
        name="destinations"
        value={(localData.destinations || []).join(", ")}
        onChange={handleInputChange}
        placeholder="Destinations (comma-separated)"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <input
        type="text"
        name="activities"
        value={(localData.activities || []).join(", ")}
        onChange={handleInputChange}
        placeholder="Activities (comma-separated)"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <input
        type="text"
        name="accommodation"
        value={localData.accommodation}
        onChange={handleInputChange}
        placeholder="Accommodation"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          name="transport"
          value={localData.transport}
          onChange={handleInputChange}
          placeholder="Transport"
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <div>
          <input
            type="file"
            multiple
            onChange={(e) => handleImageUpload(e, setLocalData)}
            className="px-3 py-2 border border-gray-300 rounded-md w-full"
          />
          <div className="flex space-x-2 mt-2">
            {(localData.images || []).map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img} alt={`Package Image ${idx}`} className="w-24 h-24 object-cover rounded" />
                <button
                  onClick={() => handleRemoveImage(idx, setLocalData)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itinerary Section */}
      {!showItinerary ? (
        <div className="space-y-6">

          <div className="space-y-6">
            <div className="border p-4 rounded-md bg-blue-100">
              <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">Arrival Day</span>
              <input
                type="text"
                value={localData.itineraryTitles.first_day}
                onChange={(e) => handleItineraryTitleChange(e, "first_day", null, setLocalData)}
                placeholder="Title for Arrival Day"
                className="mt-2 p-2 w-full border border-gray-300 rounded-md"
              />
              <textarea
                rows="2"
                value={localData.itinerary.first_day}
                onChange={(e) => handleItineraryChange(e, "first_day", null, setLocalData)}
                placeholder="Activities for Arrival Day"
                className="mt-2 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>

            {Object.keys(localData.itinerary.middle_days || {})
              .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10))
              .map((dayKey) => (
                <div key={dayKey} className="border p-4 rounded-md bg-blue-100">
                  <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">{`Day ${dayKey.split("_")[1]}`}</span>
                  <input
                    type="text"
                    value={localData.itineraryTitles.middle_days[dayKey]}
                    onChange={(e) => handleItineraryTitleChange(e, "middle_days", dayKey, setLocalData)}
                    placeholder={`Title for Day ${dayKey.split("_")[1]}`}
                    className="mt-2 p-2 w-full border border-gray-300 rounded-md"
                  />
                  <textarea
                    rows="2"
                    value={localData.itinerary.middle_days[dayKey]}
                    onChange={(e) => handleItineraryChange(e, "middle_days", dayKey, setLocalData)}
                    placeholder={`Activities for Day ${dayKey.split("_")[1]}`}
                    className="mt-2 p-2 w-full border border-gray-300 rounded-md"
                  />
                </div>
              ))}

            <div className="border p-4 rounded-md bg-blue-100">
              <span className="bg-blue-500 text-white px-6 py-2 rounded-lg">Departure Day</span>
              <input
                type="text"
                value={localData.itineraryTitles.last_day}
                onChange={(e) => handleItineraryTitleChange(e, "last_day", null, setLocalData)}
                placeholder="Title for Departure Day"
                className="mt-2 p-2 w-full border border-gray-300 rounded-md"
              />
              <textarea
                rows="2"
                value={localData.itinerary.last_day}
                onChange={(e) => handleItineraryChange(e, "last_day", null, setLocalData)}
                placeholder="Activities for Departure Day"
                className="mt-2 p-2 w-full border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSubmitItinerary(localData, setLocalData)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Submit Itinerary
            </button>
            <button
              onClick={() => handleResetItinerary(setLocalData)}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset Itinerary
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700">Itinerary Details</label>
          <div className="space-y-3 mt-2">
            <div className="border p-4 rounded-md bg-blue-100">
              <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">Arrival Day</h4>
              <p className="font-bold mt-2">{localData.itineraryTitles.first_day}</p>
              <p className="text-sm text-gray-600 mt-1">{localData.itinerary.first_day}</p>
            </div>
            {Object.keys(localData.itinerary.middle_days || {})
              .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10))
              .map((dayKey) => (
                <div key={dayKey} className="border p-4 rounded-md bg-blue-100">
                  <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">{`Day ${dayKey.split("_")[1]}`}</h4>
                  <p className="font-bold mt-2">{localData.itineraryTitles.middle_days[dayKey]}</p>
                  <p className="text-sm text-gray-600 mt-1">{localData.itinerary.middle_days[dayKey]}</p>
                </div>
              ))}
            <div className="border p-4 rounded-md bg-blue-100">
              <h4 className="bg-blue-500 text-white px-6 py-2 rounded-lg">Departure Day</h4>
              <p className="font-bold mt-2">{localData.itineraryTitles.last_day}</p>
              <p className="text-sm text-gray-600 mt-1">{localData.itinerary.last_day}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowItinerary(false);
              setIsItinerarySubmitted(false);
            }}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors mt-4"
          >
            Edit Itinerary
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            const dataToSave = { ...localData, status: "draft", updatedDate: new Date().toISOString().split("T")[0] };
            if (dataToSave.id > packagesLength) dataToSave.createdDate = new Date().toISOString().split("T")[0];
            setFormData(dataToSave);
            onSave && onSave();
          }}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
        >
          Save as Draft
        </button>
        <button
          onClick={() => {
            const dataToSave = { ...localData, status: "published", updatedDate: new Date().toISOString().split("T")[0] };
            if (dataToSave.id > packagesLength) dataToSave.createdDate = new Date().toISOString().split("T")[0];
            setFormData(dataToSave);
            onSave && onSave();
          }}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
        >
          Publish
        </button>
        <button
          onClick={() => {
            onCancel && onCancel();
          }}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ItineraryGeneration;