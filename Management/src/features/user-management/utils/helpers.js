/**
 * User Management Helper Functions
 */

export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    return 'N/A';
  }
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      date: dateStr,
      time: timeStr
    };
  } catch (error) {
    return { date: 'N/A', time: 'N/A' };
  }
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const generatePasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[@$!%*?&]/)) strength++;
  
  return {
    score: strength,
    label: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  };
};

export const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const filterUsers = (users, searchTerm, filters = {}) => {
  return users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm || 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm);
    
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesStatus = !filters.status || user.status === filters.status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
};

export const sortUsers = (users, sortField = 'createdAt', sortOrder = 'desc') => {
  const sorted = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });
  
  return sorted;
};

export const paginateArray = (array, page, limit) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return {
    data: array.slice(startIndex, endIndex),
    total: array.length,
    pages: Math.ceil(array.length / limit),
    current: page
  };
};
