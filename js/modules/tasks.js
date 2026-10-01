
import { API } from './api.js';
export const TasksMod = {
  async list(){ return API.get('/api/tasks'); },
  async complete(id){ return API.post(`/api/tasks/${id}/complete`); },
  async stats(){ return API.get('/api/user/stats'); }
};
