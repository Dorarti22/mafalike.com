
export const API = {
  base: '',
  token: localStorage.getItem('mafalike_token') || null,
  setToken(t){ this.token=t; if(t) localStorage.setItem('mafalike_token',t); else localStorage.removeItem('mafalike_token'); },
  async req(path, opts={}){
    const headers = {'Content-Type':'application/json', ...(opts.headers||{})};
    if(this.token) headers['Authorization']='Bearer '+this.token;
    const res = await fetch(this.base + path, {...opts, headers});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get(p){ return this.req(p); },
  post(p,b){ return this.req(p,{method:'POST', body:JSON.stringify(b||{})}); },
  put(p,b){ return this.req(p,{method:'PUT', body:JSON.stringify(b||{})}); },
  del(p){ return this.req(p,{method:'DELETE'}); }
};
