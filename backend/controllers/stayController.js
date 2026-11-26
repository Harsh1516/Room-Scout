import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Stay, computeLowestStartingPrice } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';
import { isAdminUser, idsMatch } from '../middleware/authMiddleware.js';
import { uploadSecureImage } from '../utils/imageSecurity.js';
import { sendPropertySubmissionToAdminEmail } from '../services/emailService.js';
import { emitToAdmin, emitToGlobal } from '../services/socketService.js';

/**
 * Computes and attaches each host's average online booking approval response time (in ms)
 * from real Booking timestamps (approvedAt - createdAt) in a single aggregation query.
 */
async function attachHostAvgResponseTimes(staysList) {
  const list = Array.isArray(staysList) ? staysList : [];
  if (list.length === 0) return list;

  const hostIds = [];
  const seen = new Set();
  for (const s of list) {
    const rawId = s?.hostId?._id || s?.hostId;
    if (!rawId) continue;
    const strId = String(rawId);
    if (!seen.has(strId) && mongoose.Types.ObjectId.isValid(strId)) {
      seen.add(strId);
      hostIds.push(new mongoose.Types.ObjectId(strId));
    }
  }

  if (hostIds.length === 0) return list;

  try {
    const stats = await Booking.aggregate([
      {
        $match: {
          hostId: { $in: hostIds },
          bookingSource: 'ONLINE',
          approvedAt: { $ne: null },
        },
      },
      {
        $project: {
          hostId: 1,
          diffMs: { $subtract: ['$approvedAt', '$createdAt'] },
        },
      },
      {
        $match: {
          diffMs: { $gte: 0, $lte: 7 * 24 * 60 * 60 * 1000 },
        },
      },
      {
        $group: {
          _id: '$hostId',
          avgResponseMs: { $avg: '$diffMs' },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(stats.map((row) => [String(row._id), row]));
    for (const s of list) {
      const strId = String(s?.hostId?._id || s?.hostId || '');
      const row = statsMap.get(strId);
      s.hostAvgResponseMs = row ? Math.round(row.avgResponseMs) : null;
      s.hostResponseCount = row ? row.count : 0;
    }
  } catch (err) {
    console.warn('Could not aggregate host response times:', err.message);
  }

  return list;
}

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

    const mongoFilter = { isPublished: true, isApproved: true };

    // Public Visibility Guard: A stay is publicly visible ONLY if its host has an active, non-expired subscription
    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    if (!(isCallerAdmin && req.query.includeAll === 'true')) {
      mongoFilter['subscription.status'] = 'ACTIVE';
      mongoFilter['subscription.expiresAt'] = { $gt: new Date() };
    }

    if (city && typeof city === 'string') {
      mongoFilter.city = { $regex: new RegExp(city.trim(), 'i') };
    }
    if (type && typeof type === 'string' && type !== 'All' && type !== 'All Types') {
      const t = type.toLowerCase().trim();
      if (t === 'flat') {
        mongoFilter.type = { $in: ['PG', 'Flat', 'Apartment'] };
      } else {
        mongoFilter.type = { $regex: new RegExp(`^${t}$`, 'i') };
      }
    }
    if (gender && typeof gender === 'string' && gender !== 'All') {
      const g = gender.trim().toLowerCase();
      if (g === 'male' || g === 'boys') {
        mongoFilter.genderType = { $in: ['Male', 'Boys', 'Both', 'Unisex'] };
      } else if (g === 'female' || g === 'girls') {
        mongoFilter.genderType = { $in: ['Female', 'Girls', 'Both', 'Unisex'] };
      } else {
        mongoFilter.genderType = { $in: [gender, 'Both', 'Unisex'] };
      }
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
      .populate('hostId', 'name email phone avatar status createdAt')
      .sort(sortOption)
      .lean();

    const isPaginated = paginate === 'true' || Boolean(page) || Boolean(limit);
    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
      const total = await Stay.countDocuments(mongoFilter);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const paginatedStays = await staysQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
      await attachHostAvgResponseTimes(paginatedStays);

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
    await attachHostAvgResponseTimes(stays);
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
      .populate('hostId', 'name email phone avatar status createdAt')
      .lean();

    if (!stay) {
      return res.status(404).json({ message: 'Stay property not found in database.' });
    }

    await attachHostAvgResponseTimes([stay]);

    const isCallerAdmin = isAdminUser(req) || req.isAdminKey;
    const callerEmail = (req.user?.email || req.hostAccount?.email || '').toLowerCase().trim();
    const stayHostEmail = (stay.hostId?.email || '').toLowerCase().trim();
    const isOwner = Boolean(callerEmail && stayHostEmail && callerEmail === stayHostEmail);

    const isLive = Boolean(
      stay.isPublished &&
      (stay.isApproved || stay.hostId?.status === 'Approved') &&
      stay.subscription?.status === 'ACTIVE' &&
      stay.subscription?.expiresAt &&
      new Date(stay.subscription.expiresAt) > new Date()
    );

    if (!isLive && !isCallerAdmin && !isOwner) {
      return res.status(404).json({
        message: 'This property listing is not currently live on the platform. Active subscription required.',
        isLive: false,
      });
    }

    return res.json({
      ...stay,
      id: stay._id.toString(),
      _id: stay._id.toString(),
      isLive,
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
    let processedImages = [];
    if (Array.isArray(images) && images.length > 0) {
      processedImages = (
        await Promise.all(
          images.filter(Boolean).map((img) => uploadSecureImage(img, 'stayin/stays'))
        )
      ).filter(Boolean);
    } else if (image && typeof image === 'string' && image.trim()) {
      const cleanImg = await uploadSecureImage(image.trim(), 'stayin/stays');
      if (cleanImg) processedImages = [cleanImg];
    }

    const cleanPrimaryImage = processedImages[0] || '';

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
      city_normalized: city ? city.trim().toLowerCase() : '',
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
            photos: Array.isArray(rr?.photos)
              ? rr.photos
              : (rr?.photos && typeof rr.photos === 'object' ? Object.entries(rr.photos).map(([label, url]) => ({ label, url })) : []),
            images: Array.isArray(rr?.images)
              ? rr.images
              : (Array.isArray(rr?.photos) ? rr.photos.map((p) => (typeof p === 'string' ? p : p.url)).filter(Boolean) : []),
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

    // Newly created stays must be approved by admin AND have active subscription to go live
    stayPayload.isApproved = false;
    stayPayload.isPublished = false;

    // Inherit active subscription from host if present and non-expired
    const hostDoc = await Host.findById(hostId).lean();
    if (
      hostDoc?.subscription?.status === 'ACTIVE' &&
      hostDoc?.subscription?.expiresAt &&
      new Date(hostDoc.subscription.expiresAt) > new Date()
    ) {
      stayPayload.subscription = {
        status: 'ACTIVE',
        planCode: hostDoc.subscription.planCode || 'monthly',
        planLabel: hostDoc.subscription.planLabel || 'Active Plan',
        expiresAt: hostDoc.subscription.expiresAt,
      };
    } else {
      stayPayload.subscription = {
        status: 'NONE',
        planCode: 'none',
        planLabel: '',
        expiresAt: null,
      };
    }

    const newStay = await Stay.create(stayPayload);

    // Real-time WebSocket update to Admin & Global so admin sees new property immediately
    emitToAdmin('admin:host_updated', {
      stayId: newStay._id,
      hostId,
      action: 'PROPERTY_SUBMITTED',
    });
    emitToGlobal('stay:updated', { stayId: newStay._id, hostId });

    // Notify admin via email that a new property awaits approval
    sendPropertySubmissionToAdminEmail({
      hostName: hostDoc?.name || req.user?.name || 'Host',
      hostEmail: hostDoc?.email || req.user?.email || '',
      hostPhone: hostDoc?.phone || req.user?.phone || '',
      propertyName: newStay.propertyName || newStay.title,
      propertyType: newStay.type || newStay.propertyType,
      location: newStay.location || newStay.city,
      roomCount: Array.isArray(newStay.roomGrid) ? newStay.roomGrid.length : 0,
    }).catch((emailErr) => {
      console.warn('[Email Warning] Admin property submission email failed:', emailErr.message);
    });

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
    emitToGlobal('stay:availability_changed', { stayId: stay._id });
    emitToGlobal('stay:updated', { stayId: stay._id });
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
function parseDMSString(str) {
  if (!str || typeof str !== 'string') return null;
  let decoded = str;
  try {
    decoded = decodeURIComponent(str).replace(/\+/g, ' ');
  } catch {}

  const dmsRegex = /(\d+(?:\.\d+)?)[°\s]+(?:(\d+(?:\.\d+)?)['′\s]+)?(?:(\d+(?:\.\d+)?)["″\s]+)?([NSEW])/gi;
  const matches = [...decoded.matchAll(dmsRegex)];
  if (matches.length >= 2) {
    let lat = null;
    let lng = null;
    for (const m of matches) {
      const deg = parseFloat(m[1]) || 0;
      const min = parseFloat(m[2]) || 0;
      const sec = parseFloat(m[3]) || 0;
      const dir = m[4].toUpperCase();
      const val = (deg + min / 60 + sec / 3600) * (dir === 'S' || dir === 'W' ? -1 : 1);
      if (dir === 'N' || dir === 'S') lat = val;
      if (dir === 'E' || dir === 'W') lng = val;
    }
    if (lat !== null && lng !== null) {
      return { latitude: Number(lat), longitude: Number(lng) };
    }
  }
  return null;
}

export const resolveMapLink = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'Google Maps URL is required' });
    }

    const trimmed = url.trim();

    // 0a. Check if input is directly DMS coordinates (e.g. "29°22'29.4\"N 79°31'39.9\"E")
    const directDms = parseDMSString(trimmed);
    if (directDms) {
      return res.json({
        success: true,
        latitude: directDms.latitude,
        longitude: directDms.longitude,
      });
    }

    // 0b. Check if input is directly decimal coordinates (e.g. "29.374833, 79.52775")
    const directCoord = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (directCoord) {
      return res.json({
        success: true,
        latitude: Number(directCoord[1]),
        longitude: Number(directCoord[2]),
      });
    }

    // Extract URL from input text (mobile apps may prepend place name before the link)
    const urlExtractMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
    const cleanUrl = urlExtractMatch ? urlExtractMatch[0].replace(/[.,;:)\]}>]+$/, '') : trimmed;
    let parsedUrl;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Please enter a valid Google Maps link or coordinates (e.g. 29°22\'29.4"N 79°31\'39.9"E)' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isGoogle =
      hostname === 'goo.gl' ||
      hostname.endsWith('.goo.gl') ||
      hostname === 'g.page' ||
      hostname.endsWith('.g.page') ||
      hostname.includes('google.');

    if (!isGoogle) {
      return res.status(400).json({ success: false, message: 'Only verified Google Maps URLs are permitted' });
    }

    let targetUrl = cleanUrl;
    let fetchedHtml = '';
    const allSeenUrls = [cleanUrl];
    const isShortUrl =
      hostname.includes('goo.gl') ||
      hostname === 'g.page' ||
      hostname.endsWith('.g.page') ||
      targetUrl.includes('/url?');

    if (isShortUrl) {
      let currentHopUrl = cleanUrl;
      const MAX_HOPS = 6;

      for (let hop = 0; hop < MAX_HOPS; hop++) {
        try {
          const curObj = new URL(currentHopUrl);
          if (curObj.hostname.includes('consent.google.') || curObj.pathname === '/url') {
            const cont =
              curObj.searchParams.get('continue') ||
              curObj.searchParams.get('q') ||
              curObj.searchParams.get('url');
            if (cont && cont.startsWith('http')) {
              currentHopUrl = decodeURIComponent(cont);
              allSeenUrls.push(currentHopUrl);
            }
          }
        } catch {}

        try {
          const redirectRes = await fetch(currentHopUrl, {
            method: 'GET',
            redirect: 'manual',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept':
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (redirectRes.status >= 300 && redirectRes.status < 400) {
            let loc = redirectRes.headers.get('location');
            if (loc) {
              if (loc.startsWith('/')) {
                const curObj = new URL(currentHopUrl);
                loc = `${curObj.protocol}//${curObj.host}${loc}`;
              }
              currentHopUrl = loc;
              targetUrl = loc;
              allSeenUrls.push(loc);
              continue;
            }
          }

          if (redirectRes.ok) {
            targetUrl = redirectRes.url || currentHopUrl;
            allSeenUrls.push(targetUrl);
            fetchedHtml = await redirectRes.text();

            const metaRefreshMatch = fetchedHtml.match(
              /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"'>]*url=['"]?([^"'>\s]+)['"]?/i
            );
            if (metaRefreshMatch && metaRefreshMatch[1]) {
              let nextUrl = metaRefreshMatch[1];
              if (nextUrl.startsWith('/')) {
                const curObj = new URL(currentHopUrl);
                nextUrl = `${curObj.protocol}//${curObj.host}${nextUrl}`;
              }
              currentHopUrl = nextUrl;
              targetUrl = nextUrl;
              allSeenUrls.push(nextUrl);
              continue;
            }
            break;
          } else {
            break;
          }
        } catch (redirectErr) {
          console.warn('Google Maps redirect error:', redirectErr.message);
          break;
        }
      }
    } else {
      try {
        const directRes = await fetch(cleanUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (directRes.ok) {
          targetUrl = directRes.url || cleanUrl;
          allSeenUrls.push(targetUrl);
          fetchedHtml = await directRes.text();
        }
      } catch (err) {
        console.warn('Direct URL fetch warning:', err.message);
      }
    }

    let lat = null;
    let lng = null;
    let placeName = '';
    let addressHint = {};

    // 0c. DMS coordinates in any of the seen URLs
    for (const u of allSeenUrls) {
      let dec = u;
      try { dec = decodeURIComponent(u); } catch {}
      const urlDms = parseDMSString(dec) || parseDMSString(u);
      if (urlDms) {
        lat = urlDms.latitude;
        lng = urlDms.longitude;
        break;
      }
    }

    // 1. Authoritative: Exact POI Marker Protobuf Coordinates (!8m2!3d<lat>!4d<lng> or !3d<lat>!4d<lng>)
    if (lat === null || lng === null) {
      const candidateTextBlock = `${allSeenUrls.join('\n')}\n${fetchedHtml}`;
      const poiMarkerMatch =
        candidateTextBlock.match(/!8m2!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/) ||
        candidateTextBlock.match(/!3d(-?\d+(?:\.\d+)?)[^!]*?!4d(-?\d+(?:\.\d+)?)/);
      if (poiMarkerMatch) {
        const pLat = parseFloat(poiMarkerMatch[1]);
        const pLng = parseFloat(poiMarkerMatch[2]);
        if (pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
          lat = pLat;
          lng = pLng;
        }
      }
    }

    // 2. Schema.org Place Metadata in HTML (<meta itemprop="latitude" content="...">)
    if ((lat === null || lng === null) && fetchedHtml) {
      const mLat =
        fetchedHtml.match(/<meta[^>]*itemprop=["']latitude["'][^>]*content=["'](-?\d+(?:\.\d+)?)["']/i) ||
        fetchedHtml.match(/<meta[^>]*content=["'](-?\d+(?:\.\d+)?)["'][^>]*itemprop=["']latitude["']/i);
      const mLng =
        fetchedHtml.match(/<meta[^>]*itemprop=["']longitude["'][^>]*content=["'](-?\d+(?:\.\d+)?)["']/i) ||
        fetchedHtml.match(/<meta[^>]*content=["'](-?\d+(?:\.\d+)?)["'][^>]*itemprop=["']longitude["']/i);
      if (mLat && mLng) {
        const sLat = parseFloat(mLat[1]);
        const sLng = parseFloat(mLng[1]);
        if (sLat >= -90 && sLat <= 90 && sLng >= -180 && sLng <= 180) {
          lat = sLat;
          lng = sLng;
        }
      }
    }

    // 3. JSON-LD GeoCoordinates in HTML (<script type="application/ld+json">)
    if ((lat === null || lng === null) && fetchedHtml) {
      const jsonLd =
        fetchedHtml.match(/"latitude":\s*(-?\d+(?:\.\d+)?)[,\s]+"longitude":\s*(-?\d+(?:\.\d+)?)/i) ||
        fetchedHtml.match(/"geo":\s*\{[^}]*"latitude":\s*(-?\d+(?:\.\d+)?)[^}]*"longitude":\s*(-?\d+(?:\.\d+)?)/i);
      if (jsonLd) {
        const jLat = parseFloat(jsonLd[1]);
        const jLng = parseFloat(jsonLd[2]);
        if (jLat >= -90 && jLat <= 90 && jLng >= -180 && jLng <= 180) {
          lat = jLat;
          lng = jLng;
        }
      }
    }

    // 4. Google Maps APP_INITIALIZATION_STATE internal coordinate array: [null, null, lat, lng]
    if ((lat === null || lng === null) && fetchedHtml) {
      const appInit = fetchedHtml.match(/\[null,\s*null,\s*(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/);
      if (appInit) {
        const aLat = parseFloat(appInit[1]);
        const aLng = parseFloat(appInit[2]);
        if (aLat >= -90 && aLat <= 90 && aLng >= -180 && aLng <= 180) {
          lat = aLat;
          lng = aLng;
        }
      }
    }

    // 5. OpenGraph Staticmap Marker Coordinates (exact pin on Google's rendered card)
    if ((lat === null || lng === null) && fetchedHtml) {
      const staticMarker =
        fetchedHtml.match(/staticmap[^"'>]*?markers=[^&"']*?(?:%7C|\|)(?:color:[^|%]*?(?:%7C|\|))?(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i) ||
        fetchedHtml.match(/staticmap[^"'>]*?markers=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
      if (staticMarker) {
        const smLat = parseFloat(staticMarker[1]);
        const smLng = parseFloat(staticMarker[2]);
        if (smLat >= -90 && smLat <= 90 && smLng >= -180 && smLng <= 180) {
          lat = smLat;
          lng = smLng;
        }
      }
    }

    // 6. Query Parameters (?q=lat,lng or ?query=lat,lng or ?ll=lat,lng or ?daddr=lat,lng)
    if (lat === null || lng === null) {
      for (const u of allSeenUrls) {
        let dec = u;
        try { dec = decodeURIComponent(u); } catch {}
        const qMatch =
          dec.match(/[?&](?:q|query|ll|daddr|saddr|center)=(?:loc:)?(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/i) ||
          u.match(/[?&](?:q|query|ll|daddr|saddr|center)=(?:loc:)?(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/i);
        if (qMatch) {
          const qLat = parseFloat(qMatch[1]);
          const qLng = parseFloat(qMatch[2]);
          if (qLat >= -90 && qLat <= 90 && qLng >= -180 && qLng <= 180) {
            lat = qLat;
            lng = qLng;
            break;
          }
        }
      }
    }

    // 7. Path Coordinates: /maps/place/lat,lng or /maps/search/lat,lng
    if (lat === null || lng === null) {
      for (const u of allSeenUrls) {
        let dec = u;
        try { dec = decodeURIComponent(u); } catch {}
        const directCoordMatch =
          dec.match(/\/maps\/(?:place|search)\/(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/) ||
          u.match(/\/maps\/(?:place|search)\/(-?\d+(?:\.\d+)?)[,+\s%]+(?:2C)?(-?\d+(?:\.\d+)?)/);
        if (directCoordMatch) {
          const dcLat = parseFloat(directCoordMatch[1]);
          const dcLng = parseFloat(directCoordMatch[2]);
          if (dcLat >= -90 && dcLat <= 90 && dcLng >= -180 && dcLng <= 180) {
            lat = dcLat;
            lng = dcLng;
            break;
          }
        }
      }
    }

    // 8. OpenGraph staticmap center
    if ((lat === null || lng === null) && fetchedHtml) {
      const staticCenter = fetchedHtml.match(/staticmap[^"'>]*?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
      if (staticCenter) {
        const smcLat = parseFloat(staticCenter[1]);
        const smcLng = parseFloat(staticCenter[2]);
        if (smcLat >= -90 && smcLat <= 90 && smcLng >= -180 && smcLng <= 180) {
          lat = smcLat;
          lng = smcLng;
        }
      }
    }

    // Viewport camera match (@lat,lng)
    let atLat = null;
    let atLng = null;
    for (const u of allSeenUrls) {
      const atMatch = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        atLat = parseFloat(atMatch[1]);
        atLng = parseFloat(atMatch[2]);
        break;
      }
    }

    // 9. Place name extraction and Plus Code / Open Location Code decoding
    for (const u of allSeenUrls) {
      const placeMatch = u.match(/\/maps\/place\/([^/@?]+)/) || u.match(/[?&]q=([^&]+)/);
      if (placeMatch && placeMatch[1]) {
        try {
          placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        } catch {
          placeName = placeMatch[1].replace(/\+/g, ' ');
        }
        break;
      }
    }
    if (!placeName && fetchedHtml) {
      const titleMatch = fetchedHtml.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        placeName = titleMatch[1].replace(/- Google Maps.*/i, '').trim();
      }
    }

    if (placeName && (lat === null || lng === null)) {
      const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
      const ENCODING_BASE = 20;
      const plusMatch = placeName.match(/\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i);
      if (plusMatch) {
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

    // 10. Viewport camera center fallback (@lat,lng) if no specific pin, POI, or Plus Code
    if (lat === null || lng === null) {
      if (atLat !== null && atLng !== null) {
        lat = atLat;
        lng = atLng;
      }
    }

    // 6. Progressive Geocoding for Place Name (mobile Google Maps share links)
    //    Mobile share links resolve to /maps/place/<name> without embedded coordinates.
    //    We geocode the extracted place name via Nominatim as a reliable fallback.
    if ((lat === null || lng === null) && placeName) {
      const nameParts = placeName.split(',').map((p) => p.trim()).filter(Boolean);

      // Indian PIN codes are reliable Nominatim identifiers
      const pinMatch = placeName.match(/\b([1-9][0-9]{5})\b/);

      // Extract City and State from parts
      let city = '';
      let state = '';
      if (nameParts.length >= 3) {
        const lastPart = nameParts[nameParts.length - 1];
        state = lastPart.replace(/\b[1-9][0-9]{5}\b/, '').trim();
        city = nameParts[nameParts.length - 2].trim();
      } else if (nameParts.length === 2) {
        city = nameParts[1].replace(/\b[1-9][0-9]{5}\b/, '').trim();
      }

      // Build candidate queries — strictly from MOST SPECIFIC to LEAST SPECIFIC
      const candidateQueries = [];

      // 1. Full place name
      candidateQueries.push(placeName);

      // 2. Place name without PIN
      if (pinMatch) {
        candidateQueries.push(placeName.replace(/\b[1-9][0-9]{5}\b/, '').trim().replace(/,\s*,/g, ','));
      }

      // 3. Specific place name + City (e.g. "Zooby's Kitchen, Bhimtal")
      if (nameParts.length > 2 && city) {
        candidateQueries.push(`${nameParts[0]}, ${city}`);
        if (nameParts.length > 3) {
          candidateQueries.push(`${nameParts[0]}, ${nameParts[1]}, ${city}`);
        }
      }

      // 4. Specific sub-locality and area parts + City (e.g. "Mehragaon, Bhimtal", "Mehra Gaon, Bhimtal")
      for (let i = 1; i < nameParts.length - 2; i++) {
        const part = nameParts[i];
        if (part && part.toLowerCase() !== city.toLowerCase()) {
          candidateQueries.push(`${part}, ${city}`);
          // Common Indian / Kumaoni hill transliteration aliases (e.g. Mehra Gaon / Mehragaon -> Mahargaon)
          if (/mehra\s*gaon/i.test(part)) {
            candidateQueries.push(`Mahargaon, ${city}`);
            candidateQueries.push(`Mahargaon, Uttarakhand`);
          }
        }
      }

      // 5. Locality + City + State (last 3 components)
      if (nameParts.length >= 3) {
        candidateQueries.push(nameParts.slice(-3).join(', '));
      }

      // 6. City + PIN code (broader area fallback)
      if (pinMatch && city) {
        candidateQueries.push(`${city}, ${pinMatch[1]}`);
      }

      // 7. City + State (last resort town center)
      if (city && state) {
        candidateQueries.push(`${city}, ${state}`);
      } else if (city) {
        candidateQueries.push(`${city}, India`);
        candidateQueries.push(city);
      } else if (nameParts.length >= 2) {
        candidateQueries.push(nameParts.slice(-2).join(', '));
      }

      // Remove duplicate queries
      const seenQueries = new Set();
      const finalQueries = candidateQueries.filter((q) => {
        const clean = q.replace(/\s+/g, ' ').trim();
        if (!clean || seenQueries.has(clean.toLowerCase())) return false;
        seenQueries.add(clean.toLowerCase());
        return true;
      });

      for (const q of finalQueries) {
        try {
          const ccParam = pinMatch ? `&countrycodes=in` : ``;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1${ccParam}`,
            {
              headers: { 'User-Agent': 'StayIn-Property-Locator/1.0 (contact@stayin.in)' },
              signal: AbortSignal.timeout(8000),
            }
          );
          if (geoRes.ok) {
            const items = await geoRes.json();
            if (Array.isArray(items) && items.length > 0) {
              const first = items[0];
              lat = Number(first.lat);
              lng = Number(first.lon);
              const addr = first.address || {};
              addressHint = {
                roadArea: nameParts.slice(0, Math.max(1, nameParts.length - 2)).join(', ') || nameParts[0] || addr.suburb || addr.neighbourhood || addr.road || ``,
                city: city || addr.city || addr.town || addr.village || addr.county || ``,
                state: state || addr.state || ``,
                pincode: pinMatch?.[1] || addr.postcode || ``,
              };
              console.log(`[resolveMapLink] Geocoded "${q}" -> ${lat},${lng}`);
              break;
            }
          }
        } catch (geoErr) {
          console.warn(`[resolveMapLink] Geocoding "${q}" failed:`, geoErr.message);
        }
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return res.json({
        success: true,
        latitude: Number(lat),
        longitude: Number(lng),
        placeName: placeName ? placeName.trim() : undefined,
        ...addressHint,
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
      status: host?.status || (s.isApproved ? 'Approved' : 'Pending Approval'),
      isPublished: Boolean(s.isPublished),
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
    const totalStays = await Stay.countDocuments({
      isPublished: true,
      isApproved: true,
      'subscription.status': 'ACTIVE',
      'subscription.expiresAt': { $gt: new Date() },
    });

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
      message: restoreAllTime ? 'All-time revenue counter restored.' : 'Revenue counter set to â‚¹0 successfully.',
      revenueResetSettings: stay.revenueResetSettings,
    });
  } catch (error) {
    console.error('Error resetting stay revenue:', error);
    return next(error);
  }
};
