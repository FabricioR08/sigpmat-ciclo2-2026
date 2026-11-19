import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sigpmat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('sigpmat_token');
      localStorage.removeItem('sigpmat_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
