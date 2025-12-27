import Career from '../models/career.model.js';
import Vacancy from '../models/vacancy.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import nodemailer from 'nodemailer';

export const applyForPosition = asyncHandler(async (req, res, next) => {
  const { fullName, email, phone, position, coverLetter, agreeTerms, resumeUrl } = req.body;
  
  if (!fullName || !email || !phone || !position || !coverLetter || !agreeTerms) {
    return next(new AppError('Please fill in all required fields', 400));
  }

  if (!resumeUrl) {
    return next(new AppError('Please upload your resume', 400));
  }

  const vacancy = await Vacancy.findOne({
    position: position,
    status: 'active'
  });

  if (!vacancy) {
    return next(new AppError('Invalid position selected or position is no longer available', 400));
  }

  // Check for duplicate application
  const existingApplication = await Career.findOne({
    email,
    position,
  });

  if (existingApplication) {
    return next(
      new AppError(
        `You have already applied for ${position}. Please wait for our response.`,
        400
      )
    );
  }

  try {
    const careerApplication = new Career({
      fullName,
      email,
      phone,
      position,
      coverLetter,
      agreeTerms,
      resume: {
        url: resumeUrl,
        fileName: 'resume',
      },
      status: 'pending',
    });

    await careerApplication.save();

    // Send confirmation email to applicant
    await sendApplicationConfirmationEmail(email, fullName, position);

    // Send admin notification email
    await sendAdminNotificationEmail(fullName, position, email);

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully! We will review it soon.',
      data: {
        application: careerApplication,
      },
    });
  } catch (error) {
    console.error('Career application error:', error);
    return next(
      new AppError('Failed to submit application. Please try again.', 500)
    );
  }
});


export const getCareerApplications = asyncHandler(async (req, res, next) => {
  const { status, position, sortBy = '-createdAt', page = 1, limit = 10 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (position) filter.position = position;

  const skip = (page - 1) * limit;

  const applications = await Career.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('reviewedBy', 'name email');

  const total = await Career.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      applications,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
});

export const getApplicationDetails = asyncHandler(async (req, res, next) => {
  const application = await Career.findById(req.params.id).populate(
    'reviewedBy',
    'name email'
  );

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      application,
    },
  });
});

export const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNotes, rating, feedback } = req.body;

  const validStatuses = ['pending', 'under-review', 'shortlisted', 'rejected', 'hired'];

  if (status && !validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const application = await Career.findById(req.params.id);

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Update fields
  if (status) {
    application.status = status;
  }
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  if (rating !== undefined) {
    application.rating = rating;
  }
  if (feedback) {
    application.feedback = feedback;
  }

  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();

  await application.save();
  await sendStatusUpdateEmail(application, status);

  res.status(200).json({
    status: 'success',
    message: 'Application updated successfully',
    data: {
      application,
    },
  });
});

export const getCareerStats = asyncHandler(async (req, res, next) => {
  const stats = await Career.aggregate([
    {
      $facet: {
        totalApplications: [{ $count: 'count' }],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
        pendingCount: [
          { $match: { status: 'pending' } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: stats[0],
  });
});

export const deleteApplication = asyncHandler(async (req, res, next) => {
  const application = await Career.findById(req.params.id);

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  await Career.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Application deleted successfully',
  });
});

export const searchApplications = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return next(new AppError('Please enter at least 2 characters to search', 400));
  }

  const applications = await Career.find({
    $or: [
      { fullName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { position: { $regex: query, $options: 'i' } },
    ],
  }).limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      applications,
    },
  });
});

const sendApplicationConfirmationEmail = async (email, fullName, position) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Application Received - ${position} Position`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF8C42;">Thank you for applying, ${fullName}!</h2>
          <p>We have received your application for the <strong>${position}</strong> position.</p>
          <p>Our team will review your application and get back to you within 5-7 business days.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h4>Application Details:</h4>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Email:</strong> ${email}</p>
          </div>
          <p style="margin-top: 20px; color: #666;">Best regards,<br/>Trip Sky Way Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Application confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};

const sendAdminNotificationEmail = async (fullName, position, applicantEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [
      process.env.EMAIL_USER,
    ];

    const managementUrl = `${process.env.MANAGEMENT_URL || process.env.CLIENT_URL || 'http://localhost:3001'}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails.join(','),
      subject: `New Application - ${position}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF8C42;">New Career Application Received</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Email:</strong> ${applicantEmail}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="margin-top: 20px;">
            <a href="${managementUrl}/career" 
               style="background-color: #FF8C42; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Review Application
            </a>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent');
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
};

const sendStatusUpdateEmail = async (application, newStatus) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const statusMessages = {
      'under-review': 'Your application is under review. We will update you soon.',
      shortlisted: 'Congratulations! Your application has been shortlisted.',
      rejected: 'Thank you for applying. Unfortunately, we cannot proceed with your application at this time.',
      hired: 'Congratulations! We are pleased to offer you the position.',
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: application.email,
      subject: `Update on Your ${application.position} Application`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF8C42;">Application Status Update</h2>
          <p>Dear ${application.fullName},</p>
          <p>${statusMessages[newStatus] || 'Your application status has been updated.'}</p>
          ${application.feedback ? `
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h4>Feedback:</h4>
              <p>${application.feedback}</p>
            </div>
          ` : ''}
          <p style="margin-top: 20px; color: #666;">Best regards,<br/>Trip Sky Way Team</p>
        </div>
      `,
    };

    if (newStatus !== 'pending' && newStatus !== 'under-review') {
      await transporter.sendMail(mailOptions);
      application.emailSent = true;
      application.emailSentAt = new Date();
      await application.save();
      console.log('Status update email sent to:', application.email);
    }
  } catch (error) {
    console.error('Error sending status update email:', error);
  }
};
