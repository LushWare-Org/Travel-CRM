import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import AppError from '../utils/appError.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

class ItineraryService {
  /**
   * Generate formatted preview of itinerary
   * @param {String} itineraryId - Itinerary ID
   * @returns {Object} Formatted preview data
   */
  static async generatePreview(itineraryId) {
    const itinerary = await Itinerary.findById(itineraryId)
      .populate('package')
      .populate('createdBy', 'name email');

    if (!itinerary) {
      throw new AppError('Itinerary not found', 404);
    }

    const packageData = itinerary.package;

    // Format the preview
    const preview = {
      packageInfo: {
        name: packageData.name,
        destination: packageData.destination,
        duration: packageData.duration,
        price: packageData.price,
        category: packageData.category,
        difficulty: packageData.difficulty,
        coverImage: packageData.coverImage?.url,
        highlights: packageData.highlights,
      },
      itinerary: {
        totalDays: itinerary.days.length,
        days: itinerary.days.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          activities: day.activities,
          accommodation: day.accommodation,
          meals: {
            breakfast: day.meals?.breakfast || false,
            lunch: day.meals?.lunch || false,
            dinner: day.meals?.dinner || false,
          },
          transport: day.transport,
          places: day.places,
        })),
      },
      inclusions: packageData.inclusions,
      exclusions: packageData.exclusions,
      terms: packageData.terms,
      createdBy: itinerary.createdBy?.name,
      createdAt: itinerary.createdAt,
      updatedAt: itinerary.updatedAt,
    };

    return preview;
  }

  /**
   * Generate branded PDF for itinerary
   * @param {String} itineraryId - Itinerary ID
   * @returns {String} File path of generated PDF
   */
  static async generatePDF(itineraryId) {
    const itinerary = await Itinerary.findById(itineraryId).populate('package');

    if (!itinerary) {
      throw new AppError('Itinerary not found', 404);
    }

    const packageData = itinerary.package;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          bufferPages: true,
        });

        const fileName = `itinerary-${packageData.slug || itineraryId}-${Date.now()}.pdf`;
        const uploadsDir = path.join(dirname, '../../uploads/itineraries');
        
        // Ensure directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Colors
        const brandColor = '#1E40AF'; // Blue
        const secondaryColor = '#64748B'; // Gray
        const accentColor = '#F59E0B'; // Amber

        // ===== PAGE 1: COVER PAGE =====
        this.addCoverPage(doc, packageData, brandColor, accentColor);

        // ===== PAGE 2: PACKAGE OVERVIEW =====
        doc.addPage();
        this.addPackageOverview(doc, packageData, itinerary, brandColor, secondaryColor);

        // ===== PAGE 3+: DAY-WISE ITINERARY =====
        itinerary.days.forEach((day, index) => {
          doc.addPage();
          this.addDayPage(doc, day, index + 1, brandColor, secondaryColor, accentColor);
        });

        // ===== INCLUSIONS & EXCLUSIONS PAGE =====
        doc.addPage();
        this.addInclusionsExclusions(doc, packageData, brandColor);

        // ===== TERMS & CONDITIONS PAGE =====
        if (packageData.terms && packageData.terms.length > 0) {
          doc.addPage();
          this.addTermsPage(doc, packageData, brandColor);
        }

        // ===== CONTACT & SUPPORT PAGE =====
        doc.addPage();
        this.addContactSupportPage(doc, brandColor, secondaryColor, accentColor);

        // ===== FOOTER ON ALL PAGES =====
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          this.addFooter(doc, i + 1, pages.count, secondaryColor);
        }

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add cover page to PDF
   */
  static addCoverPage(doc, packageData, brandColor, accentColor) {
    // Background gradient effect
    doc.rect(0, 0, 595, 842).fill('#F8FAFC');

    // Brand header with logo placeholder
    doc
      .fillColor(brandColor)
      .fontSize(32)
      .font('Helvetica-Bold')
      .text('TRIP SKY WAY', 50, 80, { align: 'center' });

    doc
      .fillColor('#64748B')
      .fontSize(12)
      .font('Helvetica')
      .text('Your Journey, Our Passion', 50, 120, { align: 'center' });

    // Decorative line
    doc
      .strokeColor(accentColor)
      .lineWidth(3)
      .moveTo(200, 150)
      .lineTo(395, 150)
      .stroke();

    // Package title
    doc
      .fillColor('#1E293B')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text(packageData.name, 50, 220, {
        align: 'center',
        width: 495,
      });

    // Destination
    doc
      .fillColor(brandColor)
      .fontSize(18)
      .font('Helvetica')
      .text(packageData.destination, 50, 280, { align: 'center' });

    // Package details box
    const boxY = 350;
    doc.rect(100, boxY, 395, 120).fillAndStroke('#FFFFFF', brandColor);

    doc
      .fillColor('#1E293B')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`${packageData.duration} Days`, 150, boxY + 30)
      .text(`${packageData.category.toUpperCase()}`, 150, boxY + 60)
      .text(`$${packageData.price} per person`, 150, boxY + 90);

    // Contact Information Box
    const contactBoxY = 520;
    doc.rect(75, contactBoxY, 445, 140).fillAndStroke('#FFFFFF', '#E2E8F0');
    
    doc
      .fillColor(brandColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contact Us', 90, contactBoxY + 15);

    doc
      .fillColor('#1E293B')
      .fontSize(10)
      .font('Helvetica')
      .text('📧 Email:', 90, contactBoxY + 45)
      .fillColor(brandColor)
      .text('info@tripskyway.com', 180, contactBoxY + 45, {
        link: 'mailto:info@tripskyway.com',
        underline: true,
      });

    doc
      .fillColor('#1E293B')
      .font('Helvetica')
      .text('📞 Phone:', 90, contactBoxY + 65)
      .fillColor(brandColor)
      .text('+91 9876543210', 180, contactBoxY + 65, {
        link: 'tel:+919876543210',
        underline: true,
      });

    doc
      .fillColor('#1E293B')
      .font('Helvetica')
      .text('🌐 Website:', 90, contactBoxY + 85)
      .fillColor(brandColor)
      .text('www.tripskyway.com', 180, contactBoxY + 85, {
        link: 'https://www.tripskyway.com',
        underline: true,
      });

    doc
      .fillColor('#1E293B')
      .font('Helvetica')
      .text('📍 Address:', 90, contactBoxY + 105)
      .fillColor('#64748B')
      .text('123 Travel Street, Mumbai, India 400001', 180, contactBoxY + 105, {
        width: 310,
      });

    // Footer text
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Detailed Travel Itinerary', 50, 700, { align: 'center' })
      .text(`Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 50, 720, { align: 'center' });
  }

  /**
   * Add package overview page
   */
  static addPackageOverview(doc, packageData, itinerary, brandColor, secondaryColor) {
    // Page header
    doc
      .fillColor(brandColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Package Overview', 50, 50);

    doc
      .strokeColor(brandColor)
      .lineWidth(2)
      .moveTo(50, 80)
      .lineTo(545, 80)
      .stroke();

    let yPos = 110;

    // Description
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Description', 50, yPos);

    yPos += 25;

    doc
      .fillColor(secondaryColor)
      .fontSize(10)
      .font('Helvetica')
      .text(packageData.description || 'No description available', 50, yPos, {
        width: 495,
        align: 'justify',
      });

    yPos += doc.heightOfString(packageData.description || 'No description available', {
      width: 495,
    }) + 30;

    // Highlights
    if (packageData.highlights && packageData.highlights.length > 0) {
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Highlights', 50, yPos);

      yPos += 25;

      packageData.highlights.forEach((highlight) => {
        doc
          .fillColor(secondaryColor)
          .fontSize(10)
          .font('Helvetica')
          .text(`• ${highlight}`, 60, yPos, { width: 485 });
        yPos += 20;
      });

      yPos += 20;
    }

    // Quick Facts
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Quick Facts', 50, yPos);

    yPos += 25;

    const facts = [
      { label: 'Duration', value: `${packageData.duration} Days` },
      { label: 'Difficulty', value: packageData.difficulty.charAt(0).toUpperCase() + packageData.difficulty.slice(1) },
      { label: 'Category', value: packageData.category.charAt(0).toUpperCase() + packageData.category.slice(1) },
      { label: 'Max Group Size', value: packageData.maxGroupSize || 'Flexible' },
      { label: 'Total Days in Itinerary', value: itinerary.days.length },
    ];

    facts.forEach((fact) => {
      doc
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(fact.label + ':', 60, yPos)
        .font('Helvetica')
        .text(fact.value, 200, yPos);
      yPos += 22;
    });
  }

  /**
   * Add day page to PDF
   */
  static addDayPage(doc, day, dayNumber, brandColor, secondaryColor, accentColor) {
    // Day header
    doc
      .fillColor(brandColor)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(`Day ${dayNumber}`, 50, 50);

    doc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(50, 75)
      .lineTo(545, 75)
      .stroke();

    // Day title
    doc
      .fillColor('#1E293B')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(day.title, 50, 90);

    let yPos = 120;

    // Description
    doc
      .fillColor(secondaryColor)
      .fontSize(10)
      .font('Helvetica')
      .text(day.description, 50, yPos, {
        width: 495,
        align: 'justify',
      });

    yPos += doc.heightOfString(day.description, { width: 495 }) + 20;

    // Activities
    if (day.activities && day.activities.length > 0) {
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Activities', 50, yPos);

      yPos += 20;

      day.activities.forEach((activity) => {
        doc
          .fillColor(secondaryColor)
          .fontSize(10)
          .font('Helvetica')
          .text(`✓ ${activity}`, 60, yPos);
        yPos += 18;
      });

      yPos += 15;
    }

    // Places to visit
    if (day.places && day.places.length > 0) {
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Places to Visit', 50, yPos);

      yPos += 20;

      day.places.forEach((place) => {
        doc
          .fillColor(secondaryColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`📍 ${place.name}`, 60, yPos);
        
        yPos += 15;

        if (place.description) {
          doc
            .font('Helvetica')
            .text(place.description, 75, yPos, { width: 470 });
          yPos += doc.heightOfString(place.description, { width: 470 }) + 5;
        }

        if (place.duration) {
          doc.text(`Duration: ${place.duration}`, 75, yPos);
          yPos += 15;
        }

        yPos += 10;
      });

      yPos += 10;
    }

    // Accommodation
    if (day.accommodation && day.accommodation.name) {
      if (yPos > 680) {
        doc.addPage();
        yPos = 50;
      }

      doc.rect(50, yPos, 495, 60).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .fillColor('#1E293B')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('🏨 Accommodation', 60, yPos + 10);

      doc
        .fillColor(secondaryColor)
        .fontSize(10)
        .font('Helvetica')
        .text(day.accommodation.name, 60, yPos + 28);

      if (day.accommodation.type) {
        doc.text(
          `Type: ${day.accommodation.type.charAt(0).toUpperCase() + day.accommodation.type.slice(1)}`,
          60,
          yPos + 43
        );
      }

      yPos += 75;
    }

    // Meals & Transport
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    const mealsIncluded = [];
    if (day.meals?.breakfast) mealsIncluded.push('Breakfast');
    if (day.meals?.lunch) mealsIncluded.push('Lunch');
    if (day.meals?.dinner) mealsIncluded.push('Dinner');

    if (mealsIncluded.length > 0 || day.transport) {
      doc.rect(50, yPos, 240, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc
        .fillColor('#1E293B')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('🍽️ Meals Included', 60, yPos + 10);
      
      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font('Helvetica')
        .text(mealsIncluded.join(', ') || 'Not included', 60, yPos + 28);

      if (day.transport) {
        doc.rect(305, yPos, 240, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc
          .fillColor('#1E293B')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('🚗 Transport', 315, yPos + 10);
        
        doc
          .fillColor(secondaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(day.transport.charAt(0).toUpperCase() + day.transport.slice(1), 315, yPos + 28);
      }
    }
  }

  /**
   * Add inclusions and exclusions page
   */
  static addInclusionsExclusions(doc, packageData, brandColor) {
    // Page header
    doc
      .fillColor(brandColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Inclusions & Exclusions', 50, 50);

    doc
      .strokeColor(brandColor)
      .lineWidth(2)
      .moveTo(50, 80)
      .lineTo(545, 80)
      .stroke();

    let yPos = 110;

    // Inclusions
    if (packageData.inclusions && packageData.inclusions.length > 0) {
      doc
        .fillColor('#10B981')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('✓ What\'s Included', 50, yPos);

      yPos += 30;

      packageData.inclusions.forEach((item) => {
        doc
          .fillColor('#1E293B')
          .fontSize(10)
          .font('Helvetica')
          .text(`✓ ${item}`, 60, yPos, { width: 485 });
        yPos += 22;
      });

      yPos += 30;
    }

    // Exclusions
    if (packageData.exclusions && packageData.exclusions.length > 0) {
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc
        .fillColor('#EF4444')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('✗ What\'s Not Included', 50, yPos);

      yPos += 30;

      packageData.exclusions.forEach((item) => {
        doc
          .fillColor('#1E293B')
          .fontSize(10)
          .font('Helvetica')
          .text(`✗ ${item}`, 60, yPos, { width: 485 });
        yPos += 22;
      });
    }
  }

  /**
   * Add terms and conditions page
   */
  static addTermsPage(doc, packageData, brandColor) {
    doc
      .fillColor(brandColor)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Terms & Conditions', 50, 50);

    doc
      .strokeColor(brandColor)
      .lineWidth(2)
      .moveTo(50, 80)
      .lineTo(545, 80)
      .stroke();

    let yPos = 110;

    packageData.terms.forEach((term, index) => {
      if (yPos > 720) {
        doc.addPage();
        yPos = 50;
      }

      doc
        .fillColor('#1E293B')
        .fontSize(10)
        .font('Helvetica')
        .text(`${index + 1}. ${term}`, 50, yPos, {
          width: 495,
          align: 'justify',
        });

      yPos += doc.heightOfString(term, { width: 495 }) + 15;
    });
  }

  /**
   * Add contact and support page
   */
  static addContactSupportPage(doc, brandColor, secondaryColor, accentColor) {
    // Page header
    doc
      .fillColor(brandColor)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Contact & Support', 50, 50, { align: 'center' });

    doc
      .strokeColor(accentColor)
      .lineWidth(3)
      .moveTo(200, 85)
      .lineTo(395, 85)
      .stroke();

    // Tagline
    doc
      .fillColor('#64748B')
      .fontSize(12)
      .font('Helvetica')
      .text('We\'re here to make your journey unforgettable', 50, 110, { align: 'center' });

    let yPos = 160;

    // Contact Information Section
    doc
      .fillColor(brandColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Get in Touch', 50, yPos);

    yPos += 35;

    // Email
    doc.rect(50, yPos, 495, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('📧 Email Us', 70, yPos + 10);
    doc
      .fillColor(brandColor)
      .fontSize(11)
      .font('Helvetica')
      .text('info@tripskyway.com', 70, yPos + 28, {
        link: 'mailto:info@tripskyway.com',
        underline: true,
      });
    doc
      .fillColor('#64748B')
      .fontSize(9)
      .text('Response within 24 hours', 70, yPos + 42);

    yPos += 70;

    // Phone
    doc.rect(50, yPos, 240, 60).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('📞 Call Us', 70, yPos + 10);
    doc
      .fillColor(brandColor)
      .fontSize(11)
      .font('Helvetica')
      .text('+91 9876543210', 70, yPos + 28, {
        link: 'tel:+919876543210',
        underline: true,
      });
    doc
      .fillColor('#64748B')
      .fontSize(9)
      .text('Mon-Sat: 9 AM - 7 PM IST', 70, yPos + 42);

    // WhatsApp
    doc.rect(305, yPos, 240, 60).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('💬 WhatsApp', 325, yPos + 10);
    doc
      .fillColor(brandColor)
      .fontSize(11)
      .font('Helvetica')
      .text('+91 9876543210', 325, yPos + 28, {
        link: 'https://wa.me/919876543210',
        underline: true,
      });
    doc
      .fillColor('#64748B')
      .fontSize(9)
      .text('Quick chat available 24/7', 325, yPos + 42);

    yPos += 80;

    // Website
    doc.rect(50, yPos, 495, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('🌐 Visit Our Website', 70, yPos + 10);
    doc
      .fillColor(brandColor)
      .fontSize(11)
      .font('Helvetica')
      .text('www.tripskyway.com', 70, yPos + 28, {
        link: 'https://www.tripskyway.com',
        underline: true,
      });

    yPos += 70;

    // Office Address
    doc.rect(50, yPos, 495, 80).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('📍 Office Address', 70, yPos + 10);
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Trip Sky Way Travel & Tourism Pvt. Ltd.', 70, yPos + 30)
      .text('123 Travel Street, Andheri West', 70, yPos + 45)
      .text('Mumbai, Maharashtra 400001, India', 70, yPos + 60);

    yPos += 100;

    // Social Media
    doc
      .fillColor(brandColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Follow Us', 50, yPos);

    yPos += 30;

    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Stay connected for travel tips, deals, and inspiration:', 50, yPos);

    yPos += 25;

    // Social media links in a box
    doc.rect(50, yPos, 495, 35).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc
      .fillColor(brandColor)
      .fontSize(10)
      .font('Helvetica')
      .text('Facebook', 70, yPos + 12, {
        link: 'https://facebook.com/tripskyway',
        underline: true,
        continued: true,
      })
      .fillColor('#64748B')
      .text('  |  ', { continued: true, link: null })
      .fillColor(brandColor)
      .text('Instagram', {
        link: 'https://instagram.com/tripskyway',
        underline: true,
        continued: true,
      })
      .fillColor('#64748B')
      .text('  |  ', { continued: true, link: null })
      .fillColor(brandColor)
      .text('Twitter', {
        link: 'https://twitter.com/tripskyway',
        underline: true,
        continued: true,
      })
      .fillColor('#64748B')
      .text('  |  ', { continued: true, link: null })
      .fillColor(brandColor)
      .text('LinkedIn', {
        link: 'https://linkedin.com/company/tripskyway',
        underline: true,
      });

    yPos += 60;

    // Emergency Contact
    doc
      .fillColor('#EF4444')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('🚨 24/7 Emergency Support', 50, yPos);

    yPos += 30;

    doc.rect(50, yPos, 495, 45).fillAndStroke('#FEF2F2', '#EF4444');
    doc
      .fillColor('#1E293B')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Emergency Helpline:', 70, yPos + 10);
    doc
      .fillColor('#EF4444')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('+91 9876543210', 70, yPos + 26, {
        link: 'tel:+919876543210',
        underline: true,
      });

    // Thank you note
    yPos += 65;
    doc
      .fillColor('#64748B')
      .fontSize(11)
      .font('Helvetica-Oblique')
      .text('Thank you for choosing Trip Sky Way!', 50, yPos, { align: 'center' })
      .text('We look forward to making your travel dreams come true.', 50, yPos + 18, { align: 'center' });
  }

  /**
   * Add footer to PDF pages
   */
  static addFooter(doc, pageNumber, totalPages, secondaryColor) {
    const footerY = 770;
    
    // Company name and contact info
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .font('Helvetica-Bold')
      .text('Trip Sky Way', 50, footerY, { continued: true })
      .font('Helvetica')
      .text(' | ', { continued: true, link: null })
      .fillColor('#1E40AF')
      .text('www.tripskyway.com', { 
        continued: true,
        link: 'https://www.tripskyway.com',
        underline: true,
      })
      .fillColor(secondaryColor)
      .text(' | ', { continued: true, link: null })
      .text('info@tripskyway.com', { 
        continued: true,
        link: 'mailto:info@tripskyway.com',
        underline: true,
      })
      .text(' | ', { continued: true, link: null })
      .text('+91 9876543210', {
        link: 'tel:+919876543210',
        underline: true,
      });

    // Page number
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .font('Helvetica')
      .text(`Page ${pageNumber} of ${totalPages}`, 50, footerY + 12, { 
        align: 'center',
        width: 495,
      });
  }

  /**
   * Validate itinerary data
   * @param {Object} itineraryData - Itinerary data to validate
   * @returns {Object} Validation result
   */
  static validateItineraryData(itineraryData) {
    const errors = [];

    if (!itineraryData.package) {
      errors.push('Package ID is required');
    }

    if (!itineraryData.days || itineraryData.days.length === 0) {
      errors.push('At least one day is required');
    }

    if (itineraryData.days) {
      itineraryData.days.forEach((day, index) => {
        if (!day.dayNumber) {
          errors.push(`Day ${index + 1}: Day number is required`);
        }
        if (!day.title) {
          errors.push(`Day ${index + 1}: Title is required`);
        }
        if (!day.description) {
          errors.push(`Day ${index + 1}: Description is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default ItineraryService;
