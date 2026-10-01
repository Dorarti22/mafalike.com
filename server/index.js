import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'mafalike-super-secret-key-2024';
const DB_FILE = path.join(__dirname, '../database/mafalike.json');
fs.mkdirSync(path.dirname(DB_FILE), {recursive:true});
function loadDB(){
  if(!fs.existsSync(DB_FILE)){
    const init = { users: [], tasks: [], user_tasks: [], messages: [], notifications: [], settings: [{key:'platform_name', value:'MAFALIKE'},{key:'min_withdraw', value:'10'},{key:'referral_bonus', value:'2'},{key:'maintenance', value:'0'}], logs: [], announcements: [], _id: {users:1, tasks:1, user_tasks:1, messages:1, notifications:1, logs:1, announcements:1} };
    const hash = crypto.pbkdf2Sync('admin123','mafalike-salt',10000,64,'sha512').toString('hex');
    init.users.push({id:init._id.users++, username:'admin', email:'admin@mafalike.com', password:hash, full_name:'Admin MAFALIKE', role:'admin', balance:0, total_earned:0, level:'Diamond', status:'active', created_at:new Date().toISOString()});
    init.users.push({id:init._id.users++, username:'demo', email:'demo@mafalike.com', password:hash, full_name:'Demo User', role:'user', balance:152.5, total_earned:1240.3, level:'Gold', status:'active', created_at:new Date().toISOString()});
    const tlist = [
      ['Follow @MafaLike on Instagram','Follow our official Instagram','instagram',0.5,'follow','easy','https://instagram.com'],
      ['Like 5 posts on Facebook','Engage with Facebook','facebook',0.75,'like','easy','https://facebook.com'],
      ['Subscribe YouTube Channel','Subscribe and turn on notifications','youtube',1.2,'subscribe','medium','https://youtube.com'],
      ['Join Telegram Group','Join community','telegram',0.6,'join','easy','https://telegram.org'],
      ['Retweet Campaign Post','Retweet latest campaign','twitter',0.8,'share','medium','https://twitter.com'],
      ['Watch Promo Video','Watch 30s promo','youtube',1.5,'watch','medium',''],
      ['App Review on Store','Leave 5 star review','appstore',2,'review','hard',''],
      ['Invite 3 Friends','Share referral link','referral',3,'invite','hard','']
    ];
    for(const t of tlist){ init.tasks.push({id:init._id.tasks++, title:t[0], description:t[1], platform:t[2], reward:t[3], type:t[4], difficulty:t[5], url:t[6], status:'active', completions:0, max_completions:1000, created_at:new Date().toISOString()}); }
    init.announcements.push({id:init._id.announcements++, title:'Welcome to MAFALIKE', message:'Complete tasks daily to earn rewards. New tasks added every day!', type:'info', is_active:1, created_at:new Date().toISOString()});
    fs.writeFileSync(DB_FILE, JSON.stringify(init,null,2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
}
function saveDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function hashPw(pw){ return crypto.pbkdf2Sync(pw,'mafalike-salt',10000,64,'sha512').toString('hex'); }
function b64url(s){ return Buffer.from(s).toString('base64url'); }
function signJWT(payload){ const h=b64url(JSON.stringify({alg:'HS256',typ:'JWT'})); const b=b64url(JSON.stringify({...payload, exp:Math.floor(Date.now()/1000)+604800})); const sig=crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+b).digest('base64url'); return h+'.'+b+'.'+sig; }
function verifyJWT(token){ const parts=token.split('.'); if(parts.length!==3) throw new Error('Invalid'); const [h,b,s]=parts; const exp=crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+b).digest('base64url'); if(s!==exp) throw new Error('Invalid sig'); const payload=JSON.parse(Buffer.from(b,'base64url').toString()); if(payload.exp && payload.exp < Math.floor(Date.now()/1000)) throw new Error('Expired'); return payload; }
function logAction(action,uid,details){ try{ const db=loadDB(); db.logs.push({id:db._id.logs++, action, user_id:uid||null, details, created_at:new Date().toISOString()}); if(db.logs.length>500) db.logs=db.logs.slice(-500); saveDB(db);}catch{} }
function sendJson(res,code,data){ res.writeHead(code, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); res.end(JSON.stringify(data)); }
function serveStatic(req,res){
  let p=req.url.split('?')[0];
  let fp=null;
  if(p.startsWith('/admin/')) fp=path.join(__dirname,'..',p);
  else if(p.startsWith('/css/')||p.startsWith('/js/')) fp=path.join(__dirname,'..',p);
  else if(p==='/'||p==='/index.html') fp=path.join(__dirname,'../index.html');
  else { const maybe=path.join(__dirname,'..',p); try{ if(fs.existsSync(maybe)&&fs.statSync(maybe).isFile()) fp=maybe; }catch{} }
  if(fp&&fs.existsSync(fp)){ const ext=path.extname(fp); const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'}[ext]||'text/plain'; res.writeHead(200,{'Content-Type':mime}); res.end(fs.readFileSync(fp)); return true; }
  return false;
}
const server=http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS'){ res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); return res.end(); }
  if(serveStatic(req,res)) return;
  if(req.url.startsWith('/admin') && !req.url.includes('.')){ res.writeHead(200,{'Content-Type':'text/html'}); return res.end(fs.readFileSync(path.join(__dirname,'../admin/index.html'))); }
  if(!req.url.startsWith('/api')){ res.writeHead(200,{'Content-Type':'text/html'}); return res.end(fs.readFileSync(path.join(__dirname,'../index.html'))); }
  let body=''; for await(const c of req) body+=c;
  let data={}; try{ data=body?JSON.parse(body):{}; }catch{}
  const url=new URL(req.url,'http://localhost'); const pathname=url.pathname;
  const getUser=()=>{ const h=req.headers['authorization']; if(!h) return null; try{ return verifyJWT(h.split(' ')[1]); }catch{ return null; } };
  try{
    if(pathname==='/api/auth/register' && req.method==='POST'){
      const {username,email,password,full_name}=data;
      if(!username||!email||!password) return sendJson(res,400,{error:'Missing fields'});
      const db=loadDB();
      if(db.users.some(u=>u.username===username||u.email===email)) return sendJson(res,400,{error:'Username or email already exists'});
      const user={id:db._id.users++, username, email, password:hashPw(password), full_name:full_name||username, role:'user', balance:0, total_earned:0, level:'Bronze', status:'active', created_at:new Date().toISOString()};
      db.users.push(user);
      db.notifications.push({id:db._id.notifications++, user_id:user.id, title:'Welcome to MAFALIKE!', message:'Your account was created successfully.', type:'success', is_read:0, created_at:new Date().toISOString()});
      saveDB(db);
      const token=signJWT({id:user.id, role:user.role, username:user.username});
      return sendJson(res,200,{token,user:{id:user.id,username:user.username,email:user.email,full_name:user.full_name,role:user.role,balance:user.balance,total_earned:user.total_earned,level:user.level,status:user.status}});
    }
    if(pathname==='/api/auth/login' && req.method==='POST'){
      const {email,password}=data; const db=loadDB(); const user=db.users.find(u=>u.email===email||u.username===email);
      if(!user) return sendJson(res,401,{error:'Invalid credentials'});
      if(user.status==='banned') return sendJson(res,403,{error:'Account banned'});
      if(hashPw(password)!==user.password) return sendJson(res,401,{error:'Invalid credentials'});
      const token=signJWT({id:user.id, role:user.role, username:user.username});
      logAction('login',user.id,'Login');
      return sendJson(res,200,{token,user:{id:user.id,username:user.username,email:user.email,full_name:user.full_name,role:user.role,balance:user.balance,total_earned:user.total_earned,level:user.level,status:user.status}});
    }
    const auth=getUser();
    if(pathname!=='/api/announcements' && !pathname.startsWith('/api/auth/')){
      if(!auth) return sendJson(res,401,{error:'No token'});
      if(pathname.startsWith('/api/admin/') && auth.role!=='admin') return sendJson(res,403,{error:'Admin only'});
    }
    const db=loadDB();
    if(pathname==='/api/auth/me' && req.method==='GET'){ const u=db.users.find(x=>x.id===auth.id); if(!u) return sendJson(res,404,{error:'Not found'}); const {password,...safe}=u; return sendJson(res,200,safe); }
    if(pathname==='/api/tasks' && req.method==='GET'){ const done=db.user_tasks.filter(x=>x.user_id===auth.id).map(x=>x.task_id); const tasks=db.tasks.filter(t=>t.status==='active').map(t=>({...t,is_completed:done.includes(t.id)})).reverse(); return sendJson(res,200,tasks); }
    if(pathname.startsWith('/api/tasks/') && pathname.endsWith('/complete') && req.method==='POST'){
      const id=parseInt(pathname.split('/')[3]); const task=db.tasks.find(t=>t.id===id);
      if(!task) return sendJson(res,404,{error:'Task not found'});
      if(db.user_tasks.some(x=>x.user_id===auth.id&&x.task_id===id)) return sendJson(res,400,{error:'Already completed'});
      db.user_tasks.push({id:db._id.user_tasks++, user_id:auth.id, task_id:id, earned:task.reward, status:'completed', completed_at:new Date().toISOString()});
      const u=db.users.find(x=>x.id===auth.id); u.balance+=task.reward; u.total_earned+=task.reward; task.completions++;
      db.notifications.push({id:db._id.notifications++, user_id:auth.id, title:'Task Completed!', message:'You earned $'+task.reward.toFixed(2)+' for '+task.title, type:'success', is_read:0, created_at:new Date().toISOString()});
      saveDB(db); logAction('task_complete',auth.id,'Task '+id); return sendJson(res,200,{success:true, reward:task.reward, balance:u.balance, total_earned:u.total_earned});
    }
    if(pathname==='/api/user/stats' && req.method==='GET'){
      const today=new Date().toISOString().slice(0,10);
      const todayTasks=db.user_tasks.filter(x=>x.user_id===auth.id&&x.completed_at.slice(0,10)===today);
      const earn=todayTasks.reduce((s,x)=>s+x.earned,0);
      const total=db.user_tasks.filter(x=>x.user_id===auth.id).length;
      const u=db.users.find(x=>x.id===auth.id);
      return sendJson(res,200,{today_tasks:todayTasks.length, today_earnings:earn, total_tasks:total, balance:u.balance, total_earned:u.total_earned, level:u.level});
    }
    if(pathname==='/api/user/profile' && req.method==='PUT'){
      const u=db.users.find(x=>x.id===auth.id); if(data.full_name) u.full_name=data.full_name; if(data.email) u.email=data.email; saveDB(db); const {password,...safe}=u; return sendJson(res,200,safe);
    }
    if(pathname==='/api/messages' && req.method==='GET'){ const msgs=db.messages.filter(m=>m.sender_id===auth.id||m.receiver_id===auth.id||m.receiver_id===null).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); return sendJson(res,200,msgs); }
    if(pathname==='/api/messages' && req.method==='POST'){ if(!data.content) return sendJson(res,400,{error:'Empty'}); db.messages.push({id:db._id.messages++, sender_id:auth.id, content:data.content, receiver_id:null, is_admin_reply:0, created_at:new Date().toISOString()}); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/notifications' && req.method==='GET'){ const n=db.notifications.filter(x=>x.user_id===auth.id||x.user_id===null).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,50); return sendJson(res,200,n); }
    if(pathname==='/api/notifications/read-all' && req.method==='PUT'){ db.notifications.forEach(x=>{ if(x.user_id===auth.id||x.user_id===null) x.is_read=1; }); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/announcements' && req.method==='GET'){ return sendJson(res,200,db.announcements.filter(a=>a.is_active).reverse()); }
    if(pathname==='/api/admin/stats' && req.method==='GET'){
      const totalUsers=db.users.filter(u=>u.role==='user').length;
      const todayUsers=db.users.filter(u=>u.role==='user'&&u.created_at.slice(0,10)===new Date().toISOString().slice(0,10)).length;
      const totalTasks=db.tasks.length; const completions=db.tasks.reduce((s,t)=>s+(t.completions||0),0);
      const totalEarned=db.users.reduce((s,u)=>s+(u.total_earned||0),0); const pending=db.users.reduce((s,u)=>s+(u.balance||0),0);
      const todayEarn=db.user_tasks.filter(x=>x.completed_at.slice(0,10)===new Date().toISOString().slice(0,10)).reduce((s,x)=>s+x.earned,0);
      return sendJson(res,200,{users:{total:totalUsers,today:todayUsers}, tasks:{total:totalTasks,completions}, earnings:{total:totalEarned,pending}, today_earnings:todayEarn, messages:db.messages.length});
    }
    if(pathname==='/api/admin/users' && req.method==='GET'){
      const search=(url.searchParams.get('search')||'').toLowerCase(); const status=url.searchParams.get('status')||''; const role=url.searchParams.get('role')||'';
      let users=db.users.map(u=>{ const {password,...safe}=u; return safe; });
      if(search) users=users.filter(u=>(u.username+u.email+(u.full_name||'')).toLowerCase().includes(search));
      if(status) users=users.filter(u=>u.status===status);
      if(role) users=users.filter(u=>u.role===role);
      return sendJson(res,200,users.reverse());
    }
    if(pathname.startsWith('/api/admin/users/') && req.method==='PUT'){
      const id=parseInt(pathname.split('/')[4]); const u=db.users.find(x=>x.id===id); if(!u) return sendJson(res,404,{error:'Not found'});
      if(data.status) u.status=data.status; if(data.role) u.role=data.role; if(data.balance!=null) u.balance=parseFloat(data.balance); if(data.level) u.level=data.level; if(data.full_name) u.full_name=data.full_name; saveDB(db); return sendJson(res,200,{success:true});
    }
    if(pathname.startsWith('/api/admin/users/') && req.method==='DELETE'){
      const id=parseInt(pathname.split('/')[4]); if(id===auth.id) return sendJson(res,400,{error:'Cannot delete self'}); db.users=db.users.filter(x=>x.id!==id); saveDB(db); return sendJson(res,200,{success:true});
    }
    if(pathname==='/api/admin/tasks' && req.method==='GET'){ return sendJson(res,200,db.tasks.slice().reverse()); }
    if(pathname==='/api/admin/tasks' && req.method==='POST'){
      if(!data.title||!data.platform||data.reward==null) return sendJson(res,400,{error:'Missing'});
      const task={id:db._id.tasks++, title:data.title, description:data.description||'', platform:data.platform, reward:parseFloat(data.reward), type:data.type||'social', difficulty:data.difficulty||'easy', url:data.url||'', status:data.status||'active', completions:0, max_completions:data.max_completions||1000, created_at:new Date().toISOString()};
      db.tasks.push(task); saveDB(db); return sendJson(res,200,{id:task.id});
    }
    if(pathname.startsWith('/api/admin/tasks/') && req.method==='PUT'){
      const id=parseInt(pathname.split('/')[4]); const t=db.tasks.find(x=>x.id===id); if(!t) return sendJson(res,404,{error:'Not found'});
      if(data.title!=null) t.title=data.title; if(data.description!=null) t.description=data.description; if(data.platform!=null) t.platform=data.platform; if(data.reward!=null) t.reward=parseFloat(data.reward); if(data.type!=null) t.type=data.type; if(data.difficulty!=null) t.difficulty=data.difficulty; if(data.url!=null) t.url=data.url; if(data.status!=null) t.status=data.status; saveDB(db); return sendJson(res,200,{success:true});
    }
    if(pathname.startsWith('/api/admin/tasks/') && req.method==='DELETE'){ const id=parseInt(pathname.split('/')[4]); db.tasks=db.tasks.filter(x=>x.id!==id); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/admin/messages' && req.method==='GET'){ const msgs=db.messages.map(m=>{ const u=db.users.find(x=>x.id===m.sender_id); return {...m, username:u?.username, email:u?.email}; }).reverse().slice(0,100); return sendJson(res,200,msgs); }
    if(pathname==='/api/admin/messages/reply' && req.method==='POST'){ if(!data.content) return sendJson(res,400,{error:'Empty'}); db.messages.push({id:db._id.messages++, sender_id:auth.id, receiver_id:data.receiver_id||null, content:data.content, is_admin_reply:1, created_at:new Date().toISOString()}); if(data.receiver_id) db.notifications.push({id:db._id.notifications++, user_id:data.receiver_id, title:'New message from Support', message:data.content, type:'info', is_read:0, created_at:new Date().toISOString()}); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/admin/announcements' && req.method==='GET'){ return sendJson(res,200,db.announcements.slice().reverse()); }
    if(pathname==='/api/admin/announcements' && req.method==='POST'){ if(!data.title||!data.message) return sendJson(res,400,{error:'Missing'}); const ann={id:db._id.announcements++, title:data.title, message:data.message, type:data.type||'info', is_active:1, created_at:new Date().toISOString()}; db.announcements.push(ann); db.notifications.push({id:db._id.notifications++, user_id:null, title:data.title, message:data.message, type:data.type||'info', is_read:0, created_at:new Date().toISOString()}); saveDB(db); return sendJson(res,200,{id:ann.id}); }
    if(pathname.startsWith('/api/admin/announcements/') && req.method==='DELETE'){ const id=parseInt(pathname.split('/')[4]); db.announcements=db.announcements.filter(a=>a.id!==id); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/admin/logs' && req.method==='GET'){ const logs=db.logs.map(l=>{ const u=db.users.find(x=>x.id===l.user_id); return {...l, username:u?.username}; }).reverse().slice(0,200); return sendJson(res,200,logs); }
    if(pathname==='/api/admin/settings' && req.method==='GET'){ return sendJson(res,200,db.settings); }
    if(pathname.startsWith('/api/admin/settings/') && req.method==='PUT'){ const key=decodeURIComponent(pathname.split('/').pop()); let s=db.settings.find(x=>x.key===key); if(s) s.value=data.value; else db.settings.push({key, value:data.value}); saveDB(db); return sendJson(res,200,{success:true}); }
    if(pathname==='/api/admin/broadcast' && req.method==='POST'){ if(!data.title||!data.message) return sendJson(res,400,{error:'Missing'}); db.notifications.push({id:db._id.notifications++, user_id:null, title:data.title, message:data.message, type:data.type||'info', is_read:0, created_at:new Date().toISOString()}); saveDB(db); return sendJson(res,200,{success:true}); }
    return sendJson(res,404,{error:'Not found'});
  }catch(e){ console.error(e); return sendJson(res,500,{error:e.message}); }
});
server.listen(PORT, ()=>console.log('MAFALIKE running on http://localhost:'+PORT+' - admin@mafalike.com / admin123'));
