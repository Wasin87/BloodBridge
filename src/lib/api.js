import axios from 'axios';

// Create a configured Axios instance
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // send cookies
});

// Automatic authorization token interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bloodbridge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept unauthorized errors to log out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local auth token if it expires or is invalid
      localStorage.removeItem('bloodbridge_token');
    }
    return Promise.reject(error);
  }
);
