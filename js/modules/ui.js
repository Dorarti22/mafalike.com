
export const UI = {
  toast(msg,type='success'){
    const c=document.getElementById('toast-container')||document.getElementById('toast');
    if(!c) return;
    const el=document.createElement('div');
    el.className='toast';
    const colors={success:'#10b981',error:'#ef4444',info:'#6366f1',warning:'#f59e0b'};
    el.innerHTML=`<div style="background:${colors[type]}20;color:${colors[type]};width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900">${type==='success'?'✓':type==='error'?'✕':'i'}</div><div><div style="font-weight:800;font-size:13px">${type.toUpperCase()}</div><div style="font-size:12px;color:#64748b">${msg}</div></div>`;
    c.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),300)},3000);
  },
  showModal(html){
    const m=document.getElementById('modal');
    const b=document.getElementById('modal-box-inner')||document.getElementById('modal-inner');
    if(!m||!b) return;
    b.innerHTML=html;
    m.classList.add('show');
  },
  closeModal(){ document.getElementById('modal')?.classList.remove('show'); },
  setLoading(id,loading){
    const btn=document.getElementById(id);
    if(!btn) return;
    if(loading){ btn.dataset.orig=btn.innerHTML; btn.innerHTML='Loading...'; btn.disabled=true; }
    else{ btn.innerHTML=btn.dataset.orig||'Submit'; btn.disabled=false; }
  }
};
window.UI = UI;
