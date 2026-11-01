const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://room-scout-backend.onrender.com/api'
    : 'http://localhost:5000/api');

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
  const adminKey = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roomscout_admin_key') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(adminKey ? { 'x-admin-key': adminKey } : {}),
    ...options.headers,
  };

  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    let data = {};
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      if (response.status === 429) {
        const rateLimitMessage = data.message || 'Too many requests from this IP. Please slow down.';
        const error = new Error(rateLimitMessage);
        error.status = 429;
        error.data = data;
        throw error;
      }

      if (data.status === 'ACCOUNT_DELETED' || response.status === 401) {
        if (data.status === 'ACCOUNT_DELETED' || (data.message && data.message.includes('Account not found'))) {
          localStorage.removeItem('roomscout_token');
          localStorage.removeItem('stayhub_jwt_token');
          localStorage.removeItem('mal_practice_user');
          localStorage.removeItem('roomscout_user');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('auth:account_deleted', {
                detail: {
                  message: data.message || 'Account not found in database. Please log in.',
                },
              })
            );
          }
        }
      }

      let errorMessage = data.extraDetails || data.message || 'API request failed';
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors.map((err) => err.message || `${err.field}: invalid`).join(', ');
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

export const authAPI = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  googleAuth: ({ credential, role }) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, role }),
    }),

  googleLogin: ({ credential, role }) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, role }),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  forgotPassword: ({ email, role }) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  updateProfile: (profileData) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  changePassword: ({ oldPassword, newPassword }) =>
    request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  setPassword: ({ newPassword }) =>
    request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  deleteAccount: () =>
    request('/auth/delete-account', {
      method: 'DELETE',
    }),

  getProfile: () => request('/auth/me'),
};

export const staysAPI = {
  getStays: (queryParams = {}) => {
    const params = new URLSearchParams(queryParams).toString();
    return request(`/stays${params ? `?${params}` : ''}`);
  },

  getStayById: (id) => request(`/stays/${id}`),

  checkAvailability: (stayId, checkIn, checkOut) =>
    request(
      `/stays/${encodeURIComponent(stayId)}/availability?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    ),

  createStay: (stayData) =>
    request('/stays', {
      method: 'POST',
      body: JSON.stringify(stayData),
    }),

  addReview: (stayId, reviewData) =>
    request(`/stays/${stayId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),

  updateReview: (stayId, reviewId, reviewData) =>
    request(`/stays/${stayId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    }),

  deleteReview: (stayId, reviewId) =>
    request(`/stays/${stayId}/reviews/${reviewId}`, {
      method: 'DELETE',
    }),

  updateRooms: (stayId, data) =>
    request(`/stays/${stayId}/rooms`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  resolveMapLink: (url) =>
    request('/stays/resolve-map-link', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // Add this new method:
  getHostProperties: () => request('/stays/host/my-properties'),

  getPublicStats: () => request('/stays/public-stats'),

  resetRevenue: (stayId, data = {}) =>
    request(`/stays/${stayId}/reset-revenue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


export const bookingsAPI = {
  createBooking: (bookingData) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  createOfflineBooking: (bookingData) =>
    request('/bookings/offline', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  checkAvailability: (stayId, checkIn, checkOut) =>
    request(
      `/bookings/check-availability?stayId=${encodeURIComponent(stayId)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    ),

  getBookingsByStay: (stayId) =>
    request(`/bookings/stay/${encodeURIComponent(stayId)}`),

  getMyBookings: () => request('/bookings/my-bookings'),

  getHostBookings: (email) => {
    if (email) {
      return request(`/bookings/host/${encodeURIComponent(email)}`);
    }
    return request('/bookings/host-bookings');
  },

  updateBookingStatus: (id, statusData) =>
    request(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    }),

  deleteBooking: (id) =>
    request(`/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  removeOccupantBooking: (payload) =>
    request('/bookings/occupant/remove', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  checkoutOccupant: (payload) =>
    request('/bookings/occupant/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  checkoutBooking: (id) =>
    request(`/bookings/${encodeURIComponent(id)}/checkout`, {
      method: 'POST',
    }),

  cascadeDeleteRoomBookings: (payload) =>
    request('/bookings/room/cascade-delete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getBookingUpiDetails: (bookingId) =>
    request(`/payments/booking-upi-details/${encodeURIComponent(bookingId)}`),

  submitUpiReference: (payload) =>
    request('/payments/submit-upi-reference', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyReference: (payload) =>
    request('/payments/verify-reference', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const paymentsAPI = {
  getBookingUpiDetails: (bookingId) =>
    request(`/payments/booking-upi-details/${encodeURIComponent(bookingId)}`),

  submitUpiReference: (payload) =>
    request('/payments/submit-upi-reference', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyReference: (payload) =>
    request('/payments/verify-reference', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  recordRefund: (payload) =>
    request('/payments/record-refund', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHostPaymentSettings: () =>
    request('/payments/host-payment-settings'),

  updateHostPaymentSettings: (payload) =>
    request('/payments/host-payment-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getHostPayments: (hostId) =>
    request(`/payments/host/${encodeURIComponent(hostId)}`),

  getMyPayments: () => request('/payments/my-payments'),
};

export const wishlistAPI = {
  getWishlist: () => request('/wishlist'),

  toggleWishlist: (stayOrId) => {
    const targetStayId = typeof stayOrId === 'string' ? stayOrId : stayOrId?._id;
    return request('/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({
        stay: typeof stayOrId === 'object' ? stayOrId : undefined,
        stayId: targetStayId,
      }),
    });
  },

  removeFromWishlist: (stayId) =>
    request(`/wishlist/${encodeURIComponent(stayId)}`, {
      method: 'DELETE',
    }),
};

export const subscriptionsAPI = {
  getOptions: () => request('/subscriptions/options'),
  submitPayment: (payload) => request('/subscriptions/payments', { method: 'POST', body: JSON.stringify(payload) }),
  getMyPayments: () => request('/subscriptions/my-payments'),
};

export const adminAPI = {
  getUsers: () => request('/enter/users'),

  deleteUser: (id) =>
    request(`/enter/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getHosts: () => request('/enter/hosts'),

  getHostByEmail: (email) => request(`/enter/hosts/by-email/${encodeURIComponent(email)}`),

  createHost: (hostData) =>
    request('/enter/hosts', {
      method: 'POST',
      body: JSON.stringify(hostData),
    }),

  approveHost: (id) =>
    request(`/enter/hosts/${id}/approve`, {
      method: 'PUT',
    }),

  rejectHost: (id) =>
    request(`/enter/hosts/${id}/reject`, {
      method: 'PUT',
    }),

  getHostGuests: (email) =>
    request(`/enter/hosts/my-guests/${encodeURIComponent(email)}`),

  deleteHost: (id) =>
    request(`/enter/hosts/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => request('/enter/stats'),

  impersonate: ({ email, role, id }) =>
    request('/enter/impersonate', {
      method: 'POST',
      body: JSON.stringify({ email, role, id }),
    }),

  getPlatformPaymentSettings: () => request('/enter/payment-settings'),
  getSubscriptionPayments: () => request('/enter/subscription-payments'),
  reviewSubscriptionPayment: (id, payload) => request(`/enter/subscription-payments/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),

  updatePlatformPaymentSettings: (payload) =>
    request('/enter/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  setAdminKey: (key) => {
    if (typeof sessionStorage !== 'undefined') {
      if (key) sessionStorage.setItem('roomscout_admin_key', key.trim());
      else sessionStorage.removeItem('roomscout_admin_key');
    }
  },

  getAdminKey: () => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roomscout_admin_key') : null),
};