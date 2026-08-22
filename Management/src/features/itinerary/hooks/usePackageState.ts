/**
 * Custom hook for managing package data
 */

import { useState } from 'react';

export const usePackageState = (initialPackages: any[] = []) => {
  const [packages, setPackages] = useState<any[]>(initialPackages);

  const addPackage = (packageData: any) => {
    setPackages((prev) => [
      ...prev,
      {
        ...packageData,
        id: Math.max(...prev.map((p) => p.id || 0), 0) + 1,
      },
    ]);
  };

  const updatePackage = (id: string | number, updatedData: any) => {
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

  const deletePackage = (id: string | number) => {
    setPackages((prev) => prev.filter((pkg) => {
      const pkgId = pkg._id || pkg.id;
      return pkgId !== id;
    }));
  };

  const getPackageById = (id: string | number) => {
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
