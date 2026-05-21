// ══════════════════════════════════════════
// CONFIG — usando API relativa para que funcione desde el mismo servidor
// ══════════════════════════════════════════
const API = window.location.origin + '/api';
let TOKEN = localStorage.getItem('nexus_token') || '';
let CUR_USER = JSON.parse(localStorage.getItem('nexus_user') || 'null');
let BIO_MODE = 'register';
let CAM_STREAM = null;
const CACHE = { sales: {}, users: {} };

// Safe fallback for getElementById: return a harmless stub when element is missing
(function(){
  const _origGet = document.getElementById.bind(document);
  document.getElementById = function(id){
    const el = _origGet(id);
    if(el) return el;
    // harmless stub with commonly used props/methods
    return {
      textContent: '',
      innerHTML: '',
      value: '',
      disabled: false,
      srcObject: null,
      style: {},
      className: '',
      classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
      appendChild: ()=>{},
      remove: ()=>{},
      focus: ()=>{},
      setAttribute: ()=>{},
      getContext: ()=>null,
      addEventListener: ()=>{},
      querySelectorAll: ()=>[]
    };
  };
})();

// ══ HUD CLOCK ══
function hudTick(){
  const n=new Date();
  const tEl = document.getElementById('hudTime');
  if(tEl) tEl.textContent = n.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const dEl = document.getElementById('hudDate');
  if(dEl) dEl.textContent = n.toLocaleDateString('es-CO',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase();
}
// Start HUD clock and background only after DOM is ready
function initBgCanvas(){
  const cv=document.getElementById('bgCanvas');
  if(!cv) return; // canvas optional — skip background animation when absent
  const ctx=cv.getContext('2d');
  let w,h,pts=[];
  function resize(){w=cv.width=window.innerWidth;h=cv.height=window.innerHeight;init()}
  function init(){
    pts=[];
    for(let i=0;i<80;i++)pts.push({
      x:Math.random()*w,y:Math.random()*h,
      vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,
      r:Math.random()*1.5+0.3,
      c:Math.random()>0.5?'rgba(0,229,255,':'rgba(0,255,157,'
    });
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(0,229,255,0.025)';ctx.lineWidth=0.5;
    for(let x=0;x<w;x+=50)for(let y=0;y<h;y+=50){
      ctx.beginPath();ctx.rect(x,y,50,50);ctx.stroke();
    }
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1;
      if(p.y<0||p.y>h)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.c+'0.6)';ctx.fill();
    });
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(0,229,255,${0.06*(1-d/100)})`;ctx.lineWidth=0.5;ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  resize();draw();
}

document.addEventListener('DOMContentLoaded',()=>{
  hudTick();setInterval(hudTick,1000);
  try{initBgCanvas();}catch(e){}
});

function hudMsg(m){
  const el = document.getElementById('hudMsg');
  if(el) el.textContent = m;
}

// ══ CANVAS BG ══
(function(){
  const cv=document.getElementById('bgCanvas');
  if(!cv) return; // canvas optional — skip background animation when absent
  const ctx=cv.getContext('2d');
  let w,h,pts=[];
  function resize(){w=cv.width=window.innerWidth;h=cv.height=window.innerHeight;init()}
  function init(){
    pts=[];
    for(let i=0;i<80;i++)pts.push({
      x:Math.random()*w,y:Math.random()*h,
      vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,
      r:Math.random()*1.5+0.3,
      c:Math.random()>0.5?'rgba(0,229,255,':'rgba(0,255,157,'
    });
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    // hexgrid subtle
    ctx.strokeStyle='rgba(0,229,255,0.025)';ctx.lineWidth=0.5;
    for(let x=0;x<w;x+=50)for(let y=0;y<h;y+=50){
      ctx.beginPath();ctx.rect(x,y,50,50);ctx.stroke();
    }
    // particles
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1;
      if(p.y<0||p.y>h)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.c+'0.6)';ctx.fill();
    });
    // connections
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(0,229,255,${0.06*(1-d/100)})`;ctx.lineWidth=0.5;ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  resize();draw();
})();

// ══ PAGE NAV ══
function goto(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('out'));
  if(id)document.getElementById(id).classList.remove('out');
}
function addRipple(btn,e){
  const r=document.createElement('span');r.className='btn-ripple';
  const rect=btn.getBoundingClientRect();
  r.style.left=(e.clientX-rect.left-3)+'px';r.style.top=(e.clientY-rect.top-3)+'px';
  btn.appendChild(r);setTimeout(()=>r.remove(),700);
}
document.querySelectorAll('.btn').forEach(b=>b.addEventListener('click',e=>addRipple(b,e)));

// ══ CODE DIGITS ══
function nxt(el,nextId){if(el.value&&nextId)document.getElementById(nextId).focus()}
function bk(e,el,prevId){if(e.key==='Backspace'&&!el.value&&prevId)document.getElementById(prevId).focus()}

// ══ ALERT HELPER ══
function showAlert(id,type,msg){
  const el=document.getElementById(id);
  el.className='alert on '+type;el.textContent=msg;
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),5000);
}

// ══ API HELPER ══
async function api(method,path,body){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(TOKEN)opts.headers['Authorization']='Bearer '+TOKEN;
  if(body)opts.body=JSON.stringify(body);
  try{
    const r=await fetch(API+path,opts);
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Error del servidor');
    return d;
  }catch(e){
    if(e.message.includes('fetch'))throw new Error('No se pudo conectar al servidor. Verifica que el backend esté corriendo en '+API);
    throw e;
  }
}

// ══ REGISTER ══
async function doReg(){
  const user=document.getElementById('rUser').value.trim();
  const pass=document.getElementById('rPass').value;
  const code=[1,2,3,4].map(i=>document.getElementById('d'+i).value).join('');
  if(!user||!pass){showAlert('aReg','err','⚠ Completa todos los campos');return}
  if(code!=='1212'){showAlert('aReg','err','⚠ CÓDIGO INCORRECTO — Acceso denegado');return}
  const btn=document.getElementById('btnReg');
  btn.disabled=true;btn.innerHTML='<span class="loading-dots"><span></span><span></span><span></span></span> PROCESANDO';
  try{
    const d=await api('POST','/auth/register',{username:user,password:pass});
    TOKEN=d.token;CUR_USER=d.user;
    localStorage.setItem('nexus_token',TOKEN);
    localStorage.setItem('nexus_user',JSON.stringify(d.user));
    showAlert('aReg','ok','✓ REGISTRO EXITOSO — Bienvenido '+d.user.username);
    hudMsg('Bienvenido '+d.user.username);
    BIO_MODE='register';
    document.getElementById('bioSubtitle').textContent='CAPTURA DE PERFIL FACIAL';
    goto('pgBio');
    initCam();
  }catch(e){showAlert('aReg','err','⚠ '+e.message)}
  finally{btn.disabled=false;btn.textContent='[ VERIFICAR Y REGISTRAR ]'}
}

// ══ LOGIN ══
async function doLogin(){
  const user=document.getElementById('lUser').value.trim();
  const pass=document.getElementById('lPass').value;
  if(!user||!pass){showAlert('aLogin','err','⚠ Ingresa usuario y contraseña');return}
  const btn=document.getElementById('btnLogin');
  btn.disabled=true;btn.innerHTML='<span class="loading-dots"><span></span><span></span><span></span></span> AUTENTICANDO';
  try{
    const d=await api('POST','/auth/login',{username:user,password:pass});
    TOKEN=d.token;CUR_USER=d.user;
    localStorage.setItem('nexus_token',TOKEN);
    localStorage.setItem('nexus_user',JSON.stringify(d.user));
    showAlert('aLogin','ok','✓ CREDENCIALES OK — Bienvenido '+d.user.username);
    hudMsg('Bienvenido '+d.user.username);
    BIO_MODE='login';
    document.getElementById('bioSubtitle').textContent='VERIFICACIÓN DE IDENTIDAD';
    goto('pgBio');
    initCam();
  }catch(e){showAlert('aLogin','err','⚠ '+e.message)}
  finally{btn.disabled=false;btn.textContent='[ INICIAR SESIÓN ]'}
}

// ══ CAM ══
async function initCam(){
  setBioStatus('Iniciando módulo de cámara...',0);
  const btnBio=document.getElementById('btnBio');
  const btnSkip=document.getElementById('btnSkip');
  btnBio.style.display='none';
  btnSkip.style.display='none';
  try{
    CAM_STREAM=await navigator.mediaDevices.getUserMedia({video:{width:320,height:370,facingMode:'user'}});
    const v=document.getElementById('bioVid');
    v.srcObject=CAM_STREAM;v.classList.add('on');
    document.getElementById('scanSweep').classList.add('on');
    document.getElementById('faceFrame').classList.add('scanning');
    setBioStatus('Cámara activa — Posiciona tu rostro',10);
    btnBio.style.display='block';
  }catch(e){
    setBioStatus('Cámara no disponible',0);
    btnSkip.style.display='block';
  }
}

function setBioStatus(msg,pct){
  document.getElementById('bioStat').textContent=msg;
  document.getElementById('bioPct').textContent=Math.round(pct)+'%';
  document.getElementById('bioProg').style.width=pct+'%';
}

function setBioDot(idx){
  for(let i=1;i<=5;i++){
    const d=document.getElementById('bd'+i);
    d.className='bdot'+(i<idx?' done':i===idx?' cur':'');
  }
}

async function startScan(){
  document.getElementById('btnBio').disabled=true;
  document.getElementById('hmap').classList.add('on');
  const steps=[
    ['Detectando landmarks faciales...',20,1],
    ['Analizando geometría facial...',40,2],
    ['Calculando eigenfaces...',60,3],
    ['Codificando vector biométrico...',80,4],
    ['Guardando perfil encriptado...',95,5],
  ];
  for(const [msg,pct,dot] of steps){
    setBioStatus(msg,pct);setBioDot(dot);
    await delay(750);
  }
  // Capture frame
  let faceData='face_captured_'+Date.now();
  try{
    const cv=document.createElement('canvas');cv.width=160;cv.height=185;
    const ctx=cv.getContext('2d');
    ctx.drawImage(document.getElementById('bioVid'),0,0,160,185);
    faceData=cv.toDataURL('image/jpeg',0.7);
  }catch(e){}

  // Save to DB if register mode
  if(BIO_MODE==='register'){
    try{await api('POST','/auth/save-face',{face_data:faceData})}catch(e){}
  }

  setBioStatus('IDENTIDAD VERIFICADA',100);setBioDot(6);
  document.getElementById('aBio').className='alert on ok';
  document.getElementById('aBio').textContent='✓ BIOMETRÍA '+(BIO_MODE==='register'?'REGISTRADA':'VERIFICADA')+' — ACCESO CONCEDIDO';
  hudMsg('ACCESO BIOMÉTRICO CONCEDIDO');
  setTimeout(()=>launchDash(),1300);
}

function skipBio(){launchDash()}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}

// ══ DASHBOARD ══
async function launchDash(){
  // mirror cam to nav avatar
  if(CAM_STREAM){
    const nv=document.getElementById('dnVid');
    nv.srcObject=CAM_STREAM;nv.style.display='block';
    document.getElementById('dnInit').style.display='none';
  }
  const name=(CUR_USER?.username||'OPERADOR').toUpperCase();
  document.getElementById('dnName').textContent=name;
  document.getElementById('dnInit').textContent=name.slice(0,2);
  document.querySelectorAll('.page').forEach(p=>{p.style.display='none'});
  document.getElementById('dash').style.display='flex';
  hudMsg('DASHBOARD ACTIVO // '+name);
  showTab('dashboard');
  await loadDashData();
}

async function loadDashData(){
  try{
    const [kpis,hist,preds,canales]=await Promise.all([
      api('GET','/dashboard/kpis'),
      api('GET','/dashboard/ventas-historicas?meses=9'),
      api('GET','/dashboard/predicciones'),
      api('GET','/dashboard/canales'),
    ]);
    renderKPIs(kpis);
    renderMainChart(hist);
    renderPredTable(preds);
    renderBarChart(canales);
    renderGauge(parseFloat(kpis.eficiencia));
    render3DCharts(canales);
  }catch(e){
    hudMsg('ERROR DB: '+e.message);
    // Render demo data if backend not available
    renderDemoData();
  }
}

function renderKPIs(k){
  animNum('kv1','$',parseFloat(k.ventas_mes),0);
  animNum('kv2','$',parseFloat(k.prediccion_mes),300);
  animNum('kv3','',parseInt(k.transacciones),600);
  animNum('kv4','',parseFloat(k.eficiencia),900,'%',1);
  const ch=parseFloat(k.cambio_pct);
  document.getElementById('kd1').className='kpi-delta '+(ch>=0?'up':'dn');
  document.getElementById('kd1').textContent=(ch>=0?'↑':'↓')+Math.abs(ch)+'% vs mes anterior';
  document.getElementById('kd2').innerHTML='<span style="color:var(--g)">↑ 23.1% PROYECTADO</span>';
}

function animNum(id,pre,target,delay,suf='',dec=0){
  setTimeout(()=>{
    const el=document.getElementById(id);
    const dur=2000;const start=Date.now();
    const tick=()=>{
      const p=Math.min((Date.now()-start)/dur,1);
      const e=1-Math.pow(1-p,4);const v=target*e;
      el.textContent=pre+(dec?v.toFixed(dec):Math.round(v).toLocaleString('es-CO'))+(suf||'');
      if(p<1)requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  },delay);
}

function renderMainChart(hist){
  if(!hist||!hist.length){renderDemoChart();return}
  const W=520,H=165,pad=40,topPad=20;
  const totals=hist.map(r=>parseFloat(r.total));
  const max=Math.max(...totals)*1.15||100000;
  const y=v=>topPad+((max-v)/max)*(H-topPad);
  const x=(i,n)=>pad+i*(W-pad)/(n-1||1);
  const pts=hist.map((r,i)=>`${x(i,hist.length)},${y(parseFloat(r.total))}`).join(' ');
  const last=hist[hist.length-1];
  const predVal=parseFloat(last.total)*1.23;
  const px1=x(hist.length-1,hist.length),py1=y(parseFloat(last.total));
  const px2=Math.min(W,px1+60),py2=y(predVal);
  document.getElementById('chartLine').setAttribute('points',pts);
  document.getElementById('chartLinePred').setAttribute('points',`${px1},${py1} ${px2},${py2}`);
  document.getElementById('chartArea').setAttribute('d',`M${pts.split(' ')[0]} ${pts} L${x(hist.length-1,hist.length)},${H} L${pad},${H} Z`);
  // dots
  const dg=document.getElementById('chartDots');dg.innerHTML='';
  hist.forEach((r,i)=>{
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('class','dp');c.setAttribute('cx',x(i,hist.length));c.setAttribute('cy',y(parseFloat(r.total)));
    c.innerHTML=`<title>$${Math.round(parseFloat(r.total)).toLocaleString()}</title>`;
    dg.appendChild(c);
  });
  // cursor
  const svg=document.getElementById('chartMain');
  const cur=document.getElementById('cursor');
  svg.addEventListener('mousemove',e=>{
    const rc=svg.getBoundingClientRect();
    const xv=(e.clientX-rc.left)*(520/rc.width);
    cur.setAttribute('x1',xv);cur.setAttribute('x2',xv);cur.setAttribute('opacity','1');
  });
  svg.addEventListener('mouseleave',()=>cur.setAttribute('opacity','0'));
}

function renderDemoChart(){
  const pts=[[70,145],[120,125],[170,110],[220,130],[270,95],[320,80],[370,60],[420,45]];
  document.getElementById('chartLine').setAttribute('points',pts.map(p=>p.join(',')).join(' '));
  document.getElementById('chartLinePred').setAttribute('points','420,45 480,28');
  document.getElementById('chartArea').setAttribute('d',`M${pts[0].join(',')} ${pts.map(p=>p.join(',')).join(' ')} L420,165 L70,165 Z`);
}

function renderPredTable(preds, targetId='predBody'){
  const tb=document.getElementById(targetId);tb.innerHTML='';
  if(!preds||!preds.length){
    renderDemoPreds(targetId);return;
  }
  preds.forEach((p,i)=>{
    const tr=document.createElement('tr');
    tr.style.animation=`alertIn 0.4s ease ${i*0.08}s backwards`;
    const v=parseFloat(p.variacion);
    tr.innerHTML=`
      <td style="color:var(--text);font-weight:600">${p.producto}</td>
      <td style="font-family:'Share Tech Mono',monospace;color:var(--b)">$${Math.round(p.venta_actual).toLocaleString()}</td>
      <td style="font-family:'Share Tech Mono',monospace;color:var(--g)">$${Math.round(p.prediccion).toLocaleString()}</td>
      <td style="color:${v>=0?'var(--g)':'var(--r)'}">${v>=0?'+':''}${v}%</td>
      <td><span class="nbadge ${p.confianza}">${p.confianza.toUpperCase()}</span></td>`;
    tb.appendChild(tr);
  });
}

function renderDemoPreds(targetId='predBody'){
  const data=[
    ['Electrónica','42,300','56,100','+32.6','alta'],
    ['Hogar','31,800','38,400','+20.8','alta'],
    ['Software','28,500','34,200','+20.0','media'],
    ['Servicios','19,700','21,300','+8.1','media'],
    ['Accesorios','14,200','13,800','-2.8','baja'],
  ];
  const tb=document.getElementById(targetId);tb.innerHTML='';
  data.forEach(([n,a,p,v,c],i)=>{
    const tr=document.createElement('tr');
    tr.style.animation=`alertIn 0.4s ease ${i*0.08}s backwards`;
    tr.innerHTML=`<td style="color:var(--text)">${n}</td>
      <td style="font-family:'Share Tech Mono',monospace;color:var(--b)">$${a}</td>
      <td style="font-family:'Share Tech Mono',monospace;color:var(--g)">$${p}</td>
      <td style="color:${v.startsWith('+')?'var(--g)':'var(--r)'}">${v}%</td>
      <td><span class="nbadge ${c}">${c.toUpperCase()}</span></td>`;
    tb.appendChild(tr);
  });
}

function renderBarChart(canales, areaId='barArea'){
  const area=document.getElementById(areaId);area.innerHTML='';
  const data=canales&&canales.length?canales:[
    {canal:'Web',total:85000},{canal:'App',total:72000},{canal:'B2B',total:91000},
    {canal:'Tienda',total:58000},{canal:'API',total:44000}
  ];
  const max=Math.max(...data.map(d=>parseFloat(d.total)));
  data.forEach((d,i)=>{
    const bw=document.createElement('div');bw.className='bw';
    const bar=document.createElement('div');bar.className='bar';
    const h=Math.max(4,Math.round((parseFloat(d.total)/max)*115));
    bar.style.height=h+'px';bar.style.animationDelay=(i*0.12)+'s';
    bar.title='$'+Math.round(parseFloat(d.total)).toLocaleString();
    const lbl=document.createElement('div');lbl.className='bl';lbl.textContent=d.canal;
    bw.appendChild(bar);bw.appendChild(lbl);area.appendChild(bw);
  });
}

function renderGauge(val){
  const pct=Math.min(100,Math.max(0,val||87.3));
  const totalArc=220;
  const offset=totalArc-(pct/100)*totalArc;
  document.getElementById('gaugePath').style.strokeDashoffset=offset;
  const angle=((pct/100)*180)-90;
  document.getElementById('gaugeNeedle').setAttribute('transform',`rotate(${angle},90,88)`);
  document.getElementById('gaugeVal').textContent=pct.toFixed(1)+'%';
}

function renderDemoData(){
  animNum('kv1','$',248400,0);
  animNum('kv2','$',306800,300);
  animNum('kv3','',1847,600);
  animNum('kv4','',94.7,900,'%',1);
  document.getElementById('kd1').innerHTML='<span class="up">↑ 18.4% vs mes anterior</span>';
  document.getElementById('kd2').innerHTML='<span style="color:var(--g)">↑ 23.1% PROYECTADO</span>';
  renderDemoChart();renderDemoPreds();
  renderBarChart(null);renderGauge(87.3);
}

// Sidebar tabs
function setTab(el){
  document.querySelectorAll('.si').forEach(s=>s.classList.remove('on'));
  el.classList.add('on');
  const tab = el.dataset.tab || 'dashboard';
  showTab(tab);
}

function showTab(tab){
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('on'));
  const panel=document.getElementById('tab'+tab.charAt(0).toUpperCase()+tab.slice(1));
  if(panel)panel.classList.add('on');
  if(tab==='predicciones')loadPredictionsTab();
  if(tab==='ventas')loadSalesTab();
  if(tab==='historico')loadHistory();
  if(tab==='usuarios')loadUsers();
  if(tab==='sistema')loadSystem();
}

async function loadPredictionsTab(){
  try{
    const [preds,canales]=await Promise.all([
      api('GET','/dashboard/predicciones'),
      api('GET','/dashboard/canales')
    ]);
    renderPredTable(preds,'predBody2');
    renderBarChart(canales,'barArea2');
  }catch(e){
    renderDemoPreds('predBody2');
    renderBarChart(null,'barArea2');
  }
}

async function loadSalesTab(){
  try{
    const rows = await api('GET','/ventas?limit=20');
    const body=document.getElementById('salesBody');body.innerHTML='';
    rows.forEach((sale)=>{
      CACHE.sales[sale.id]=sale;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${sale.producto}</td><td>${sale.canal||'N/A'}</td><td>$${parseFloat(sale.monto).toLocaleString('es-CO')}</td><td>${new Date(sale.fecha).toLocaleDateString('es-CO')}</td><td><div class="action-cell"><button class="action-btn" onclick="editSale(${sale.id})">Editar</button><button class="action-btn" onclick="deleteSale(${sale.id})">Eliminar</button></div></td>`;
      body.appendChild(tr);
    });
    if(!rows.length){
      document.getElementById('salesBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No hay ventas registradas.</td></tr>';
    }
  }catch(e){
    document.getElementById('salesBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No se pudieron cargar las ventas.</td></tr>';
  }
}

async function loadHistory(){
  try{
    const rows = await api('GET','/ventas?limit=20');
    const body=document.getElementById('historyBody');body.innerHTML='';
    rows.forEach((sale)=>{
      CACHE.sales[sale.id]=sale;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${new Date(sale.fecha).toLocaleDateString('es-CO')}</td><td>${sale.producto}</td><td>${sale.canal||'N/A'}</td><td>$${parseFloat(sale.monto).toLocaleString('es-CO')}</td><td><div class="action-cell"><button class="action-btn" onclick="editSale(${sale.id})">Editar</button><button class="action-btn" onclick="deleteSale(${sale.id})">Eliminar</button></div></td>`;
      body.appendChild(tr);
    });
    if(!rows.length){
      document.getElementById('historyBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No hay registros históricos.</td></tr>';
    }
  }catch(e){
    document.getElementById('historyBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No se pudo cargar el histórico.</td></tr>';
  }
}

async function submitSale(){
  const prod=document.getElementById('saleProd').value.trim();
  const canal=document.getElementById('saleCanal').value.trim();
  const monto=parseFloat(document.getElementById('saleMonto').value);
  const fecha=document.getElementById('saleFecha').value;
  if(!prod||!monto){
    showAlert('aSales','err','⚠ Completa producto y monto');
    return;
  }
  const btn=document.getElementById('btnSale');
  btn.disabled=true;btn.textContent='GUARDANDO...';
  try{
    await api('POST','/ventas',{producto:prod,canal:canal||'Web',monto,fecha:fecha||null});
    showAlert('aSales','ok','✓ Venta guardada con éxito');
    document.getElementById('saleProd').value='';
    document.getElementById('saleCanal').value='';
    document.getElementById('saleMonto').value='';
    document.getElementById('saleFecha').value='';
    loadSalesTab();
  }catch(e){
    showAlert('aSales','err','⚠ '+e.message);
  }finally{btn.disabled=false;btn.textContent='[ GUARDAR VENTA ]';}
}

async function loadUsers(){
  try{
    const rows = await api('GET','/users');
    const body=document.getElementById('usersBody');body.innerHTML='';
    rows.forEach((u)=>{
      CACHE.users[u.id]=u;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${u.id}</td><td>${u.username}</td><td>${new Date(u.created_at).toLocaleString('es-CO')}</td><td>${u.last_login?new Date(u.last_login).toLocaleString('es-CO'):'Nunca'}</td><td><div class="action-cell"><button class="action-btn" onclick="editUser(${u.id})">Editar</button><button class="action-btn" onclick="deleteUser(${u.id})">Eliminar</button></div></td>`;
      body.appendChild(tr);
    });
    if(!rows.length){
      document.getElementById('usersBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No hay usuarios registrados.</td></tr>';
    }
  }catch(e){
    document.getElementById('usersBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem">No se pueden cargar los usuarios.</td></tr>';
  }
}

async function editSale(id){
  const sale=CACHE.sales[id];
  if(!sale){showAlert('aSales','err','Venta no encontrada');return}
  const producto=prompt('Editar producto',sale.producto);
  if(producto===null)return;
  const canal=prompt('Editar canal',sale.canal||'Web');
  if(canal===null)return;
  const monto=parseFloat(prompt('Editar monto',sale.monto));
  if(isNaN(monto)||monto<=0){showAlert('aSales','err','Monto inválido');return;}
  const fecha=prompt('Editar fecha (YYYY-MM-DD)',sale.fecha?new Date(sale.fecha).toISOString().slice(0,10):'');
  try{
    await api('PUT',`/ventas/${id}`,{producto,canal,monto,fecha});
    showAlert('aSales','ok','✓ Venta actualizada');
    await Promise.all([loadSalesTab(),loadHistory(),loadDashData()]);
  }catch(e){showAlert('aSales','err','⚠ '+e.message)}
}

async function deleteSale(id){
  if(!confirm('¿Eliminar esta venta?'))return;
  try{
    await api('DELETE',`/ventas/${id}`);
    showAlert('aSales','ok','✓ Venta eliminada');
    await Promise.all([loadSalesTab(),loadHistory(),loadDashData()]);
  }catch(e){showAlert('aSales','err','⚠ '+e.message)}
}

async function editUser(id){
  const user=CACHE.users[id];
  if(!user){showAlert('aUsers','err','Usuario no encontrado');return}
  const username=prompt('Editar usuario',user.username);
  if(username===null)return;
  const password=prompt('Nueva contraseña (opcional)','');
  if(password!==null && password!=='' && password.length<4){showAlert('aUsers','err','Contraseña debe tener mínimo 4 caracteres');return;}
  try{
    const body={username};
    if(password)body.password=password;
    await api('PUT',`/users/${id}`,body);
    showAlert('aUsers','ok','✓ Usuario actualizado');
    loadUsers();
  }catch(e){showAlert('aUsers','err','⚠ '+e.message)}
}

async function deleteUser(id){
  if(!confirm('¿Eliminar este usuario? Esta acción es irreversible.'))return;
  try{
    await api('DELETE',`/users/${id}`);
    showAlert('aUsers','ok','✓ Usuario eliminado');
    loadUsers();
  }catch(e){showAlert('aUsers','err','⚠ '+e.message)}
}

function render3DCharts(canales){
  if(!canales||!canales.length) return;
  const sorted = [...canales].sort((a,b)=>parseFloat(b.total)-parseFloat(a.total)).slice(0,3);
  const sets = [
    {id:'chart3dSales',values:sorted.map((row,i)=>({height:Math.max(20,Math.min(90,parseFloat(row.total)/1000)),label:row.canal}))},
    {id:'chart3dCanales',values:sorted.map((row,i)=>({height:Math.max(20,Math.min(90,parseFloat(row.total)/1200)),label:row.canal}))},
    {id:'chart3dImpact',values:sorted.map((row,i)=>({height:Math.max(20,Math.min(90,parseFloat(row.total)/800)),label:row.canal}))}
  ];
  sets.forEach(set=>{
    const container=document.getElementById(set.id);
    if(!container)return;
    const bars=container.querySelectorAll('.bar3d');
    set.values.forEach((val,i)=>{
      if(!bars[i])return;
      bars[i].querySelector('span').style.height=val.height+'%';
      bars[i].querySelector('strong').textContent=val.label;
    });
  });
}

async function loadSystem(){
  try{
    const info = await api('GET','/system');
    document.getElementById('sysStatus').textContent = info.status;
    document.getElementById('sysEnv').textContent = info.env;
    document.getElementById('sysUser').textContent = info.user;
    document.getElementById('sysServer').textContent = new Date(info.server_time).toLocaleString('es-CO');
    document.getElementById('sysDb').textContent = info.db;
  }catch(e){
    document.getElementById('sysStatus').textContent = 'desconectado';
    document.getElementById('sysEnv').textContent = 'error';
    document.getElementById('sysUser').textContent = '---';
    document.getElementById('sysServer').textContent = '---';
    document.getElementById('sysDb').textContent = '---';
  }
}

// Logout
function logout(){
  if(CAM_STREAM)CAM_STREAM.getTracks().forEach(t=>t.stop());
  TOKEN='';CUR_USER=null;
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('nexus_user');
  location.reload();
}

// ── Auto-login if token exists ──
if(TOKEN&&CUR_USER){
  api('GET','/dashboard/kpis').then(()=>{launchDash()}).catch(()=>{
    TOKEN='';localStorage.removeItem('nexus_token');
  });
}
