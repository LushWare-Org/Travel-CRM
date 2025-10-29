/**
 * Custom hook for managing package data
 */

import { useState } from 'react';
import { createDefaultPackage } from '../types';

export const usePackageState = (initialPackages = []) => {
  const [packages, setPackages] = useState(initialPackages);

  const addPackage = (packageData) => {
    setPackages((prev) => [
      ...prev,
      {
        ...packageData,
        id: Math.max(...prev.map((p) => p.id || 0), 0) + 1,
      },
    ]);
  };

  const updatePackage = (id, updatedData) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === id
          ? {
              ...pkg,
              ...updatedData,
              updatedDate: new Date().toISOString().split('T')[0],
            }
          : pkg
      )
    );
  };

  const deletePackage = (id) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
  };

  const getPackageById = (id) => {
    return packages.find((pkg) => pkg.id === id);
  };

  return {
    packages,
    setPackages,
    addPackage,
    updatePackage,
    deletePackage,
    getPackageById,
  };
};
