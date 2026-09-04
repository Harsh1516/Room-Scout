import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { staysAPI } from '../services/api';

// In-memory module cache for instantaneous 0ms transitions (Stale-While-Revalidate)
let memoryCacheStays = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh TTL, background revalidates thereafter

export function useStaySearch() {
  const [allStays, setAllStays] = useState(() => {
    if (memoryCacheStays && Array.isArray(memoryCacheStays)) {
      return memoryCacheStays;
    }
    try {
      const cached = sessionStorage.getItem('stayhub_stays_cache');
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

  const [isLoadingStays, setIsLoadingStays] = useState(() => !memoryCacheStays || memoryCacheStays.length === 0);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const [filters, setFilters] = useState({
    query: '',
    location: '',
    type: 'All', // All, PG, Hostel, Hotel, Villa, Resort, Flat
    gender: 'All', // All, Boys, Girls, Unisex
    when: '',
    who: '',
    minPrice: null,
    maxPrice: null,
    minRating: 0,
    selectedAmenities: [], // e.g. ['Wifi', 'Food Included', 'AC', 'Power Backup']
    sortOrder: 'price-desc', // price-desc, price-asc, rating-desc, title-asc, recent
  });

  // Fetch verified host stays from backend database API with SWR (Stale-While-Revalidate)
  const fetchStaysFromAPI = useCallback(async (isForced = false) => {
    const now = Date.now();
    const isCacheFresh = memoryCacheStays && (now - lastFetchTimestamp < CACHE_TTL_MS);

    // If cache is fresh and not forced, keep instant data
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
        sessionStorage.setItem('stayhub_stays_cache', JSON.stringify(staysList));
      } catch {
        // quota exceeded or private mode
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
  }, [fetchStaysFromAPI]);

  // Prepend newly uploaded stay directly to memory & state
  const addNewStay = (newStay) => {
    if (!newStay) return;
    setAllStays((prev) => {
      const updated = [newStay, ...prev];
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
      minPrice: searchData.minPrice !== undefined && searchData.minPrice !== null ? Number(searchData.minPrice) : prev.minPrice,
      maxPrice: searchData.maxPrice !== undefined && searchData.maxPrice !== null ? Number(searchData.maxPrice) : prev.maxPrice,
    }));
    setCurrentPage(1); // Reset to page 1 on new search
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

  // Compute filtered & sorted stays with high performance
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
      const matchesGender =
        filters.gender === 'All' ||
        stayGender === filters.gender.toLowerCase() ||
        stayGender === 'both' ||
        stayGender === 'unisex' ||
        stayTitle.includes(filters.gender.toLowerCase()) ||
        (stay.tags && stay.tags.some((t) => t.toLowerCase().includes(filters.gender.toLowerCase())));

      // 4. Price match
      const stayPrice = Number(stay.price || 0);
      const matchesMinPrice = filters.minPrice === null || stayPrice >= filters.minPrice;
      const matchesMaxPrice = filters.maxPrice === null || stayPrice <= filters.maxPrice;
      const matchesPrice = matchesMinPrice && matchesMaxPrice;

      // 5. Rating match
      const matchesRating = (stay.rating || 0) >= filters.minRating;

      // 6. Amenities match
      const matchesAmenities =
        filters.selectedAmenities.length === 0 ||
        filters.selectedAmenities.every((amenity) =>
          stay.tags && stay.tags.some((t) => t.toLowerCase().includes(amenity.toLowerCase()))
        );

      // 7. Text Query match
      const matchesQuery =
        !filters.query ||
        stayTitle.includes(filters.query) ||
        stayLoc.includes(filters.query) ||
        stayCity.includes(filters.query) ||
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
      if (filters.sortOrder === 'price-asc') {
        return Number(a.price || 0) - Number(b.price || 0);
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
        return Number(b.price || 0) - Number(a.price || 0);
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
