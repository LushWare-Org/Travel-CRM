import { useState, useCallback, useEffect } from 'react';
import websiteUserService from '../../../services/websiteUser.service';
import { unwrapList } from '../../../services/apiResponse';

/**
 * Custom hook for managing website users
 * Handles fetching, creating, updating, and deleting users
 */
export const useWebsiteUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined,
    isEmailVerified: undefined,
    page: 1,
    limit: 10,
  });

  /**
   * Fetch users from API
   */
  const fetchUsers = useCallback(async (queryParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Clean up params - remove undefined and empty string values
      const cleanParams = {};
      const paramsToUse = { ...filters, ...queryParams };

      Object.keys(paramsToUse).forEach(key => {
        const value = paramsToUse[key];
        // Only include parameters that have meaningful values
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });

      const response = await websiteUserService.getAllUsers(cleanParams);

      if (response.status === 'success') {
        // user-service returns a flat array in `data` and pagination at the
        // top level — not nested under `data.users`/`data.pagination`.
        const { items, pagination: rawPagination } = unwrapList(response);
        const transformedUsers = items.map(user =>
          websiteUserService.transformUserData(user)
        );
        setUsers(transformedUsers);
        if (rawPagination) {
          setPagination({
            currentPage: rawPagination.page,
            totalPages: rawPagination.pages,
            totalUsers: rawPagination.total,
            usersPerPage: rawPagination.limit,
            hasNextPage: rawPagination.page < rawPagination.pages,
            hasPrevPage: rawPagination.page > 1,
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Create new user
   */
  const createUser = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      // Validate before sending
      const validation = websiteUserService.validateUserData(userData);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Transform to API format
      const apiData = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone, // Already in E.164 format from frontend
        phoneCountry: userData.phoneCountry, // ISO country code
        password: userData.password,
        role: 'customer', // Always customer role
      };

      const response = await websiteUserService.createUser(apiData);

      if (response.status === 'success') {
        // Reset filters and refresh user list
        const resetFilters = {
          search: '',
          isActive: undefined,
          isEmailVerified: undefined,
          page: 1,
          limit: 10,
        };
        setFilters(resetFilters);
        // Fetch with reset filters
        await fetchUsers({ ...resetFilters, page: 1 });
        return response.data;
      } else {
        throw new Error('Failed to create user');
      }
    } catch (err) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  /**
   * Update user
   */
  const updateUser = useCallback(async (userId, userData) => {
    setLoading(true);
    setError(null);
    try {
      // Validate before sending
      const validation = websiteUserService.validateUserData(userData);
      if (!validation.valid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const updateData = {
        name: userData.name,
        phone: userData.phone, // E.164 format from frontend
        phoneCountry: userData.phoneCountry, // ISO country code
        email: userData.email,
      };

      if (userData.status !== undefined) {
        updateData.isActive = userData.status === 'active';
      }

      const response = await websiteUserService.updateUser(userId, updateData);

      if (response.status === 'success') {
        // Reset filters and refresh user list
        const resetFilters = {
          search: '',
          isActive: undefined,
          isEmailVerified: undefined,
          page: 1,
          limit: 10,
        };
        setFilters(resetFilters);
        await fetchUsers(resetFilters);
        return response.data;
      } else {
        throw new Error('Failed to update user');
      }
    } catch (err) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  /**
   * Delete user
   */
  const deleteUser = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await websiteUserService.deleteUser(userId);

      if (response.status === 'success') {
        // Reset filters and refresh user list
        const resetFilters = {
          search: '',
          isActive: undefined,
          isEmailVerified: undefined,
          page: 1,
          limit: 10,
        };
        setFilters(resetFilters);
        await fetchUsers(resetFilters);
        return response;
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  /**
   * Toggle user status
   */
  const toggleUserStatus = useCallback(async (userId, currentStatus) => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = currentStatus === 'active' ? false : true;
      const response = await websiteUserService.toggleUserStatus(userId, newStatus);

      if (response.status === 'success') {
        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId
              ? { ...user, status: newStatus ? 'active' : 'inactive' }
              : user
          )
        );
        return response.data;
      } else {
        throw new Error('Failed to toggle user status');
      }
    } catch (err) {
      setError(err.message || 'Failed to toggle user status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search users
   */
  const searchUsers = useCallback(async (searchTerm) => {
    const newFilters = {
      ...filters,
      search: searchTerm,
      page: 1,
    };
    setFilters(newFilters);
    await fetchUsers(newFilters);
  }, [filters, fetchUsers]);

  /**
   * Change page
   */
  const changePage = useCallback(async (page) => {
    const newFilters = {
      ...filters,
      page,
    };
    setFilters(newFilters);
    await fetchUsers(newFilters);
  }, [filters, fetchUsers]);

  /**
   * Update filters
   */
  const updateFilters = useCallback(async (newFilters) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    };
    setFilters(updatedFilters);
    await fetchUsers(updatedFilters);
  }, [filters, fetchUsers]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []); // Only on mount

  return {
    users,
    loading,
    error,
    pagination,
    filters,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    searchUsers,
    changePage,
    updateFilters,
    clearError,
  };
};

export default useWebsiteUsers;
