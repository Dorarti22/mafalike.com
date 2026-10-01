
import { API } from './modules/api.js';
import { Auth } from './modules/auth.js';
import { TasksMod } from './modules/tasks.js';
import { UI } from './modules/ui.js';
let currentUser=null; let tasksCache=[];
function $(s){return document.querySelector(s)}
function showApp(show){
  document.getElementById('auth-screen').classList.toggle('show', !show);
  document.getElementById('app').classList.toggle('show', show);
}
function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const t=document.getElementById('view-'+view); if(t) t.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  document.querySelectorAll('.mob-item').forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  if(view==='tasks') loadTasks();
  if(view==='wallet') loadStats();
  if(view==='home') loadHome();
  if(view==='messages') loadMessages();
  if(view==='profile') renderProfile();
}
async function init(){
  if(API.token){ try{ currentUser=await Auth.me(); showApp(true); await afterLogin(); }catch{ API.setToken(null); showApp(false); } }else showApp(false);
  document.getElementById('btn-show-register')?.addEventListener('click',()=>{ document.getElementById('login-form').style.display='none'; document.getElementById('register-form').style.display='block'; });
  document.getElementById('btn-show-login')?.addEventListener('click',()=>{ document.getElementById('register-form').style.display='none'; document.getElementById('login-form').style.display='block'; });
  document.getElementById('register-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd=new FormData(e.target); try{ UI.setLoading('reg-btn',true); const res=await Auth.register({username:fd.get('username'),email:fd.get('email'),password:fd.get('password'),full_name:fd.get('full_name')}); currentUser=res.user; showApp(true); await afterLogin(); UI.toast('Account created!','success'); }catch(err){ UI.toast(err.message,'error'); } finally{ UI.setLoading('reg-btn',false); } });
  document.getElementById('login-form')?.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd=new FormData(e.target); try{ UI.setLoading('login-btn',true); const res=await Auth.login(fd.get('email'),fd.get('password')); currentUser=res.user; showApp(true); await afterLogin(); UI.toast('Welcome back!','success'); }catch(err){ UI.toast(err.message,'error'); } finally{ UI.setLoading('login-btn',false); } });
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.view)));
  document.getElementById('logout-btn')?.addEventListener('click',()=>Auth.logout());
  document.getElementById('logout-btn2')?.addEventListener('click',()=>Auth.logout());
  document.getElementById('modal')?.addEventListener('click',(e)=>{ if(e.target.id==='modal') UI.closeModal(); });
  document.getElementById('task-search')?.addEventListener('input', renderTasks);
  document.querySelectorAll('.filter-chip').forEach(ch=>ch.addEventListener('click',()=>{ document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active')); ch.classList.add('active'); renderTasks(); }));
  document.getElementById('send-msg-btn')?.addEventListener('click', sendMessage);
  document.getElementById('chat-input')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter') sendMessage(); });
  document.getElementById('notif-btn')?.addEventListener('click', loadNotifications);
  document.getElementById('profile-form')?.addEventListener('submit', saveProfile);
}
async function afterLogin(){ await Promise.all([loadHome(), loadStats()]); loadNotificationsBadge(); renderProfile(); navigate('home'); }
async function loadHome(){
  try{
    const [stats, announcements] = await Promise.all([TasksMod.stats(), API.get('/api/announcements')]);
    const el1=document.getElementById('today-earn'); if(el1) el1.textContent='$'+ (stats.today_earnings||0).toFixed(2);
    const el2=document.getElementById('today-tasks'); if(el2) el2.textContent=stats.today_tasks||0;
    const el3=document.getElementById('total-tasks'); if(el3) el3.textContent=stats.total_tasks||0;
    const el4=document.getElementById('balance-hero'); if(el4) el4.textContent='$'+ (stats.balance||0).toFixed(2);
    const annWrap=document.getElementById('announcements');
    if(annWrap){ annWrap.innerHTML=announcements.map(a=>`<div class="card" style="margin-bottom:10px"><div class="card-body" style="display:flex;gap:12px"><div style="font-size:20px">📢</div><div><div style="font-weight:700;font-size:13px">${a.title}</div><div style="font-size:12px;color:#64748b;margin-top:4px">${a.message}</div></div></div></div>`).join('') || '<div class="empty">No announcements</div>'; }
  }catch{}
}
async function loadStats(){
  try{
    const s=await TasksMod.stats();
    const elBal=document.getElementById('wallet-balance'); if(elBal) elBal.textContent='$'+(s.balance||0).toFixed(2);
    const elTot=document.getElementById('wallet-total'); if(elTot) elTot.textContent='$'+(s.total_earned||0).toFixed(2);
    const elToday=document.getElementById('wallet-today'); if(elToday) elToday.textContent='$'+(s.today_earnings||0).toFixed(2);
    const elTasks=document.getElementById('wallet-tasks'); if(elTasks) elTasks.textContent=s.total_tasks||0;
  }catch{}
}
async function loadTasks(){
  try{
    document.getElementById('tasks-grid').innerHTML='<div class="loader"></div>';
    tasksCache=await TasksMod.list();
    renderTasks();
  }catch{ document.getElementById('tasks-grid').innerHTML=`<div class="empty">Failed to load tasks</div>`; }
}
function renderTasks(){
  const grid=document.getElementById('tasks-grid'); if(!grid) return;
  const search=(document.getElementById('task-search')?.value||'').toLowerCase();
  const activeFilter=document.querySelector('.filter-chip.active')?.dataset.filter||'all';
  let list=tasksCache;
  if(activeFilter!=='all') list=list.filter(t=>t.platform===activeFilter || t.type===activeFilter || t.difficulty===activeFilter);
  if(search) list=list.filter(t=> (t.title+t.description+t.platform).toLowerCase().includes(search));
  if(!list.length){ grid.innerHTML='<div class="empty">No tasks found</div>'; return; }
  grid.innerHTML=list.map(t=>`<div class="task-card ${t.is_completed?'completed':''}"><div class="task-top"><span class="platform-badge p-${t.platform}">${t.platform}</span><span class="task-reward">+$${Number(t.reward).toFixed(2)}</span></div><div class="task-title">${t.title}</div><div class="task-desc">${t.description||''}</div><div class="task-foot"><div class="task-meta"><span class="meta-dot">${t.difficulty}</span><span class="meta-dot">${t.completions||0} done</span></div><button class="btn btn-primary" style="padding:8px 14px;font-size:12px" onclick="window.completeTask(${t.id})" ${t.is_completed?'disabled':''}>${t.is_completed?'Done':'Complete'}</button></div></div>`).join('');
}
window.completeTask=async(id)=>{
  try{
    UI.showModal(`<div style="text-align:center;padding:10px"><div style="font-size:40px">⏳</div><div style="font-weight:800;margin-top:10px">Verifying...</div></div>`);
    await new Promise(r=>setTimeout(r,1200));
    const res=await TasksMod.complete(id);
    UI.closeModal(); UI.toast(`Earned $${res.reward.toFixed(2)}!`,'success');
    await loadTasks(); await loadHome(); await loadStats();
  }catch(e){ UI.closeModal(); UI.toast(e.message,'error'); }
};
async function loadMessages(){
  try{
    const msgs=await API.get('/api/messages');
    const wrap=document.getElementById('chat-msgs');
    if(!msgs.length){ wrap.innerHTML='<div class="empty">No messages yet. Say hi!</div>'; return; }
    wrap.innerHTML=msgs.map(m=>`<div class="msg ${m.sender_id===currentUser.id?'user':'bot'}">${m.content}<div style="font-size:10px;opacity:.6;margin-top:4px">${new Date(m.created_at).toLocaleTimeString()}</div></div>`).join('');
    wrap.scrollTop=wrap.scrollHeight;
  }catch{}
}
async function sendMessage(){
  const input=document.getElementById('chat-input'); const content=input.value.trim(); if(!content) return;
  try{ await API.post('/api/messages',{content}); input.value=''; loadMessages(); UI.toast('Sent','success'); }catch(e){ UI.toast(e.message,'error'); }
}
async function loadNotifications(){
  try{
    const notifs=await API.get('/api/notifications');
    const html=`<div style="padding:18px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-weight:800">Notifications <button class="btn btn-ghost" style="padding:6px 10px" onclick="window.markAllRead()">Mark all read</button></div><div style="max-height:400px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:16px">${notifs.length? notifs.map(n=>`<div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:${n.is_read?'white':'#f0fdf4'}"><div style="font-weight:700;font-size:13px">${n.title}</div><div style="font-size:12px;color:#64748b;margin-top:4px">${n.message}</div><div style="font-size:10px;color:#94a3b8;margin-top:6px">${new Date(n.created_at).toLocaleString()}</div></div>`).join('') : '<div class="empty">No notifications</div>'}</div>`;
    UI.showModal(html);
  }catch(e){ UI.toast(e.message,'error'); }
}
window.markAllRead=async()=>{ await API.put('/api/notifications/read-all'); UI.closeModal(); loadNotificationsBadge(); UI.toast('All read','success'); };
async function loadNotificationsBadge(){
  try{
    const notifs=await API.get('/api/notifications');
    const unread=notifs.filter(n=>!n.is_read).length;
    const badge=document.getElementById('notif-badge'); if(badge){ badge.textContent=unread; badge.style.display=unread?'flex':'none'; }
  }catch{}
}
function renderProfile(){
  if(!currentUser) return;
  const av=document.getElementById('profile-avatar'); if(av) av.textContent=(currentUser.username||'U').charAt(0).toUpperCase();
  const pn=document.getElementById('profile-name'); if(pn) pn.textContent=currentUser.full_name||currentUser.username;
  const pe=document.getElementById('profile-email'); if(pe) pe.textContent=currentUser.email;
  const pl=document.getElementById('profile-level'); if(pl) pl.textContent=currentUser.level||'Bronze';
  const pb=document.getElementById('profile-balance'); if(pb) pb.textContent='$'+(currentUser.balance||0).toFixed(2);
  const u1=document.getElementById('pf-username'); if(u1) u1.value=currentUser.username;
  const u2=document.getElementById('pf-fullname'); if(u2) u2.value=currentUser.full_name||'';
  const u3=document.getElementById('pf-email'); if(u3) u3.value=currentUser.email;
}
async function saveProfile(e){
  e.preventDefault();
  const fd=new FormData(e.target);
  try{
    const updated=await API.put('/api/user/profile',{full_name:fd.get('full_name'), email:fd.get('email')});
    currentUser={...currentUser,...updated}; renderProfile(); UI.toast('Profile updated','success');
  }catch(err){ UI.toast(err.message,'error'); }
}
document.addEventListener('DOMContentLoaded', init);
