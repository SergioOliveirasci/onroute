// ON ROUTE – versão compacta estável (correção submit)
const $ = s => document.querySelector(s);

// Reset rápido
if (location.search.includes("reset=1")) try { localStorage.clear(); } catch(e){}

// Estado
const KEY="onroute.state.v91";
const DEF={rep:null,weekOffset:0,view:"week",doctors:[],backlogFilter:""};
let S = (()=>{ try{const t=localStorage.getItem(KEY); if(t) return JSON.parse(t);}catch(e){} return structuredClone(DEF); })();
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };
const uid=()=>Math.random().toString(36).slice(2,9);
const mk=(n,e="",a="")=>({id:uid(),nome:n,espec:e,end:a,scheduled:null,order:0});

// Banner
function banner(msg){ const b=$("#banner"); b.textContent=msg; b.classList.remove("hidden"); setTimeout(()=>b.classList.add("hidden"),2500); }

// Sincronização via link (?sync=)
(function syncImport(){
  try{
    const p=new URLSearchParams(location.search);
    if(p.has("sync")){
      const json=atob(decodeURIComponent(p.get("sync")));
      const incoming=JSON.parse(json);
      localStorage.setItem(KEY, JSON.stringify(incoming));
      S=incoming; const u=new URL(location.href); u.searchParams.delete("sync"); history.replaceState(null,"",u.toString());
      banner("Agenda sincronizada ✅");
    }
  }catch(e){ banner("Falha ao importar sincronização"); }
})();

// Utilidades de data
const startOfWeek=(off=0)=>{ const n=new Date(); const d=n.getDay(); const md=(d===0?-6:1-d); const m=new Date(n); m.setDate(n.getDate()+md+off*7); m.setHours(0,0,0,0); return m; };
const addDays=(dt,dd)=>{ const x=new Date(dt); x.setDate(x.getDate()+dd); return x; };
const fmt=(d)=>{ const wd=["seg.","ter.","qua.","qui.","sex.","sáb.","dom."]; const i=(d.getDay()+6)%7; const dd=String(d.getDate()).padStart(2,"0"); const mm=String(d.getMonth()+1).padStart(2,"0"); return `${wd[i]} ${dd}/${mm}`; };
const TIMES=(()=>{ const a=[]; for(let h=8;h<=18;h++){ for(const m of [0,30]){ if(h===18&&m>0) continue; a.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);} } return a; })();

// Render
function render(){
  $("#dayViewBtn").classList.toggle("active", S.view==="day");
  $("#weekViewBtn").classList.toggle("active", S.view==="week");
  document.querySelector(".board").classList.toggle("week-only", S.view==="week");
  document.querySelector(".cadastro").classList.toggle("hidden", S.view!=="day");

  const ws=startOfWeek(S.weekOffset);
  $("#calendarTitle").textContent=`Agenda (Seg→Dom) • Início ${ws.toLocaleDateString()}`;

  const grid=$("#calendarGrid");
  grid.className=`calendar-grid ${S.view==="week"?"week-view":"day-view"}`;
  grid.innerHTML="";

  const days=[...Array(7)].map((_,i)=> addDays(ws,i));
  const dlist = S.view==="week" ? days : [ new Date() ];

  dlist.forEach(date=>{
    const col=document.createElement("div"); col.className="day-col";
    const h=document.createElement("h3"); h.textContent=fmt(date); col.appendChild(h);
    const hg=document.createElement("div"); hg.className="hour-grid "+(S.view==="week"?"week-tight":""); col.appendChild(hg);

    TIMES.forEach(t=>{
      const slot=document.createElement("div"); slot.className="hour-slot"; slot.dataset.date=date.toISOString().slice(0,10); slot.dataset.time=t;
      const label=document.createElement("div"); label.className="slot-label"; label.textContent=t; slot.appendChild(label);
      docsFor(date,t).forEach(d=> slot.appendChild(card(d)));
      slot.addEventListener("dragover",(e)=>{ e.preventDefault(); const after=getAfter(slot,e.clientY); const id=e.dataTransfer.getData("text/plain"); const dragging=document.querySelector(`[data-id="${id}"]`); if(!dragging) return; if(after==null) slot.appendChild(dragging); else slot.insertBefore(dragging,after); });
      slot.addEventListener("drop",(e)=>{ e.preventDefault(); const id=e.dataTransfer.getData("text/plain"); const d=S.doctors.find(x=>x.id===id); if(!d) return; d.scheduled={isoDate:slot.dataset.date,time:slot.dataset.time}; persistOrder(slot); save(); render(); });
      hg.appendChild(slot);
    });
    grid.appendChild(col);
  });

  renderCadastro();
}

function docsFor(date,time){ const iso=date.toISOString().slice(0,10); return S.doctors.filter(d=>d.scheduled && d.scheduled.isoDate===iso && d.scheduled.time===time).sort((a,b)=>(a.order??0)-(b.order??0)); }
function short(n){ if(n.length<=16) return n; const p=n.split(" "); if(p.length>1) return (p[0]+" "+p[1][0]+".").slice(0,16); return n.slice(0,16); }
function card(d){ const el=document.createElement("div"); el.className="doctor-card"+(S.view==="week"?" compact":""); el.dataset.id=d.id;
  const handle=document.createElement("div"); handle.className="handle"; handle.textContent="⋮⋮"; el.appendChild(handle);
  const info=document.createElement("div"); const t=document.createElement("div"); t.textContent=S.view==="week"? short(d.nome): d.nome; const m=document.createElement("div"); m.className="muted"; m.textContent=d.espec||""; info.appendChild(t); info.appendChild(m); el.appendChild(info);
  el.draggable=true; el.addEventListener("dragstart",(e)=> e.dataTransfer.setData("text/plain", d.id));
  el.addEventListener("click", ()=> openPanel(d.id));
  return el;
}
function getAfter(container,y){
  const els=[...container.querySelectorAll(".doctor-card")];
  return els.reduce((c,child)=>{ const box=child.getBoundingClientRect(); const off=y-box.top-box.height/2; return (off<0 && off>c.offset)? {offset:off,el:child}:c; }, {offset:-Infinity,el:null}).el;
}
function persistOrder(slot){
  const ids=[...slot.querySelectorAll(".doctor-card")].map(e=>e.dataset.id);
  const date=slot.dataset.date, time=slot.dataset.time;
  ids.forEach((id,i)=>{ const d=S.doctors.find(x=>x.id===id); if(d){ d.scheduled={isoDate:date,time}; d.order=i; } });
}

function renderCadastro(){
  if(S.view!=="day") return;
  const list=$("#cadastroList"); list.innerHTML="";
  const items=S.doctors.filter(d=>!d.scheduled);
  const filtered = S.backlogFilter? items.filter(d=>(d.nome+" "+(d.espec||"")+" "+(d.end||"")).toLowerCase().includes(S.backlogFilter)) : items;
  $("#cadastroCount").textContent=filtered.length;
  filtered.forEach(d=> list.appendChild(card(d)));
}

// Painel lateral
let PID=null;
function openPanel(id){
  PID=id; const d=S.doctors.find(x=>x.id===id); if(!d) return;
  $("#detailName").textContent=d.nome;
  $("#editNome").value=d.nome; $("#editEspec").value=d.espec||""; $("#editEnd").value=d.end||"";
  $("#editScheduled").textContent = d.scheduled? `${d.scheduled.isoDate} • ${d.scheduled.time}` : "— (Cadastro)";
  $("#detailPanel").classList.remove("hidden"); $("#detailPanel").setAttribute("aria-hidden","false");
}
function closePanel(){ $("#detailPanel").classList.add("hidden"); $("#detailPanel").setAttribute("aria-hidden","true"); PID=null; }

// Import helpers
function detect(lines){ const c={",":0,";":0,"\t":0}; lines.slice(0,5).forEach(l=>{c[","]+=(l.match(/,/g)||[]).length; c[";"]+=(l.match(/;/g)||[]).length; c["\t"]+=(l.match(/\t/g)||[]).length;}); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]; }
function splitRow(row,d){ const out=[]; let cur="",q=false; for(let i=0;i<row.length;i++){ const ch=row[i]; if(ch=='"'){ if(q && row[i+1]=='"'){cur+='"'; i++;} else q=!q; } else if(ch==d && !q){ out.push(cur); cur=""; } else cur+=ch; } out.push(cur); return out; }
function csvNames(text){ const rows=text.split(/\r?\n/).filter(l=>l.trim()); if(!rows.length) return []; const d=detect(rows); const parsed=rows.map(r=>splitRow(r,d)); const j=parsed.map(c=>(c[9]||"").trim()).filter(Boolean); if(j.length>=Math.floor(parsed.length*0.5)) return j; const cols=Math.max(...parsed.map(c=>c.length)); let best=0,score=-1; for(let i=0;i<cols;i++){ let tot=0,cnt=0; for(const c of parsed){ const v=(c[i]||"").trim(); if(v){ tot+=v.replace(/[^A-Za-zÀ-ú\s]/g,"").length; cnt++; } } const sc=cnt?tot/cnt:0; if(sc>score){score=sc; best=i;} } return parsed.map(c=>(c[best]||"").trim()).filter(Boolean); }
const clean=s=>s.replace(/^"+|"+$/g,"").replace(/[;|,]+$/,"").replace(/\s+/g," ").trim();

// Página
function page(){
  if(S.rep){
    $("#welcomePage").classList.add("hidden");
    $("#agendaPage").classList.remove("hidden");
    $("#repInfo").textContent=`${S.rep.nome} • ${S.rep.empresa} • Matrícula ${S.rep.matricula}`;
    render();
  }else{
    $("#welcomePage").classList.remove("hidden");
    $("#agendaPage").classList.add("hidden");
    $("#repInfo").textContent="";
  }
}

// Eventos
document.addEventListener("DOMContentLoaded", ()=>{
  // Submit do formulário (correção principal)
  $("#repForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    S.rep={nome:$("#repNome").value.trim(), empresa:$("#repEmpresa").value.trim(), matricula:$("#repMatricula").value.trim()};
    save(); page();
  });

  $("#logoutBtn").addEventListener("click", ()=>{ S.rep=null; save(); page(); });
  $("#resetBtn").addEventListener("click", ()=>{ if(confirm("Limpar dados e reiniciar?")){ localStorage.clear(); location.href=location.pathname; }});

  $("#todayBtn").addEventListener("click", ()=>{ S.weekOffset=0; save(); render(); });
  $("#prevWeekBtn").addEventListener("click", ()=>{ S.weekOffset--; save(); render(); });
  $("#nextWeekBtn").addEventListener("click", ()=>{ S.weekOffset++; save(); render(); });
  $("#dayViewBtn").addEventListener("click", ()=>{ S.view="day"; save(); render(); });
  $("#weekViewBtn").addEventListener("click", ()=>{ S.view="week"; save(); render(); });

  $("#addDoctorBtn").addEventListener("click", ()=> $("#addDoctorDialog").showModal());
  $("#confirmAddDoctor").addEventListener("click", (e)=>{
    const n=$("#newNome").value.trim(); if(!n){ e.preventDefault(); return; }
    const esp=$("#newEspec").value.trim(), end=$("#newEnd").value.trim();
    S.doctors.unshift(mk(n,esp,end)); save();
    $("#newNome").value=$("#newEspec").value=$("#newEnd").value="";
    $("#addDoctorDialog").close(); renderCadastro();
  });

  $("#importBtn").addEventListener("click", ()=> $("#importDialog").showModal());
  $("#confirmImport").addEventListener("click", async (e)=>{
    let names=[]; const file=$("#importFile").files[0]; const pasted=$("#pasteList").value.trim();
    if(file){ let text=await file.text(); if(text.includes("\ufffd")||/�{2,}/.test(text)){ text=await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsText(file,"ISO-8859-1"); }); } names=csvNames(text); }
    if(pasted){ names=names.concat(pasted.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)); }
    names=names.map(clean).filter(Boolean);
    if(!names.length){ e.preventDefault(); alert("Nenhum nome encontrado."); return; }
    const replace=$("#replaceList").checked;
    const news = names.map(n=> mk(n));
    if(replace){ const sched=S.doctors.filter(d=>d.scheduled); S.doctors=sched.concat(news); }
    else{ const ex=new Set(S.doctors.map(d=>d.nome.toLowerCase())); news.forEach(d=>{ if(!ex.has(d.nome.toLowerCase())) S.doctors.push(d); }); }
    save(); $("#importDialog").close(); renderCadastro();
  });

  $("#searchCadastroTop").addEventListener("input",(e)=>{ S.backlogFilter=e.target.value.toLowerCase(); renderCadastro(); });

  // Painel
  $("#closePanelBtn").addEventListener("click", closePanel);
  $("#saveEditBtn").addEventListener("click", ()=>{ const d=S.doctors.find(x=>x.id===PID); if(!d) return; d.nome=$("#editNome").value.trim(); d.espec=$("#editEspec").value.trim(); d.end=$("#editEnd").value.trim(); save(); render(); openPanel(d.id); });
  $("#cancelScheduleBtn").addEventListener("click", ()=>{ const d=S.doctors.find(x=>x.id===PID); if(!d) return; d.scheduled=null; d.order=0; save(); render(); openPanel(d.id); });
  $("#movePrevWeekBtn").addEventListener("click", ()=> moveWeek(-1));
  $("#moveNextWeekBtn").addEventListener("click", ()=> moveWeek(1));
  $("#deleteDoctorBtn").addEventListener("click", ()=>{ const i=S.doctors.findIndex(x=>x.id===PID); if(i>=0) S.doctors.splice(i,1); save(); render(); closePanel(); });

  // Copiar mês (+28 dias)
  $("#copyMonthBtn").addEventListener("click", ()=>{
    if(!confirm("Copiar agendamentos para +28 dias?")) return;
    const add=(iso,days)=>{ const d=new Date(iso); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
    const copies=[];
    S.doctors.forEach(d=>{ if(d.scheduled){ const c=mk(d.nome,d.espec||"",d.end||""); c.scheduled={isoDate:add(d.scheduled.isoDate,28), time:d.scheduled.time}; c.order=d.order||0; copies.push(c);} });
    if(!copies.length){ banner("Nada para copiar."); return; }
    S.doctors.push(...copies); save(); render(); banner(`Copiado: ${copies.length}`);
  });

  // Sincronizar (copiar link)
  $("#syncBtn").addEventListener("click", async ()=>{
    try{
      const url=`${location.origin}${location.pathname}?sync=${encodeURIComponent(btoa(localStorage.getItem(KEY)||JSON.stringify(S)))}`;
      await navigator.clipboard.writeText(url); banner("🔗 Link de sincronização copiado!");
    }catch(e){ alert("Copie o link manualmente:\n"+`${location.origin}${location.pathname}?sync=${encodeURIComponent(btoa(JSON.stringify(S)))}`); }
  });

  page();
});

function moveWeek(n){
  const d=S.doctors.find(x=>x.id===PID); if(!d) return;
  if(!d.scheduled){ S.weekOffset+=n; save(); render(); openPanel(d.id); return; }
  const dt=new Date(d.scheduled.isoDate); dt.setDate(dt.getDate()+n*7); d.scheduled.isoDate=dt.toISOString().slice(0,10);
  S.weekOffset+=n; save(); render(); openPanel(d.id);
}
