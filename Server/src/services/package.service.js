/**
 * Package Service
 * Business logic for package operations
 * Handles all package-related operations with proper error handling
 */

import Package from '../models/package.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import logger from '../config/logger.js';

class PackageService {
  /**
   * Create a new package
   * @param {Object} packageData - Package data
   * @param {string} userId - User ID of the creator
   * @returns {Object} Created package
   */
  async createPackage(packageData, userId) {
    try {
      const newPackage = await Package.create({
        ...packageData,
        createdBy: userId,
      });

      // Populate references
      await newPackage.populate('createdBy', 'name email role');
      await newPackage.populate('itinerary');

      logger.info(`Package created: ${newPackage._id}`);
      return newPackage;
    } catch (error) {
      logger.error(`Error creating package: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all packages with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @returns {Object} Packages and metadata
   */
  async getPackages(filters = {}) {
    try {
      const {
        search,
        category,
        minPrice,
        maxPrice,
        minDuration,
        maxDuration,
        difficulty,
        isActive = true,
        isFeatured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
      } = filters;

      // Build query
      const query = {};

      // Active packages by default
      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      // Search by name, description, or destination
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { destination: { $regex: search, $options: 'i' } },
        ];
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Price range filter
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) {
          query.price.$gte = parseFloat(minPrice);
        }
        if (maxPrice !== undefined) {
          query.price.$lte = parseFloat(maxPrice);
        }
      }

      // Duration range filter
      if (minDuration !== undefined || maxDuration !== undefined) {
        query.duration = {};
        if (minDuration !== undefined) {
          query.duration.$gte = parseInt(minDuration);
        }
        if (maxDuration !== undefined) {
          query.duration.$lte = parseInt(maxDuration);
        }
      }

      // Difficulty filter
      if (difficulty) {
        query.difficulty = difficulty;
      }

      // Featured filter
      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured;
      }

      // Build sort object
      const sortObj = {};
      const sortField = this.getValidSortField(sortBy);
      sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const packages = await Package.find(query)
        .populate('createdBy', 'name email role')
        .populate('itinerary')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Package.countDocuments(query);

      logger.info(`Fetched ${packages.length} packages`);

      return {
        packages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error(`Error fetching packages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single package by ID
   * @param {string} packageId - Package ID
   * @returns {Object} Package details
   */
  async getPackageById(packageId) {
    try {
      const pkg = await Package.findById(packageId)
        .populate('createdBy', 'name email role')
        .populate('itinerary')
        .populate({
          path: 'reviews',
          select: 'rating comment author createdAt',
          populate: {
            path: 'author',
            select: 'name email',
          },
        });

      if (!pkg) {
        throw new AppError('Package not found', 404);
      }

      // Increment views
      await Package.findByIdAndUpdate(
        packageId,
        { $inc: { views: 1 } },
        { new: true },
      );

      return pkg;
    } catch (error) {
      logger.error(`Error fetching package ${packageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a package
   * @param {string} packageId - Package ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Updated package
   */
  async updatePackage(packageId, updateData, userId) {
    try {
      const pkg = await Package.findById(packageId);

      if (!pkg) {
        throw new AppError('Package not found', 404);
      }

      // Check authorization (only creator or admin/staff can update)
      const isAuthorized = pkg.createdBy.toString() === userId.toString() || await this.isAdmin(userId);
      if (!isAuthorized) {
        throw new AppError('Not authorized to update this package', 403);
      }

      // Update allowed fields
      const allowedFields = [
        'name',
        'description',
        'destination',
        'duration',
        'price',
        'maxGroupSize',
        'difficulty',
        'category',
        'inclusions',
        'exclusions',
        'highlights',
        'terms',
        'isActive',
        'isFeatured',
        'availableFrom',
        'availableTo',
        'itinerary',
      ];

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          pkg[key] = updateData[key];
        }
      });

      const updatedPackage = await pkg.save();

      await updatedPackage.populate('createdBy', 'name email role');
      await updatedPackage.populate('itinerary');

      logger.info(`Package updated: ${packageId}`);
      return updatedPackage;
    } catch (error) {
      logger.error(`Error updating package ${packageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a package
   * @param {string} packageId - Package ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Deleted package
   */
  async deletePackage(packageId, userId) {
    try {
      const pkg = await Package.findById(packageId);

      if (!pkg) {
        throw new AppError('Package not found', 404);
      }

      // Check authorization (only creator or admin/staff can delete)
      const isAuthorized = pkg.createdBy.toString() === userId.toString() || await this.isAdmin(userId);
      if (!isAuthorized) {
        throw new AppError('Not authorized to delete this package', 403);
      }

      await Package.findByIdAndDelete(packageId);

      logger.info(`Package deleted: ${packageId}`);
      return pkg;
    } catch (error) {
      logger.error(`Error deleting package ${packageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get featured packages
   * @param {number} limit - Number of packages to fetch
   * @returns {Array} Featured packages
   */
  async getFeaturedPackages(limit = 6) {
    try {
      const packages = await Package.find({
        isFeatured: true,
        isActive: true,
      })
        .populate('createdBy', 'name email')
        .populate('itinerary')
        .limit(parseInt(limit))
        .sort('-createdAt');

      return packages;
    } catch (error) {
      logger.error(`Error fetching featured packages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get package statistics
   * @returns {Object} Package statistics
   */
  async getPackageStats() {
    try {
      const stats = await Package.aggregate([
        {
          $group: {
            _id: null,
            totalPackages: { $sum: 1 },
            publishedPackages: {
              $sum: { $cond: ['$isActive', 1, 0] },
            },
            totalBookings: { $sum: '$bookings' },
            averageRating: { $avg: '$rating' },
            totalRevenue: { $sum: '$price' },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]);

      return stats[0] || {
        totalPackages: 0,
        publishedPackages: 0,
        totalBookings: 0,
        averageRating: 0,
        totalRevenue: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
      };
    } catch (error) {
      logger.error(`Error fetching package stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search packages
   * @param {string} searchTerm - Search term
   * @returns {Array} Search results
   */
  async searchPackages(searchTerm) {
    try {
      const packages = await Package.find(
        {
          $text: { $search: searchTerm },
          isActive: true,
        },
        {
          score: { $meta: 'textScore' },
        },
      )
        .sort({ score: { $meta: 'textScore' } })
        .populate('createdBy', 'name email')
        .limit(10);

      return packages;
    } catch (error) {
      logger.error(`Error searching packages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Increment package bookings
   * @param {string} packageId - Package ID
   * @returns {Object} Updated package
   */
  async incrementBookings(packageId) {
    try {
      const pkg = await Package.findByIdAndUpdate(
        packageId,
        { $inc: { bookings: 1 } },
        { new: true },
      );

      if (!pkg) {
        throw new AppError('Package not found', 404);
      }

      logger.info(`Package bookings incremented: ${packageId}`);
      return pkg;
    } catch (error) {
      logger.error(`Error incrementing bookings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update package rating
   * @param {string} packageId - Package ID
   * @param {number} rating - New rating
   * @param {number} reviewCount - Total review count
   * @returns {Object} Updated package
   */
  async updatePackageRating(packageId, rating, reviewCount) {
    try {
      const pkg = await Package.findByIdAndUpdate(
        packageId,
        {
          rating: (pkg.rating * pkg.numReviews + rating) / (pkg.numReviews + 1),
          numReviews: reviewCount,
        },
        { new: true },
      );

      if (!pkg) {
        throw new AppError('Package not found', 404);
      }

      logger.info(`Package rating updated: ${packageId}`);
      return pkg;
    } catch (error) {
      logger.error(`Error updating package rating: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get packages by category
   * @param {string} category - Category name
   * @param {number} limit - Limit results
   * @returns {Array} Packages in category
   */
  async getPackagesByCategory(category, limit = 10) {
    try {
      const packages = await Package.find({
        category,
        isActive: true,
      })
        .populate('createdBy', 'name email')
        .populate('itinerary')
        .limit(parseInt(limit))
        .sort('-rating');

      return packages;
    } catch (error) {
      logger.error(`Error fetching packages by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate sort field
   * @param {string} sortBy - Sort field
   * @returns {string} Validated sort field
   */
  getValidSortField(sortBy) {
    const validFields = ['name', 'price', 'duration', 'rating', 'bookings', 'createdAt'];
    return validFields.includes(sortBy) ? sortBy : 'createdAt';
  }

  /**
   * Check if user is admin (placeholder - implement based on your auth)
   * @param {string} userId - User ID
   * @returns {boolean} Is admin
   */
  async isAdmin(userId) {
    try {
      const user = await User.findById(userId);
      return user && (user.role === 'admin' || user.role === 'staff');
    } catch (error) {
      logger.error(`Error checking admin status: ${error.message}`);
      return false;
    }
  }
}

export default new PackageService();
