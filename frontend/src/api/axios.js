import axios from 'axios';

const getSessionId = () => {
  let id = localStorage.getItem('voicedoc-session');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('voicedoc-session', id);
  }
  return id;
};

const configuredURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const baseURL = /\/api$/i.test(configuredURL) ? configuredURL : `${configuredURL}/api`;
const API = axios.create({ baseURL });
API.interceptors.request.use((config) => {
  config.headers['X-Session-ID'] = getSessionId();
  return config;
});

export { getSessionId };
export default API;
