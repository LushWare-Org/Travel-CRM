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
      prev.map((pkg) => {
        // Check both _id (MongoDB) and id (local) fields
        const pkgId = pkg._id || pkg.id;
        return pkgId === id
          ? {
              ...pkg,
              ...updatedData,
              updatedDate: new Date().toISOString().split('T')[0],
            }
          : pkg;
      })
    );
  };

  const deletePackage = (id) => {
    setPackages((prev) => prev.filter((pkg) => {
      const pkgId = pkg._id || pkg.id;
      return pkgId !== id;
    }));
  };

  const getPackageById = (id) => {
    return packages.find((pkg) => {
      const pkgId = pkg._id || pkg.id;
      return pkgId === id;
    });
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
