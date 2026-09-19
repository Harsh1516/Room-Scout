import { useState, useEffect, useMemo, useCallback } from 'react';
import { staysAPI } from '../services/api';

// In-memory module cache for instant transitions (Stale-While-Revalidate)
let memoryCacheStays = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

// Helper: Safely convert mixed prices (e.g. 4000, "4000", "₹4,000") to numeric values
const parseNumericPrice = (priceVal) => {
  if (typeof priceVal === 'number' && !isNaN(priceVal)) return priceVal;
  return parseInt(String(priceVal || 0).replace(/[^0-9]/g, ''), 10) || 0;
};

export function useStaySearch() {
  const [allStays, setAllStays] = useState(() => {
    if (memoryCacheStays && Array.isArray(memoryCacheStays)) {
      return memoryCacheStays;
    }
    try {
      const cached =
        sessionStorage.getItem('roomscout_stays_cache') ||
        sessionStorage.getItem('stayhub_stays_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCacheStays = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isLoadingStays, setIsLoadingStays] = useState(
    () => !memoryCacheStays || memoryCacheStays.length === 0
  );
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const [filters, setFilters] = useState({
    query: '',
    location: '',
    type: 'All',
    gender: 'All',
    when: '',
    who: '',
    minPrice: null,
    maxPrice: null,
    minRating: 0,
    selectedAmenities: [],
    sortOrder: 'price-desc',
  });

  // Fetch verified host stays from backend database API with SWR
  const fetchStaysFromAPI = useCallback(async (isForced = false) => {
    const now = Date.now();
    const isCacheFresh = memoryCacheStays && now - lastFetchTimestamp < CACHE_TTL_MS;

    if (isCacheFresh && !isForced) {
      setIsLoadingStays(false);
      return;
    }

    if (memoryCacheStays && memoryCacheStays.length > 0) {
      setIsBackgroundRefreshing(true);
    } else {
      setIsLoadingStays(true);
    }

    try {
      const data = await staysAPI.getStays();
      let staysList = [];

      if (Array.isArray(data)) {
        staysList = data;
      } else if (data && Array.isArray(data.stays)) {
        staysList = data.stays;
      }

      memoryCacheStays = staysList;
      lastFetchTimestamp = Date.now();
      setAllStays(staysList);

      try {
        sessionStorage.setItem('roomscout_stays_cache', JSON.stringify(staysList));
        sessionStorage.removeItem('stayhub_stays_cache');
      } catch {
        // quota exceeded or private browsing
      }
    } catch (e) {
      console.warn('API stay fetch warning:', e.message);
      if (!memoryCacheStays) {
        setAllStays([]);
      }
    } finally {
      setIsLoadingStays(false);
      setIsBackgroundRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaysFromAPI();

    const handleSync = () => {
      memoryCacheStays = null;
      lastFetchTimestamp = 0;
      fetchStaysFromAPI(true);
    };

    window.addEventListener('stayhub_rooms_updated', handleSync);
    window.addEventListener('stayhub_admin_sync', handleSync);
    window.addEventListener('focus', handleSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'HOST_APPROVED' ||
            event.data?.type === 'STAY_UPDATED' ||
            event.data?.type === 'ROOMS_UPDATED'
          ) {
            handleSync();
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('stayhub_admin_sync', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, [fetchStaysFromAPI]);

  // Insert or update newly published stay directly in state & memory cache
  const addNewStay = (newStay) => {
    if (!newStay) return;
    const newId = String(newStay._id || newStay.id);

    setAllStays((prev) => {
      const exists = prev.some((s) => String(s._id || s.id) === newId);
      let updated;
      if (exists) {
        updated = prev.map((s) => (String(s._id || s.id) === newId ? { ...s, ...newStay } : s));
      } else {
        updated = [newStay, ...prev];
      }
      memoryCacheStays = updated;
      return updated;
    });
  };

  const handleSearchSubmit = (searchData = {}) => {
    const rawLocation = searchData.location || '';
    const cleanLocation =
      rawLocation.toLowerCase().includes('enter location') ||
      rawLocation.toLowerCase().includes('all locations')
        ? ''
        : rawLocation.trim().toLowerCase();

    setFilters((prev) => ({
      ...prev,
      query: (searchData.query || '').toLowerCase().trim(),
      location: cleanLocation,
      type: searchData.type || prev.type || 'All',
      gender: searchData.gender || prev.gender || 'All',
      when: searchData.when || prev.when || '',
      who: searchData.who || prev.who || '',
      minPrice:
        searchData.minPrice !== undefined && searchData.minPrice !== null
          ? Number(searchData.minPrice)
          : prev.minPrice,
      maxPrice:
        searchData.maxPrice !== undefined && searchData.maxPrice !== null
          ? Number(searchData.maxPrice)
          : prev.maxPrice,
    }));
    setCurrentPage(1);
  };

  const setCategoryFilter = (type) => {
    setFilters((prev) => ({ ...prev, type }));
    setCurrentPage(1);
  };

  const setGenderFilter = (gender) => {
    setFilters((prev) => ({ ...prev, gender }));
    setCurrentPage(1);
  };

  const setSortOrder = (sortOrder) => {
    setFilters((prev) => ({ ...prev, sortOrder }));
  };

  const setMinRating = (minRating) => {
    setFilters((prev) => ({ ...prev, minRating }));
    setCurrentPage(1);
  };

  const setPriceRange = (min, max) => {
    setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
    setCurrentPage(1);
  };

  const toggleAmenity = (amenity) => {
    setFilters((prev) => {
      const exists = prev.selectedAmenities.includes(amenity);
      return {
        ...prev,
        selectedAmenities: exists
          ? prev.selectedAmenities.filter((a) => a !== amenity)
          : [...prev.selectedAmenities, amenity],
      };
    });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      location: '',
      type: 'All',
      gender: 'All',
      when: '',
      who: '',
      minPrice: null,
      maxPrice: null,
      minRating: 0,
      selectedAmenities: [],
      sortOrder: 'price-desc',
    });
    setCurrentPage(1);
  };

  // Compute filtered & sorted stays
  const filteredStays = useMemo(() => {
    let result = allStays.filter((stay) => {
      // 1. Location match
      const stayLoc = (stay.location || '').toLowerCase();
      const stayCity = (stay.city || '').toLowerCase();
      const stayAddress = (stay.address || '').toLowerCase();

      const matchesLocation =
        !filters.location ||
        stayLoc.includes(filters.location) ||
        stayCity.includes(filters.location) ||
        stayAddress.includes(filters.location);

      // 2. Type / Category match
      const stayType = (stay.type || stay.propertyType || '').toLowerCase();
      const targetType = (filters.type || '').toLowerCase();
      const matchesType =
        !filters.type ||
        filters.type === 'All' ||
        filters.type === 'All Types' ||
        stayType === targetType ||
        (targetType === 'stays & villas' && (stayType === 'villa' || stayType === 'resort')) ||
        (targetType === 'flat' && (stayType === 'flat' || stayType === 'apartment'));

      // 3. Gender / Occupancy match
      const stayGender = (stay.genderType || '').toLowerCase();
      const stayTitle = (stay.title || '').toLowerCase();
      const allTags = [
        ...(Array.isArray(stay.tags) ? stay.tags : []),
        ...(Array.isArray(stay.facilities) ? stay.facilities : []),
      ];

      const matchesGender =
        filters.gender === 'All' ||
        stayGender === filters.gender.toLowerCase() ||
        stayGender === 'both' ||
        stayGender === 'unisex' ||
        stayTitle.includes(filters.gender.toLowerCase()) ||
        allTags.some((t) => t.toLowerCase().includes(filters.gender.toLowerCase()));

      // 4. Price match (with safe string-to-number stripping)
      const stayPrice = parseNumericPrice(stay.price);
      const matchesMinPrice = filters.minPrice === null || stayPrice >= filters.minPrice;
      const matchesMaxPrice = filters.maxPrice === null || stayPrice <= filters.maxPrice;
      const matchesPrice = matchesMinPrice && matchesMaxPrice;

      // 5. Rating match
      const matchesRating = (stay.rating || 0) >= filters.minRating;

      // 6. Amenities match (checks both facilities and tags)
      const matchesAmenities =
        filters.selectedAmenities.length === 0 ||
        filters.selectedAmenities.every((amenity) =>
          allTags.some((t) => t.toLowerCase().includes(amenity.toLowerCase()))
        );

      // 7. Text Query match
      const matchesQuery =
        !filters.query ||
        stayTitle.includes(filters.query) ||
        stayLoc.includes(filters.query) ||
        stayCity.includes(filters.query) ||
        stayAddress.includes(filters.query) ||
        stayType.includes(filters.query);

      return (
        matchesLocation &&
        matchesType &&
        matchesGender &&
        matchesPrice &&
        matchesRating &&
        matchesAmenities &&
        matchesQuery
      );
    });

    // Apply Sorting
    return result.sort((a, b) => {
      const priceA = parseNumericPrice(a.price);
      const priceB = parseNumericPrice(b.price);

      if (filters.sortOrder === 'price-asc') {
        return priceA - priceB;
      } else if (filters.sortOrder === 'rating-desc') {
        return Number(b.rating || 0) - Number(a.rating || 0);
      } else if (filters.sortOrder === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (filters.sortOrder === 'recent') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      } else {
        // Default: price-desc
        return priceB - priceA;
      }
    });
  }, [allStays, filters]);

  // Paginated stays slice
  const totalCount = filteredStays.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStays = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredStays.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStays, safeCurrentPage, itemsPerPage]);

  return {
    allStays,
    filters,
    handleSearchSubmit,
    setCategoryFilter,
    setGenderFilter,
    setSortOrder,
    setMinRating,
    setPriceRange,
    toggleAmenity,
    resetFilters,
    filteredStays,
    paginatedStays,
    pagination: {
      currentPage: safeCurrentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage,
      totalPages,
      totalCount,
    },
    addNewStay,
    isLoadingStays,
    isBackgroundRefreshing,
    refetchStays: () => fetchStaysFromAPI(true),
  };
}

export default useStaySearch;