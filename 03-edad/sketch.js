/* ==========================================================================
   EJERCICIO 03 · LA EDAD DEL PAÍS
   «Si tu país fueran 100 personas»: cuadrícula 10×10, cada cuadrado una
   persona de cada 100, coloreada por etapa de vida y ordenada de abajo
   arriba (de los más pequeños a los mayores). Cada etapa pide servicios
   distintos. Indicadores: edad mediana, hijos por mujer, esperanza de vida
   y dependientes por cada 10 personas en edad de trabajar.
   ========================================================================== */
(async function(){
  const D = await OR.loadData();
  const $ = id => document.getElementById(id);

  /* ==========================================================================
     CONFIGURACIÓN · todo lo que se puede cambiar sin tocar la lógica
     Colores: en shared/css/theme.css (variables --c-age-…)
     Cortes de edad: en tools/procesar-edades.py (ETAPAS), luego regenerar datos
     ========================================================================== */
  const ETAPAS = [
    {k:'infancia', label:'Primera infancia', rango:'0–5',   col:'--c-age-infancia', servicios:'Guarderías, vacunas y salud infantil'},
    {k:'escolar',  label:'Edad escolar',     rango:'6–17',  col:'--c-age-escolar',  servicios:'Escuelas y profesorado'},
    {k:'jovenes',  label:'Jóvenes',          rango:'18–24', col:'--c-age-jovenes',  servicios:'Universidad, formación y primer empleo'},
    {k:'trabajo',  label:'Edad de trabajar', rango:'25–64', col:'--c-age-trabajo',  servicios:'Empleo, vivienda y transporte'},
    {k:'mayores',  label:'Mayores',          rango:'65+',   col:'--c-age-mayores',  servicios:'Pensiones, sanidad y cuidados'},
  ];
  // Grupos de la predicción (más simples que las etapas): qué etapas agrupan y su color
  const GRUPOS_PREDICCION = [
    {k:'menores', label:'Menores de 18', etapas:['infancia','escolar'], col:'--c-age-escolar'},
    {k:'adultos', label:'De 18 a 64',    etapas:['jovenes','trabajo'],  col:'--c-age-trabajo'},
    {k:'mayores', label:'65 o más',      etapas:['mayores'],            col:'--c-age-mayores'},
  ];
  // Indicadores: clave en los datos, texto, máximo de la barra y decimales
  const INDICADORES = [
    {k:'edad_mediana',        label:'Edad mediana (años)',                           max:60, dec:1},
    {k:'hijos_por_mujer',     label:'Hijos por mujer',                               max:7,  dec:1},
    {k:'esperanza_vida',      label:'Esperanza de vida (años)',                      max:90, dec:0},
    {k:'dependientes_por_10', label:'Dependientes por cada 10 en edad de trabajar',  max:10, dec:1},
  ];
  // Ordenaciones de la rejilla del mundo
  const ORDEN = [
    {k:'mediana',  label:'Edad mediana (de menor a mayor)', f:c=>-c.E.edad_mediana, show:c=>`${OR.nf(c.E.edad_mediana,1)} años de mediana`},
    {k:'menores',  label:'Menores de 18',                   f:c=>c.cn[0]+c.cn[1],      show:c=>`${c.cn[0]+c.cn[1]} de 100 menores de 18`},
    {k:'mayores',  label:'Mayores de 65',                   f:c=>c.cn[4],             show:c=>`${c.cn[4]} de 100 con 65 o más`},
    {k:'dep',      label:'Dependientes por cada 10',        f:c=>c.E.dependientes_por_10, show:c=>`${OR.nf(c.E.dependientes_por_10,1)} dependientes por 10`},
    {k:'hijos',    label:'Hijos por mujer',                 f:c=>c.E.hijos_por_mujer, show:c=>`${OR.nf(c.E.hijos_por_mujer,1)} hijos por mujer`},
    {k:'cont',     label:'Continente',                      f:null,                  show:c=>`${OR.nf(c.E.edad_mediana,1)} años de mediana`},
  ];
  const VISTAS = {
    sample:{label:'Muestra diversa (40)', f:c=>D.muestra.has(c.iso), note:'Cuarenta países elegidos por contraste. Cada cuadrícula son 100 personas, sea cual sea el tamaño del país.'},
    all:{label:'Todos los países', f:()=>true, note:'Todos los países. Filtra por continente para que la rejilla sea manejable.'},
  };
  // Predicción: valores iniciales y tolerancia (en personas de cada 100)
  const PREDICCION = {menoresInicial:30, mayoresInicial:10, tolerancia:4};
  // Rejilla del mundo: cómo destacar tu país
  // atenuar: opacidad de los demás países · atenuarComparado: el país con el que comparas (con fondo sombreado)
  const MUNDO = {atenuar:0.35, atenuarComparado:0.8, grosorPropio:5};
  // Animación (fotogramas a 60 fps en la web)
  const ANIM = {llenar:0.012, revelar:0.012};
  // Vídeo (fotogramas a 30 fps): cuándo empieza cada parte
  const F = {show:30, fill:55, legend:190, nums:240, close:390, end:490};
  // Textos
  const TXT = {
    serie:'Otras realidades · 03 La edad del país',
    pregunta:'¿Cuántos años tiene tu país?',
    sub:'Si cada país fuera 100 personas · ▪ = 1 persona',
    cta:'¿Y tu país? Compáralo tú: enlace en la bio',
    rotulo:'100 personas · ▪ = 1', arriba:'↑ mayores', abajo:'↓ pequeños',
    lede:'Si tu país fuera 100 personas, ¿cuántas serían niños, jóvenes, adultos o mayores? Cada etapa de la vida pide servicios distintos: lo que un país necesita en escuelas, otro lo necesita en cuidados.',
    ayudaPrediccion:'A la derecha, tu predicción: de abajo arriba, menores de 18, de 18 a 64 y 65 o más.',
    linea:c=>`La mitad de la población de ${c.n} tiene menos de <b>${OR.nf(Math.round(c.E.edad_mediana))}</b> años. <b>${c.cn[0]+c.cn[1]}</b> de cada 100 están en edad de guardería o escuela; <b>${c.cn[4]}</b> tienen 65 años o más.`,
    // Frase final del vídeo y de la imagen para compartir: a = tu país, b = el otro
    cierre:(a,b)=>`En ${a.n}, ${a.cn[0]+a.cn[1]} de cada 100 personas son menores de 18 y ${a.cn[4]} tienen 65 o más; en ${b.n}, ${b.cn[0]+b.cn[1]} y ${b.cn[4]}.`,
  };

  /* ==========================================================================
     DATOS DERIVADOS
     ========================================================================== */
  // 100 personas por etapa (método del mayor resto)
  function cien(et){
    const raw=ETAPAS.map(s=>(et[s.k]||0)*100), base=raw.map(Math.floor); let left=100-base.reduce((a,b)=>a+b,0);
    raw.map((v,i)=>[v-base[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,left).forEach(([,i])=>base[i]++);
    return base;
  }
  D.paises.forEach(c=>{ if (c.ed){ c.E=c.ed; c.cn=cien(c.ed.etapas); } });   // cn = recuento de 100 personas por etapa
  const OK = D.paises.filter(c=>c.E);
  const valid = c => c && c.E;

  /* ---------- Estado ---------- */
  const P = OR.params();
  if (!P.herramientas && !window.OR_ESTUDIO) $('toReel').hidden = true;
  const S = {
    home: [D.byIso[P.pais], D.byIso[OR.store.get('home')], D.byIso.ESP].find(valid),
    other: [D.byIso[P.comparar], D.byIso.NGA].find(valid),
    scene:'home', gy:PREDICCION.menoresInicial, gm:PREDICCION.mayoresInicial, guessed:false,
    fill:0, t:1, view:'sample', cont:'', sort:'mediana'
  };
  if (S.other===S.home) S.other = S.home.iso==='NGA' ? D.byIso.JPN : D.byIso.NGA;

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
  const fmtInd = (r,v) => v==null ? 'sin dato' : OR.nf(v, r.dec);
  const perCell = c => { const v=c.p/100; return v>=1e6 ? `${OR.nf(v/1e6,1)} millones` : `${OR.nf(v/1e3)} mil`; };

  /* ==========================================================================
     CUADRÍCULA DE 100 PERSONAS
     ========================================================================== */
  // Colores (variables CSS) de las 100 celdas en orden de llenado
  const cellsReal = c => { const out=[]; c.cn.forEach((k,i)=>{ for(let j=0;j<k;j++) out.push(ETAPAS[i].col); }); return out; };
  function cellsGuess(gy, gm){
    const y=Math.max(0,Math.min(100,gy)), m=Math.max(0,Math.min(100-y,gm)), a=100-y-m, out=[];
    [[y,0],[a,1],[m,2]].forEach(([k,i])=>{ for(let j=0;j<k;j++) out.push(GRUPOS_PREDICCION[i].col); });
    return out;
  }
  // Dibuja la cuadrícula. A → B con transición t (0..1); fill = parte llenada (0..1)
  function drawGrid(ctx, x, y, S, A, B, o={}){
    const th=o.th||OR.theme(), t=o.t??1, fill=o.fill??1, g=S*0.014, s=(S-9*g)/10;
    for (let i=0;i<100;i++){
      const cx=x+(i%10)*(s+g), cy=y+(9-Math.floor(i/10))*(s+g);
      const vis=OR.clamp((fill*100-i)/6+1,0,1);
      ctx.fillStyle=th.panel; ctx.fillRect(cx,cy,s,s);
      if (vis<=0) continue;
      const e=OR.ease(OR.clamp(t*1.4-i/100*0.4,0,1));
      ctx.save(); ctx.globalAlpha*=vis;
      if (e<1){ ctx.fillStyle=th.v(A[i]); ctx.fillRect(cx,cy,s,s); }
      if (e>0){ ctx.globalAlpha*=e; ctx.fillStyle=th.v(B[i]); ctx.fillRect(cx,cy,s,s); }
      ctx.restore();
    }
    if (o.frame){ ctx.strokeStyle=o.frame; ctx.lineWidth=o.lw||2; if (o.dash) ctx.setLineDash(o.dash);
      const p=o.pad??Math.max(3,S*0.02); ctx.strokeRect(x-p, y-p, S+2*p, S+2*p); ctx.setLineDash([]); }
    if (o.captions){
      const fs=Math.max(10, Math.min(14, S/34));
      OR.text(ctx, S<260 ? TXT.rotulo.split(' · ')[0] : TXT.rotulo, x, y-fs*1.7, {t:th, font:'mono', size:fs, color:th.muted, weight:400});
      OR.text(ctx, TXT.arriba, x+S, y-fs*1.7, {t:th, font:'mono', size:fs, color:th.muted, weight:400, align:'right'});
      OR.text(ctx, TXT.abajo, x+S, y+S+fs*0.6, {t:th, font:'mono', size:fs, color:th.muted, weight:400, align:'right'});
    }
  }
  // Dos cuadrículas iguales lado a lado, con espacio para rótulos y etiquetas
  function pairBox(box, fs){
    const gap=36*fs, top=26*fs, labelH=70*fs;
    const s=Math.min((box.w-gap)/2, box.h-top-labelH);
    const x0=box.x+(box.w-(2*s+gap))/2;
    return {a:{x:x0, y:box.y+top, s}, b:{x:x0+s+gap, y:box.y+top, s}};
  }
  function label(ctx, c, q, fs, th, color, sub){
    OR.text(ctx, c.n, q.x, q.y+q.s+20*fs, {t:th, size:20*fs, color, maxW:q.s});
    OR.text(ctx, sub, q.x, q.y+q.s+45*fs, {t:th, font:'mono', size:12.5*fs, color:th.muted, weight:400, maxW:q.s, lh:1.25});
  }
  const subFor = c => `Edad mediana ${OR.nf(c.E.edad_mediana,1)} · ▪ = ${perCell(c)}`;

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
    OR.text(ctx, TXT.sub, m, m*0.9+60*fs+qh+(reel?28:18)*fs, {t:th, font:'mono', size:20*fs, color:th.muted, weight:400});
    ctx.globalAlpha=1;
    const top=m*0.9+60*fs+qh+(reel?80:56)*fs, box={x:m, y:top, w:W-2*m, h:(reel?640:430)*fs};
    const pb=pairBox(box, fs*1.5);
    if (f>=F.show){
      const fill=OR.ease(ph(F.fill, F.legend));
      ctx.globalAlpha=OR.ease(ph(F.show,F.show+20));
      const Ah=cellsReal(h), Ao=cellsReal(o);
      drawGrid(ctx, pb.a.x, pb.a.y, pb.a.s, Ah, Ah, {th, fill, frame:th.home, lw:3*fs, pad:8*fs});
      drawGrid(ctx, pb.b.x, pb.b.y, pb.b.s, Ao, Ao, {th, fill});
      label(ctx, h, pb.a, fs*1.5, th, th.home, `Mediana ${OR.nf(h.E.edad_mediana,1)} años`);
      label(ctx, o, pb.b, fs*1.5, th, th.ink, `Mediana ${OR.nf(o.E.edad_mediana,1)} años`);
      ctx.globalAlpha=1;
    }
    let y=box.y+box.h+(reel?30:12)*fs;
    if (f>=F.legend){
      ctx.globalAlpha=ph(F.legend,F.legend+20);
      const cw=(W-2*m)/ (reel?3:5), sw=18*fs;
      ETAPAS.forEach((e,i)=>{ const col=i%(reel?3:5), row=Math.floor(i/(reel?3:5)), lx=m+col*cw, ly=y+row*34*fs;
        ctx.fillStyle=th.v(e.col); ctx.fillRect(lx, ly+3*fs, sw, sw);
        OR.text(ctx, `${e.label} ${e.rango}`, lx+sw+10*fs, ly, {t:th, font:'body', size:(reel?22:17)*fs, weight:400, maxW:cw-sw-16*fs}); });
      y += (reel?2:1)*34*fs + 24*fs;
      ctx.globalAlpha=1;
    } else y += (reel?2:1)*34*fs + 24*fs;
    if (f>=F.nums){
      const rows=[['Menores de 18 (de cada 100)', `${h.cn[0]+h.cn[1]} / ${o.cn[0]+o.cn[1]}`],
                  ['65 años o más (de cada 100)', `${h.cn[4]} / ${o.cn[4]}`]]
        .concat(INDICADORES.filter(r=>r.k!=='edad_mediana').map(r=>[r.label, `${fmtInd(r,h.E[r.k])} / ${fmtInd(r,o.E[r.k])}`]));
      const rh=(reel?64:46)*fs;
      rows.forEach((r,i)=>{
        ctx.globalAlpha=ph(F.nums+i*10, F.nums+i*10+20);
        OR.text(ctx, r[0], m, y+8*fs, {t:th, font:'body', size:(reel?27:21)*fs, color:th.muted, weight:400, maxW:(W-2*m)*0.62});
        OR.text(ctx, r[1], W-m, y, {t:th, font:'mono', size:(reel?40:31)*fs, color:th.ink, align:'right', weight:500});
        ctx.save(); ctx.globalAlpha*=.6; ctx.fillStyle=th.rule; ctx.fillRect(m, y+rh-8*fs, W-2*m, 1.5*fs); ctx.restore();
        y+=rh;
      });
      ctx.globalAlpha=ph(F.nums,F.nums+20);
      OR.text(ctx, `${h.n} / ${o.n}`, W-m, y+2*fs, {t:th, font:'mono', size:18*fs, color:th.muted, align:'right', weight:400});
      ctx.globalAlpha=1;
    }
    if (f>=F.close){
      ctx.globalAlpha=ph(F.close,F.close+20); y+=(reel?46:30)*fs;
      OR.text(ctx, TXT.cierre(h,o), m, y, {t:th, size:(reel?42:30)*fs, maxW:W-2*m, lh:1.08, color:th.home});
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
    p.setup=()=>{ p.createCanvas(stage.clientWidth, stage.clientHeight).parent(stage); p.frameRate(60); p.noLoop();
      // Clic en un país de la rejilla. Se escucha solo en el lienzo (no con p.mousePressed,
    // que recibe clics de toda la página: la franja fija «ir a…» quedaba encima del lienzo
    // y su clic se tomaba como un clic en el país de debajo).
    p.canvas.addEventListener('click', ev=>{
      if (S.scene!=='world') return;
      const mx=ev.offsetX, my=ev.offsetY;
      if (mx<0||my<0||mx>p.width||my>p.height) return;
      const c=cells.list[Math.floor(my/cells.ch)*cells.cols+Math.floor(mx/cells.cw)];
      if (c && c!==S.home){ S.other=c; S.guessed=false; go('reveal'); }
    });
    };
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
    p.scrollToHome=()=>{ const i=cells.list.indexOf(S.home); if (i<0) return;
      stage.scrollTo({top:Math.max(0, Math.floor(i/cells.cols)*cells.ch-20), behavior:OR.reducedMotion()?'auto':'smooth'}); };
    p.draw=()=>{
      const ctx=p.drawingContext, th=OR.theme(), W=p.width, H=p.height, pad=W<500?16:28, h=S.home, o=S.other, fs=W<500?.85:1;
      ctx.fillStyle=th.paper; ctx.fillRect(0,0,W,H);
      if (S.scene==='home'){
        const s=Math.min(W-2*pad, H-2*pad-110)*0.9, x=(W-s)/2, y=pad+28+(H-2*pad-110-s)/2, A=cellsReal(h);
        drawGrid(ctx, x, y, s, A, A, {th, fill:OR.ease(S.fill), captions:true});
        OR.text(ctx, h.n, x, y+s+28, {t:th, size:22, color:th.home});
        OR.text(ctx, subFor(h), x, y+s+56, {t:th, font:'mono', size:12, color:th.muted, weight:400, maxW:s});
      }
      if (S.scene==='guess' || S.scene==='reveal'){
        const box={x:pad, y:pad, w:W-2*pad, h:H-2*pad}, pb=pairBox(box, fs), Ah=cellsReal(h);
        drawGrid(ctx, pb.a.x, pb.a.y, pb.a.s, Ah, Ah, {th, captions:true, frame:th.home, lw:2});
        label(ctx, h, pb.a, fs, th, th.home, subFor(h));
        const G=cellsGuess(S.gy, S.gm), R=cellsReal(o);
        if (S.scene==='guess'){
          drawGrid(ctx, pb.b.x, pb.b.y, pb.b.s, G, G, {th, captions:true, frame:th.ink, dash:[6,4], lw:1.5});
          label(ctx, o, pb.b, fs, th, th.ink, `Tu predicción: ${S.gy} menores de 18 y ${Math.min(S.gm,100-S.gy)} con 65 o más`);
        } else {
          drawGrid(ctx, pb.b.x, pb.b.y, pb.b.s, S.guessed?G:R, R, {th, t:S.t, captions:true});
          label(ctx, o, pb.b, fs, th, th.ink, subFor(o));
        }
      }
      if (S.scene==='world'){
        const {cols,cw,ch,list}=cells, ord=ORDEN.find(x=>x.k===S.sort);
        list.forEach((c,i)=>{
          const x=(i%cols)*cw, y=Math.floor(i/cols)*ch, pd=12, bx=cw-2*pd, base=y+pd+bx, mine=c===h, A=cellsReal(c);
          if (c===S.other){ ctx.fillStyle=th.panel; ctx.fillRect(x+2,y+2,cw-4,ch-4); }
          ctx.save(); ctx.globalAlpha = mine ? 1 : c===S.other ? MUNDO.atenuarComparado : MUNDO.atenuar;
          const ins=mine?MUNDO.grosorPropio+3:0;
          drawGrid(ctx, x+pd+ins, y+pd+ins, bx-2*ins, A, A, {th, frame:mine?th.home:null, lw:MUNDO.grosorPropio, pad:ins-MUNDO.grosorPropio/2});
          ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(x,base,cw,40); ctx.clip();
          OR.text(ctx, mine?`${c.n} · tu país`:c.n, x+pd, base+6, {t:th, font:'body', size:cw<120?12:13, weight:700, color:mine?th.home:th.ink});
          OR.text(ctx, ord.show(c), x+pd, base+23, {t:th, font:'mono', size:10.5, color:mine?th.home:th.muted, weight:400});
          ctx.restore();
        });
      }
      let busy=false;
      if (S.scene==='home' && S.fill<1){ S.fill=Math.min(1,S.fill+ANIM.llenar); busy=true; }
      if (S.scene==='reveal' && S.t<1){ S.t=Math.min(1,S.t+ANIM.revelar); busy=true; }
      busy?p.loop():p.noLoop();
    };
  }, stage);
  new ResizeObserver(()=>app && app._setupDone && app.fit()).observe(stage);

  function worldList(){
    const arr=OK.filter(c=>VISTAS[S.view].f(c) && (!S.cont||c.c===S.cont)), ord=ORDEN.find(x=>x.k===S.sort);
    // Tu país siempre aparece, aunque no esté en la vista o el continente elegidos
    if (!arr.includes(S.home)) arr.push(S.home);
    if (!ord.f) arr.sort((a,b)=>OR.CONTS.indexOf(a.c)-OR.CONTS.indexOf(b.c)||b.p-a.p);
    else arr.sort((a,b)=>ord.f(b)-ord.f(a));
    return arr;
  }

  /* ---------- Panel ---------- */
  const sw = col => `<span class="sw" style="background:var(${col})"></span>`;
  const etapasHTML = c => ETAPAS.map((e,i)=>
    `${sw(e.col)}<span>${e.label} <span class="r">${e.rango}</span></span><span class="lead" aria-hidden="true"></span><span class="n">${c.cn[i]}</span><span class="sv">${e.servicios}</span>`).join('');
  const etapasDuoHTML = (a,b) =>
    `<span></span><span></span><span></span><span class="hd home">${a.n}</span><span class="hd">${b.n}</span>`+
    ETAPAS.map((e,i)=>`${sw(e.col)}<span>${e.label} <span class="r">${e.rango}</span></span><span class="lead" aria-hidden="true"></span><span class="n home">${a.cn[i]}</span><span class="n">${b.cn[i]}</span><span class="sv">${e.servicios}</span>`).join('');
  function indHTML(a, b){
    const head = `<div class="head"><span>Indicadores</span>${b?`<span style="color:var(--c-home)">${a.n}</span><span>${b.n}</span>`:''}</div>`;
    return head + INDICADORES.map(r=>{
      const va=a.E[r.k], w=v=>v==null?0:Math.min(100,100*v/r.max);
      if (!b) return `<div class="reto"><span>${r.label}</span><span class="v">${fmtInd(r,va)}</span><span class="track home"><i style="width:${w(va)}%"></i></span></div>`;
      const vb=b.E[r.k];
      return `<div class="reto"><span>${r.label}</span><span class="v">${fmtInd(r,va)} · ${fmtInd(r,vb)}</span>
        <span class="pair"><span class="track home"><i style="width:${w(va)}%"></i></span><span class="track"><i style="width:${w(vb)}%"></i></span></span></div>`;
    }).join('');
  }
  const legendHTML = list => list.map(x=>`<span><i style="background:var(${x.col})"></i>${x.label}${x.rango?' '+x.rango:''}</span>`).join('');

  function renderPanel(){
    const h=S.home, o=S.other, prob=(OR.store.get('problema')||'').trim();
    $('home').value=h.iso; $('home2').value=h.iso; $('other').value=o.iso;
    $('homeLede').textContent=TXT.lede;
    $('homeLine').innerHTML=TXT.linea(h);
    $('homeEtapas').innerHTML=etapasHTML(h);
    $('homeTiles').innerHTML=INDICADORES.map(r=>`<div><b>${fmtInd(r,h.E[r.k])}</b><span>${r.label}</span></div>`).join('');
    $('homePrompt').textContent=(prob?`Tu problema: «${prob}». `:`Piensa en un problema de ${h.n}. `)+
      `¿Afecta a todas las edades por igual, o sobre todo a una etapa? En ${h.n}, ${h.cn[0]+h.cn[1]} de cada 100 son menores de 18 y ${h.cn[4]} tienen 65 o más.`;
    // predicción
    const gm=Math.min(S.gm,100-S.gy);
    $('guessTitle').textContent=`Si ${o.n} fuera 100 personas…`;
    $('gyLabel').textContent='¿Cuántas tendrían menos de 18 años?';
    $('gmLabel').textContent='¿Y cuántas 65 años o más?';
    $('gy').value=S.gy; $('gm').value=S.gm;
    $('gyOut').textContent=`${S.gy} de 100`; $('gmOut').textContent=`${gm} de 100`;
    $('guessHelp').textContent=TXT.ayudaPrediccion;
    $('guessLegend').innerHTML=legendHTML(GRUPOS_PREDICCION)+`<span style="flex-basis:100%;height:0"></span>`+legendHTML(ETAPAS);
    // comparación
    $('revealTitle').textContent=`${h.n} y ${o.n}`;
    const tol=PREDICCION.tolerancia;
    const line=(k,g,r)=>{ const d=r-g, msg=!S.guessed?'':Math.abs(d)<=tol?'Muy cerca.':d>0?`En realidad son ${d} más.`:`En realidad son ${-d} menos.`;
      return `<div class="line"><span class="k">${k}</span>${S.guessed?`<span class="g">${g}</span>`:'<span></span>'}<span class="r">${r} de 100</span>${msg?`<span class="msg">${msg}</span>`:''}</div>`; };
    $('verdict').innerHTML=line(`Menores de 18 en ${o.n}`, S.gy, o.cn[0]+o.cn[1])+line(`65 o más en ${o.n}`, gm, o.cn[4]);
    $('cmpEtapas').innerHTML=etapasDuoHTML(h,o);
    $('cmpInd').innerHTML=indHTML(h,o);
    const rs=o.E.etapas.escolar/h.E.etapas.escolar, rm=o.E.etapas.mayores/h.E.etapas.mayores;
    $('equiv').innerHTML=`Por cada habitante, ${o.n} necesita <b>${OR.ratio(rs)}</b> plazas escolares que ${h.n}, y <b>${OR.ratio(rm)}</b> atención a mayores.`;
    $('reflect').textContent=(prob?`Tu problema: «${prob}». `:`Piensa en una política de ${h.n}: pensiones, residencias, escuelas, empleo juvenil. `)+
      `¿Tendría sentido igual en ${o.n}, donde ${o.cn[0]+o.cn[1]} de cada 100 son menores y ${o.cn[4]} son mayores? ¿Qué etapa tendría que atender primero?`;
    // mundo
    $('worldHome').textContent=h.n;
    $('worldLegend').textContent=`${h.n}: mediana de ${OR.nf(h.E.edad_mediana,1)} años; ${h.cn[0]+h.cn[1]} de cada 100 son menores de 18 y ${h.cn[4]} tienen 65 o más. Su cuadrícula tiene el contorno de color.`;
    $('worldLegendColors').innerHTML=legendHTML(ETAPAS);
    const fuera = !VISTAS[S.view].f(h) || (S.cont && h.c!==S.cont);
    $('worldHelp').textContent=`${VISTAS[S.view].note}${fuera?` ${h.n} no forma parte de esta selección; aparece para que puedas compararla.`:''} Toca un país para compararlo con ${h.n}.`;
    $('stageTagText').innerHTML=`Comparando con <b>${h.n}</b> · mediana ${OR.nf(h.E.edad_mediana,1)} años · <u>ir a ${h.n}</u>`;
  }

  function go(scene){
    S.scene=scene;
    document.querySelectorAll('[data-scene]').forEach(el=>el.hidden=el.dataset.scene!==scene);
    document.querySelectorAll('.steps button').forEach(b=>b.setAttribute('aria-current', b.dataset.go===scene?'step':'false'));
    $('main').classList.toggle('world', scene==='world'); $('stageTag').hidden=scene!=='world';
    if (scene==='reveal') S.t=OR.reducedMotion()?1:0;
    if (scene==='home') S.fill=OR.reducedMotion()?1:0;
    $('panel').scrollTop=0; stage.scrollTop=0;
    renderPanel(); app && app._setupDone && app.fit();
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
  const setHome=e=>{ S.home=D.byIso[e.target.value]; OR.store.set('home', S.home.iso);
    if (S.other===S.home) S.other=S.home.iso==='NGA'?D.byIso.JPN:D.byIso.NGA;
    S.fill=OR.reducedMotion()?1:0; renderPanel(); app.fit(); };
  $('home').addEventListener('change', setHome); $('home2').addEventListener('change', setHome);
  $('other').addEventListener('change', e=>{ S.other=D.byIso[e.target.value]; renderPanel(); app.fit(); });
  $('random').addEventListener('click', ()=>{
    const pool=[...D.muestra].map(k=>D.byIso[k]).filter(c=>valid(c)&&c!==S.home&&c!==S.other);
    S.other=pool[Math.floor(Math.random()*pool.length)]; renderPanel(); app.fit(); });
  ['gy','gm'].forEach(id=>$(id).addEventListener('input', e=>{ S[id]=+e.target.value; renderPanel(); app.redraw(); }));
  $('revealBtn').addEventListener('click', ()=>{ S.gm=Math.min(S.gm,100-S.gy); S.guessed=true; go('reveal'); });
  ['view','cont','sort'].forEach(id=>$(id).addEventListener('change', e=>{ S[id]=e.target.value; renderPanel(); app.fit(); }));
  $('stageTag').addEventListener('click', ()=>app.scrollToHome());
  $('copyLink').addEventListener('click', ()=>OR.copy(OR.link({pais:S.home.iso, comparar:S.other.iso})));
  $('shareImg').addEventListener('click', ()=>{
    const c=document.createElement('canvas'); c.width=1080; c.height=1350;
    renderFrame(c.getContext('2d'), 1080, 1350, F.end, 'post');
    OR.shareImage(c, `edad-${S.home.iso}-${S.other.iso}.png`, `${S.home.n} y ${S.other.n}: la edad del país`, OR.link({pais:S.home.iso, comparar:S.other.iso}));
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
      async function finishRec(){ const blob=await rec.stop(); OR.download(blob, `edad-${S.home.iso}-${S.other.iso}-${fmt}.${rec.ext}`);
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
  $('exPng').addEventListener('click', async ()=>OR.download(await OR.canvasBlob(ex.canvas), `edad-${S.home.iso}-${S.other.iso}.png`));

  /* ---------- Fuentes ---------- */
  $('sources').innerHTML=`<b>Fuentes.</b> ${D.meta.fuentes.edades} Dependientes: menores de 15 y mayores de 65 por cada 10 personas de 15 a 64 años. Las 100 personas se redondean por el método del mayor resto.`;

  /* ---------- Arranque ---------- */
  await OR.fontsReady();
  if (P.modo && SIZES[P.modo]) enterExport(P.modo, P.tema==='oscuro'?'dark':P.tema==='claro'?'light':null);
  if (P.pais && P.comparar && !P.modo){
    $('sharedNotice').hidden=false;
    $('sharedNotice').textContent=`Te han enviado la comparación entre ${S.home.n} y ${S.other.n}. Antes de verla, ¿qué crees?`;
    go('guess');
  } else go('home');
})();
