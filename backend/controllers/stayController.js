import mongoose from 'mongoose';
import { Stay } from '../models/Stay.js';
import { Host } from '../models/Host.js';

// @desc    Get all property stays created by hosts with optional filters, sorting & high-speed pagination
// @route   GET /api/stays
// @access  Public
export const getAllStays = async (req, res, next) => {
  try {
    const {
      location,
      city,
      type,
      gender,
      minPrice,
      maxPrice,
      minRating,
      amenities,
      query,
      sort,
      page,
      limit,
      paginate,
    } = req.query;

    let dbStays = [];
    const existingIds = new Set();
    const existingHostEmails = new Set();

    try {
      const approvedHosts = await Host.find({
        $or: [{ status: 'Approved' }, { 'hostDetails.status': 'Approved' }],
      }).lean();
      const approvedHostEmails = new Set(
        approvedHosts.map((h) => (h.hostDetails?.email || h.email || '').toLowerCase()).filter(Boolean)
      );

      const mongoStays = await Stay.find({}).lean();
      for (const s of mongoStays) {
        const hostEmail = (s.hostEmail || '').toLowerCase();
        // If stay has a hostEmail, strictly only include if host is currently Approved
        if (hostEmail && !approvedHostEmails.has(hostEmail)) {
          // Permanently delete unapproved/pending host stays from MongoDB stays collection
          await Stay.deleteOne({ _id: s._id }).catch(() => {});
          continue;
        }
        const sId = s._id?.toString() || s.id;
        existingIds.add(sId);
        if (hostEmail) existingHostEmails.add(hostEmail);
        dbStays.push({
          ...s,
          _id: sId,
          id: sId,
        });
      }

      approvedHosts.forEach((h) => {
        const p = h.property || {};
        const d = h.hostDetails || {};
        const propTitle = p.propertyName || h.propertyName;
        const hostEmail = (d.email || h.email || '').toLowerCase();

        if (propTitle && !existingHostEmails.has(hostEmail)) {
          const hId = h._id?.toString() || h.id;
          if (!existingIds.has(hId)) {
            existingIds.add(hId);
            existingHostEmails.add(hostEmail);

            const firstRate = h.roomRates?.[0];
            const basePrice = firstRate?.price
              ? (parseInt(String(firstRate.price).replace(/[^0-9]/g, '')) || 0)
              : (parseInt(String(p.price || h.price || '3500').replace(/[^0-9]/g, '')) || 3500);
            const rateUnit = firstRate?.rateUnit || p.rateUnit || '/month';

            const hostPrimaryImage =
              (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) ||
              p.image ||
              (Array.isArray(h.images) && h.images.length > 0 && h.images[0]) ||
              h.image ||
              'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

            dbStays.push({
              _id: hId,
              id: hId,
              title: propTitle,
              type: p.propertyType || h.propertyType || 'PG',
              genderType: p.genderType || h.genderType || 'Both',
              location: p.location || h.location || (p.city && p.state ? `${p.city}, ${p.state}` : (p.city || '')),
              address: p.address || h.address || p.location || h.location || '',
              roadArea: p.roadArea || h.roadArea || '',
              city: p.city || h.city || '',
              state: p.state || h.state || '',
              pincode: p.pincode || h.pincode || '',
              price: basePrice,
              rateUnit: rateUnit,
              rating: (Array.isArray(h.reviews) && h.reviews.length > 0)
                ? Number((h.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / h.reviews.length).toFixed(1))
                : (p.rating && p.rating !== 4.8 ? Number(p.rating) : (h.rating && h.rating !== 4.8 ? Number(h.rating) : null)),
              badge: '',
              tags: p.facilities || h.facilities || h.amenities || ['WiFi', 'Attached Bath', 'Security'],
              roomRates: h.roomRates || [],
              availableRooms: Array.isArray(h.rooms)
                ? h.rooms.filter((r) => r.status === 'Available').length
                : (p.availableRooms !== undefined ? p.availableRooms : (h.availableRooms || 1)),
              totalRooms: Array.isArray(h.rooms)
                ? h.rooms.length
                : (p.totalRooms !== undefined ? p.totalRooms : (h.totalRooms || 1)),
              rooms: h.rooms || [],
              image: hostPrimaryImage,
              images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (Array.isArray(h.images) && h.images.length > 0 ? h.images : [hostPrimaryImage]),
              videos: h.videos || [],
              instagramVideoUrl: p.instagramVideoUrl || h.instagramVideoUrl || '',
              reviews: h.reviews || [],
              description: p.description || h.description || h.bio || `${propTitle} located in ${p.location || h.location}.`,
              hostId: hId,
              hostName: d.name || h.name,
              hostEmail: hostEmail,
              hostPhone: d.phone || h.phone,
              createdAt: h.createdAt || new Date().toISOString(),
            });
          }
        }
      });
    } catch (err) {
      console.warn('MongoDB read stays warning:', err.message);
    }

    let parsedAmenities = [];
    if (amenities) {
      if (Array.isArray(amenities)) parsedAmenities = amenities.map((a) => a.toLowerCase().trim());
      else if (typeof amenities === 'string') parsedAmenities = amenities.split(',').map((a) => a.toLowerCase().trim());
    }

    let filtered = dbStays.filter((stay) => {
      const stayLoc = (stay.location || '').toLowerCase();
      const stayCity = (stay.city || '').toLowerCase();
      const stayAddress = (stay.address || '').toLowerCase();
      const stayTitle = (stay.title || '').toLowerCase();
      const stayType = (stay.type || '').toLowerCase();
      const stayDesc = (stay.description || '').toLowerCase();
      const stayGender = (stay.genderType || '').toLowerCase();

      if (location && !stayLoc.includes(location.toLowerCase()) && !stayCity.includes(location.toLowerCase())) {
        return false;
      }
      if (city && !stayCity.includes(city.toLowerCase()) && !stayLoc.includes(city.toLowerCase())) {
        return false;
      }
      if (type && type !== 'All' && type !== 'All Types') {
        const t = type.toLowerCase();
        const matchesType =
          stayType === t ||
          (t === 'flat' && (stayType === 'flat' || stayType === 'apartment')) ||
          (t === 'stays & villas' && (stayType === 'villa' || stayType === 'resort'));
        if (!matchesType) return false;
      }
      if (gender && gender !== 'All') {
        const g = gender.toLowerCase();
        const matchesG =
          stayGender.includes(g) ||
          stayTitle.includes(g) ||
          (stay.tags && stay.tags.some((t) => t.toLowerCase().includes(g)));
        if (!matchesG) return false;
      }
      if (minPrice && stay.price < Number(minPrice)) {
        return false;
      }
      if (maxPrice && stay.price > Number(maxPrice)) {
        return false;
      }
      if (minRating && (stay.rating || 0) < Number(minRating)) {
        return false;
      }
      if (parsedAmenities.length > 0) {
        const stayTags = (stay.tags || []).map((t) => t.toLowerCase());
        const hasAllAmenities = parsedAmenities.every((reqAmenity) =>
          stayTags.some((tag) => tag.includes(reqAmenity))
        );
        if (!hasAllAmenities) return false;
      }
      if (query) {
        const q = query.toLowerCase().trim();
        const matchesQ =
          stayTitle.includes(q) ||
          stayLoc.includes(q) ||
          stayCity.includes(q) ||
          stayAddress.includes(q) ||
          stayDesc.includes(q) ||
          stayType.includes(q) ||
          stayGender.includes(q) ||
          (stay.tags && stay.tags.some((t) => t.toLowerCase().includes(q)));

        if (!matchesQ) return false;
      }
      return true;
    });

    if (sort === 'price-asc') {
      filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sort === 'price-desc') {
      filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sort === 'rating-desc') {
      filtered.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sort === 'title-asc') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    const formatted = filtered.map((s) => ({
      ...s,
      id: s._id?.toString() || s.id,
      _id: s._id?.toString() || s.id,
    }));

    const isPaginatedRequest = paginate === 'true' || Boolean(page) || Boolean(limit);
    if (isPaginatedRequest) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
      const total = formatted.length;
      const totalPages = Math.ceil(total / limitNum) || 1;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedStays = formatted.slice(startIndex, startIndex + limitNum);

      return res.json({
        stays: paginatedStays,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasMore: pageNum < totalPages,
        },
      });
    }

    return res.json(formatted);
  } catch (error) {
    return next(error);
  }
};

export const getStayById = async (req, res, next) => {
  try {
    let stay = null;
    const stayId = req.params.id;

    try {
      if (mongoose.Types.ObjectId.isValid(stayId)) {
        stay = await Stay.findById(stayId).lean();
      }
      if (!stay) {
        stay = await Stay.findOne({ $or: [{ hostId: stayId }, { id: stayId }] }).lean();
      }
      if (!stay) {
        const host = await Host.findById(stayId).lean();
        const p = host?.property || {};
        const d = host?.hostDetails || {};
        const propTitle = p.propertyName || host?.propertyName;
        if (host && propTitle) {
          const firstRate = host.roomRates?.[0];
          const basePrice = firstRate?.price
            ? (parseInt(String(firstRate.price).replace(/[^0-9]/g, '')) || 0)
            : (parseInt(String(p.price || host.price || '3500').replace(/[^0-9]/g, '')) || 3500);
          const rateUnit = firstRate?.rateUnit || p.rateUnit || '/month';

          stay = {
            _id: host._id?.toString() || host.id,
            id: host._id?.toString() || host.id,
            title: propTitle,
            type: p.propertyType || host.propertyType || 'PG',
            genderType: p.genderType || host.genderType || 'Both',
            location: p.location || host.location || (p.city && p.state ? `${p.city}, ${p.state}` : (p.city || '')),
            address: p.address || host.address || p.location || host.location || '',
            roadArea: p.roadArea || host.roadArea || '',
            city: p.city || host.city || '',
            state: p.state || host.state || '',
            pincode: p.pincode || host.pincode || '',
            price: basePrice,
            rateUnit: rateUnit,
            rating: (Array.isArray(host.reviews) && host.reviews.length > 0)
              ? Number((host.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / host.reviews.length).toFixed(1))
              : (p.rating && p.rating !== 4.8 ? Number(p.rating) : (host.rating && host.rating !== 4.8 ? Number(host.rating) : null)),
            badge: '',
            tags: p.facilities || host.facilities || host.amenities || ['WiFi', 'Attached Bath', 'Security'],
            roomRates: host.roomRates || [],
            availableRooms: Array.isArray(host.rooms) ? host.rooms.filter((r) => r.status === 'Available').length : (p.availableRooms !== undefined ? p.availableRooms : (host.availableRooms || 1)),
            totalRooms: Array.isArray(host.rooms) ? host.rooms.length : (p.totalRooms !== undefined ? p.totalRooms : (host.totalRooms || 1)),
            rooms: host.rooms || [],
            image: (Array.isArray(p.images) && p.images[0]) || p.image || host.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (Array.isArray(host.images) && host.images.length > 0 ? host.images : [host.image]),
            videos: host.videos || [],
            instagramVideoUrl: p.instagramVideoUrl || host.instagramVideoUrl || '',
            reviews: host.reviews || [],
            description: p.description || host.description || host.bio || `${propTitle} located in ${p.location || host.location}.`,
            hostId: host._id?.toString() || host.id,
            hostName: d.name || host.name,
            hostEmail: d.email || host.email,
            hostPhone: d.phone || host.phone,
            createdAt: host.createdAt || new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('MongoDB read single stay error:', err.message);
    }

    if (!stay) {
      return res.status(404).json({ message: 'Stay property not found in database' });
    }

    const finalStayName = stay.propertyName || stay.title || 'Stay Property';
    const finalPropType = stay.propertyType || stay.type || 'PG';
    const finalFacilities = Array.isArray(stay.facilities) && stay.facilities.length > 0
      ? stay.facilities
      : (Array.isArray(stay.amenities) && stay.amenities.length > 0 ? stay.amenities : (stay.tags || []));
    const finalRules = Array.isArray(stay.rules) && stay.rules.length > 0 ? stay.rules : (stay.houseRules || []);

    return res.json({
      ...stay,
      id: stay._id?.toString() || stay.id,
      _id: stay._id?.toString() || stay.id,
      propertyName: finalStayName,
      title: finalStayName,
      propertyType: finalPropType,
      type: finalPropType,
      facilities: finalFacilities,
      amenities: finalFacilities,
      tags: finalFacilities,
      rules: finalRules,
      description: stay.description || stay.bio || '',
    });
  } catch (error) {
    return next(error);
  }
};

export const createStay = async (req, res, next) => {
  try {
    const { title, type, location, price, description, tags, image, badge } = req.body;

    if (!title || !location || !price) {
      return res.status(400).json({ message: 'Please provide title, location, and monthly price.' });
    }

    const defaultImage =
      image ||
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

    const stayPayload = {
      title,
      type: type || 'PG',
      location,
      price: Number(price),
      rating: 5.0,
      badge: badge || 'VERIFIED HOST',
      tags: Array.isArray(tags) ? tags : ['Wifi', 'Attached Bath', 'Security'],
      image: defaultImage,
      images: [defaultImage],
      description: description || `${title} located in ${location}. Brand new property listing.`,
      hostId: req.user?.id || req.user?._id || 'host_user',
      createdAt: new Date().toISOString(),
    };

    let newStay = null;

    try {
      newStay = await Stay.create(stayPayload);
    } catch (dbErr) {
      console.warn('MongoDB stay creation failed:', dbErr.message);
      return res.status(500).json({ message: 'Database error while creating stay' });
    }

    console.log(`✅ Real Host Property Created & Saved: ${newStay.title} (${newStay.location})`);
    return res.status(201).json(newStay);
  } catch (error) {
    console.error('Error creating property stay:', error);
    return next(error);
  }
};

export const addReviewToStay = async (req, res, next) => {
  try {
    const stayId = req.params.id;
    const { author, userEmail, userId, rating, text } = req.body;

    if (!text || !rating) {
      return res.status(400).json({ message: 'Please provide rating and review text.' });
    }

    const reviewObj = {
      id: 'rev_' + Date.now(),
      author: author || req.user?.name || 'Guest User',
      userEmail: userEmail || req.user?.email || '',
      userId: userId || req.user?._id || req.user?.id || '',
      rating: Number(rating) || 5,
      text: text.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
    };

    let updatedReviews = [];

    try {
      let dbStay = await Stay.findById(stayId);
      if (!dbStay) {
        dbStay = await Stay.findOne({ $or: [{ hostId: stayId }, { id: stayId }] });
      }
      if (dbStay) {
        if (!Array.isArray(dbStay.reviews)) dbStay.reviews = [];
        dbStay.reviews.unshift(reviewObj);
        await dbStay.save();
        updatedReviews = dbStay.reviews;
      }

      let dbHost = await Host.findById(stayId);
      if (!dbHost) {
        dbHost = await Host.findOne({ email: stayId });
      }
      if (dbHost) {
        if (!Array.isArray(dbHost.reviews)) dbHost.reviews = [];
        dbHost.reviews.unshift(reviewObj);
        await dbHost.save();
        if (updatedReviews.length === 0) updatedReviews = dbHost.reviews;
      }
    } catch (err) {
      console.warn('MongoDB update review error:', err.message);
      return res.status(500).json({ message: 'Database error while saving review' });
    }

    if (updatedReviews.length === 0) {
      updatedReviews = [reviewObj];
    }

    const sum = updatedReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avgRating = (sum / updatedReviews.length).toFixed(1);

    return res.status(201).json({
      message: 'Review saved to database successfully',
      review: reviewObj,
      reviews: updatedReviews,
      rating: avgRating,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateReviewInStay = async (req, res, next) => {
  try {
    const { id: stayId, reviewId } = req.params;
    const { rating, text } = req.body;

    let updatedReviews = [];

    try {
      let dbStay = await Stay.findById(stayId) || await Stay.findOne({ $or: [{ hostId: stayId }, { id: stayId }] });
      if (dbStay && Array.isArray(dbStay.reviews)) {
        const rev = dbStay.reviews.find((r) => String(r.id || r._id) === String(reviewId));
        if (rev) {
          if (rating) rev.rating = Number(rating);
          if (text) rev.text = text.trim();
          await dbStay.save();
          updatedReviews = dbStay.reviews;
        }
      }
    } catch (err) {
      console.warn('MongoDB update review error:', err.message);
      return res.status(500).json({ message: 'Database error while updating review' });
    }

    return res.status(200).json({
      message: 'Review updated successfully',
      reviews: updatedReviews,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteReviewFromStay = async (req, res, next) => {
  try {
    const { id: stayId, reviewId } = req.params;

    let updatedReviews = [];

    try {
      let dbStay = await Stay.findById(stayId) || await Stay.findOne({ $or: [{ hostId: stayId }, { id: stayId }] });
      if (dbStay && Array.isArray(dbStay.reviews)) {
        dbStay.reviews = dbStay.reviews.filter((r) => String(r.id || r._id) !== String(reviewId));
        await dbStay.save();
        updatedReviews = dbStay.reviews;
      }
    } catch (err) {
      console.warn('MongoDB delete review error:', err.message);
      return res.status(500).json({ message: 'Database error while deleting review' });
    }

    return res.status(200).json({
      message: 'Review deleted successfully',
      reviews: updatedReviews,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateStayRooms = async (req, res, next) => {
  try {
    const { id: stayId } = req.params;
    const { availableRooms, decrement } = req.body;

    let newAvailableRooms = availableRooms;

    try {
      let dbStay = await Stay.findById(stayId) || await Stay.findOne({ $or: [{ hostId: stayId }, { id: stayId }] });
      if (dbStay) {
        if (decrement) {
          dbStay.availableRooms = Math.max(0, (dbStay.availableRooms || 1) - 1);
        } else if (availableRooms !== undefined) {
          dbStay.availableRooms = Math.max(0, Number(availableRooms));
        }
        await dbStay.save();
        newAvailableRooms = dbStay.availableRooms;
      }

      let dbHost = await Host.findById(stayId) || await Host.findOne({ $or: [{ hostId: stayId }, { id: stayId }, { email: stayId }] });
      if (dbHost) {
        if (decrement) {
          dbHost.availableRooms = Math.max(0, (dbHost.availableRooms || 1) - 1);
        } else if (availableRooms !== undefined) {
          dbHost.availableRooms = Math.max(0, Number(availableRooms));
        }
        await dbHost.save();
        newAvailableRooms = dbHost.availableRooms;
      }
    } catch (err) {
      console.warn('MongoDB room update error:', err.message);
      return res.status(500).json({ message: 'Database error while updating rooms' });
    }

    return res.status(200).json({
      message: 'Room availability updated in database successfully',
      availableRooms: newAvailableRooms,
    });
  } catch (error) {
    return next(error);
  }
};

export const resolveMapLink = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'Google Maps URL is required' });
    }

    const trimmed = url.trim();
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    // SSRF Prevention: Enforce HTTP/HTTPS and restrict hostname strictly to Google Maps domains
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, message: 'Only HTTP and HTTPS URLs are allowed' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isGoogleDomain =
      hostname === 'goo.gl' ||
      hostname.endsWith('.goo.gl') ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com') ||
      hostname === 'google.co.in' ||
      hostname.endsWith('.google.co.in');

    if (!isGoogleDomain) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL: Only verified Google Maps URLs are permitted',
      });
    }

    let targetUrl = trimmed;

    if (hostname.includes('goo.gl')) {
      try {
        const redirectRes = await fetch(trimmed, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        targetUrl = redirectRes.url || trimmed;
      } catch (redirectErr) {
        console.warn('Google Maps redirect error:', redirectErr.message);
      }
    }

    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const dataMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const queryMatch = targetUrl.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);

    let lat = null;
    let lng = null;

    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else if (dataMatch) {
      lat = parseFloat(dataMatch[1]);
      lng = parseFloat(dataMatch[2]);
    } else if (queryMatch) {
      lat = parseFloat(queryMatch[1]);
      lng = parseFloat(queryMatch[2]);
    }

    let placeName = '';
    const placeMatch = targetUrl.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        placeName = placeMatch[1].replace(/\+/g, ' ');
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return res.status(200).json({
        success: true,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        placeName,
        resolvedUrl: targetUrl,
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Could not extract latitude and longitude coordinates from the provided Google Maps URL.',
    });
  } catch (error) {
    console.error('resolveMapLink error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process Google Maps link',
      error: error.message,
    });
  }
};
