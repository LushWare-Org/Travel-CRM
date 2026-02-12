import { createContext, useContext, useState, useEffect } from 'react';
import { fetchPackages } from '../utils/packageApi';

const PackageContext = createContext();

export function PackageProvider({ children }) {
  const [packages, setPackages] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchPackages({ limit: 6 })
      .then(({ packages: pkg, destinations: dest }) => {
        if (!mounted) return;
        const sorted = dest.slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
        setPackages(pkg);
        setDestinations(sorted);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load packages');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => (mounted = false);
  }, []);

  return (
    <PackageContext.Provider value={{ packages, destinations, loading, error }}>
      {children}
    </PackageContext.Provider>
  );
}

export function usePackages() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error('usePackages must be used within PackageProvider');
  }
  return context;
}
