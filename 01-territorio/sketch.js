/* ==========================================================================
   EJERCICIO 01 · TERRITORIO Y GENTE
   Un cuadrado = el territorio de un país (área proporcional).
   Un punto    = un millón de personas.
   Escenas: tu país → predicción → comparación → el mundo.
   Modo exportación: Reel 1080×1920 y publicación 1080×1350.
   ========================================================================== */
(async function(){
  const D = await OR.loadData();
  const $ = id => document.getElementById(id);

  /* ---------- Textos editables ---------- */
  const TXT = {
    serie:'Otras realidades · 01 Territorio y gente',
    leyenda:'1 punto = 1 millón de personas',
    cta:'¿Y tu país? Compáralo tú: enlace en la bio',
    vistas:{
      sample:{t:'Muestra diversa', note:'Cuarenta países elegidos por contraste: muy poblados y casi vacíos, ricos y pobres, islas, desiertos y países sin salida al mar, en los cinco continentes.'},
      gdp:{t:'Top 30 por PIB', note:'Las treinta economías más grandes. Mira cuántos continentes quedan fuera y cuánta gente no aparece.'},
      pop:{t:'Top 30 por población', note:'Los treinta países con más habitantes. Compárala con la vista por PIB: casi la misma parte de la economía mundial, pero mucha más humanidad.'},
      all:{t:'Todos los países', note:'Los 195 países. Filtra por continente para que la rejilla sea manejable.'}
    }
  };

  /* ---------- Estado ---------- */
  const P = OR.params();
  // Herramientas de producción (Reels): solo visibles con ?herramientas=1
  if (!P.herramientas) document.getElementById('toReel').hidden = true;
  const S = {
    home: D.byIso[P.pais] || D.byIso[OR.store.get('home')] || D.byIso.ESP,
    other: D.byIso[P.comparar] || D.byIso.IND,
    scene:'home', ga:0, gp:0, guessed:false,
    view:'sample', cont:'', sort:'cont', anim:1, t:1
  };
  if (S.other===S.home) S.other = S.home.iso==='IND' ? D.byIso.CHN : D.byIso.IND;

  const TOP_GDP = new Set(D.paises.filter(c=>c.g!=null).sort((a,b)=>b.g-a.g).slice(0,30).map(c=>c.iso));
  const TOP_POP = new Set(D.paises.slice().sort((a,b)=>b.p-a.p).slice(0,30).map(c=>c.iso));
  const VIEWF = { sample:c=>D.muestra.has(c.iso), gdp:c=>TOP_GDP.has(c.iso), pop:c=>TOP_POP.has(c.iso), all:()=>true };

  /* ---------- Selectores ---------- */
  const byName = D.paises.slice().sort((a,b)=>a.n.localeCompare(b.n,'es'));
  byName.forEach(c=>{ $('home').add(new Option(c.n, c.iso)); $('home2').add(new Option(c.n, c.iso)); });
  OR.CONTS.forEach(k=>{
    const g=document.createElement('optgroup'); g.label=k;
    byName.filter(c=>c.c===k).forEach(c=>g.appendChild(new Option(c.n, c.iso)));
    $('other').appendChild(g);
    $('cont').add(new Option(k,k));
  });
  $('problem').value = OR.store.get('problema') || '';

  /* ---------- Cálculos ---------- */
  const rA = ()=>S.other.a/S.home.a, rP = ()=>S.other.p/S.home.p;
  const gA = ()=>Math.pow(10,S.ga), gP = ()=>Math.pow(10,S.gp);
  const densRank = c => D.paises.slice().sort((a,b)=>b.d-a.d).indexOf(c)+1;
  function sliderRange(){ // el rango cubre la respuesta real con margen
    const ext = Math.max(2, Math.ceil(Math.abs(Math.log10(rA()))+1), Math.ceil(Math.abs(Math.log10(rP()))+1));
    ['ga','gp'].forEach(id=>{ $(id).min=-ext; $(id).max=ext; });
  }

  /* ==========================================================================
     DIBUJO COMPARTIDO
     ========================================================================== */
  // Dos cuadrados alineados abajo, a la misma escala, con etiquetas.
  // A y B: {key, a, n, name, sub, dot, stroke, dash, ghost}
  function drawPair(ctx, box, A, B, o={}){
    const t=o.t||OR.theme(), fs=o.fs||1, gap=28*fs, labelH=(o.labels===false?0:58*fs);
    const maxA = Math.max(A.a, B.a, B.ghost||0, o.scaleA||0);
    const sA=Math.sqrt(A.a), sB=Math.sqrt(Math.max(B.a, B.ghost||0));
    const s = Math.min((box.w-gap)/(sA+Math.sqrt(Math.max(B.a,B.ghost||0,o.scaleA||0))), (box.h-labelH)/Math.sqrt(maxA));
    const base = box.y+box.h-labelH, ax=box.x, bx=box.x+sA*s+gap;
    const sideA=sA*s, sideB=Math.sqrt(B.a)*s;
    const ds = Math.max(1.4, Math.min(4*fs, (o.ds||2.4)*fs));
    if (B.ghost){ const gs=Math.sqrt(B.ghost)*s;
      OR.square(ctx, bx, base-gs, gs, 0, '', {stroke:t.muted, dash:[5*fs,4*fs], lw:1.2*fs}); }
    OR.square(ctx, ax, base-sideA, sideA, A.n, A.key, {stroke:t.home, lw:1.6*fs, dot:t.home, ds});
    OR.square(ctx, bx, base-sideB, sideB, B.n, B.key, {stroke:B.stroke||t.ink, dash:B.dash, lw:1.6*fs, dot:B.dot||t.dot, ds});
    if (labelH){
      const lab = (L,x,side,col)=>{
        const narrow = side < 150*fs, y = narrow ? base-side-labelH+6*fs : base+10*fs;
        const lx = Math.min(x, box.x+box.w-170*fs);
        OR.text(ctx, L.name, lx, y, {t, size:20*fs, color:col});
        OR.text(ctx, L.sub, lx, y+25*fs, {t, font:'mono', size:12.5*fs, color:t.muted, weight:400});
      };
      lab(A, ax, sideA, t.home); lab(B, bx, sideB, t.ink);
    }
    return {s, base};
  }
  const labelFor = c => ({name:c.n, sub:`${OR.popShort(c.p)} · ${OR.nf(c.a)} km²`});

  /* ---------- Fotograma de vídeo / imagen para compartir ---------- */
  const F = {q:0, home:75, grow:120, nums:270, close:390, end:480};
  function renderFrame(ctx, W, H, f, fmt){
    const t=OR.theme(), reel = fmt==='reel', fs = W/1080, m=80*fs;
    const h=S.home, o=S.other, bigger = o.a>=h.a;
    const ph = (a,b)=>OR.clamp((f-a)/(b-a),0,1);
    ctx.fillStyle=t.paper; ctx.fillRect(0,0,W,H);
    OR.text(ctx, TXT.serie.toUpperCase(), m, m*0.9, {t, font:'mono', size:24*fs, color:t.muted, weight:400});
    // Pregunta
    const q = bigger ? `¿Cuántas veces cabe ${h.n} en ${o.n}?` : `¿Cuántas veces cabe ${o.n} en ${h.n}?`;
    ctx.globalAlpha = ph(0,20);
    const qh = OR.text(ctx, q, m, m*0.9+60*fs, {t, size:(reel?96:76)*fs, maxW:W-2*m, lh:1});
    ctx.globalAlpha = 1;
    // Cuadrados
    ctx.globalAlpha = ph(0,20);
    OR.text(ctx, TXT.leyenda, m, m*0.9+60*fs+qh+(reel?28:18)*fs, {t, font:'mono', size:20*fs, color:t.muted, weight:400});
    ctx.globalAlpha = 1;
    const top = m*0.9+60*fs+qh+(reel?90:64)*fs;
    const box = {x:m, y:top, w:W-2*m, h:(reel?760:500)*fs};
    const g = OR.ease(ph(F.grow, F.nums-20));
    if (f>=F.home){
      const aIn = OR.ease(ph(F.home, F.grow));
      const Bn = o.p/1e6*OR.ease(ph(F.grow+40, F.nums));
      const Ba = Math.exp(Math.log(h.a)+(Math.log(o.a)-Math.log(h.a))*g);
      ctx.globalAlpha = aIn;
      drawPair(ctx, box, {key:h.iso, a:h.a, n:h.p/1e6*aIn, ...labelFor(h)},
        {key:o.iso, a:Ba, n:Bn, ...(g>0.02?labelFor(o):{name:'', sub:''})},
        {t, fs:fs*1.6, ds:3, scaleA:o.a});
      ctx.globalAlpha = 1;
    }
    // Cifras
    let y = box.y+box.h+(reel?60:30)*fs;
    if (f>=F.nums){
      const rows = [
        ['Territorio', OR.times(rA()), S.guessed?`tú dijiste ${OR.times(gA())}`:''],
        ['Población', OR.times(rP()), S.guessed?`tú dijiste ${OR.times(gP())}`:''],
        ['Personas por km²', `${OR.nf(o.d)} / ${OR.nf(h.d)}`, `${o.n} / ${h.n}`]
      ];
      rows.forEach((r,i)=>{
        ctx.globalAlpha = ph(F.nums+i*12, F.nums+i*12+20);
        const rh=(reel?84:66)*fs;
        OR.text(ctx, r[0], m, y+12*fs, {t, font:'body', size:(reel?30:26)*fs, color:t.muted, weight:400});
        OR.text(ctx, r[1], W-m, y, {t, font:'mono', size:(reel?56:46)*fs, color:i<2?t.ink:t.home, align:'right', weight:500});
        if (r[2]) OR.text(ctx, r[2], W-m, y+(reel?60:50)*fs, {t, font:'mono', size:(reel?20:17)*fs, color:t.muted, align:'right', weight:400});
        ctx.save(); ctx.globalAlpha*=.6; ctx.fillStyle=t.rule; ctx.fillRect(m, y+rh-6*fs, W-2*m, 1.5*fs); ctx.restore();
        y += rh+(r[2]?12:0)*fs;
      });
      ctx.globalAlpha = 1;
    }
    if (f>=F.close){
      ctx.globalAlpha = ph(F.close, F.close+20);
      y += (reel?36:18)*fs;
      const eq = `Con la densidad de ${o.n}, ${h.n} tendría ${OR.pop(h.a*o.d)} de habitantes.`;
      OR.text(ctx, eq, m, y, {t, size:(reel?50:40)*fs, maxW:W-2*m, lh:1.05, color:t.home});
      ctx.globalAlpha = 1;
    }
    if (f>=F.close){ ctx.globalAlpha = ph(F.close+20, F.close+40);
      OR.text(ctx, TXT.cta, m, H-m*0.9-20*fs, {t, font:'mono', size:20*fs, color:t.ink, weight:500}); ctx.globalAlpha=1; }
  }

  /* ==========================================================================
     MODO INTERACTIVO
     ========================================================================== */
  const stage = $('stage');
  let app;
  new p5(p=>{
    app = p;
    let cells = {cols:1, cw:1, ch:1, list:[]};
    p.setup = ()=>{ p.createCanvas(stage.clientWidth, stage.clientHeight).parent(stage); p.frameRate(60); p.noLoop(); };
    p.fit = ()=>{
      const W = stage.clientWidth;
      let H = stage.clientHeight;
      if (S.scene==='world'){
        const list = worldList(); cells.cols = W<420?3:W<700?4:W<1000?5:6;
        cells.cw = W/cells.cols; cells.ch = cells.cw+40; cells.list = list;
        H = Math.max(H, Math.ceil(list.length/cells.cols)*cells.ch + 8);
      }
      if (p.width!==W || p.height!==H) p.resizeCanvas(W,H);
      p.redraw();
    };
    p.draw = ()=>{
      const ctx=p.drawingContext, t=OR.theme(), W=p.width, H=p.height, pad=W<500?16:28;
      ctx.fillStyle=t.paper; ctx.fillRect(0,0,W,H);
      const h=S.home, o=S.other;
      if (S.scene==='home'){
        const side = Math.min(W-2*pad, H-2*pad-70)*0.86, x=(W-side)/2, y=pad+(H-2*pad-70-side)/2;
        OR.square(ctx, x, y, side, h.p/1e6*OR.ease(S.anim), h.iso, {stroke:t.home, lw:1.6, dot:t.home, ds:W<500?2:2.6});
        OR.text(ctx, h.n, x, y+side+12, {t, size:22, color:t.home});
        OR.text(ctx, `${OR.popShort(h.p)} · ${OR.nf(h.a)} km² · ${TXT.leyenda}`, x, y+side+40, {t, font:'mono', size:12, color:t.muted, weight:400, maxW:side});
      }
      if (S.scene==='guess'){
        drawPair(ctx, {x:pad, y:pad, w:W-2*pad, h:H-2*pad},
          {key:h.iso, a:h.a, n:h.p/1e6, ...labelFor(h)},
          {key:'guess-'+o.iso, a:h.a*gA(), n:h.p*gP()/1e6, name:`Tu predicción: ${o.n}`,
           sub:`${OR.popShort(h.p*gP())} · ${OR.nf(h.a*gA())} km²`, dash:[6,4], stroke:t.ink, dot:t.muted},
          {t, fs:W<500?.85:1});
      }
      if (S.scene==='reveal'){
        const e = OR.ease(S.t);
        const ga = S.guessed ? h.a*gA() : h.a, gp = S.guessed ? h.p*gP() : 0;
        const a = Math.exp(Math.log(ga)+(Math.log(o.a)-Math.log(ga))*e);
        const n = (gp+(o.p-gp)*e)/1e6;
        OR.text(ctx, `${OR.times(rA())} territorio · ${OR.times(rP())} población`, pad, pad, {t, font:'mono', size:W<500?13:15, color:t.ink, weight:500});
        drawPair(ctx, {x:pad, y:pad+34, w:W-2*pad, h:H-2*pad-34},
          {key:h.iso, a:h.a, n:h.p/1e6, ...labelFor(h)},
          {key:o.iso, a, n, ...labelFor(o), ghost:S.guessed?ga:0},
          {t, fs:W<500?.85:1, scaleA:o.a});
      }
      if (S.scene==='world'){
        const {cols,cw,ch,list} = cells;
        list.forEach((c,i)=>{
          const x=(i%cols)*cw, y=Math.floor(i/cols)*ch, pd=10, bx=cw-2*pd;
          if (c===S.other){ ctx.fillStyle=t.panel; ctx.fillRect(x+2,y+2,cw-4,ch-4); }
          const s = bx/Math.sqrt(Math.max(c.a,h.a)), side=Math.sqrt(c.a)*s, base=y+pd+bx, hs=Math.sqrt(h.a)*s;
          OR.square(ctx, x+pd, base-side, side, c.p/1e6, c.iso, {stroke:t.ink, dot:t.dot, ds:cw<120?1.3:1.6});
          OR.square(ctx, x+pd, base-hs, hs, 0, '', {stroke:t.home, dash:[3,3], lw:1.5});
          ctx.save(); ctx.beginPath(); ctx.rect(x, base, cw, 40); ctx.clip();
          const mine = c===h;
          OR.text(ctx, c.n, x+pd, base+5, {t, font:'body', size:cw<120?12:13, weight:700, color:mine?t.home:t.ink});
          OR.text(ctx, OR.nf(c.d)+' hab/km²'+(mine?' · tu país':''), x+pd, base+22, {t, font:'mono', size:10.5, color:mine?t.home:t.muted, weight:400});
          ctx.restore();
        });
      }
      // animaciones
      let busy=false;
      if (S.anim<1){ S.anim=Math.min(1,S.anim+0.012); busy=true; }
      if (S.scene==='reveal' && S.t<1){ S.t=Math.min(1,S.t+0.011); busy=true; }
      busy ? p.loop() : p.noLoop();
    };
    p.mousePressed = ()=>{
      if (S.scene!=='world') return;
      if (p.mouseX<0||p.mouseY<0||p.mouseX>p.width||p.mouseY>p.height) return;
      const c = cells.list[Math.floor(p.mouseY/cells.ch)*cells.cols+Math.floor(p.mouseX/cells.cw)];
      if (c && c!==S.home){ S.other=c; S.guessed=false; go('reveal'); }
    };
  }, stage);
  new ResizeObserver(()=>app && app._setupDone && app.fit()).observe(stage);

  function worldList(){
    const arr = D.paises.filter(c=>VIEWF[S.view](c) && (!S.cont || c.c===S.cont));
    if (S.sort==='cont') arr.sort((a,b)=>OR.CONTS.indexOf(a.c)-OR.CONTS.indexOf(b.c) || b.p-a.p);
    else arr.sort((a,b)=>b[S.sort]-a[S.sort]);
    return arr;
  }

  /* ---------- Panel ---------- */
  function renderPanel(){
    const h=S.home, o=S.other;
    $('home').value=h.iso; $('home2').value=h.iso; $('other').value=o.iso;
    $('worldHome').textContent = h.n;
    $('worldLegend').textContent = `El contorno punteado de cada celda es ${h.n}, dibujado a la misma escala que ese país.`;
    $('worldHelp').textContent = `Cada celda tiene su propia escala. Toca un país para compararlo con ${h.n}.`;
    $('stageTagText').innerHTML = `Comparando todos con <b>${h.n}</b> · ${OR.nf(h.d)} hab/km²`;
    $('homeTiles').innerHTML = `
      <div><b>${OR.nf(h.a)}</b><span>km²</span></div>
      <div><b>${OR.popShort(h.p)}</b><span>habitantes</span></div>
      <div><b>${OR.nf(h.d)}</b><span>personas por km²</span></div>
      <div><b>${densRank(h)} / ${D.paises.length}</b><span>puesto mundial en densidad</span></div>`;
    $('problemLabel').textContent = `Un problema de ${h.n} que tenga que ver con su tamaño o su población`;
    // predicción
    $('guessTitle').textContent = `¿Cómo es ${o.n} comparado con ${h.n}?`;
    $('gaLabel').textContent = `Territorio de ${o.n} frente a ${h.n}`;
    $('gpLabel').textContent = `Población de ${o.n} frente a ${h.n}`;
    $('ga').value=S.ga; $('gp').value=S.gp;
    $('gaOut').textContent = OR.times(gA()); $('gpOut').textContent = OR.times(gP());
    // comparación
    $('revealTitle').textContent = `${o.n} frente a ${h.n}`;
    const line = (k,g,r)=>{
      let msg='';
      if (S.guessed){ const err=r/g;
        msg = Math.abs(Math.log(err))<Math.log(1.25) ? 'Muy cerca.' :
          err>1 ? `Te quedaste corto: la realidad es ${OR.nf(err,OR.dec(err))} veces tu predicción.`
                : `Te pasaste: la realidad es ${OR.nf(1/err,OR.dec(1/err))} veces menor que tu predicción.`; }
      return `<div class="line"><span class="k">${k}</span>${S.guessed?`<span class="g">${OR.times(g)}</span>`:'<span></span>'}<span class="r">${OR.times(r)}</span>${msg?`<span class="msg">${msg}</span>`:''}</div>`;
    };
    $('verdict').innerHTML = line(`Territorio de ${o.n}`, gA(), rA()) + line(`Población de ${o.n}`, gP(), rP()) +
      `<div class="line"><span class="k">Personas por km²</span><span></span><span class="r">${OR.nf(o.d)} <small>/ ${OR.nf(h.d)}</small></span></div>`;
    $('equiv').innerHTML = `Con la densidad de ${o.n}, ${h.n} tendría <b>${OR.pop(h.a*o.d)}</b> de habitantes en lugar de ${OR.pop(h.p)}.<br>Con la densidad de ${h.n}, ${o.n} tendría <b>${OR.pop(o.a*h.d)}</b> en lugar de ${OR.pop(o.p)}.`;
    const prob = $('problem').value.trim();
    const more = `${OR.ratio(rP())} personas`;
    $('reflect').textContent = (prob ? `Tu problema: «${prob}». ` : `Piensa en un problema de ${h.n}: transporte, agua, vivienda o sanidad. `) +
      `¿La solución que funciona en ${h.n} seguiría funcionando con ${more}, en un territorio ${o.a>h.a?'más grande':'más pequeño'} y con otra historia, otros recursos y otra geografía? ¿Qué tendría que cambiar primero?`;
    // mundo
    const v=TXT.vistas[S.view], base=D.paises.filter(VIEWF[S.view]);
    $('viewTitle').textContent=v.t; $('viewNote').textContent=v.note;
    const sp=base.reduce((a,c)=>a+c.p,0), sg=base.reduce((a,c)=>a+(c.g||0),0);
    $('covTiles').innerHTML = `<div><b>${OR.nf(100*sp/D.worldP,1)} %</b><span>de la población mundial</span></div><div><b>${OR.nf(100*sg/D.worldG,1)} %</b><span>del PIB mundial</span></div>`;
    $('contTiles').innerHTML = OR.CONTS.map(k=>{ const n=base.filter(c=>c.c===k).length; return `<div><b class="${n?'':'zero'}">${n}</b><span>${k}</span></div>`; }).join('');
  }

  function go(scene){
    S.scene=scene;
    document.querySelectorAll('[data-scene]').forEach(el=>el.hidden = el.dataset.scene!==scene);
    document.querySelectorAll('.steps button').forEach(b=>b.setAttribute('aria-current', b.dataset.go===scene?'step':'false'));
    $('main').classList.toggle('world', scene==='world');
    $('stageTag').hidden = scene!=='world';
    if (scene==='guess') sliderRange();
    if (scene==='reveal') S.t = OR.reducedMotion()?1:0;
    if (scene==='home') S.anim = OR.reducedMotion()?1:0;
    $('panel').scrollTop=0; stage.scrollTop=0;
    renderPanel(); app && app._setupDone && app.fit();
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  const setHome = e=>{
    S.home=D.byIso[e.target.value]; OR.store.set('home', S.home.iso);
    if (S.other===S.home) S.other = S.home.iso==='IND'?D.byIso.CHN:D.byIso.IND;
    S.anim = OR.reducedMotion()?1:0; renderPanel(); app.fit();
  };
  $('home').addEventListener('change', setHome);
  $('home2').addEventListener('change', setHome);
  $('problem').addEventListener('input', e=>OR.store.set('problema', e.target.value));
  const resetGuess = ()=>{ S.ga=0; S.gp=0; sliderRange(); renderPanel(); app.fit(); };
  $('other').addEventListener('change', e=>{ S.other=D.byIso[e.target.value]; resetGuess(); });
  $('random').addEventListener('click', ()=>{
    const pool=[...D.muestra].map(k=>D.byIso[k]).filter(c=>c!==S.home&&c!==S.other);
    S.other=pool[Math.floor(Math.random()*pool.length)]; resetGuess();
  });
  ['ga','gp'].forEach(id=>$(id).addEventListener('input', e=>{ S[id]=+e.target.value; renderPanel(); app.redraw(); }));
  $('revealBtn').addEventListener('click', ()=>{ S.guessed=true; go('reveal'); });
  ['view','cont','sort'].forEach(id=>$(id).addEventListener('change', e=>{ S[id]=e.target.value; renderPanel(); app.fit(); }));
  $('copyLink').addEventListener('click', ()=>OR.copy(OR.link({pais:S.home.iso, comparar:S.other.iso})));
  $('shareImg').addEventListener('click', async ()=>{
    const c=document.createElement('canvas'); c.width=1080; c.height=1350;
    renderFrame(c.getContext('2d'), 1080, 1350, F.end, 'post');
    OR.shareImage(c, `territorio-${S.home.iso}-${S.other.iso}.png`, `${S.home.n} frente a ${S.other.n}`, OR.link({pais:S.home.iso, comparar:S.other.iso}));
  });
  OR.onThemeChange(()=>{ app.redraw(); ex && ex.redraw(); });

  /* ==========================================================================
     MODO EXPORTACIÓN
     ========================================================================== */
  let ex=null;
  const SIZES = {reel:[1080,1920], post:[1080,1350]};
  function enterExport(fmt, theme){
    $('app').hidden=true; $('export').hidden=false;
    $('exFormat').value=fmt; if (theme){ $('exTheme').value=theme; document.documentElement.dataset.theme=theme; }
    else $('exTheme').value = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    if (ex) { ex.setFormat(fmt); return; }
    new p5(p=>{
      ex=p; let frame=0, playing=false, rec=null;
      p.setup=()=>{ const [w,h]=SIZES[fmt]; p.pixelDensity(1); p.createCanvas(w,h).parent('exFrame'); p.frameRate(30); p.noLoop(); frame=F.end; };
      p.setFormat=f=>{ fmt=f; const [w,h]=SIZES[f]; p.resizeCanvas(w,h); p.redraw(); };
      p.draw=()=>{
        renderFrame(p.drawingContext, p.width, p.height, frame, fmt);
        $('exInfo').textContent = `${(frame/30).toFixed(1)} s / ${(F.end/30).toFixed(1)} s`;
        if (playing){ frame++; if (frame>F.end){ playing=false; p.noLoop(); if (rec) finishRec(); } }
      };
      p.play=()=>{ frame=0; playing=true; p.loop(); };
      p.seek=f=>{ playing=false; frame=f; p.noLoop(); p.redraw(); };
      async function finishRec(){ const blob=await rec.stop(); OR.download(blob, `territorio-${S.home.iso}-${S.other.iso}-${fmt}.${rec.ext}`);
        OR.toast(rec.ext==='mp4'?'Vídeo MP4 guardado':'Vídeo WebM guardado: conviértelo a MP4 para Instagram'); rec=null; }
      p.record=()=>{ rec=OR.recorder(p.canvas,30); if(!rec){ OR.toast('Este navegador no puede grabar vídeo'); return; } rec.start(); p.play(); };
      window.OR_seek = f=>p.seek(f); window.OR_frames = F.end;
    }, 'exFrame');
  }
  $('toReel').addEventListener('click', ()=>enterExport('reel'));
  $('exBack').addEventListener('click', ()=>{ $('export').hidden=true; $('app').hidden=false; app.fit(); });
  $('exFormat').addEventListener('change', e=>ex.setFormat(e.target.value));
  $('exTheme').addEventListener('change', e=>{ document.documentElement.dataset.theme=e.target.value; });
  $('exPlay').addEventListener('click', ()=>ex.play());
  $('exRec').addEventListener('click', ()=>ex.record());
  $('exPng').addEventListener('click', async ()=>OR.download(await OR.canvasBlob(ex.canvas), `territorio-${S.home.iso}-${S.other.iso}.png`));

  /* ---------- Fuentes de datos ---------- */
  $('sources').innerHTML = `<b>Fuentes.</b> ${D.meta.fuentes.poblacion} ${D.meta.fuentes.pib} ${D.meta.fuentes.superficie} ${D.meta.notas}`;

  /* ---------- Arranque ---------- */
  await OR.fontsReady();
  if (P.modo && SIZES[P.modo]) enterExport(P.modo, P.tema==='oscuro'?'dark':P.tema==='claro'?'light':null);
  if (P.pais && P.comparar && !P.modo){
    $('sharedNotice').hidden=false;
    $('sharedNotice').textContent=`Te han enviado la comparación entre ${S.home.n} y ${S.other.n}. Antes de verla, ¿qué crees?`;
    go('guess');
  } else go('home');
})();
