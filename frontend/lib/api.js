import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  // Prefer user token (for worker/admin operations), fall back to company token
  const userToken = typeof window !== 'undefined' ? localStorage.getItem('saas_user_token') : null;
  const companyToken = typeof window !== 'undefined' ? localStorage.getItem('saas_token') : null;
  const token = userToken || companyToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const activeDbStr = typeof window !== 'undefined' ? localStorage.getItem('saas_active_db') : null;
  if (activeDbStr) {
    try {
      const activeDb = JSON.parse(activeDbStr);
      if (activeDb && activeDb._id) {
        config.headers['x-database-id'] = activeDb._id;
      }
    } catch(e) {}
  }

  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (typeof window !== 'undefined' && err.response?.data?.subscriptionExpired) {
      // Force reload so subscription banner appears
      window.dispatchEvent(new CustomEvent('subscription-expired'));
    }
    return Promise.reject(err);
  }
);

export default api;
