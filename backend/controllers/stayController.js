import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Stay, computeLowestStartingPrice } from '../models/Stay.js';
import { Host } from '../models/Host.js';
import { Booking } from '../models/Booking.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const processImageUrl = async (imgStr) => {
  if (!imgStr || typeof imgStr !== 'string') return '';
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) return imgStr;
  if (imgStr.startsWith('data:image/')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(imgStr, {
        folder: 'room-scout/stays',
        resource_type: 'image',
      });
      return uploadRes.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      return '';
    }
  }
  return imgStr;
};

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

    if (city) {
      mongoFilter.city = { $regex: new RegExp(city.trim(), 'i') };
    }
    if (type && type !== 'All' && type !== 'All Types') {
      const t = type.toLowerCase().trim();
      if (t === 'flat') {
        mongoFilter.type = { $in: ['PG', 'Flat', 'Apartment'] };
      } else if (t === 'stays & villas') {
        mongoFilter.type = { $in: ['Villa', 'Resort'] };
      } else {
        mongoFilter.type = { $regex: new RegExp(`^${t}$`, 'i') };
      }
    }
    if (gender && gender !== 'All') {
      mongoFilter.genderType = { $in: [gender, 'Both', 'Unisex'] };
    }
    if (minPrice || maxPrice) {
      mongoFilter.price = {};
      if (minPrice) mongoFilter.price.$gte = Number(minPrice);
      if (maxPrice) mongoFilter.price.$lte = Number(maxPrice);
    }
    if (minRating) {
      mongoFilter.rating = { $gte: Number(minRating) };
    }
    if (query) {
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
      status: { $nin: ['CANCELLED', 'REJECTED', 'CHECKED_OUT'] },
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
    const hostId = req.user?._id || req.user?.id || req.body.hostId;
    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ message: 'Valid hostId is required.' });
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
    const cleanPrimaryImage = await processImageUrl(image);

    let processedImages = [];
    if (Array.isArray(images) && images.length > 0) {
      processedImages = await Promise.all(images.map((img) => processImageUrl(img)));
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
      rating: 5.0,
      facilities: Array.isArray(facilities) ? facilities : (Array.isArray(tags) ? tags : []),
      tags: Array.isArray(tags) ? tags : [],
      rules: Array.isArray(rules) ? rules : [],
      image: cleanPrimaryImage,
      images: processedImages,
      instagramVideoUrl: instagramVideoUrl || '',
      description: description || '',
      roomRates: Array.isArray(roomRates) ? roomRates : [],
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
    const userId = req.user?._id || req.user?.id;
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
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    const rev = stay.reviews.id(reviewId);
    if (!rev) return res.status(404).json({ message: 'Review not found.' });

    if (rating) rev.rating = Math.min(5, Math.max(1, Number(rating)));
    if (comment) rev.comment = comment.trim();

    const sum = stay.reviews.reduce((acc, r) => acc + r.rating, 0);
    stay.rating = Number((sum / stay.reviews.length).toFixed(1));
    await stay.save();

    return res.json({ message: 'Review updated successfully', reviews: stay.reviews });
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
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.reviews.pull(reviewId);
    stay.reviewsCount = stay.reviews.length;
    const sum = stay.reviews.length > 0 ? stay.reviews.reduce((acc, r) => acc + r.rating, 0) : 5.0;
    stay.rating = stay.reviews.length > 0 ? Number((sum / stay.reviews.length).toFixed(1)) : 5.0;
    await stay.save();

    return res.json({ message: 'Review deleted successfully', reviews: stay.reviews });
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
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    if (decrement) {
      stay.availableRooms = Math.max(0, stay.availableRooms - 1);
    } else if (availableRooms !== undefined) {
      stay.availableRooms = Math.max(0, Number(availableRooms));
    }

    await stay.save();
    return res.json({
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

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return res.json({
        success: true,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6)),
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
    const userId = req.user?._id || req.user?.id;
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