
import { API } from './api.js';
export const Auth = {
  async register(data){ const res = await API.post('/api/auth/register', data); API.setToken(res.token); return res; },
  async login(email,password){ const res = await API.post('/api/auth/login',{email,password}); API.setToken(res.token); return res; },
  async me(){ return API.get('/api/auth/me'); },
  logout(){ API.setToken(null); location.reload(); },
  isLogged(){ return !!API.token; }
};
