// faithful v9 app (features & styles matching)
const $ = (s)=>document.querySelector(s);
if(location.search.includes("reset=1")){ try{localStorage.clear();}catch(e){} }
const VERSION="9.1"; const VK="onroute.version"; try{ if(localStorage.getItem(VK)!==VERSION){ localStorage.clear(); localStorage.setItem(VK,VERSION);} }catch(e){}
const KEY="onrouteData.v9.1"; const def={rep:null,weekOffset:0,view:"week",doctors:[],backlogFilter:""};
let state=(()=>{try{const r=localStorage.getItem(KEY); if(r) return JSON.parse(r);}catch(e){} return structuredClone(def);})();
const save=()=>{ try{localStorage.setItem(KEY, JSON.stringify(state));}catch(e){} };
const uid=()=>Math.random().toString(36).slice(2,9);
const mk=(n,e="",a="")=>({id:uid(),nome:n,espec:e,end:a,visited:false,scheduled:null});

function banner(t,cls="success"){ const b=$("#banner"); b.textContent=t; b.classList.remove("hidden"); b.classList.add(cls); setTimeout(()=>{b.classList.add("hidden"); b.classList.remove(cls);},3000); }

(function(){try{const p=new URLSearchParams(location.search); if(p.has("sync")){ const json=atob(decodeURIComponent(p.get("sync"))); const incoming=JSON.parse(json); localStorage.setItem(KEY, JSON.stringify(incoming)); state=incoming; const u=new URL(location.href); u.searchParams.delete("sync"); history.replaceState(null,"",u.toString()); banner("Agenda sincronizada ✅"); }}catch(e){ banner("Falha ao importar sync","error"); }})();

document.addEventListener("DOMContentLoaded", ()=>{
  $("#syncBtn").addEventListener("click", async ()=>{ const data=localStorage.getItem(KEY)||JSON.stringify(state); const url=`${location.origin}${location.pathname}?sync=${encodeURIComponent(btoa(data))}`; try{ await navigator.clipboard.writeText(url); banner("🔗 Link copiado!"); }catch(e){ alert("Copie manualmente:\\n"+url);} });
  $("#copyMonthBtn").addEventListener("click", ()=>{ if(!confirm("Copiar planejamento (+28 dias)?")) return; const add=(iso,d)=>{const x=new Date(iso); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10)}; const news=[]; state.doctors.forEach(d=>{ if(d.scheduled){ const c=mk(d.nome,d.espec||"",d.end||""); c.scheduled={isoDate:add(d.scheduled.isoDate,28),time:d.scheduled.time}; c.order=d.order??0; news.push(c);} }); if(!news.length){banner("Nada para copiar","error");return;} state.doctors.push(...news); save(); banner(`✅ ${news.length} agendamentos copiados!`); render(); });
  $("#resetBtn").addEventListener("click", ()=>{ if(confirm("Limpar dados e reiniciar?")){ localStorage.clear(); location.href=location.pathname; }});
  $("#repForm").addEventListener("submit",(e)=>{ e.preventDefault(); state.rep={nome:$("#repNome").value.trim(),empresa:$("#repEmpresa").value.trim(),matricula:$("#repMatricula").value.trim()}; save(); page(); });
  $("#logoutBtn").addEventListener("click", ()=>{ state.rep=null; save(); page(); });
  $("#todayBtn").addEventListener("click", ()=>{ state.weekOffset=0; save(); render(); });
  $("#prevWeekBtn").addEventListener("click", ()=>{ state.weekOffset--; save(); render(); });
  $("#nextWeekBtn").addEventListener("click", ()=>{ state.weekOffset++; save(); render(); });
  $("#dayViewBtn").addEventListener("click", ()=>{ state.view="day"; save(); render(); });
  $("#weekViewBtn").addEventListener("click", ()=>{ state.view="week"; save(); render(); });
  $("#searchCadastroTop").addEventListener("input",(e)=>{ state.backlogFilter=e.target.value.toLowerCase(); renderCadastro(); });
  $("#addDoctorBtn").addEventListener("click", ()=> $("#addDoctorDialog").showModal());
  $("#confirmAddDoctor").addEventListener("click", (e)=>{ const n=$("#newNome").value.trim(), s=$("#newEspec").value.trim(), a=$("#newEnd").value.trim(); if(!n){e.preventDefault(); return;} state.doctors.unshift(mk(n,s,a)); $("#newNome").value=$("#newEspec").value=$("#newEnd").value=""; $("#addDoctorDialog").close(); save(); renderCadastro(); });
  $("#importBtn").addEventListener("click", ()=> $("#importDialog").showModal());
  $("#confirmImport").addEventListener("click", async (e)=>{ const f=$("#importFile").files[0], p=$("#pasteList").value.trim(), rep=$("#replaceList").checked; let names=[]; if(f){ let t=await f.text(); if(t.includes("\\ufffd")||/�{2,}/.test(t)){ t=await new Promise(r=>{const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsText(f,"ISO-8859-1");}); } names=csvNames(t);} if(p){ names=names.concat(p.split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean)); } names=names.map(clean).filter(Boolean); if(!names.length){ e.preventDefault(); alert("Nenhum nome encontrado."); return; } const docs=names.map(n=>mk(n)); if(rep){ const sch=state.doctors.filter(d=>d.scheduled); state.doctors = sch.concat(docs);} else { const ex=new Set(state.doctors.map(d=>d.nome.toLowerCase())); docs.forEach(d=>{ if(!ex.has(d.nome.toLowerCase())) state.doctors.push(d); }); } save(); $("#importDialog").close(); renderCadastro(); render(); });
  page();
});

function page(){ if(state.rep){ $("#welcomePage").classList.add("hidden"); $("#agendaPage").classList.remove("hidden"); $("#repInfo").textContent=`${state.rep.nome} • ${state.rep.empresa} • Matrícula ${state.rep.matricula}`; render(); }else{ $("#welcomePage").classList.remove("hidden"); $("#agendaPage").classList.add("hidden"); $("#repInfo").textContent=""; } }
function clean(s){ return s.replace(/^\"+|\"+$/g,"").replace(/[;|,]+$/,"").replace(/\\s+/g," ").trim(); }
function detect(lines){ const c={",":0,";":0,"\\t":0}; lines.slice(0,5).forEach(l=>{c[","]+=(l.match(/,/g)||[]).length; c[";"]+=(l.match(/;/g)||[]).length; c["\\t"]+=(l.match(/\\t/g)||[]).length}); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0].replace("\\\\t","\\t"); }
function split(row,d){ const out=[]; let cur="",q=false; for(let i=0;i<row.length;i++){ const ch=row[i]; if(ch=='\"'){ if(q && row[i+1]=='\"'){ cur+='\"'; i++; } else q=!q; } else if(ch==d && !q){ out.push(cur); cur=""; } else cur+=ch; } out.push(cur); return out; }
function csvNames(t){ const rows=t.split(/\\r?\\n/).filter(l=>l.trim()); if(!rows.length) return []; const d=detect(rows); const parsed=rows.map(r=>split(r,d)); const j=parsed.map(c=>(c[9]||"").trim()).filter(Boolean); if(j.length>=Math.floor(parsed.length*0.5)) return j; const mc=Math.max(...parsed.map(c=>c.length)); let best=0,score=-1; for(let i=0;i<mc;i++){ let tot=0,cnt=0; for(const c of parsed){ const v=(c[i]||"").trim(); if(v){ tot+=v.replace(/[^A-Za-zÀ-Úà-ú\\s]/g,"").length; cnt++; } } const s=cnt?tot/cnt:0; if(s>score){score=s;best=i;} } return parsed.map(c=>(c[best]||"").trim()).filter(Boolean); }
function sow(offset=0){ const now=new Date(); const day=now.getDay(); const md=(day===0?-6:1-day); const b=new Date(now); b.setDate(now.getDate()+md+offset*7); b.setHours(0,0,0,0); return b; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmt(d){ const wd=["seg.","ter.","qua.","qui.","sex.","sáb.","dom."]; const i=(d.getDay()+6)%7; const dd=String(d.getDate()).padStart(2,"0"); const mm=String(d.getMonth()+1).toString().padStart(2,"0"); return `${wd[i]} ${dd}/${mm}`; }
const TIMES=(()=>{ const a=[]; for(let h=8;h<=18;h++){ for(const m of [0,30]){ if(h===18 && m>0) continue; a.push({h,m,label:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); } } return a; })();

function render(){
  $("#dayViewBtn").classList.toggle("active", state.view==="day"); $("#weekViewBtn").classList.toggle("active", state.view==="week");
  document.querySelector(".board").classList.toggle("week-only", state.view==="week"); document.querySelector(".cadastro").classList.toggle("hidden", state.view!=="day");
  const ws=sow(state.weekOffset); $("#calendarTitle").textContent=`Agenda (Seg→Dom) • Início ${ws.toLocaleDateString()}`;
  const grid=$("#calendarGrid"); grid.className=`calendar-grid ${state.view==="week"?"week-view":"day-view"}`; grid.innerHTML="";
  const days=[...Array(7)].map((_,i)=> addDays(ws,i)); const renderDays= state.view==="week" ? days : [ new Date() ];
  renderDays.forEach(date=>{ const col=document.createElement("div"); col.className="day-col"; const h=document.createElement("h3"); h.textContent=fmt(date); col.appendChild(h);
    const hg=document.createElement("div"); hg.className="hour-grid "+(state.view==="week"?"week-tight":"day-loose"); col.appendChild(hg);
    TIMES.forEach(t=>{ const slot=document.createElement("div"); slot.className="hour-slot"; slot.dataset.date=date.toISOString().slice(0,10); slot.dataset.time=t.label;
      const label=document.createElement("div"); label.className="slot-label"; label.textContent=t.label; slot.appendChild(label);
      docsFor(date,t.label).forEach(d=> slot.appendChild(card(d)));
      slot.addEventListener("dragover",(e)=>{ e.preventDefault(); const after=afterEl(slot,e.clientY); const id=e.dataTransfer.getData("text/plain"); const dragging=document.querySelector(`[data-drag="${id}"]`); if(!dragging) return; if(after==null) slot.appendChild(dragging); else slot.insertBefore(dragging, after); });
      slot.addEventListener("drop",(e)=>{ e.preventDefault(); const id=e.dataTransfer.getData("text/plain"); const d=state.doctors.find(x=>x.id===id); if(!d) return; d.scheduled={isoDate:slot.dataset.date,time:slot.dataset.time}; order(slot); save(); render(); });
      hg.appendChild(slot);
    }); grid.appendChild(col);
  });
  renderCadastro();
}
function afterEl(container,y){ const els=[...container.querySelectorAll(".doctor-card")]; return els.reduce((c,child)=>{ const box=child.getBoundingClientRect(); const off=y-box.top-box.height/2; if(off<0 && off>c.offset){ return {offset:off,element:child}; } return c; },{offset:Number.NEGATIVE_INFINITY}).element; }
function order(slot){ const ids=[...slot.querySelectorAll(".doctor-card")].map(el=>el.dataset.drag); const d=slot.dataset.date,t=slot.dataset.time; ids.forEach((id,i)=>{ const o=state.doctors.find(x=>x.id===id); if(o){ o.scheduled={isoDate:d,time:t}; o.order=i; } }); }
function docsFor(date,time){ const iso=date.toISOString().slice(0,10); return state.doctors.filter(d=>d.scheduled && d.scheduled.isoDate===iso && d.scheduled.time===time).sort((a,b)=>(a.order??0)-(b.order??0)); }
function short(n){ if(n.length<=16) return n; const p=n.split(" "); if(p.length>1) return (p[0]+" "+p[1][0]+".").slice(0,16); return n.slice(0,16); }
function card(d){ const el=document.createElement("div"); el.className="doctor-card"; if(state.view==="week") el.classList.add("compact"); el.dataset.drag=d.id;
  const h=document.createElement("div"); h.textContent="⋮⋮"; h.className="handle"; el.appendChild(h);
  const info=document.createElement("div"); const tt=document.createElement("div"); tt.textContent= state.view==="week"? short(d.nome): d.nome; const meta=document.createElement("div"); meta.className="meta"; meta.textContent=(d.espec||""); info.appendChild(tt); info.appendChild(meta); el.appendChild(info);
  el.addEventListener("click", ()=>panel(d.id)); el.draggable=true; el.addEventListener("dragstart",(e)=> e.dataTransfer.setData("text/plain", d.id)); return el; }
function renderCadastro(){ if(state.view!=="day") return; const list=$("#cadastroList"); list.innerHTML=""; const items=state.doctors.filter(d=>!d.scheduled); const f=state.backlogFilter? items.filter(d=>(d.nome+" "+(d.espec||"")+" "+(d.end||"")).toLowerCase().includes(state.backlogFilter)): items; $("#cadastroCount").textContent=f.length; f.forEach(d=> list.appendChild(card(d))); }
let pid=null; function panel(id){ pid=id; const d=state.doctors.find(x=>x.id===id); if(!d) return; $("#detailName").textContent=d.nome; $("#editNome").value=d.nome; $("#editEspec").value=d.espec||""; $("#editEnd").value=d.end||""; $("#editScheduled").textContent= d.scheduled? `${d.scheduled.isoDate} • ${d.scheduled.time}` : "— (Cadastro)"; $("#detailPanel").classList.remove("hidden"); $("#detailPanel").setAttribute("aria-hidden","false"); }
function closePanel(){ $("#detailPanel").classList.add("hidden"); $("#detailPanel").setAttribute("aria-hidden","true"); pid=null; }
document.addEventListener("DOMContentLoaded", ()=>{ $("#closePanelBtn").addEventListener("click", closePanel); $("#saveEditBtn").addEventListener("click", ()=>{ const d=state.doctors.find(x=>x.id===pid); if(!d) return; d.nome=$("#editNome").value.trim(); d.espec=$("#editEspec").value.trim(); d.end=$("#editEnd").value.trim(); save(); render(); panel(d.id); }); $("#cancelScheduleBtn").addEventListener("click", ()=>{ const d=state.doctors.find(x=>x.id===pid); if(!d) return; d.scheduled=null; d.order=undefined; save(); render(); panel(d.id); }); $("#movePrevWeekBtn").addEventListener("click", ()=>moveW(-1)); $("#moveNextWeekBtn").addEventListener("click", ()=>moveW(1)); $("#deleteDoctorBtn").addEventListener("click", ()=>{ const i=state.doctors.findIndex(x=>x.id===pid); if(i>=0) state.doctors.splice(i,1); save(); render(); closePanel(); }); });
function moveW(n){ const d=state.doctors.find(x=>x.id===pid); if(!d) return; if(!d.scheduled){ state.weekOffset+=n; save(); render(); panel(d.id); return; } const dt=new Date(d.scheduled.isoDate); dt.setDate(dt.getDate()+n*7); d.scheduled.isoDate=dt.toISOString().slice(0,10); state.weekOffset+=n; save(); render(); panel(d.id); }
