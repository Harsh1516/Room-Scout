const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('stayhub_jwt_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (data.status === 'ACCOUNT_DELETED') {
        localStorage.removeItem('stayhub_jwt_token');
        localStorage.removeItem('mal_practice_user');
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
      const errorMessage = data.extraDetails || data.message || 'API request failed';
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
};

export const bookingsAPI = {
  createBooking: (bookingData) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  getMyBookings: () => request('/bookings/my-bookings'),

  getBookingsByStay: (stayId) => request(`/bookings/stay/${encodeURIComponent(stayId)}`),

  updateBookingStatus: (id, statusData) =>
    request(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    }),
};

export const wishlistAPI = {
  getWishlist: () => request('/wishlist'),
  toggleWishlist: (stay) =>
    request('/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ stay }),
    }),
  removeFromWishlist: (stayId) =>
    request(`/wishlist/${encodeURIComponent(stayId)}`, {
      method: 'DELETE',
    }),
};

export const adminAPI = {
  getUsers: () => request('/admin/users'),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getHosts: () => request('/admin/hosts'),
  getHostByEmail: (email) => request(`/admin/hosts/by-email/${encodeURIComponent(email)}`),
  createHost: (hostData) =>
    request('/admin/hosts', {
      method: 'POST',
      body: JSON.stringify(hostData),
    }),
  approveHost: (id) =>
    request(`/admin/hosts/${id}/approve`, {
      method: 'PUT',
    }),
  rejectHost: (id) =>
    request(`/admin/hosts/${id}/reject`, {
      method: 'PUT',
    }),
  getHostGuests: (email) =>
    request(`/admin/hosts/my-guests/${encodeURIComponent(email)}`),
  deleteHost: (id) =>
    request(`/admin/hosts/${id}`, {
      method: 'DELETE',
    }),
  getStats: () => request('/admin/stats'),
  impersonate: ({ email, role, id }) =>
    request('/admin/impersonate', {
      method: 'POST',
      body: JSON.stringify({ email, role, id }),
    }),
};
