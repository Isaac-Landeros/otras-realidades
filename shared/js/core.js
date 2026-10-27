/* ==========================================================================
   OTRAS REALIDADES · NÚCLEO COMPARTIDO
   Datos, tema, formato de cifras, texto en lienzo, puntos de población,
   enlaces, descarga/compartir de imágenes y grabación de vídeo.
   Se expone como window.OR para que lo use cualquier ejercicio.
   ========================================================================== */
(function(){
  const OR = {};
  OR.SERIES = 'Otras realidades';
  OR.CONTS = ['Europa','Asia','África','América','Oceanía'];

  /* ---------- Datos ---------- */
  OR.loadData = async function(url){
    const raw = window.__OR_DATA__ || await (await fetch(url || '../shared/data/countries.json')).json();
    const paises = raw.paises.map((c,i)=>({
      id:i, iso:c.iso, n:c.nombre, c:c.continente, a:c.area_km2, p:c.poblacion,
      g:c.pib_usd, d:c.poblacion/c.area_km2, s:c.suelo||null
    }));
    const byIso = Object.fromEntries(paises.map(c=>[c.iso,c]));
    const worldP = paises.reduce((t,c)=>t+c.p,0), worldG = paises.reduce((t,c)=>t+(c.g||0),0);
    return {meta:raw.meta, paises, byIso, muestra:new Set(raw.muestra), worldP, worldG};
  };

  /* ---------- Tema: lee las variables de theme.css ---------- */
  OR.theme = function(){
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    return {
      paper:v('--c-paper'), panel:v('--c-panel'), ink:v('--c-ink'), muted:v('--c-muted'),
      rule:v('--c-rule'), home:v('--c-home'), dot:v('--c-dot'), onHome:v('--c-on-home'),
      crop:v('--c-crop'), pasture:v('--c-pasture'), forest:v('--c-forest'),
      fDisplay:v('--f-display'), fBody:v('--f-body'), fMono:v('--f-mono'),
      stretch:parseFloat(v('--display-stretch'))||100, weight:v('--display-weight')||'800'
    };
  };
  OR.onThemeChange = function(cb){
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', cb);
    new MutationObserver(cb).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  };
  OR.fontsReady = async function(){
    if (!document.fonts) return;
    const t = OR.theme();
    try{ await Promise.all([
      document.fonts.load(`${t.weight} 40px ${t.fDisplay}`), document.fonts.load(`400 16px ${t.fBody}`),
      document.fonts.load(`500 16px ${t.fMono}`), document.fonts.load(`400 16px ${t.fMono}`)]); }catch(e){}
    await document.fonts.ready;
  };

  /* ---------- Formato ---------- */
  const NF = {};
  OR.nf = (v,d=0)=>(NF[d] ||= new Intl.NumberFormat('es-ES',{maximumFractionDigits:d,minimumFractionDigits:d,useGrouping:'always'})).format(v);
  OR.dec = v => v<10 ? 1 : 0;
  OR.pop = p => { const m=p/1e6; return m>=1 ? OR.nf(m, m<10?1:0)+' millones' : OR.nf(p/1e3)+' mil'; };
  OR.popShort = p => { const m=p/1e6; return m>=1 ? OR.nf(m, m<10?1:0)+' M' : OR.nf(p/1e3)+' mil'; };
  OR.times = r => r>=1 ? '×'+OR.nf(r,OR.dec(r)) : '1/'+OR.nf(1/r,OR.dec(1/r));
  OR.ratio = (r, more='más', less='menos') => {
    if (Math.abs(Math.log(r))<0.05) return 'casi igual';
    return r>1 ? `${OR.nf(r,OR.dec(r))} veces ${more}` : `${OR.nf(1/r,OR.dec(1/r))} veces ${less}`;
  };

  /* ---------- Texto en lienzo (con ajuste de línea) ---------- */
  function stretchKw(pct){
    return pct<=62.5?'ultra-condensed':pct<=75?'extra-condensed':pct<=87.5?'condensed':pct<=100?'normal':pct<=112.5?'semi-expanded':'expanded';
  }
  // o: {font:'display'|'body'|'mono', size, weight, color, align, maxW, lh, base}
  OR.text = function(ctx, str, x, y, o={}){
    const t = o.t || OR.theme();
    const fam = o.font==='mono'?t.fMono : o.font==='body'?t.fBody : t.fDisplay;
    const w = o.weight || (o.font==='display'||!o.font ? t.weight : 400);
    ctx.save();
    ctx.font = `${w} ${o.size||16}px ${fam}`;
    if ('fontStretch' in ctx) ctx.fontStretch = (!o.font||o.font==='display') ? stretchKw(t.stretch) : 'normal';
    ctx.fillStyle = o.color || t.ink; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'top';
    const lh = (o.size||16)*(o.lh||1.15);
    const lines = [];
    String(str).split('\n').forEach(par=>{
      if (!o.maxW){ lines.push(par); return; }
      let line='';
      par.split(' ').forEach(word=>{
        const test = line ? line+' '+word : word;
        if (ctx.measureText(test).width > o.maxW && line){ lines.push(line); line=word; } else line=test;
      });
      lines.push(line);
    });
    lines.forEach((l,i)=>ctx.fillText(l, x, y+i*lh));
    ctx.restore();
    return lines.length*lh;
  };

  /* ---------- Puntos de población: posiciones estables por país ---------- */
  function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  const dotCache = {};
  OR.dots = function(key, n){
    let c = dotCache[key];
    if (!c){ let h=0; for (const ch of key) h=(h*31+ch.charCodeAt(0))|0; c = dotCache[key] = {r:rng(h), pts:[]}; }
    while (c.pts.length<n) c.pts.push([c.r(), c.r()]);
    return c.pts;
  };
  // Dibuja un cuadrado con n puntos. x,y = esquina superior izquierda.
  OR.square = function(ctx, x, y, side, n, key, o={}){
    ctx.save();
    if (o.fill){ ctx.fillStyle=o.fill; ctx.fillRect(x,y,side,side); }
    if (o.stroke){
      ctx.strokeStyle=o.stroke; ctx.lineWidth=o.lw||1; if (o.dash) ctx.setLineDash(o.dash);
      ctx.strokeRect(x+.5, y+.5, Math.max(side-1,1), Math.max(side-1,1)); ctx.setLineDash([]);
    }
    if (n>0 && o.dot){
      const pts = OR.dots(key, Math.ceil(n)), s=o.ds||2, inner=Math.max(side-s-2,0.5);
      ctx.fillStyle=o.dot;
      for (let i=0;i<Math.floor(n);i++) ctx.fillRect(x+1+pts[i][0]*inner, y+1+pts[i][1]*inner, s, s);
      const frac = n-Math.floor(n);
      if (frac>0.02){ ctx.globalAlpha=frac; const pt=pts[Math.floor(n)]; ctx.fillRect(x+1+pt[0]*inner, y+1+pt[1]*inner, s, s); }
    }
    ctx.restore();
  };

  /* ---------- Parámetros de URL (?pais=ESP&comparar=IND) o ancla (#ESP-IND) ---------- */
  OR.params = function(){
    const q = new URLSearchParams(location.search), out = {};
    for (const [k,v] of q) out[k]=v;
    const h = location.hash.replace('#','');
    if (h){ const parts=h.split('-'); if (/^(reel|post)$/.test(parts[0])) out.modo=parts.shift();
      if (parts[0]) out.pais=parts[0]; if (parts[1]) out.comparar=parts[1]; }
    return out;
  };
  OR.link = function(params){
    const u = new URL(location.href); u.hash=''; u.search='';
    Object.entries(params).forEach(([k,v])=>v!=null && u.searchParams.set(k,v));
    return u.toString();
  };

  /* ---------- Almacenamiento local seguro ---------- */
  OR.store = {
    get(k){ try{ return localStorage.getItem('or:'+k); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem('or:'+k, v); }catch(e){} }
  };

  /* ---------- Avisos, copiar, descargar, compartir ---------- */
  OR.toast = function(msg){
    const el=document.createElement('div'); el.className='toast'; el.textContent=msg; el.setAttribute('role','status');
    document.body.appendChild(el); setTimeout(()=>el.remove(), 2600);
  };
  OR.copy = async function(text){
    try{ await navigator.clipboard.writeText(text); OR.toast('Enlace copiado'); }
    catch(e){ window.prompt('Copia este enlace:', text); }
  };
  OR.download = function(blob, name){
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  OR.canvasBlob = c => new Promise(r=>c.toBlob(r,'image/png'));
  // Comparte la imagen con el menú nativo del móvil; si no se puede, la descarga.
  OR.shareImage = async function(canvas, name, title, url){
    const blob = await OR.canvasBlob(canvas);
    const file = new File([blob], name, {type:'image/png'});
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file], title, text: title+(url?' '+url:'')}); return; }catch(e){ if (e.name==='AbortError') return; }
    }
    OR.download(blob, name); OR.toast('Imagen descargada');
  };

  /* ---------- Grabación de vídeo del lienzo ---------- */
  OR.recorder = function(canvas, fps=30){
    const types = ['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'];
    const type = types.find(t=>window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const chunks=[]; const rec = new MediaRecorder(canvas.captureStream(fps), {mimeType:type, videoBitsPerSecond:12e6});
    rec.ondataavailable = e=>e.data.size && chunks.push(e.data);
    return {
      type, ext: type.includes('mp4')?'mp4':'webm',
      start(){ rec.start(); },
      stop(){ return new Promise(r=>{ rec.onstop=()=>r(new Blob(chunks,{type})); rec.stop(); }); }
    };
  };

  /* ---------- Utilidades ---------- */
  OR.pct = v => OR.nf(v, v<10?1:0)+'\u00a0%';
  OR.ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  OR.clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  OR.reducedMotion = ()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.OR = OR;
})();
