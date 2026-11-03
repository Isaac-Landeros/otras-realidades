/* ==========================================================================
   EJERCICIO 02 · DÓNDE VIVE LA GENTE
   Cada país es un cuadrado dividido en un treemap: un bloque urbano
   (ciudades + pueblos y periferias, con contorno) y seis clases rurales de
   cobertura del suelo. Cada punto = 1 millón de personas. Los puntos parten
   de un reparto uniforme y se mueven a donde vive la gente.
   Junto al cuadrado, un panel de «retos»: montaña, desierto, casi vacío,
   hielo, costa baja y lluvia.
   ========================================================================== */
(async function(){
  const D = await OR.loadData();
  const $ = id => document.getElementById(id);

  /* ==========================================================================
     CONFIGURACIÓN · todo lo que se puede cambiar sin tocar la lógica
     Colores: en shared/css/theme.css (variables --c-city, --c-town, --c-crop…)
     ========================================================================== */

  // Clases del treemap. «col» es la variable de color de theme.css.
  const URBANO = [
    {k:'ciudades', label:'Ciudades',             col:'--c-city'},
    {k:'pueblos',  label:'Pueblos y periferias', col:'--c-town'},
  ];
  const RURAL = [
    {k:'cultivos',   label:'Cultivos',                 col:'--c-crop'},
    {k:'pastizal',   label:'Pastizal',                 col:'--c-pasture'},
    {k:'bosque',     label:'Bosque',                   col:'--c-forest'},
    {k:'matorral',   label:'Matorral',                 col:'--c-shrub'},
    {k:'desierto',   label:'Desierto o suelo desnudo', col:'--c-desert'},
    {k:'hielo_agua', label:'Hielo o agua',             col:'--c-icewater'},
  ];
  // Dónde se dibuja la población rural que vive en núcleos y dispersa (ilustrativo)
  const RURAL_HABITADO = ['cultivos','pastizal'];

  // Panel de retos: clave en los datos, texto, valor máximo de la barra y formato
  const RETOS = [
    {k:'montana_pct',    label:'Montaña',                               max:100,  fmt:'pct'},
    {k:'desierto_pct',   label:'Desierto o suelo desnudo',              max:100,  fmt:'pct'},
    {k:'casi_vacio_pct', label:'Casi vacío (rural de muy baja densidad)', max:100, fmt:'pct'},
    {k:'hielo_pct',      label:'Hielo permanente',                      max:100,  fmt:'pct'},
    {k:'costa_baja_pct', label:'Población a menos de 5 m sobre el mar', max:100,  fmt:'pct'},
    {k:'lluvia_mm',      label:'Lluvia media al año',                   max:3000, fmt:'mm'},
  ];
  // Retos que aparecen en el vídeo (máximo 3 para que se lea en 3 segundos)
  const RETOS_VIDEO = ['montana_pct','desierto_pct','lluvia_mm'];

  // Ordenaciones de la rejilla del mundo
  const ORDEN = [
    {k:'urbTerr',  label:'Territorio urbano',               f:c=>c.M.fu,  show:c=>OR.pct(100*c.M.fu)+' urbano'},
    {k:'urbPob',   label:'Población urbana',                f:c=>c.M.pu,  show:c=>OR.pct(100*c.M.pu)+' vive en lo urbano'},
    {k:'densU',    label:'Personas por km² urbano',         f:c=>c.M.dU,  show:c=>OR.nf(c.M.dU)+' /km² urbano'},
    {k:'vacio',    label:'Territorio casi vacío',           f:c=>c.M.R.casi_vacio_pct, show:c=>OR.pct(c.M.R.casi_vacio_pct)+' casi vacío'},
    {k:'montana',  label:'Montaña',                         f:c=>c.M.R.montana_pct ?? -1, show:c=>c.M.R.montana_pct==null?'montaña: sin dato':OR.pct(c.M.R.montana_pct)+' montaña'},
    {k:'desierto', label:'Desierto o suelo desnudo',        f:c=>c.M.R.desierto_pct, show:c=>OR.pct(c.M.R.desierto_pct)+' desierto'},
    {k:'cont',     label:'Continente',                      f:null, show:c=>OR.pct(100*c.M.fu)+' urbano'},
  ];
  const VISTAS = {
    sample:{label:'Muestra diversa (40)', f:c=>D.muestra.has(c.iso), note:'Cuarenta países elegidos por contraste. Todos los cuadrados tienen el mismo tamaño: aquí importan las proporciones, no la superficie.'},
    all:{label:'Todos los países', f:()=>true, note:'Todos los países. Filtra por continente para que la rejilla sea manejable. Todos los cuadrados tienen el mismo tamaño.'},
  };

  // Predicción: el deslizador de territorio urbano no es lineal (la mayoría de
  // países está entre 0,5 % y 5 %). pct = 100 · posición^CURVA
  const PREDICCION = {curva:3, territorioInicial:0.45, poblacionInicial:50, tolerancia:1.5, toleranciaPuntos:5};

  // Animación (fotogramas a 60 fps en la web)
  const ANIM = {migrar:0.010, revelar:0.009, autoMigrarMs:1200};
  // Vídeo (fotogramas a 30 fps): cuándo empieza cada parte
  const F = {show:45, migrate:120, nums:300, close:420, end:510};

  // Textos
  const TXT = {
    serie:'Otras realidades · 02 Dónde vive la gente',
    leyenda:'1 punto = 1 millón de personas',
    cta:'¿Y tu país? Compáralo tú: enlace en la bio',
    pregunta:'¿Dónde vive realmente la gente?',
    uniforme:'Si se repartieran por igual',
    real:'Donde vive realmente',
    lede:'En el ejercicio anterior los puntos se repartían por todo el territorio. En realidad hay ciudades, campos, bosques, desiertos y montañas, y la gente se concentra en muy poco espacio. El rectángulo con contorno es la superficie urbana real.',
    boton:['Ver dónde vive realmente','Ver reparto uniforme'],
    ayudaPrediccion:'A la derecha, tu predicción: el rectángulo turquesa con contorno es la superficie urbana; los puntos que caen dentro, la gente que vive en ciudades y pueblos.',
  };

  /* ==========================================================================
     DATOS DERIVADOS
     ========================================================================== */
  // Se usan las proporciones de GHSL aplicadas a la población oficial (la del ejercicio 01).
  D.paises.forEach(c=>{
    const t=c.tr; if (!t) return;
    const u=t.urbano, r=t.rural, T=t.total_km2;
    const ua=u.ciudades.km2+u.pueblos.km2;
    const gp=u.ciudades.pob+u.pueblos.pob+r.nucleos.pob+r.disperso.pob+r.casi_vacio.pob || 1;
    const sh={ciudades:u.ciudades.pob/gp, pueblos:u.pueblos.pob/gp, habitado:(r.nucleos.pob+r.disperso.pob)/gp, vacio:r.casi_vacio.pob/gp};
    const up=c.p*(sh.ciudades+sh.pueblos);
    c.M = { T, ua, fu:ua/T, pu:sh.ciudades+sh.pueblos, sh, up, rp:c.p-up,
      dU: ua>0 ? up/ua : 0, dR: (T-ua)>0 ? (c.p-up)/(T-ua) : 0, dM:c.p/T,
      cov:r.cobertura_km2, ciud:u.ciudades.km2, pueb:u.pueblos.km2, R:t.retos };
  });
  const OK = D.paises.filter(c=>c.M);
  const valid = c => c && c.M;

  /* ---------- Estado ---------- */
  const P = OR.params();
  if (!P.herramientas && !window.OR_ESTUDIO) $('toReel').hidden = true;
  const S = {
    home: [D.byIso[P.pais], D.byIso[OR.store.get('home')], D.byIso.ESP].find(valid),
    other: [D.byIso[P.comparar], D.byIso.EGY].find(valid),
    scene:'home', ga:PREDICCION.territorioInicial, gp:PREDICCION.poblacionInicial, guessed:false,
    morph:0, morphTo:0, t:1, view:'sample', cont:'', sort:'urbTerr'
  };
  if (S.other===S.home) S.other = S.home.iso==='EGY' ? D.byIso.CAN : D.byIso.EGY;
  const guessFu = ()=>Math.pow(S.ga, PREDICCION.curva);   // fracción del territorio

  /* ---------- Selectores ---------- */
  const byName = OK.slice().sort((a,b)=>a.n.localeCompare(b.n,'es'));
  byName.forEach(c=>{ $('home').add(new Option(c.n,c.iso)); $('home2').add(new Option(c.n,c.iso)); });
  OR.CONTS.forEach(k=>{
    const g=document.createElement('optgroup'); g.label=k;
    byName.filter(c=>c.c===k).forEach(c=>g.appendChild(new Option(c.n,c.iso)));
    $('other').appendChild(g); $('cont').add(new Option(k,k));
  });
  Object.entries(VISTAS).forEach(([k,v])=>$('view').add(new Option(v.label,k)));
  ORDEN.forEach(o=>$('sort').add(new Option(o.label,o.k)));

  /* ---------- Formato ---------- */
  const pct = v => v==null ? 'sin dato' : OR.pct(v);
  const fmtReto = (r,v) => v==null ? 'sin dato' : r.fmt==='mm' ? OR.nf(v)+' mm' : OR.pct(v);
  const classLabel = k => (URBANO.concat(RURAL).find(x=>x.k===k)||{}).label || k;

  /* ==========================================================================
     TREEMAP Y PUNTOS (coordenadas de 0 a 1 dentro del cuadrado)
     ========================================================================== */
  const layoutCache = {};
  function layoutReal(c){
    if (layoutCache[c.iso]) return layoutCache[c.iso];
    const nodes = RURAL.map(r=>({k:r.k, v:c.M.cov[r.k]||0, col:r.col})).concat([{k:'urbano', v:c.M.ua}]);
    const leaves=[], outlines=[];
    OR.squarify(nodes,0,0,1,1).forEach(q=>{
      if (q.item.k==='urbano'){
        outlines.push(q);
        OR.squarify([{k:'ciudades',v:c.M.ciud,col:'--c-city'},{k:'pueblos',v:c.M.pueb,col:'--c-town'}],q.x,q.y,q.w,q.h)
          .forEach(s=>leaves.push({...s, k:s.item.k, col:s.item.col, urb:true}));
      } else leaves.push({...q, k:q.item.k, col:q.item.col});
    });
    return layoutCache[c.iso] = {leaves, outlines};
  }
  // Predicción: la parte urbana es un cuadrado en la esquina inferior derecha y lo
  // rural el resto (dos rectángulos). Con solo dos piezas, un treemap daría una franja.
  function layoutGuess(fu){
    const q=Math.sqrt(OR.clamp(fu,0,1)), u={x:1-q, y:1-q, w:q, h:q};
    const leaves=[{x:0,y:0,w:1,h:1-q,k:'rural',col:'--c-panel',seam:true},{x:0,y:1-q,w:1-q,h:q,k:'rural',col:'--c-panel',seam:true,nolabel:true},
                  {...u, k:'urbano', col:'--c-town', urb:true}].filter(l=>l.w>0&&l.h>0);
    return {leaves, outlines:[u]};
  }
  // Reparte n puntos entre rectángulos según su área, con posiciones estables.
  function scatter(rng, n, rects, out){
    const A = rects.reduce((a,l)=>a+l.w*l.h,0) || 1; let left=n;
    rects.forEach((l,i)=>{ const m = i===rects.length-1 ? left : Math.round(n*l.w*l.h/A); left-=m;
      for (let j=0;j<m;j++) out.push([l.x+rng()*l.w, l.y+rng()*l.h]); });
  }
  const dotCache = {};
  function dotsReal(c){
    if (dotCache[c.iso]) return dotCache[c.iso];
    const L=layoutReal(c).leaves, N=Math.round(c.p/1e6), R=OR.rng(c.iso+'real'), pts=[];
    const n=[c.M.sh.ciudades, c.M.sh.pueblos, c.M.sh.habitado].map(s=>Math.round(N*s));
    const nv=Math.max(0, N-n[0]-n[1]-n[2]);
    const by=k=>L.filter(l=>l.k===k), rural=L.filter(l=>!l.urb), hab=L.filter(l=>RURAL_HABITADO.includes(l.k));
    scatter(R, n[0], by('ciudades'), pts); scatter(R, n[1], by('pueblos'), pts);
    scatter(R, n[2], hab.length?hab:rural, pts); scatter(R, nv, rural.length?rural:L, pts);
    return dotCache[c.iso] = pts;
  }
  function dotsGuess(c, fu, pu){
    const L=layoutGuess(fu).leaves, N=Math.round(c.p/1e6), R=OR.rng(c.iso+'guess'), pts=[];
    const nu=Math.round(N*pu), u=L.filter(l=>l.urb), r=L.filter(l=>!l.urb);
    scatter(R, nu, u.length?u:L, pts); scatter(R, N-nu, r.length?r:L, pts);
    return pts;
  }
  function dotsUniform(c){ return OR.dots(c.iso, Math.round(c.p/1e6)); }

  // Dibuja un treemap en (x,y) con lado s. o: {alpha, labels, stroke, lw, th}
  function drawTree(ctx, layout, x, y, s, o={}){
    const th=o.th||OR.theme();
    ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
    layout.leaves.forEach(l=>{ ctx.fillStyle=th.v(l.col)||th.panel; ctx.fillRect(x+l.x*s, y+l.y*s, l.w*s, l.h*s); });
    ctx.strokeStyle=th.paper; ctx.lineWidth=Math.max(1, s/300);
    layout.leaves.forEach(l=>{ if (!l.seam) ctx.strokeRect(x+l.x*s, y+l.y*s, l.w*s, l.h*s); });
    ctx.strokeStyle=th.ink; ctx.lineWidth=Math.max(1.4, s/240);
    layout.outlines.forEach(q=>ctx.strokeRect(x+q.x*s, y+q.y*s, q.w*s, q.h*s));
    if (o.labels){
      const fs=Math.max(11, Math.min(16, s/34));
      layout.leaves.forEach(l=>{
        const w=l.w*s, h=l.h*s; if (l.nolabel || w<fs*7 || h<fs*2.8) return;
        ctx.save(); ctx.beginPath(); ctx.rect(x+l.x*s, y+l.y*s, w, h); ctx.clip();
        const share = l.k==='rural' ? 1-layout.outlines.reduce((t,q)=>t+q.w*q.h,0) : l.w*l.h;
        OR.text(ctx, l.k==='rural'?'Rural':l.k==='urbano'?'Urbano':classLabel(l.k), x+l.x*s+6, y+l.y*s+5, {t:th, font:'body', size:fs, weight:700});
        OR.text(ctx, OR.pct(100*share), x+l.x*s+6, y+l.y*s+5+fs*1.25, {t:th, font:'mono', size:fs*0.9, weight:400, color:th.muted});
        ctx.restore();
      });
    }
    ctx.restore();
    ctx.strokeStyle=o.stroke||th.ink; ctx.lineWidth=o.lw||1.4; if (o.dash) ctx.setLineDash(o.dash);
    ctx.strokeRect(x+.5, y+.5, s-1, s-1); ctx.setLineDash([]);
  }
  // Puntos interpolados entre dos repartos (A → B) con un pequeño desfase por punto.
  function drawDots(ctx, A, B, t, x, y, s, ds, color){
    ctx.fillStyle=color; const n=Math.min(A.length,B.length), span=s-ds;
    for (let i=0;i<n;i++){
      const e=OR.ease(OR.clamp(t*1.3-(i%37)/37*0.3,0,1));
      ctx.fillRect(x+(A[i][0]+(B[i][0]-A[i][0])*e)*span, y+(A[i][1]+(B[i][1]-A[i][1])*e)*span, ds, ds);
    }
  }
  const dotSize = (s,N)=>OR.clamp(Math.sqrt(s*s/Math.max(N,1))*0.22, 1.2, 4);

  // Dos países a escala (superficie real), alineados abajo, con etiquetas.
  function pairBox(box, A, B, fs){
    const gap=28*fs, labelH=74*fs, sA=Math.sqrt(A.M.T), sB=Math.sqrt(B.M.T);
    const k=Math.min((box.w-gap)/(sA+sB), (box.h-labelH)/Math.max(sA,sB));
    const base=box.y+box.h-labelH;
    return {a:{x:box.x, y:base-sA*k, s:sA*k}, b:{x:box.x+sA*k+gap, y:base-sB*k, s:sB*k}, base, labelH};
  }
  // Etiqueta bajo el cuadrado (o encima, si es pequeño). maxW evita que pise la del otro país.
  function label(ctx, c, q, box, fs, th, color, sub, maxW){
    const narrow=q.s<150*fs, w=Math.max(80*fs, maxW||box.w), ly=narrow ? q.y-70*fs : q.y+q.s+10*fs;
    OR.text(ctx, c.n, q.x, ly, {t:th, size:20*fs, color, maxW:w});
    OR.text(ctx, sub, q.x, ly+25*fs, {t:th, font:'mono', size:12.5*fs, color:th.muted, weight:400, maxW:w, lh:1.25});
  }
  const room = (pb, box) => ({a: pb.b.x-pb.a.x-14, b: box.x+box.w-pb.b.x});
  const subFor = c => `${OR.pct(100*c.M.fu)} urbano · ${OR.pct(100*c.M.pu)} de la gente`;

  /* ==========================================================================
     FOTOGRAMA DE VÍDEO / IMAGEN PARA COMPARTIR
     ========================================================================== */
  function renderFrame(ctx, W, H, f, fmt){
    const th=OR.theme(), reel=fmt==='reel', fs=W/1080, m=80*fs, h=S.home, o=S.other;
    const ph=(a,b)=>OR.clamp((f-a)/(b-a),0,1);
    ctx.fillStyle=th.paper; ctx.fillRect(0,0,W,H);
    OR.text(ctx, TXT.serie.toUpperCase(), m, m*0.9, {t:th, font:'mono', size:24*fs, color:th.muted, weight:400});
    ctx.globalAlpha=ph(0,20);
    const qh=OR.text(ctx, TXT.pregunta, m, m*0.9+60*fs, {t:th, size:(reel?96:76)*fs, maxW:W-2*m, lh:1});
    const tm=ph(F.migrate, F.nums-30);
    OR.text(ctx, `${tm<0.5?TXT.uniforme:TXT.real} · ${TXT.leyenda}`, m, m*0.9+60*fs+qh+(reel?28:18)*fs, {t:th, font:'mono', size:20*fs, color:th.muted, weight:400});
    ctx.globalAlpha=1;
    const top=m*0.9+60*fs+qh+(reel?90:64)*fs, box={x:m, y:top, w:W-2*m, h:(reel?740:480)*fs};
    if (f>=F.show){
      const pb=pairBox(box, h, o, fs*1.6), aIn=OR.ease(ph(F.show,F.show+30));
      ctx.globalAlpha=aIn;
      [[h,pb.a,th.home],[o,pb.b,th.ink]].forEach(([c,q,col])=>{
        drawTree(ctx, layoutReal(c), q.x, q.y, q.s, {th, alpha:OR.ease(tm), stroke:col, lw:2.5*fs});
        drawDots(ctx, dotsUniform(c), dotsReal(c), tm, q.x, q.y, q.s, Math.max(2.2*fs, dotSize(q.s, c.p/1e6)), th.ink);
        label(ctx, c, q, box, fs*1.6, th, col, subFor(c), q===pb.a?room(pb,box).a:room(pb,box).b);
      });
      ctx.globalAlpha=1;
    }
    let y=box.y+box.h+(reel?60:28)*fs;
    if (f>=F.nums){
      const rows=[['Territorio urbano', `${OR.pct(100*o.M.fu)} / ${OR.pct(100*h.M.fu)}`],
                  ['Gente que vive ahí', `${OR.pct(100*o.M.pu)} / ${OR.pct(100*h.M.pu)}`]]
        .concat(RETOS_VIDEO.map(k=>{ const r=RETOS.find(x=>x.k===k); return [r.label, `${fmtReto(r,o.M.R[k])} / ${fmtReto(r,h.M.R[k])}`]; }));
      const rh=(reel?70:50)*fs;
      rows.forEach((r,i)=>{
        ctx.globalAlpha=ph(F.nums+i*10, F.nums+i*10+20);
        OR.text(ctx, r[0], m, y+10*fs, {t:th, font:'body', size:(reel?30:24)*fs, color:th.muted, weight:400});
        OR.text(ctx, r[1], W-m, y, {t:th, font:'mono', size:(reel?44:34)*fs, color:i<2?th.ink:th.ink, align:'right', weight:500});
        ctx.save(); ctx.globalAlpha*=.6; ctx.fillStyle=th.rule; ctx.fillRect(m, y+rh-8*fs, W-2*m, 1.5*fs); ctx.restore();
        y+=rh;
      });
      ctx.globalAlpha=ph(F.nums,F.nums+20);
      OR.text(ctx, `${o.n} / ${h.n}`, W-m, y+2*fs, {t:th, font:'mono', size:18*fs, color:th.muted, align:'right', weight:400});
      ctx.globalAlpha=1;
    }
    if (f>=F.close){
      ctx.globalAlpha=ph(F.close,F.close+20); y+=(reel?50:34)*fs;
      OR.text(ctx, `En ${o.n}, el ${OR.pct(100*o.M.pu)} de la gente vive en el ${OR.pct(100*o.M.fu)} del territorio.`, m, y, {t:th, size:(reel?50:38)*fs, maxW:W-2*m, lh:1.05, color:th.home});
      ctx.globalAlpha=ph(F.close+20,F.close+40);
      OR.text(ctx, TXT.cta, m, H-m*0.9-20*fs, {t:th, font:'mono', size:20*fs, color:th.ink, weight:500});
      ctx.globalAlpha=1;
    }
  }

  /* ==========================================================================
     MODO INTERACTIVO
     ========================================================================== */
  const stage=$('stage'); let app;
  new p5(p=>{
    app=p; const cells={cols:1,cw:1,ch:1,list:[]};
    p.setup=()=>{ p.createCanvas(stage.clientWidth, stage.clientHeight).parent(stage); p.frameRate(60); p.noLoop(); };
    p.fit=()=>{
      const W=stage.clientWidth; let H=stage.clientHeight-(S.scene==='world'?36:0);
      if (S.scene==='world'){
        const list=worldList(); cells.cols=W<420?3:W<700?4:W<1000?5:6;
        cells.cw=W/cells.cols; cells.ch=cells.cw+40; cells.list=list;
        H=Math.max(H, Math.ceil(list.length/cells.cols)*cells.ch+8);
      }
      if (p.width!==W||p.height!==H) p.resizeCanvas(W,H);
      p.redraw();
    };
    p.draw=()=>{
      const ctx=p.drawingContext, th=OR.theme(), W=p.width, H=p.height, pad=W<500?16:28, h=S.home, o=S.other, fs=W<500?.85:1;
      ctx.fillStyle=th.paper; ctx.fillRect(0,0,W,H);
      if (S.scene==='home'){
        const s=Math.min(W-2*pad, H-2*pad-70)*0.9, x=(W-s)/2, y=pad+(H-2*pad-70-s)/2, e=OR.ease(S.morph);
        drawTree(ctx, layoutReal(h), x, y, s, {th, alpha:e, labels:e>0.95, stroke:th.home, lw:2});
        drawDots(ctx, dotsUniform(h), dotsReal(h), S.morph, x, y, s, dotSize(s, h.p/1e6), th.ink);
        OR.text(ctx, h.n, x, y+s+12, {t:th, size:22, color:th.home});
        OR.text(ctx, `${S.morph<0.5?TXT.uniforme:TXT.real} · ${TXT.leyenda}`, x, y+s+40, {t:th, font:'mono', size:12, color:th.muted, weight:400, maxW:s});
      }
      if (S.scene==='guess'){
        const box={x:pad,y:pad,w:W-2*pad,h:H-2*pad}, pb=pairBox(box,h,o,fs);
        drawTree(ctx, layoutReal(h), pb.a.x, pb.a.y, pb.a.s, {th, stroke:th.home, lw:2});
        drawDots(ctx, dotsReal(h), dotsReal(h), 1, pb.a.x, pb.a.y, pb.a.s, dotSize(pb.a.s, h.p/1e6), th.ink);
        const fu=guessFu(), G=layoutGuess(fu);
        drawTree(ctx, G, pb.b.x, pb.b.y, pb.b.s, {th, dash:[6,4], labels:true});
        const gd=dotsGuess(o, fu, S.gp/100); drawDots(ctx, gd, gd, 1, pb.b.x, pb.b.y, pb.b.s, dotSize(pb.b.s, o.p/1e6), th.ink);
        label(ctx, h, pb.a, box, fs, th, th.home, subFor(h), room(pb,box).a);
        label(ctx, o, pb.b, box, fs, th, th.ink, `Tu predicción: ${OR.pct(100*fu)} urbano · ${S.gp} % de la gente`, room(pb,box).b);
      }
      if (S.scene==='reveal'){
        const box={x:pad,y:pad+34,w:W-2*pad,h:H-2*pad-34}, pb=pairBox(box,h,o,fs), e=OR.ease(S.t);
        OR.text(ctx, `${OR.pct(100*o.M.pu)} de la gente en el ${OR.pct(100*o.M.fu)} del territorio`, pad, pad, {t:th, font:'mono', size:W<500?13:15, weight:500, maxW:W-2*pad});
        drawTree(ctx, layoutReal(h), pb.a.x, pb.a.y, pb.a.s, {th, stroke:th.home, lw:2});
        drawDots(ctx, dotsReal(h), dotsReal(h), 1, pb.a.x, pb.a.y, pb.a.s, dotSize(pb.a.s, h.p/1e6), th.ink);
        const from = S.guessed ? dotsGuess(o, guessFu(), S.gp/100) : dotsUniform(o);
        if (S.guessed) drawTree(ctx, layoutGuess(guessFu()), pb.b.x, pb.b.y, pb.b.s, {th, alpha:1-e, dash:[6,4]});
        drawTree(ctx, layoutReal(o), pb.b.x, pb.b.y, pb.b.s, {th, alpha:e, labels:e>0.95});
        drawDots(ctx, from, dotsReal(o), S.t, pb.b.x, pb.b.y, pb.b.s, dotSize(pb.b.s, o.p/1e6), th.ink);
        label(ctx, h, pb.a, box, fs, th, th.home, subFor(h), room(pb,box).a);
        label(ctx, o, pb.b, box, fs, th, th.ink, subFor(o), room(pb,box).b);
      }
      if (S.scene==='world'){
        const {cols,cw,ch,list}=cells, ord=ORDEN.find(x=>x.k===S.sort);
        list.forEach((c,i)=>{
          const x=(i%cols)*cw, y=Math.floor(i/cols)*ch, pd=10, bx=cw-2*pd, base=y+pd+bx, mine=c===h;
          if (c===S.other){ ctx.fillStyle=th.panel; ctx.fillRect(x+2,y+2,cw-4,ch-4); }
          drawTree(ctx, layoutReal(c), x+pd, y+pd, bx, {th, stroke:mine?th.home:th.ink, lw:mine?3:1});
          const pts=dotsReal(c); drawDots(ctx, pts, pts, 1, x+pd, y+pd, bx, cw<120?1.2:1.5, th.ink);
          ctx.save(); ctx.beginPath(); ctx.rect(x,base,cw,40); ctx.clip();
          OR.text(ctx, c.n, x+pd, base+5, {t:th, font:'body', size:cw<120?12:13, weight:700, color:mine?th.home:th.ink});
          OR.text(ctx, ord.show(c)+(mine?' · tu país':''), x+pd, base+22, {t:th, font:'mono', size:10.5, color:mine?th.home:th.muted, weight:400});
          ctx.restore();
        });
      }
      let busy=false;
      if (S.morph!==S.morphTo){ S.morph = S.morphTo>S.morph ? Math.min(S.morphTo,S.morph+ANIM.migrar) : Math.max(S.morphTo,S.morph-ANIM.migrar*2); busy=true; }
      if (S.scene==='reveal' && S.t<1){ S.t=Math.min(1,S.t+ANIM.revelar); busy=true; }
      busy?p.loop():p.noLoop();
    };
    p.mousePressed=()=>{
      if (S.scene!=='world') return;
      if (p.mouseX<0||p.mouseY<0||p.mouseX>p.width||p.mouseY>p.height) return;
      const c=cells.list[Math.floor(p.mouseY/cells.ch)*cells.cols+Math.floor(p.mouseX/cells.cw)];
      if (c && c!==S.home){ S.other=c; S.guessed=false; go('reveal'); }
    };
  }, stage);
  new ResizeObserver(()=>app && app._setupDone && app.fit()).observe(stage);

  function worldList(){
    const arr=OK.filter(c=>VISTAS[S.view].f(c) && (!S.cont||c.c===S.cont)), ord=ORDEN.find(x=>x.k===S.sort);
    if (!ord.f) arr.sort((a,b)=>OR.CONTS.indexOf(a.c)-OR.CONTS.indexOf(b.c)||b.p-a.p);
    else arr.sort((a,b)=>ord.f(b)-ord.f(a));
    return arr;
  }

  /* ---------- Panel ---------- */
  const legendHTML = c => {
    const L=layoutReal(c).leaves;
    const share=k=>L.filter(l=>l.k===k).reduce((a,l)=>a+l.w*l.h,0);
    const item=(x)=>`<span><i style="background:var(${x.col})"${URBANO.includes(x)?' class="urb"':''}></i>${x.label} <b>${OR.pct(100*share(x.k))}</b></span>`;
    return URBANO.map(item).join('')+RURAL.map(item).join('');
  };
  function retosHTML(a, b){
    const head = b ? `<div class="head"><span>Retos del territorio</span><span style="color:var(--c-home)">${a.n}</span><span>${b.n}</span></div>` : `<div class="head"><span>Retos del territorio</span></div>`;
    return head + RETOS.map(r=>{
      const va=a.M.R[r.k], w=v=>v==null?0:Math.min(100,100*v/r.max);
      if (!b) return `<div class="reto"><span>${r.label}</span><span class="v ${va==null?'na':''}">${fmtReto(r,va)}</span><span class="track home"><i style="width:${w(va)}%"></i></span></div>`;
      const vb=b.M.R[r.k];
      return `<div class="reto"><span>${r.label}</span><span class="v">${fmtReto(r,va)} · ${fmtReto(r,vb)}</span>
        <span class="pair"><span class="track home"><i style="width:${w(va)}%"></i></span><span class="track"><i style="width:${w(vb)}%"></i></span></span></div>`;
    }).join('');
  }
  function renderPanel(){
    const h=S.home, o=S.other, prob=(OR.store.get('problema')||'').trim();
    $('home').value=h.iso; $('home2').value=h.iso; $('other').value=o.iso;
    $('homeLede').textContent=TXT.lede;
    $('morphBtn').textContent=TXT.boton[S.morphTo?1:0];
    $('homeLine').innerHTML=`En ${h.n}, el <b>${OR.pct(100*h.M.pu)}</b> de la gente vive en el <b>${OR.pct(100*h.M.fu)}</b> del territorio.`;
    $('homeTiles').innerHTML=`
      <div><b>${OR.nf(h.M.dM)}</b><span>personas por km² (media)</span></div>
      <div><b>${OR.nf(h.M.dU)}</b><span>personas por km² en lo urbano</span></div>
      <div><b>${OR.nf(h.M.dR)}</b><span>personas por km² en lo rural</span></div>
      <div><b>${pct(h.M.R.casi_vacio_pct)}</b><span>del territorio casi vacío</span></div>`;
    $('homeLegend').innerHTML=legendHTML(h);
    $('homeRetos').innerHTML=retosHTML(h);
    $('homePrompt').textContent=(prob?`Tu problema: «${prob}». `:`Piensa en un problema de ${h.n}: transporte, agua, vivienda, sanidad. `)+
      `¿Lo pensabas para la densidad media (${OR.nf(h.M.dM)} por km²) o para la de donde vive la gente (${OR.nf(h.M.dU)} por km²)? ¿Y qué pasa con quien vive en el ${pct(h.M.R.casi_vacio_pct)} casi vacío?`;
    // predicción
    const fu=guessFu();
    $('guessTitle').textContent=`¿Dónde vive la gente de ${o.n}?`;
    $('gaLabel').textContent=`Parte del territorio de ${o.n} que es urbano`;
    $('gpLabel').textContent=`Parte de su población que vive en ciudades y pueblos`;
    $('ga').value=S.ga; $('gp').value=S.gp;
    $('gaOut').textContent=OR.pct(100*fu); $('gpOut').textContent=`${S.gp} de cada 100`;
    $('guessHelp').textContent=TXT.ayudaPrediccion;
    // comparación
    $('revealTitle').textContent=`${o.n} frente a ${h.n}`;
    const tol=PREDICCION;
    const lineT=()=>{ const g=100*fu, r=100*o.M.fu, k=r/Math.max(g,0.01);
      const msg=!S.guessed?'':Math.abs(Math.log(k))<Math.log(tol.tolerancia)?'Muy cerca.':k>1?`La realidad es ${OR.nf(k,OR.dec(k))} veces tu predicción.`:`La realidad es ${OR.nf(1/k,OR.dec(1/k))} veces menor que tu predicción.`;
      return `<div class="line"><span class="k">Territorio urbano de ${o.n}</span>${S.guessed?`<span class="g">${OR.pct(g)}</span>`:'<span></span>'}<span class="r">${OR.pct(r)}</span>${msg?`<span class="msg">${msg}</span>`:''}</div>`; };
    const lineP=()=>{ const g=S.gp, r=100*o.M.pu, d=r-g;
      const msg=!S.guessed?'':Math.abs(d)<=tol.toleranciaPuntos?'Muy cerca.':d>0?`La realidad es ${OR.nf(d,0)} puntos más.`:`La realidad es ${OR.nf(-d,0)} puntos menos.`;
      return `<div class="line"><span class="k">Gente que vive ahí</span>${S.guessed?`<span class="g">${OR.pct(g)}</span>`:'<span></span>'}<span class="r">${OR.pct(r)}</span>${msg?`<span class="msg">${msg}</span>`:''}</div>`; };
    $('verdict').innerHTML = lineT()+lineP()+
      `<div class="line"><span class="k">Personas por km² en lo urbano</span><span></span><span class="r">${OR.nf(o.M.dU)} <small>/ ${OR.nf(h.M.dU)}</small></span></div>`+
      `<div class="land-legend">${legendHTML(o)}</div>`;
    $('cmpRetos').innerHTML=retosHTML(h,o);
    $('reflect').textContent=(prob?`Tu problema: «${prob}». `:`Piensa en un problema de ${h.n}. `)+
      `Una solución pensada para ${h.n}, donde el ${OR.pct(100*h.M.pu)} vive en el ${OR.pct(100*h.M.fu)} del territorio, ¿funcionaría en ${o.n}, donde el ${OR.pct(100*o.M.pu)} vive en el ${OR.pct(100*o.M.fu)}? ¿Qué cambian su relieve, su clima y su suelo?`;
    // mundo
    $('worldHome').textContent=h.n;
    $('worldLegend').textContent=`${h.n}: ${OR.pct(100*h.M.fu)} del territorio es urbano y ahí vive el ${OR.pct(100*h.M.pu)} de la gente. Su cuadrado tiene el contorno de color.`;
    $('worldLand').innerHTML=URBANO.concat(RURAL).map(x=>`<span><i style="background:var(${x.col})"${URBANO.includes(x)?' class="urb"':''}></i>${x.label}</span>`).join('');
    $('worldHelp').textContent=`${VISTAS[S.view].note} Toca un país para compararlo con ${h.n}.`;
    $('stageTagText').innerHTML=`Comparando con <b>${h.n}</b> · ${OR.pct(100*h.M.fu)} urbano, ${OR.pct(100*h.M.pu)} de la gente`;
  }

  function go(scene){
    S.scene=scene;
    document.querySelectorAll('[data-scene]').forEach(el=>el.hidden=el.dataset.scene!==scene);
    document.querySelectorAll('.steps button').forEach(b=>b.setAttribute('aria-current', b.dataset.go===scene?'step':'false'));
    $('main').classList.toggle('world', scene==='world'); $('stageTag').hidden=scene!=='world';
    if (scene==='reveal') S.t=OR.reducedMotion()?1:0;
    $('panel').scrollTop=0; stage.scrollTop=0;
    renderPanel(); app && app._setupDone && app.fit();
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  $('morphBtn').addEventListener('click', ()=>{ S.morphTo=S.morphTo?0:1; if (OR.reducedMotion()) S.morph=S.morphTo; renderPanel(); app.loop(); });
  const setHome=e=>{ S.home=D.byIso[e.target.value]; OR.store.set('home', S.home.iso);
    if (S.other===S.home) S.other=S.home.iso==='EGY'?D.byIso.CAN:D.byIso.EGY;
    S.morph=0; S.morphTo=0; renderPanel(); app.fit();
    if (S.scene==='home') setTimeout(()=>{ S.morphTo=1; if (OR.reducedMotion()) S.morph=1; renderPanel(); app.loop(); }, ANIM.autoMigrarMs); };
  $('home').addEventListener('change', setHome); $('home2').addEventListener('change', setHome);
  $('other').addEventListener('change', e=>{ S.other=D.byIso[e.target.value]; renderPanel(); app.fit(); });
  $('random').addEventListener('click', ()=>{
    const pool=[...D.muestra].map(k=>D.byIso[k]).filter(c=>valid(c)&&c!==S.home&&c!==S.other);
    S.other=pool[Math.floor(Math.random()*pool.length)]; renderPanel(); app.fit(); });
  ['ga','gp'].forEach(id=>$(id).addEventListener('input', e=>{ S[id]=+e.target.value; renderPanel(); app.redraw(); }));
  $('revealBtn').addEventListener('click', ()=>{ S.guessed=true; go('reveal'); });
  ['view','cont','sort'].forEach(id=>$(id).addEventListener('change', e=>{ S[id]=e.target.value; renderPanel(); app.fit(); }));
  $('copyLink').addEventListener('click', ()=>OR.copy(OR.link({pais:S.home.iso, comparar:S.other.iso})));
  $('shareImg').addEventListener('click', ()=>{
    const c=document.createElement('canvas'); c.width=1080; c.height=1350;
    renderFrame(c.getContext('2d'), 1080, 1350, F.end, 'post');
    OR.shareImage(c, `donde-vive-${S.home.iso}-${S.other.iso}.png`, `${S.home.n} y ${S.other.n}: dónde vive la gente`, OR.link({pais:S.home.iso, comparar:S.other.iso}));
  });
  OR.onThemeChange(()=>{ app.redraw(); ex && ex.redraw(); });

  /* ==========================================================================
     MODO EXPORTACIÓN (Reels y publicaciones)
     ========================================================================== */
  let ex=null; const SIZES={reel:[1080,1920], post:[1080,1350]};
  function enterExport(fmt, theme){
    $('app').hidden=true; $('export').hidden=false; $('exFormat').value=fmt;
    if (theme){ $('exTheme').value=theme; document.documentElement.dataset.theme=theme; }
    else $('exTheme').value=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    if (ex){ ex.setFormat(fmt); return; }
    new p5(p=>{
      ex=p; let frame=0, playing=false, rec=null;
      p.setup=()=>{ const [w,h]=SIZES[fmt]; p.pixelDensity(1); p.createCanvas(w,h).parent('exFrame'); p.frameRate(30); p.noLoop(); frame=F.end; };
      p.setFormat=f=>{ fmt=f; const [w,h]=SIZES[f]; p.resizeCanvas(w,h); p.redraw(); };
      p.draw=()=>{
        renderFrame(p.drawingContext, p.width, p.height, frame, fmt);
        $('exInfo').textContent=`${(frame/30).toFixed(1)} s / ${(F.end/30).toFixed(1)} s`;
        if (playing){ frame++; if (frame>F.end){ playing=false; p.noLoop(); if (rec) finishRec(); } }
      };
      p.play=()=>{ frame=0; playing=true; p.loop(); };
      p.seek=f=>{ playing=false; frame=f; p.noLoop(); p.redraw(); };
      async function finishRec(){ const blob=await rec.stop(); OR.download(blob, `donde-vive-${S.home.iso}-${S.other.iso}-${fmt}.${rec.ext}`);
        OR.toast(rec.ext==='mp4'?'Vídeo MP4 guardado':'Vídeo WebM guardado: conviértelo a MP4 para Instagram'); rec=null; }
      p.record=()=>{ rec=OR.recorder(p.canvas,30); if(!rec){ OR.toast('Este navegador no puede grabar vídeo'); return; } rec.start(); p.play(); };
      window.OR_seek=f=>p.seek(f); window.OR_frames=F.end;
    }, 'exFrame');
  }
  $('toReel').addEventListener('click', ()=>enterExport('reel'));
  $('exBack').addEventListener('click', ()=>{ $('export').hidden=true; $('app').hidden=false; app.fit(); });
  $('exFormat').addEventListener('change', e=>ex.setFormat(e.target.value));
  $('exTheme').addEventListener('change', e=>{ document.documentElement.dataset.theme=e.target.value; });
  $('exPlay').addEventListener('click', ()=>ex.play());
  $('exRec').addEventListener('click', ()=>ex.record());
  $('exPng').addEventListener('click', async ()=>OR.download(await OR.canvasBlob(ex.canvas), `donde-vive-${S.home.iso}-${S.other.iso}.png`));

  /* ---------- Fuentes ---------- */
  $('sources').innerHTML=`<b>Fuentes.</b> ${D.meta.fuentes.territorio} Población total: ${D.meta.fuentes.poblacion} Las proporciones urbano/rural de GHSL se aplican a esa población. Urbano = ciudades + pueblos y periferias (Degree of Urbanisation). La cobertura del suelo se reparte sobre la superficie rural; la población rural se dibuja de forma ilustrativa sobre cultivos y pastizal. «Sin dato»: la fuente no ofrece valor para ese país.`;

  /* ---------- Arranque ---------- */
  await OR.fontsReady();
  if (P.modo && SIZES[P.modo]) enterExport(P.modo, P.tema==='oscuro'?'dark':P.tema==='claro'?'light':null);
  if (P.pais && P.comparar && !P.modo){
    $('sharedNotice').hidden=false;
    $('sharedNotice').textContent=`Te han enviado la comparación entre ${S.home.n} y ${S.other.n}. Antes de verla, ¿qué crees?`;
    go('guess');
  } else go('home');
  if (!P.modo && !(P.pais&&P.comparar)) setTimeout(()=>{ if (S.scene==='home' && !S.morphTo){ S.morphTo=1; if (OR.reducedMotion()) S.morph=1; renderPanel(); app.loop(); } }, ANIM.autoMigrarMs);
})();
