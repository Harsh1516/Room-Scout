import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Stay, computeLowestStartingPrice } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';
import { isAdminUser, idsMatch } from '../middleware/authMiddleware.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';

// @desc    Get all published property stays with filters, sorting, and pagination
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

    const mongoFilter = { isPublished: true };

    if (city && typeof city === 'string') {
      mongoFilter.city = { $regex: new RegExp(city.trim(), 'i') };
    }
    if (type && typeof type === 'string' && type !== 'All' && type !== 'All Types') {
      const t = type.toLowerCase().trim();
      if (t === 'flat') {
        mongoFilter.type = { $in: ['PG', 'Flat', 'Apartment'] };
      } else if (t === 'stays & villas') {
        mongoFilter.type = { $in: ['Villa', 'Resort'] };
      } else {
        mongoFilter.type = { $regex: new RegExp(`^${t}$`, 'i') };
      }
    }
    if (gender && typeof gender === 'string' && gender !== 'All') {
      mongoFilter.genderType = { $in: [gender, 'Both', 'Unisex'] };
    }
    if (minPrice || maxPrice) {
      mongoFilter.price = {};
      if (minPrice && !isNaN(minPrice)) mongoFilter.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(maxPrice)) mongoFilter.price.$lte = Number(maxPrice);
    }
    if (minRating && !isNaN(minRating)) {
      mongoFilter.rating = { $gte: Number(minRating) };
    }
    if (query && typeof query === 'string') {
      const qRegex = { $regex: new RegExp(query.trim(), 'i') };
      mongoFilter.$or = [
        { title: qRegex },
        { location: qRegex },
        { city: qRegex },
        { address: qRegex },
        { description: qRegex },
        { tags: qRegex },
      ];
    }
    if (amenities) {
      const amenityArr = Array.isArray(amenities)
        ? amenities
        : amenities.split(',').map((a) => a.trim());
      if (amenityArr.length > 0) {
        mongoFilter.facilities = { $all: amenityArr.map((a) => new RegExp(a, 'i')) };
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'rating-desc') sortOption = { rating: -1 };
    else if (sort === 'title-asc') sortOption = { title: 1 };

    const staysQuery = Stay.find(mongoFilter)
      .populate('hostId', 'name email phone avatar status')
      .sort(sortOption)
      .lean();

    const isPaginated = paginate === 'true' || Boolean(page) || Boolean(limit);
    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
      const total = await Stay.countDocuments(mongoFilter);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const paginatedStays = await staysQuery.skip((pageNum - 1) * limitNum).limit(limitNum);

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

    const stays = await staysQuery;
    return res.json(stays);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get single stay by ID
// @route   GET /api/stays/:id
// @access  Public
export const getStayById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stay ID format.' });
    }

    const stay = await Stay.findById(id)
      .populate('hostId', 'name email phone avatar status')
      .lean();

    if (!stay) {
      return res.status(404).json({ message: 'Stay property not found in database.' });
    }

    return res.json({
      ...stay,
      id: stay._id.toString(),
      _id: stay._id.toString(),
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Check dynamic room availability for requested dates without storing booking IDs
// @route   GET /api/stays/:id/availability
// @access  Public
export const getStayAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'checkIn and checkOut dates are required.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
      return res.status(400).json({ success: false, message: 'Invalid date range provided.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid stay ID format.' });
    }

    const stay = await Stay.findById(id).lean();
    if (!stay) {
      return res.status(404).json({ success: false, message: 'Stay not found.' });
    }

    const overlapping = await Booking.find({
      stayId: stay._id,
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'AWAITING_PAYMENT'] },
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate },
    })
      .select('roomNumber')
      .lean();

    const occupiedRoomNumbers = new Set(
      overlapping.map((b) => String(b.roomNumber).trim())
    );

    const roomStatusList = (stay.rooms || []).map((rm) => {
      const cleanNum = String(rm.roomNumber).trim();
      const isBooked = occupiedRoomNumbers.has(cleanNum);
      return {
        ...rm,
        isAvailable: !isBooked,
        status: isBooked ? 'Occupied' : 'Available',
      };
    });

    return res.json({
      success: true,
      stayId: stay._id,
      checkIn: inDate.toISOString(),
      checkOut: outDate.toISOString(),
      totalRooms: roomStatusList.length,
      availableRoomsCount: roomStatusList.filter((r) => r.isAvailable).length,
      rooms: roomStatusList,
    });
  } catch (error) {
    console.error('Get stay availability error:', error);
    return next(error);
  }
};

// @desc    Create a stay listing linked via hostId
// @route   POST /api/stays
// @access  Private (Host)
export const createStay = async (req, res, next) => {
  try {
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    let hostId = req.user?._id;
    if (isCallerAdmin && req.body.hostId && mongoose.Types.ObjectId.isValid(req.body.hostId)) {
      hostId = req.body.hostId;
    }

    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ success: false, message: 'Valid hostId is required.' });
    }

    const {
      title,
      type,
      location,
      price,
      description,
      tags,
      facilities,
      rules,
      image,
      images,
      instagramVideoUrl,
      latitude,
      longitude,
      city,
      state,
      pincode,
      roadArea,
      address,
      roomRates,
      rooms,
    } = req.body;

    if (!title || !location || price === undefined) {
      return res.status(400).json({ message: 'Title, location, and price are required.' });
    }

    const parsedPrice = parseInt(String(price).replace(/[^0-9]/g, ''), 10) || 0;
    const cleanPrimaryImage = await uploadSecureImage(image, 'roomscout/stays');

    let processedImages = [];
    if (Array.isArray(images) && images.length > 0) {
      processedImages = await Promise.all(images.map((img) => uploadSecureImage(img, 'roomscout/stays')));
    } else if (cleanPrimaryImage) {
      processedImages = [cleanPrimaryImage];
    }

    const latNum = latitude ? parseFloat(latitude) : undefined;
    const lngNum = longitude ? parseFloat(longitude) : undefined;

    const startingPricing = computeLowestStartingPrice(
      Array.isArray(roomRates) ? roomRates : [],
      Array.isArray(rooms) ? rooms : [],
      parsedPrice,
      req.body.rateUnit || '/month'
    );

    const stayPayload = {
      hostId,
      title: title.trim(),
      type: type || 'PG',
      location: location.trim(),
      address: address || '',
      roadArea: roadArea || '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      latitude: latNum,
      longitude: lngNum,
      price: startingPricing.price,
      rateUnit: startingPricing.rateUnit,
      rating: 0,
      reviewsCount: 0,
      facilities: Array.isArray(facilities) ? facilities : (Array.isArray(tags) ? tags : []),
      tags: Array.isArray(tags) ? tags : [],
      rules: Array.isArray(rules) ? rules : [],
      image: cleanPrimaryImage || processedImages[0] || '',
      images: processedImages,
      instagramVideoUrl: instagramVideoUrl || '',
      description: description || '',
      roomRates: Array.isArray(roomRates)
        ? roomRates.map((rr) => ({
            ...(rr && rr._id && mongoose.Types.ObjectId.isValid(rr._id) ? { _id: rr._id } : {}),
            id: rr?.id || (rr?._id ? String(rr._id) : undefined),
            type: rr?.type,
            price: rr?.price,
            rateUnit: rr?.rateUnit,
            capacity: Number(rr?.capacity) || 1,
          }))
        : [],
      rooms: Array.isArray(rooms) ? rooms : [],
      totalRooms: Array.isArray(rooms) ? rooms.length : 1,
      availableRooms: Array.isArray(rooms) ? rooms.filter((r) => r.status === 'Available').length : 1,
    };

    if (latNum != null && lngNum != null) {
      stayPayload.locationGeo = {
        type: 'Point',
        coordinates: [lngNum, latNum],
      };
    }

    const newStay = await Stay.create(stayPayload);
    return res.status(201).json(newStay);
  } catch (error) {
    console.error('Error creating stay:', error);
    return next(error);
  }
};

// @desc    Add review to stay
// @route   POST /api/stays/:id/reviews
// @access  Private
export const addReviewToStay = async (req, res, next) => {
  try {
    const { id: stayId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?._id;
    const userName = req.user?.name || req.body.userName || 'Guest User';

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment text are required.' });
    }

    const stay = await Stay.findById(stayId);
    if (!stay) {
      return res.status(404).json({ message: 'Stay not found.' });
    }

    const reviewObj = {
      userId,
      userName,
      userAvatar: req.user?.avatar || '',
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment.trim(),
    };

    stay.reviews.unshift(reviewObj);
    stay.reviewsCount = stay.reviews.length;
    const sum = stay.reviews.reduce((acc, r) => acc + r.rating, 0);
    stay.rating = Number((sum / stay.reviews.length).toFixed(1));
    await stay.save();

    return res.status(201).json({
      message: 'Review added successfully',
      rating: stay.rating,
      reviewsCount: stay.reviewsCount,
      reviews: stay.reviews,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update review
// @route   PUT /api/stays/:id/reviews/:reviewId
// @access  Private
export const updateReviewInStay = async (req, res, next) => {
  try {
    const { id: stayId, reviewId } = req.params;
    const { rating, comment } = req.body;

    const stay = await Stay.findById(stayId);
    if (!stay) return res.status(404).json({ success: false, message: 'Stay not found.' });

    const rev = stay.reviews.id(reviewId);
    if (!rev) return res.status(404).json({ success: false, message: 'Review not found.' });

    // IDOR Guard: Only author or admin can update review
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    const callerId = req.user?._id?.toString();
    const callerName = (req.user?.name || '').toLowerCase().trim();
    const revUserId = (rev.userId?._id || rev.userId || rev.user)?.toString();
    const isAuthor =
      (revUserId && callerId && revUserId === callerId) ||
      idsMatch(revUserId, callerId) ||
      (rev.userName && rev.userName.toLowerCase().trim() === callerName);

    if (!isCallerAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to edit another user\'s review.',
      });
    }

    if (rating) rev.rating = Math.min(5, Math.max(1, Number(rating)));
    if (comment) rev.comment = comment.trim();

    const sum = stay.reviews.reduce((acc, r) => acc + r.rating, 0);
    stay.rating = Number((sum / stay.reviews.length).toFixed(1));
    await stay.save();

    return res.json({ success: true, message: 'Review updated successfully', reviews: stay.reviews });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/stays/:id/reviews/:reviewId
// @access  Private
export const deleteReviewFromStay = async (req, res, next) => {
  try {
    const { id: stayId, reviewId } = req.params;

    const stay = await Stay.findById(stayId);
    if (!stay) return res.status(404).json({ success: false, message: 'Stay not found.' });

    const rev = stay.reviews.id(reviewId);
    if (!rev) return res.status(404).json({ success: false, message: 'Review not found.' });

    // IDOR Guard: Only author or admin can delete review
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    const callerId = req.user?._id?.toString();
    const callerName = (req.user?.name || '').toLowerCase().trim();
    const revUserId = (rev.userId?._id || rev.userId || rev.user)?.toString();
    const isAuthor =
      (revUserId && callerId && revUserId === callerId) ||
      idsMatch(revUserId, callerId) ||
      (rev.userName && rev.userName.toLowerCase().trim() === callerName);

    if (!isCallerAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to delete another user\'s review.',
      });
    }

    stay.reviews.pull(reviewId);
    stay.reviewsCount = stay.reviews.length;
    const sum = stay.reviews.length > 0 ? stay.reviews.reduce((acc, r) => acc + r.rating, 0) : 0;
    stay.rating = stay.reviews.length > 0 ? Number((sum / stay.reviews.length).toFixed(1)) : 0;
    await stay.save();

    return res.json({ success: true, message: 'Review deleted successfully', reviews: stay.reviews });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update room physical availability in stay
// @route   PUT /api/stays/:id/rooms
// @access  Private (Host)
export const updateStayRooms = async (req, res, next) => {
  try {
    const { id: stayId } = req.params;
    const { availableRooms, decrement } = req.body;

    const stay = await Stay.findById(stayId);
    if (!stay) return res.status(404).json({ success: false, message: 'Stay not found.' });

    // IDOR Guard: Verify caller is admin or the host of this stay
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    const callerId = req.user?._id?.toString();
    const callerEmail = (req.user?.email || '').toLowerCase().trim();

    let isOwner = isCallerAdmin;
    if (!isOwner && stay.hostId) {
      const stayHostId = (stay.hostId?._id || stay.hostId)?.toString();
      if (idsMatch(stayHostId, callerId)) {
        isOwner = true;
      } else if (callerEmail) {
        const host = await Host.findOne({ email: callerEmail }).select('_id').lean();
        if (host && idsMatch(stayHostId, host._id)) {
          isOwner = true;
        }
      }
    }

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to update room inventory for a listing you do not own.',
      });
    }

    if (decrement) {
      stay.availableRooms = Math.max(0, stay.availableRooms - 1);
    } else if (availableRooms !== undefined) {
      stay.availableRooms = Math.max(0, Number(availableRooms));
    }

    await stay.save();
    return res.json({
      success: true,
      message: 'Room counts updated successfully',
      availableRooms: stay.availableRooms,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Resolve Google Maps coordinates
// @route   POST /api/stays/resolve-map
// @access  Public
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

    const hostname = parsedUrl.hostname.toLowerCase();
    const isGoogle =
      hostname === 'goo.gl' ||
      hostname.endsWith('.goo.gl') ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com') ||
      hostname === 'google.co.in' ||
      hostname.endsWith('.google.co.in');

    if (!isGoogle) {
      return res.status(400).json({ success: false, message: 'Only verified Google Maps URLs are permitted' });
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

    let lat = null;
    let lng = null;
    let placeName = '';

    // 1. Exact POI / Marker coordinates in protobuf data (!3d<lat> and !4d<lng>)
    const lat3d = targetUrl.match(/!3d(-?\d+\.\d+)/);
    const lng4d = targetUrl.match(/!4d(-?\d+\.\d+)/);
    if (lat3d && lng4d) {
      lat = parseFloat(lat3d[1]);
      lng = parseFloat(lng4d[1]);
    }

    // 2. Query search / pin marker (?q=lat,lng or ?query=lat,lng or ?ll=lat,lng)
    if (lat === null || lng === null) {
      const queryMatch = targetUrl.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (queryMatch) {
        lat = parseFloat(queryMatch[1]);
        lng = parseFloat(queryMatch[2]);
      }
    }

    // 3. Direct coordinates in place path: /maps/place/lat,lng
    if (lat === null || lng === null) {
      const directPlaceMatch = targetUrl.match(/\/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (directPlaceMatch) {
        lat = parseFloat(directPlaceMatch[1]);
        lng = parseFloat(directPlaceMatch[2]);
      }
    }

    // Viewport camera match (@lat,lng)
    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const atLat = atMatch ? parseFloat(atMatch[1]) : null;
    const atLng = atMatch ? parseFloat(atMatch[2]) : null;

    // 4. Place name extraction and Plus Code / Open Location Code decoding
    const placeMatch = targetUrl.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        placeName = placeMatch[1].replace(/\+/g, ' ');
      }

      const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
      const ENCODING_BASE = 20;
      const plusMatch = placeName.match(/\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i);
      if (plusMatch && (lat === null || lng === null)) {
        const code = plusMatch[1];
        const refLat = atLat !== null ? atLat : 0;
        const refLng = atLng !== null ? atLng : 0;
        if (refLat !== 0 || refLng !== 0) {
          const parts = code.split('+');
          let fullCode = code;
          if (parts[0].length < 8) {
            let adjLat = Math.min(90, Math.max(-90, refLat)) + 90;
            let adjLng = Math.min(180, Math.max(-180, refLng)) + 180;
            let pfx = '';
            let lRes = 20, gRes = 20;
            for (let i = 0; i < 2; i++) {
              pfx += CODE_ALPHABET[Math.floor(adjLat / lRes)] + CODE_ALPHABET[Math.floor(adjLng / gRes)];
              adjLat -= Math.floor(adjLat / lRes) * lRes;
              adjLng -= Math.floor(adjLng / gRes) * gRes;
              lRes /= ENCODING_BASE;
              gRes /= ENCODING_BASE;
            }
            fullCode = pfx + code;
          }
          let dLat = -90, dLng = -180, latRes = 20, lngRes = 20;
          const clean = fullCode.replace('+', '').toUpperCase();
          for (let i = 0; i < Math.min(clean.length, 10); i += 2) {
            const ld = CODE_ALPHABET.indexOf(clean[i]);
            const gd = CODE_ALPHABET.indexOf(clean[i + 1]);
            if (ld === -1 || gd === -1) break;
            dLat += ld * latRes;
            dLng += gd * lngRes;
            latRes /= ENCODING_BASE;
            lngRes /= ENCODING_BASE;
          }
          lat = dLat + (latRes * ENCODING_BASE) / 2;
          lng = dLng + (lngRes * ENCODING_BASE) / 2;
        }
      }
    }

    // 5. Fallback to viewport center (@lat,lng) ONLY if no specific pin, POI, or Plus Code exists
    if (lat === null || lng === null) {
      if (atLat !== null && atLng !== null) {
        lat = atLat;
        lng = atLng;
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return res.json({
        success: true,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
        placeName: placeName ? placeName.trim() : undefined,
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Could not extract latitude and longitude coordinates.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPropertiesByHost = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userEmail = (req.user?.email || '').trim().toLowerCase();

    let host = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      host = await Host.findById(userId).lean();
    }
    if (!host && userEmail) {
      host = await Host.findOne({ email: userEmail }).lean();
    }

    const hostId = host?._id || (userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null);

    const stays = hostId ? await Stay.find({ hostId }).sort({ createdAt: -1 }).lean() : [];

    const mappedStays = stays.map((s) => ({
      ...s,
      id: s._id.toString(),
      _id: s._id.toString(),
      propertyName: s.title,
      propertyType: s.type,
      hostName: host?.name || req.user?.name || '',
      hostEmail: host?.email || req.user?.email || '',
      email: host?.email || req.user?.email || '',
      phone: host?.phone || req.user?.phone || '',
      status: host?.status || (s.isPublished ? 'Approved' : 'Pending Approval'),
      isApproved: host?.status === 'Approved' || Boolean(s.isPublished),
    }));

    return res.json(mappedStays);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get public platform statistics (actual stay count, online booked users count)
// @route   GET /api/stays/public-stats
// @access  Public
export const getPublicStats = async (req, res, next) => {
  try {
    const totalStays = await Stay.countDocuments({ isPublished: true });

    // Query online bookings created via website
    const onlineBookings = await Booking.find({
      bookingSource: { $in: ['ONLINE', 'ONLINE_USER'] },
    })
      .select('userId email phone')
      .lean();

    // Calculate unique online users who booked through the website
    const uniqueUsersSet = new Set();
    onlineBookings.forEach((b) => {
      const identifier =
        (b.userId && b.userId.toString()) ||
        (b.email && b.email.toLowerCase().trim()) ||
        (b.phone && b.phone.trim()) ||
        b._id.toString();
      if (identifier) uniqueUsersSet.add(identifier);
    });

    const onlineUsersBooked = uniqueUsersSet.size;
    const totalOnlineBookings = onlineBookings.length;

    return res.json({
      success: true,
      totalStays,
      onlineUsersBooked,
      totalOnlineBookings,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return next(error);
  }
};

// @desc    Reset or restore revenue counter for a stay / property
// @route   POST /api/stays/:id/reset-revenue
// @access  Private (Host)
export const resetStayRevenue = async (req, res, next) => {
  try {
    const { id: stayId } = req.params;
    const { baselineTotal = 0, baselineOnline = 0, baselineOffline = 0, restoreAllTime = false } = req.body;

    const stay = await Stay.findById(stayId);
    if (!stay) {
      return res.status(404).json({ success: false, message: 'Stay not found.' });
    }

    if (restoreAllTime) {
      stay.revenueResetSettings = {
        resetAt: null,
        baselineTotal: 0,
        baselineOnline: 0,
        baselineOffline: 0,
      };
    } else {
      stay.revenueResetSettings = {
        resetAt: new Date(),
        baselineTotal: Number(baselineTotal) || 0,
        baselineOnline: Number(baselineOnline) || 0,
        baselineOffline: Number(baselineOffline) || 0,
      };
    }

    await stay.save();

    return res.json({
      success: true,
      message: restoreAllTime ? 'All-time revenue counter restored.' : 'Revenue counter set to ₹0 successfully.',
      revenueResetSettings: stay.revenueResetSettings,
    });
  } catch (error) {
    console.error('Error resetting stay revenue:', error);
    return next(error);
  }
};