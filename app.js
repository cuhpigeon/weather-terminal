const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sgn=(v,d=2,suf='')=>v==null?'—':(v>0?'▲ +':v<0?'▼ ':'• ')+Number(v).toFixed(d)+suf, cls=v=>v>0?'pos':v<0?'neg':'cy';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let S=null, sel=null, tab='daily';
// boot screen (<2s, skippable)
const lines=['WEATHER//TERMINAL v2.0','LINKING SATELLITES …','CALIBRATING 51 MODELS …','ONLINE'];let bi=0;
const bt=setInterval(()=>{const b=$('#bootTxt');if(!b||bi>=lines.length){clearInterval(bt);setTimeout(()=>$('#boot')?.remove(),300);return}b.textContent+=lines[bi++]+'\n'},350);
document.querySelectorAll('.panel').forEach((p,i)=>p.style.animationDelay=(i*80)+'ms');
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.t;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.desk').forEach(d=>d.classList.toggle('on',d.id===tab));render()});
// clocks
setInterval(()=>{const f=tz=>new Date().toLocaleTimeString('en-US',{timeZone:tz,hour12:false});$('#ctClock').textContent=f('America/Chicago')+' CT';$('#myClock').textContent=f(Intl.DateTimeFormat().resolvedOptions().timeZone)+' '+Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()},500);
function setTxt(el,t){if(el.textContent!==t){el.textContent=t;if(!RM){el.classList.remove('glitch');void el.offsetWidth;el.classList.add('glitch')}}}
// Size from the CSS box, never from the height attribute. Assigning canvas.height
// writes bitmap pixels back into that attribute, so the next poll multiplied by
// devicePixelRatio again until the buffer exceeded the GPU limit and Chrome
// painted the canvas solid white (the scanline overlay then striped it).
function cv(id){const c=$(id),cssW=c.clientWidth,cssH=c.clientHeight;if(cssW<2||cssH<2)return null;
 let r=devicePixelRatio||1;const MAX=8192;if(cssW*r>MAX)r=MAX/cssW;if(cssH*r>MAX)r=MAX/cssH;
 const bw=Math.max(1,Math.round(cssW*r)),bh=Math.max(1,Math.round(cssH*r));
 if(c.width!==bw||c.height!==bh){c.width=bw;c.height=bh}
 const x=c.getContext('2d');x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,cssW,cssH);return [x,cssW,cssH,r]}
function line(x,pts,w,h,color,minY,maxY,minX,maxX){if(pts.length<2)return;x.strokeStyle=color;x.shadowColor=color;x.shadowBlur=8;x.lineWidth=2;x.beginPath();pts.forEach(([a,b],i)=>{const px=(a-minX)/(maxX-minX||1)*w,py=h-(b-minY)/(maxY-minY||1)*(h-10)-5;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.shadowBlur=0}
let landCV=null,landKey='';
function drawMap(){const got=cv('#map');if(!got)return;const [x,w,h,r]=got;const P=(lo,la)=>[(lo+180)/360*w,(90-la)/180*h];
 const key=Math.round(w)+'x'+Math.round(h)+'@'+r.toFixed(4);
 if(landKey!==key){const c=landCV=document.createElement('canvas');c.width=Math.max(1,Math.round(w*r));c.height=Math.max(1,Math.round(h*r));
  const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);
  g.strokeStyle='rgba(255,43,214,.18)';g.lineWidth=1;
  for(let lo=-180;lo<=180;lo+=30){g.beginPath();g.moveTo(...P(lo,90));g.lineTo(...P(lo,-90));g.stroke()}
  for(let la=-60;la<=60;la+=30){g.beginPath();g.moveTo(...P(-180,la));g.lineTo(...P(180,la));g.stroke()}
  g.strokeStyle='rgba(0,240,255,.7)';g.shadowColor='#00f0ff';g.shadowBlur=4;g.beginPath();
  LAND.forEach(ring=>{ring.forEach((p,i)=>i?g.lineTo(...P(...p)):g.moveTo(...P(...p)));g.closePath()});
  g.stroke();g.shadowBlur=0;landKey=key}
 x.drawImage(landCV,0,0,w,h);
 const by={};(S.daily||[]).forEach(d=>{const k=d.station;if(!by[k]||(d.best?.edge??-1)>(by[k].best?.edge??-1))by[k]=d;by[k].vt=(by[k].vt||0)+d.vol});
 Object.values(by).forEach(d=>{const [px,py]=P(d.lon,d.lat),e=d.best?.edge??0,rad=3+Math.min(10,Math.sqrt((d.vt||0)/2000));x.fillStyle=e>=0.06?'#39ff14':e>0?'#ffb000':'#ff2bd6';x.shadowColor=x.fillStyle;x.shadowBlur=12;x.beginPath();x.arc(px,py,rad,0,7);x.fill()});x.shadowBlur=0}
function drawer(d){if(!d)return;const mx=Math.max(...d.buckets.map(b=>Math.max(b.p,b.ask||0)),.01);
 const hist={};d.vals.forEach(v=>{const k=Math.round(v);hist[k]=(hist[k]||0)+1});const hk=Object.keys(hist).map(Number).sort((a,b)=>a-b),hm=Math.max(...Object.values(hist));
 $('#drawer').innerHTML=`<h2 class="chrome">${esc(d.city.toUpperCase())} · ${d.kind==='daily_high'?'HIGH':'LOW'} · ${esc(d.date)}</h2>
 <p class="small">station ${esc(d.station)} · forecast ${d.mu}°${d.unit} ±${d.sigma} · observed ${d.kind==='daily_high'?'max':'min'} so far: ${d.ext??'n/a'} · ${d.n_hist} days calibration</p>
 <p class="small"><span class="cy">■ model</span> vs <span class="neg">■ market ask</span></p>
 <div class="bars">${d.buckets.map(b=>`<div title="${esc(b.label)}: model ${(b.p*100).toFixed(1)}% / ask ${b.ask}"><span class="m" style="height:${b.p/mx*100}%"></span><span class="k" style="height:${(b.ask||0)/mx*100}%"></span><em>${esc(b.label)}</em></div>`).join('')}</div>
 <p class="small" style="margin-top:38px">ENSEMBLE MEMBERS (${d.vals.length}, bias-corrected)</p><div class="bars" style="height:60px">${hk.map(k=>`<div title="${k}°: ${hist[k]}"><span class="m" style="height:${hist[k]/hm*100}%"></span><em>${k}</em></div>`).join('')}</div>
 <p class="small" style="margin-top:34px">best: ${d.best?`${esc(d.best.side)} ${esc(d.best.label)} p=${d.best.p} @${d.best.px} edge ${sgn(d.best.edge*100,1,'¢')}`:'none'} · <a class="cy" target="_blank" rel="noopener" href="${esc(d.src)}">settlement source ↗</a></p>`}
function render(){if(!S)return;const D=S.desks||{},eq=(D.daily?.equity||0)+(D.hourly?.equity||0),td=(D.daily?.today||0)+(D.hourly?.today||0);
 setTxt($('#equity'),'$'+eq.toFixed(2));const t=$('#today');setTxt(t,sgn(td));t.className='mono big '+cls(td);
 const m=$('#mode');m.textContent=S.mode;m.classList.toggle('live',S.mode==='LIVE');
 const hb=S.heartbeat?Math.round(S.now-S.heartbeat):null;$('#status').textContent=(S.stopped?'⚠ STOP REQUESTED · ':'')+`bot heartbeat ${hb==null?'n/a':hb+'s ago'} · ${S.daily.length} daily markets · ${(S.signals||[]).length} recent signals`;
 if(tab==='daily'){drawMap();const tb=$('#cities tbody'),rows=[...S.daily].sort((a,b)=>(b.best?.edge??-9)-(a.best?.edge??-9));
  tb.innerHTML=rows.map((d,i)=>`<tr data-i="${S.daily.indexOf(d)}"><td>${esc(d.city)}</td><td>${d.kind==='daily_high'?'HIGH':'LOW'}</td><td>${esc(d.date)}</td><td class="cy">${esc(d.station)}</td><td>${d.mu}°${d.unit}</td><td>±${d.spread}</td><td>${d.ext??'—'}</td><td>${esc(d.fav)}</td><td>${d.best?esc(d.best.side+' '+d.best.label):'—'}</td><td class="${cls(d.best?.edge)}">${d.best?sgn(d.best.edge*100,1):'—'}</td><td>${d.position?'$'+d.position.toFixed(2):'—'}</td></tr>`).join('');
  tb.querySelectorAll('tr').forEach(r=>r.onclick=()=>{sel=+r.dataset.i;drawer(S.daily[sel])});if(sel!=null)drawer(S.daily[sel])}
 else{$('#cards').innerHTML=(S.hourly||[]).map(c=>{const h=c.hours[0]||{},sp=c.spark||[];return `<div class="panel card" style="opacity:1"><h3>${c.station.slice(1)}</h3><div class="small">${esc(c.code)}</div>
   <div class="tmp">${c.last?c.last[1].toFixed(1)+'°F':'—'}</div><div class="small">last obs ${c.mins_since??'?'} min ago · next hour in ${h.ts?Math.max(0,Math.round((h.ts-S.now)/60)):'?'} min</div>
   <canvas class="spark" data-s='${JSON.stringify(sp)}' height="44"></canvas>
   ${c.hours.map(hh=>`<div class="small" style="margin-top:6px">${esc(hh.hour)} · nowcast <b class="cy">${hh.mu}±${hh.sd}°F</b> · ${esc(hh.state)}${hh.strikes_estimated?' · strikes est.':''}</div>
   <table><tr><th>&gt;N</th><th>model</th><th>mkt</th></tr>${hh.strikes.map(s=>`<tr><td>${s.N}°</td><td>${(s.p*100).toFixed(0)}%</td><td>${s.mkt==null?'<span class="dim">n/a</span>':(s.mkt*100).toFixed(0)+'%'}</td></tr>`).join('')}</table>`).join('')}</div>`}).join('');
  document.querySelectorAll('.spark').forEach(c=>{const s=JSON.parse(c.dataset.s);const r=devicePixelRatio||1,w=c.clientWidth,h=44;c.width=w*r;c.height=h*r;const x=c.getContext('2d');x.scale(r,r);if(s.length>1)line(x,s,w,h,'#ff2bd6',Math.min(...s.map(p=>p[1]))-1,Math.max(...s.map(p=>p[1]))+1,s[0][0],s[s.length-1][0])});
  const fh=(S.signals||[]).map(g=>`<li><span>${g.edge!=null&&g.edge>0?'▲':'◆'}</span><span>${esc(g.line)}${(g.signal_only||/SIGNAL ONLY/i.test(g.line||''))?'<b class="tag">SIGNAL ONLY</b>':''}</span><button class="pill" data-c="${esc(g.line)}">COPY</button></li>`).join('')||'<li class="dim">no signals yet</li>';if($('#feed').dataset.h!==fh){$('#feed').innerHTML=fh;$('#feed').dataset.h=fh}
  document.querySelectorAll('#feed button').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(b.dataset.c))}
 // equity curves
 {const got=cv('#eq');if(got){const [x,w,h]=got;const all=['daily','hourly'].flatMap(k=>(D[k]?.curve||[]).map(p=>p[1]-D[k].bankroll));const mn=Math.min(0,...all)-.5,mx=Math.max(0,...all)+.5;
  x.fillStyle='#9ab';x.font='11px STM';x.fillText('P&L vs start ($)  ━ daily (cyan)  ━ hourly (pink)',4,12);
  [['daily','#00f0ff'],['hourly','#ff2bd6']].forEach(([k,c])=>{const cu=D[k]?.curve||[];if(cu.length<2){x.fillStyle=c;x.fillText(k+': no settled trades yet',4,k==='daily'?40:58)}line(x,cu.map(p=>[p[0],p[1]-D[k].bankroll]),w,h,c,mn,mx,cu[0]?.[0]||0,cu.at(-1)?.[0]||1)})}}
 // calibration: from backtest if ledger is thin
 {const got=cv('#cal');if(got){const [x,w,h]=got;const cal=D.daily?.calib||S.backtest?.daily?.calib;x.strokeStyle='rgba(255,255,255,.25)';x.beginPath();x.moveTo(0,h);x.lineTo(w,0);x.stroke();x.fillStyle='#9ab';x.font='11px STM';x.fillText(D.daily?.calib?'paper ledger':'backtest buckets (daily)',4,12);
  if(cal)Object.entries(cal).forEach(([k,[n,f]])=>{const b=parseInt(k)/100+.05;x.fillStyle=Math.abs(f-b)<=.07?'#39ff14':'#ffb000';x.beginPath();x.arc(b*w,h-f*h,3+Math.min(8,Math.log(n+1)),0,7);x.fill()})}}
 $('#gauges').innerHTML=['daily','hourly'].map(k=>`<div class="small cy">${k.toUpperCase()} · bankroll $${D[k]?.bankroll} · ${D[k]?.halted?'<span class="warn">⚠ '+esc(D[k].halted)+'</span>':'✔ OK'}</div>`+Object.entries(D[k]?.gauges||{}).map(([n,v])=>`<div class="gauge small">${n} ${(v*100).toFixed(0)}% of limit<b><i style="width:${Math.min(100,v*100)}%"></i></b></div>`).join('')).join('');
 const B=S.backtest;$('#bt').innerHTML=B?['daily','hourly'].map(k=>{const r=B[k];return `<div><b class="cy">${k.toUpperCase()}</b> trades ${r.trades} · P&L <span class="${cls(r.pnl)}">${sgn(r.pnl)}</span> · ROI ${r.roi==null?'—':sgn(r.roi*100,1,'%')} · win ${r.win_rate==null?'—':(r.win_rate*100).toFixed(0)+'%'} · maxDD $${r.max_dd} · Brier model ${r.brier_model} vs mkt ${r.brier_market}</div>`}).join('')+`<div class="small dim">simulated on history, not real money · ${new Date(B.ts*1000).toLocaleString()}</div>`:'no backtest yet';
 $('#log').textContent=(S.trades||[]).map(t=>`${new Date(t.ts*1000).toLocaleTimeString()} ${t.desk.padEnd(6)} ${t.side.padEnd(3)} ${t.size.toFixed(1)}@${t.price.toFixed(2)} p=${(t.model_p||0).toFixed(2)} ${t.status}${t.pnl!=null?' '+sgn(t.pnl):''}  ${(t.note||'').slice(0,60)}`).join('\n')||'> awaiting first paper trade_';}
// --- read-only relay: #src=<blob url>&k=<base64 AES-256 key>; poll every 15s, STALE after 90s ---
const H=new URLSearchParams(location.hash.slice(1)),SRC=H.get('src'),KEY=H.get('k'),b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let CK=null,lastPush=null;
async function load(){try{const r=await fetch(SRC+(SRC.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});const j=await r.json();
 CK=CK||await crypto.subtle.importKey('raw',b64(KEY),'AES-GCM',false,['decrypt']);
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(j.iv)},CK,b64(j.ct));
 S=JSON.parse(await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip'))).text());lastPush=Date.parse(j.pushed_utc);render();stale()}
 catch(e){$('#status').textContent='feed error: '+e.message+' (check the full private link)'}}
function stale(){if(!lastPush)return;const a=Math.round((Date.now()-lastPush)/1000);$('#stale').hidden=a<=90;$('#stale').textContent='STALE · box last pushed '+a+'s ago, pusher or box may be down'}
if(SRC&&KEY&&/^https:\/\//.test(SRC)){load();setInterval(load,15000);setInterval(stale,1000)}
else{$('#demo').hidden=false;fetch('example.json').then(r=>r.json()).then(j=>{S=j;S.now=Date.now()/1000;S.heartbeat=S.now-5;render()})}
let _rz=0;addEventListener('resize',()=>{if(_rz)return;_rz=requestAnimationFrame(()=>{_rz=0;render()})});
