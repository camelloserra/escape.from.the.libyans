/* =====================================================================
   ESCAPE FROM THE LIBYANS — juego retro
   ---------------------------------------------------------------------
   AJUSTES: cambiá estos números para afinar el juego.
   ===================================================================== */
const CONFIG = {
  vidas: 3,
  mphViaje: 88,               // velocidad para viajar en el tiempo
  pixelesPorMph: 6.0,         // cuánto avanza el mundo por cada mph (más alto = todo más rápido)
  velocidadAuto: 1.12,        // el DeLorean rinde 12% más por cada mph que la camioneta
  aceleracionInicial: 18,     // mph por segundo al arrancar: sale disparado
  aceleracionPerdida: 0.07,   // cuánto se achica la aceleración por cada mph (cuesta más llegar a 88)
  conos: 200,                 // cantidad de conos en el estacionamiento
  arboles: 32, canteros: 28, cercos: 8, puestos: 12, contenedores: 24, // escenario que se reparte por el estacionamiento
  camionetaVelMax: 72,        // mph máximos de la camioneta; el auto la supera a partir de unas 65 mph
  misilVelocidad: 560,        // píxeles por segundo
  misilGiro: 1.3,             // qué tanto persigue el misil (radianes por segundo)
  misilDuracion: 2.4,         // segundos hasta que explota solo
  misilCadencia: [5.5, 8.5],  // segundos entre disparos (mínimo, máximo)
  zoom: 0.85,                 // 1 = como antes; menos de 1 aleja la escena (no afecta velocímetro, vidas ni logo)
  mundo: { ancho: 6400, alto: 4400 }, // tamaño del estacionamiento (incluye el pasto del borde)
  volumenMusica: 0.6,
};

/* Imágenes: reemplazá los PNG manteniendo los mismos nombres.
   E = mira a la derecha, W = izquierda, N = hacia arriba (de espaldas), S = hacia abajo (de frente), etc. */
const IMG = {
  auto: 'img/auto/',
  camioneta: 'img/camioneta/',
  camionetaDoc: 'img/camioneta-doc.png',
  doc: 'img/doc/pose',        // pose01.png … pose24.png (17 a 24: boca arriba)
  docPoses: 24,
  escenario: 'img/escenario/',
  fx: 'img/fx/',
  audio: 'audio/',
};

(()=>{
"use strict";
// en el celu, al entrar desde un link la pantalla queda corrida: se recarga sola una vez a los 0,5 s
try{
  if(matchMedia('(pointer:coarse)').matches){
    const k='88mph-recarga',t=+sessionStorage.getItem(k)||0;
    if(Date.now()-t>10000){sessionStorage.setItem(k,String(Date.now()));setTimeout(()=>location.reload(),500)}
  }
}catch(e){}
const DIRS=['E','SE','S','SW','W','NW','N','NE'];
const load=src=>{const i=new Image();i.src=src;return i};
const carImg={},vanImg={};
for(const d of DIRS){carImg[d]=load(IMG.auto+d+'.png');vanImg[d]=load(IMG.camioneta+d+'.png');}
const truckImg=load(IMG.camionetaDoc);
const SCN={ // huellas de choque en píxeles del sprite: [x, y, radio]; base = línea del piso para ordenar
  arbol:{names:['arbol1','arbol2','arbol3','arbol4','arbol5','arbol6'],foot:(w,h)=>[[w/2,h-17,12]],base:(w,h)=>h-17},
  cantero:{names:['cantero1','cantero2','cantero3','cantero4','cantero5','cantero6','cantero7','cantero8','cantero9'],foot:(w,h)=>[[w/2,h-21,w*.3]],base:(w,h)=>h-21},
  cerco:{names:['cerco'],path:[[18,73],[125,31],[228,77],[327,35]],ax:170,ay:66},
  contenedor:{names:['contenedor1','contenedor2','contenedor3','contenedor4','contenedor5','contenedor6'],foot:(w,h)=>[[w/2-10,h-26,20],[w/2+10,h-26,20]],base:(w,h)=>h-26},
  puesto:{names:['puesto1','puesto2'],foot:(w,h)=>[[w/2-14,h-40,30],[w/2+14,h-40,30]],base:(w,h)=>h-40},
};
const coneImgs=[load(IMG.escenario+'cono1.png'),load(IMG.escenario+'cono2.png')];
const scnImg={};for(const t in SCN)for(const n of SCN[t].names)scnImg[n]=load(IMG.escenario+n+'.png');
const docImg=[];for(let i=1;i<=IMG.docPoses;i++)docImg.push(load(IMG.doc+String(i).padStart(2,'0')+'.png'));
const rayImg={},fireImg={};
for(const d of DIRS){rayImg[d]=[0,1,2,'g'].map(n=>load(IMG.fx+'rayos/'+d+n+'.png'));fireImg[d]={base:load(IMG.fx+'fuego_'+d+'_base.png'),llamas:load(IMG.fx+'fuego_'+d+'_llamas.png')}}
const explImg=[];for(let i=1;i<=12;i++)explImg.push(load(IMG.fx+'explosion'+String(i).padStart(2,'0')+'.png'));
const portalImg=[];for(let i=1;i<=8;i++)portalImg.push(load(IMG.fx+'portal'+i+'.png'));

const CAR_R=20, VAN_R=24;   // radios de choque
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ang=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const PX=()=>CONFIG.pixelesPorMph;
const dirOf=a=>DIRS[((Math.round(a/(Math.PI/4))%8)+8)%8];
function hash(x,y){let h=(x*374761393+y*668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}

// ---------- cono en pixel art (pixeles dobles, como el piso) ----------
const coneImg=(()=>{const U=2,w=9,h=11,c=document.createElement('canvas');c.width=w*U;c.height=h*U;const x=c.getContext('2d');
  const px=(a,b,col)=>{x.fillStyle=col;x.fillRect(a*U,b*U,U,U)};
  x.fillStyle='rgba(10,10,20,.45)';x.fillRect(2*U,9*U,8*U,2*U);
  for(let y=0;y<8;y++){const half=Math.floor(.5+y*.5),l=4-half,r=4+half;
    for(let i=l;i<=r;i++){const stripe=y===2||y===5;const t=(i-l)/Math.max(1,r-l);
      let col=stripe?(t<.6?'#f1f2f5':'#b9bcc6'):(t<.34?'#ff9447':t<.7?'#ff6a1a':'#c94a0c');
      if(i===l||i===r||y===0)col='#1b1c22';px(i,y,col)}}
  for(let i=0;i<9;i++){px(i,8,i===0||i===8?'#1b1c22':'#4a4c56');px(i,9,'#1b1c22')}
  return c})();

// ---------- mundo: estacionamiento con piso en perspectiva isométrica ----------
const WW=CONFIG.mundo.ancho,WH=CONFIG.mundo.alto;
const LOT={x0:120,y0:120,x1:WW-120,y1:WH-120};
const Ls=76,SP=42,AISLE=116,NST=9,P=2*Ls+AISLE,LB=NST*SP,ISL0=LB+10,ISL1=LB+24,BP=ISL1+110;
const OX=LOT.x0,OY=LOT.y0+300;
const toUV=(x,y)=>{const X=(x-OX)/2,Y=y-OY;return[(X+Y)/2,(X-Y)/2]};
const toXY=(u,v)=>[OX+2*u+2*v,OY+u-v];
const TRUCK={x:Math.round(WW/2),y:Math.round(WH/2)};
const DOC0={x:TRUCK.x+150,y:TRUCK.y+100};
const START={x:TRUCK.x-300,y:TRUCK.y+40};

// sólidos fijos (canteros, postes, camioneta del Doc) como círculos con grilla de búsqueda
const CELL=128,grid=new Map(),statics=[];
function addStatic(x,y,r,kind){const s={x,y,r,kind};statics.push(s);const k=Math.floor(x/CELL)+','+Math.floor(y/CELL);(grid.get(k)||grid.set(k,[]).get(k)).push(s)}
function nearStatics(x,y){const out=[],cx0=Math.floor(x/CELL),cy0=Math.floor(y/CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const g=grid.get((cx0+i)+','+(cy0+j));if(g)out.push(...g)}return out}
const islands=new Set(),lamps=[],decor=[];
(function layout(){
  const inLot=(x,y,m)=>x>LOT.x0+m&&x<LOT.x1-m&&y>LOT.y0+m&&y<LOT.y1-m;
  const cs=[[LOT.x0,LOT.y0],[LOT.x1,LOT.y0],[LOT.x0,LOT.y1],[LOT.x1,LOT.y1]].map(([x,y])=>toUV(x,y));
  const umin=Math.min(...cs.map(c=>c[0])),umax=Math.max(...cs.map(c=>c[0])),vmin=Math.min(...cs.map(c=>c[1])),vmax=Math.max(...cs.map(c=>c[1]));
  for(let r=Math.floor(umin/P);r<=Math.ceil(umax/P);r++)for(let b=Math.floor(vmin/BP);b<=Math.ceil(vmax/BP);b++){
    const u1=r*P+4,u2=r*P+2*Ls-4,v1=b*BP+ISL0,v2=b*BP+ISL1;
    const corners=[toXY(u1,v1),toXY(u2,v1),toXY(u1,v2),toXY(u2,v2)];
    if(!corners.every(([x,y])=>inLot(x,y,40)))continue;
    const [cxp,cyp]=toXY((u1+u2)/2,(v1+v2)/2);
    if(Math.hypot(cxp-TRUCK.x,cyp-TRUCK.y)<330||Math.hypot(cxp-START.x,cyp-START.y)<260)continue;
    islands.add(r+','+b);
    const vc=(v1+v2)/2;
    for(let u=u1+3;u<=u2-3;u+=5){const [x,y]=toXY(u,vc);addStatic(x,y,13,'island')}
    for(const u of [u1+3,u2-3]){const [x,y]=toXY(u,vc);lamps.push({x:Math.round(x/2)*2,y:Math.round(y/2)*2})}
  }
  // árboles, canteros, cercos y puestos repartidos por el estacionamiento
  const placed=[];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const want=[['cerco',CONFIG.cercos],['puesto',CONFIG.puestos],['arbol',CONFIG.arboles],['cantero',CONFIG.canteros],['contenedor',CONFIG.contenedores]];
  for(const [type,n] of want)for(let k=0;k<n;k++){
    const name=pick(SCN[type].names),big=type==='cerco'?190:type==='puesto'?115:type==='contenedor'?55:65;
    for(let t=0;t<120;t++){
      const x=Math.round(rnd(LOT.x0+big+40,LOT.x1-big-40)/2)*2,y=Math.round(rnd(LOT.y0+160,LOT.y1-50)/2)*2;
      if(Math.hypot(x-TRUCK.x,y-TRUCK.y)<360||Math.hypot(x-DOC0.x,y-DOC0.y)<200||Math.hypot(x-START.x,y-START.y)<340)continue;
      if(placed.some(o=>Math.hypot(o.x-x,o.y-y)<o.big+big+60))continue;
      if(statics.some(s=>Math.abs(s.x-x)<big+50&&Math.abs(s.y-y)<big*0.7+40))continue;
      placed.push({type,name,x,y,big});break;
    }
  }
  for(const o of placed){const im=SCN[o.type];o.foot=[];decor.push(o);
    if(im.path){ // cerco: círculos a lo largo de su recorrido (coordenadas del sprite, ancla en su centro)
      const pts=im.path.map(([px,py])=>[o.x-im.ax+px,o.y-im.ay+py]);
      for(let s=1;s<pts.length;s++){const [ax,ay]=pts[s-1],[bx,by]=pts[s],L=Math.hypot(bx-ax,by-ay);
        for(let d=0;d<=L;d+=12)addStatic(ax+(bx-ax)*d/L,ay+(by-ay)*d/L,15,'cerco')}
      o.pts=pts;
    }
  }
  // huella de la camioneta del Doc (de la cabina a las puertas traseras)
  const tw=209,th=173,ax=TRUCK.x-tw/2,ay=TRUCK.y-th/2;
  for(let t=0;t<=1.0001;t+=1/9)addStatic(ax+tw*(0.20+0.57*t),ay+th*(0.47+0.35*t),26,'truck');
})();
function decorFootprints(){
  for(const o of decor){if(o.ready||SCN[o.type].path)continue;const im=scnImg[o.name];if(!im.complete||!im.naturalWidth)continue;
    const w=im.width,h=im.height,b=SCN[o.type].base(w,h);o.dx=Math.round(o.x-w/2);o.dy=Math.round(o.y-b);
    for(const [fx,fy,r] of SCN[o.type].foot(w,h))addStatic(o.dx+fx,o.dy+fy,r,o.type);o.ready=true}
}
const inIsland=(u,v)=>{const r=Math.floor(u/P),b=Math.floor(v/BP),ur=u-r*P,vb=v-b*BP;return ur>=4&&ur<=2*Ls-4&&vb>=ISL0&&vb<=ISL1&&islands.has(r+','+b)};

// el piso se pinta una sola vez, con pixeles dobles (la misma grilla que árboles, puestos y conos)
const FW=WW/2,FH=WH/2;
const floor=document.createElement('canvas');floor.width=FW;floor.height=FH;
(function paintFloor(){
  const fx=floor.getContext('2d'),img=fx.createImageData(FW,FH),d32=new Uint32Array(img.data.buffer),type=new Uint8Array(FW*FH);
  const C=(hex)=>{const n=parseInt(hex.slice(1),16);return(255<<24)|((n&255)<<16)|(((n>>8)&255)<<8)|(n>>16)};
  const ASF=C('#4b4c54'),ASF_L=C('#55565e'),ASF_D=C('#424349'),LINE=C('#dcdde2'),LINE_W=C('#aeb0b8'),
    OUT=C('#1f2025'),YEL=C('#e2b42a'),YEL_D=C('#a8851e'),CON=C('#8f919a'),CON_S=C('#76787f'),DIRT=C('#6a5a3e'),G1=C('#6f8a3b'),G2=C('#57702f'),
    SW=C('#8b8d96'),SW_S=C('#777981'),SW_H=C('#a4a6ae'),GR=C('#666c3e'),GR_L=C('#737a46'),GR_D=C('#59603a');
  for(let hy=0;hy<FH;hy++)for(let hx=0;hx<FW;hx++){
    const x=hx*2+1,y=hy*2+1,i=hy*FW+hx,h=hash(hx,hy);let col;
    const out=Math.max(LOT.x0-x,x-LOT.x1,LOT.y0-y,y-LOT.y1);
    if(out>0){ // vereda y pasto
      if(out<=3)col=OUT;
      else if(out<=26){const along=((x<LOT.x0||x>LOT.x1)?y:x)>>1;col=out<=5?SW_H:(along%18===0?SW_S:SW);if(h<.03)col=SW_S}
      else if(out<=30)col=OUT;
      else col=h<.06?GR_L:h<.12?GR_D:GR;
      d32[i]=col;type[i]=3;continue;
    }
    col=h<.010?ASF_L:h<.022?ASF_D:ASF;let t=0;
    if(out<-24){
      const [u,v]=toUV(x,y),r=Math.floor(u/P),b=Math.floor(v/BP),ur=u-r*P,vb=v-b*BP;
      if(ur>=4&&ur<=2*Ls-4&&vb>=ISL0&&vb<=ISL1&&islands.has(r+','+b)){
        const e=Math.min(ur-4,2*Ls-4-ur,vb-ISL0,ISL1-vb);
        if(e<1)col=OUT;else if(e<2.6)col=YEL;
        else{const s=(ur-4)%36;col=s<12?(s<1?CON_S:CON):(h<.12?G1:h<.2?G2:DIRT)}
        t=2;
      }else if(inIsland(u-1,v+1))col=YEL_D;          // cara del cordón
      else if(inIsland(u-2,v+2))col=OUT;
      else if(vb>=-1&&vb<=LB+1&&ur<=2*Ls+1){
        const k=Math.round(vb/SP);
        if((Math.abs(ur-Ls)<1&&vb>=0&&vb<=LB)||(Math.abs(vb-k*SP)<1&&ur>=0&&ur<=2*Ls)){col=h<.16?LINE_W:LINE;t=1}
      }else if(ur>2*Ls&&hash(r,b)<.4&&vb>130&&vb<200){ // flecha de sentido en el pasillo
        const uc=2*Ls+AISLE/2,dir=(r&1)?1:-1,tt=dir>0?vb-135:195-vb;
        if((tt>=0&&tt<36&&Math.abs(ur-uc)<2.6)||(tt>=36&&tt<=58&&Math.abs(ur-uc)<(58-tt)*.45)){col=h<.16?LINE_W:LINE;t=1}
      }
    }
    d32[i]=col;type[i]=t;
  }
  const R=(a,b)=>a+Math.random()*(b-a);
  const areaK=(WW*WH)/(3200*2200);
  for(let n=0;n<110*areaK;n++){ // manchas de aceite
    const sx=R(LOT.x0+40,LOT.x1-40)/2,sy=R(LOT.y0+40,LOT.y1-40)/2,r=R(3,9),ry=r*.55;
    for(let y=Math.floor(sy-ry-2);y<=sy+ry+2;y++)for(let x=Math.floor(sx-r-2);x<=sx+r+2;x++){
      const i=y*FW+x;if(type[i]===2||type[i]===3)continue;
      const q=Math.hypot((x-sx)/r,(y-sy)/ry)-(hash(x,y)-.5)*.5;
      if(q<1)d32[i]=type[i]===1?C('#9d9fa6'):(q<.45?C('#38393f'):C('#3f4047'));
    }
  }
  for(let n=0;n<70*areaK;n++){ // grietas
    let x=R(LOT.x0+30,LOT.x1-30)/2,y=R(LOT.y0+30,LOT.y1-30)/2,a=R(0,6.28);const len=R(8,24);
    for(let s=0;s<len;s++){a+=R(-.6,.6);x+=Math.cos(a);y+=Math.sin(a)*.6;const i=Math.round(y)*FW+Math.round(x);if(type[i]===0)d32[i]=C('#393a40')}
  }
  fx.putImageData(img,0,0);
})();

// ---------- canvas y cámara ----------
const cv=document.getElementById('game'),cx=cv.getContext('2d');
let W=0,H=0,S=1;
const cam={x:START.x,y:START.y};
function resize(){
  const iw=innerWidth,ih=innerHeight;
  S=Math.max(1,Math.floor(Math.min(iw/600,ih/330)));
  const Z=S*CONFIG.zoom,nw=Math.ceil(iw/Z),nh=Math.ceil(ih/Z);
  if(nw!==W||nh!==H){W=nw;H=nh;cv.width=W;cv.height=H;}
  cx.imageSmoothingEnabled=false;
  drawBezel();
}
addEventListener('resize',resize);
// el logo y el velocímetro quedan siempre arriba del aviso legal
function placeLegal(){const d=document.querySelector('.disclaimer');if(d)document.documentElement.style.setProperty('--legal-h',Math.ceil(d.getBoundingClientRect().height)+'px')}
addEventListener('resize',placeLegal);addEventListener('orientationchange',()=>setTimeout(()=>{resize();placeLegal()},300));
if(window.visualViewport)visualViewport.addEventListener('resize',()=>{resize();placeLegal()});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeLegal);
placeLegal();
if(window.ResizeObserver){const d=document.querySelector('.disclaimer');if(d)new ResizeObserver(placeLegal).observe(d)}
// aro del velocímetro dibujado en pixeles, del mismo tamaño de pixel que el juego
function drawBezel(){
  const bz=document.getElementById('bezel');if(!bz)return;
  const n=Math.max(40,Math.round(bz.getBoundingClientRect().width/S));if(bz.width!==n){bz.width=n;bz.height=n}
  const g=bz.getContext('2d'),R=n/2;g.clearRect(0,0,n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const dx=x+.5-R,dy=y+.5-R,d=Math.hypot(dx,dy);if(d>R)continue;
    let col;
    if(d>R-2)col='#16171d';
    else if(d>R-5){const t=(-dx-dy)/(d*1.414);col=t>.45?'#c3c9dd':t>-.3?'#8e97b5':'#646c88'}
    else if(d>R-6)col='#16171d';
    else col='#ffffff';
    g.fillStyle=col;g.fillRect(x,y,1,1);
  }
}
function follow(){ // el auto queda en el centro hasta que la cámara llega al borde del estacionamiento
  cam.x=WW>W?clamp(car.x,W/2,WW-W/2):WW/2;
  cam.y=WH>H?clamp(car.y-12,H/2,WH-H/2):WH/2;
}

// ---------- sonido ----------
let AC=null,engOsc=null,engGain=null,muted=false;
function initAudio(){
  if(AC)return;try{
  AC=new (window.AudioContext||window.webkitAudioContext)();
  engOsc=AC.createOscillator();engOsc.type='sawtooth';
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=520;
  engGain=AC.createGain();engGain.gain.value=0;
  engOsc.connect(lp);lp.connect(engGain);engGain.connect(AC.destination);engOsc.start();
  }catch(e){AC=null}
}
function tone(f1,f2,dur,type='square',vol=.08){
  if(!AC||muted)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+.02);
}
function boom(dur=.5,vol=.25,freq=400){
  if(!AC||muted)return;const t=AC.currentTime,n=Math.floor(AC.sampleRate*dur),b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;
  const g=AC.createGain();g.gain.value=vol;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t);
}
// música: INICIO en la pantalla del logo, ESCAPE mientras jugás, FINAL al ganar
let music=null,musicKey=null,musicWanted=null;
function musicSrc(key){return IMG.audio+key+'-8bit.mp3'}
function playMusic(key,loop){
  musicWanted={key,loop};
  if(musicKey===key&&music&&!music.paused)return;
  stopMusic();musicWanted={key,loop};
  const a=new Audio(musicSrc(key));a.loop=loop;a.volume=muted?0:CONFIG.volumenMusica;music=a;musicKey=key;
  const p=a.play();if(p&&p.catch)p.catch(()=>{musicKey=null}); // el navegador bloquea el sonido hasta que la persona toque la página
}
function stopMusic(){if(music){music.pause();music.src=''}music=null;musicKey=null;musicWanted=null}
function retryMusic(){if(musicWanted&&(!music||music.paused)){const w=musicWanted;musicKey=null;playMusic(w.key,w.loop)}}
function engine(mph,on){
  if(!AC)return;const t=AC.currentTime;
  const gear=mph<25?mph/25:mph<50?(mph-25)/25:mph<75?(mph-50)/25:(mph-75)/20;
  engOsc.frequency.setTargetAtTime(48+gear*55+mph*1.1,t,.05);
  engGain.gain.setTargetAtTime(on&&!muted?.022:0,t,.08);
}

// ---------- controles ----------
const keys={};
addEventListener('keydown',e=>{
  const k=e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();
  keys[k]=true;
  const arrow=k.startsWith('Arrow');
  // se juega con las flechas: cualquier flecha (o Enter) arranca, y en los carteles finales vuelve a jugar
  if(!e.repeat&&(arrow||k==='Enter')){
    if(state==='title')start();
    else if((state==='won'||state==='lost')&&endShown&&performance.now()>restartAt)start();
    else if(state==='paused'&&k==='Enter')resume();
  }
  if(k==='p'||k==='P'||k==='Escape'){ if(state==='play')pause(); else if(state==='paused')resume(); }
  if(k==='m'||k==='M'){muted=!muted;if(music)music.volume=muted?0:CONFIG.volumenMusica}
  retryMusic();
});
addEventListener('keyup',e=>{keys[e.key]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='play')pause()});
const joy=document.getElementById('joy'),knob=document.getElementById('joyKnob');
let tj=null;
addEventListener('pointerdown',e=>{
  if(state==='paused'){resume();return} // en el celu no hay tecla P: tocar la pantalla saca de la pausa
  retryMusic(); // un clic sólo habilita el sonido; el juego arranca con las flechas
  if(e.pointerType==='mouse')return;
  if(state==='title'){start();return}
  if((state==='won'||state==='lost')&&endShown&&performance.now()>restartAt){start();return}
});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;initAudio();tj={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};joy.hidden=false;joy.style.left=e.clientX+'px';joy.style.top=e.clientY+'px';knob.style.transform='';});
addEventListener('pointermove',e=>{if(!tj||e.pointerId!==tj.id)return;let dx=e.clientX-tj.x,dy=e.clientY-tj.y;const m=Math.hypot(dx,dy);if(m>36){dx=dx/m*36;dy=dy/m*36}tj.dx=dx;tj.dy=dy;knob.style.transform=`translate(${dx}px,${dy}px)`});
const endTouch=e=>{if(tj&&e.pointerId===tj.id){tj=null;joy.hidden=true}};
addEventListener('pointerup',endTouch);addEventListener('pointercancel',endTouch);

// ---------- estado ----------
let state='title',car=null,van=null,doc=null,cones=[],missiles=[],parts=[],texts=[],trail=[],skids=[],coneQ=[],booms=[],trails=[],portal=null;
let elapsed=0,shake=0,lives=CONFIG.vidas,best=null,warpT=0,endShown=false,restartAt=0;
try{best=parseFloat(localStorage.getItem('88mph-best'))||null}catch(e){}

function freeSpot(minCar){
  for(let t=0;t<80;t++){
    const x=rnd(LOT.x0+50,LOT.x1-50),y=rnd(LOT.y0+50,LOT.y1-30);
    if(nearStatics(x,y).some(s=>Math.hypot(s.x-x,s.y-y)<s.r+34))continue;
    if(Math.hypot(x-TRUCK.x,y-TRUCK.y)<170||Math.hypot(x-DOC0.x,y-DOC0.y)<90||Math.hypot(x-START.x,y-START.y)<200)continue;
    if(car&&minCar&&Math.hypot(x-car.x,y-car.y)<minCar)continue;
    if(cones.some(c=>Math.hypot(c.x-x,c.y-y)<40))continue;
    return{x,y};
  }
  return null;
}
function newRun(){
  car={x:START.x,y:START.y,a:Math.PI,k:CONFIG.velocidadAuto,mph:0,inv:0,hitCd:0,skid:false,gone:false};
  doc={x:DOC0.x,y:DOC0.y,pose:16,cd:0,hop:0};
  van={x:0,y:0,a:0,mph:0,fireT:6,warn:0,hitCd:0,on:false,spawnT:1.8};
  decorFootprints();
  cones=[];missiles=[];parts=[];texts=[];trail=[];skids=[];coneQ=[];booms=[];trails=[];portal=null;endShown=false;
  for(let i=0;i<CONFIG.conos;i++){const p=freeSpot(0);if(p)cones.push({x:p.x,y:p.y,r:8,fly:0,vx:0,vy:0,v:i&1})}
  shake=0;lives=CONFIG.vidas;elapsed=0;warpT=0;
  follow();renderLives();
}
const $=id=>document.getElementById(id);
function renderLives(){
  const el=$('lives');el.innerHTML='';
  for(let i=0;i<CONFIG.vidas;i++){const im=new Image();im.src=IMG.auto+'E.png';im.alt='';if(i>=lives)im.className='lost';el.appendChild(im)}
}
function showOnly(id){for(const o of ['ovStart','ovPause','ovWin','ovLose'])$(o).hidden=o!==id}
function start(){document.body.classList.add('playing');drawBezel();initAudio();if(AC&&AC.state==='suspended')AC.resume();newRun();state='play';showOnly(null);last=performance.now();playMusic('escape',true)}
function pause(){state='paused';showOnly('ovPause');engine(0,false)}
function resume(){state='play';showOnly(null);last=performance.now()}


// ---------- efectos ----------
function burst(x,y,n,cols,spd=60,life=.6,size=2){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=rnd(spd*.3,spd);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(life*.5,life),max:life,c:cols[Math.floor(Math.random()*cols.length)],s:size})}}
function popText(x,y,t,c='#ffffff'){texts.push({x,y,t,c,life:1})}
function explode(x,y,big,scale){
  booms.push({x,y,t:0,s:scale||(big?.5:.36),fd:scale>=1?.075:.05});
  burst(x,y,big?30:16,['#ff6a1a','#ffd23f','#ff9f1c','#16171d','#8b8d96'],big?190:130,big?.7:.5,big?4:2);
  shake=Math.max(shake,big?7:4);boom(big?.7:.4,big?.32:.2,big?500:800);
}

// ---------- lógica ----------
let last=performance.now();
function steerInput(){
  let dx=(keys.ArrowRight||keys.d||keys.D?1:0)-(keys.ArrowLeft||keys.a||keys.A?1:0);
  let dy=(keys.ArrowDown||keys.s||keys.S?1:0)-(keys.ArrowUp||keys.w||keys.W?1:0);
  if(tj&&Math.hypot(tj.dx,tj.dy)>10){dx=tj.dx;dy=tj.dy}
  return (dx||dy)?Math.atan2(dy,dx):null;
}
function bounceWalls(o,isCar){
  let hit=false;
  const x0=LOT.x0+44,x1=LOT.x1-44,y0=LOT.y0+34,y1=LOT.y1-14;
  if(o.x<x0){o.x=x0;o.a=Math.PI-o.a;hit=true}
  if(o.x>x1){o.x=x1;o.a=Math.PI-o.a;hit=true}
  if(o.y<y0){o.y=y0;o.a=-o.a;hit=true}
  if(o.y>y1){o.y=y1;o.a=-o.a;hit=true}
  if(hit){o.a=ang(o.a);if(o.mph>12){const lost=Math.round(o.mph*.5);o.mph*=.5;
    if(isCar){shake=Math.max(shake,4);tone(140,60,.18,'square',.1);popText(o.x,o.y-50,'-'+lost);burst(o.x,o.y,10,['#8e97b5','#16171d'],80,.4,3)}}}
}
function collide(o,isCar){
  const R=isCar?CAR_R:VAN_R;
  // conos: salen volando y te frenan un poco
  for(const c of cones){
    if(c.fly)continue;const d=Math.hypot(o.x-c.x,o.y-c.y);if(d>=c.r+R)continue;
    const nx=(o.x-c.x)/(d||1),ny=(o.y-c.y)/(d||1),sp=o.mph*PX();
    c.fly=.0001;c.vx=Math.cos(o.a)*sp*.9-nx*30;c.vy=Math.sin(o.a)*sp*.9-ny*30-80;
    const lost=Math.round(o.mph*.22);o.mph*=.78;coneQ.push(6);
    if(isCar){tone(500,200,.08,'square',.06);if(lost>2)popText(c.x,c.y-24,'-'+lost)}
  }
  // canteros, postes y la camioneta del Doc: choque fuerte
  for(const b of nearStatics(o.x,o.y)){
    const d=Math.hypot(o.x-b.x,o.y-b.y),rr=b.r+R;if(d>=rr)continue;
    const nx=(o.x-b.x)/(d||1),ny=(o.y-b.y)/(d||1);
    o.x=b.x+nx*rr;o.y=b.y+ny*rr;
    if(o.hitCd>0)continue;
    const vx=Math.cos(o.a),vy=Math.sin(o.a),dot=vx*nx+vy*ny;
    if(dot<0)o.a=Math.atan2(vy-2*dot*ny,vx-2*dot*nx);
    const lost=Math.round(o.mph*.65);o.mph*=.35;o.hitCd=.35;
    if(isCar&&lost>3){shake=Math.max(shake,6);boom(.25,.22,1200);popText(o.x,o.y-50,'-'+lost,'#ffd23f');burst(o.x-nx*14,o.y-ny*14,16,['#8e97b5','#16171d','#ffd23f'],110,.5,3)}
  }
  // el Doc: si le pasás por encima, da una vuelta y cambia de postura
  if(doc.cd<=0&&o.mph>6&&Math.hypot(o.x-doc.x,o.y-doc.y)<R+18){
    let p;do{p=Math.floor(Math.random()*docImg.length)}while(p===doc.pose);
    doc.pose=p;doc.cd=.5;doc.hop=.35;doc.x+=Math.cos(o.a)*12;doc.y+=Math.sin(o.a)*8;
    doc.x=clamp(doc.x,LOT.x0+60,LOT.x1-60);doc.y=clamp(doc.y,LOT.y0+60,LOT.y1-40);
    o.mph*=.9;tone(160,70,.15,'square',.09);
    if(isCar){shake=Math.max(shake,3);popText(doc.x,doc.y-30,'¡UF!')}
  }
}
function move(o,dt){const k=(o.k||1)*PX();o.x+=Math.cos(o.a)*o.mph*k*dt;o.y+=Math.sin(o.a)*o.mph*k*dt}
function update(dt){
  if(state==='play')elapsed+=dt;
  doc.cd=Math.max(0,doc.cd-dt);doc.hop=Math.max(0,doc.hop-dt);
  // ---- auto ----
  if(state==='play'){
    car.inv=Math.max(0,car.inv-dt);car.hitCd=Math.max(0,car.hitCd-dt);
    const ta=steerInput();car.skid=false;car.launch=false;
    if(ta!==null){
      const diff=ang(ta-car.a),ad=Math.abs(diff);
      if(ad>2.4&&car.mph>18){car.mph-=48*dt;car.skid=car.mph>25}
      else{
        const turn=(car.mph<10?5:4.6-car.mph/88*2.4)*dt;
        car.a=ang(car.a+clamp(diff,-turn,turn));
        // sale disparado y le cuesta cada vez más a medida que se acerca a 88
        const acc=Math.max(3,CONFIG.aceleracionInicial-car.mph*CONFIG.aceleracionPerdida);
        car.mph+=acc*dt*(ad<.6?1:.3);
        if(ad<.6&&car.mph<32)car.launch=true;
        if(ad>.5&&car.mph>32){car.skid=true;car.mph-=5*dt}
      }
    }else car.mph-=10*dt;
    car.mph=clamp(car.mph,0,95);
    move(car,dt);bounceWalls(car,true);collide(car,true);
    if(car.mph>=CONFIG.mphViaje){
      state='warp';warpT=0;tone(200,1800,.6,'sawtooth',.08);
      const hx=Math.cos(car.a),hy=Math.sin(car.a),D=150;
      portal={gx:car.x+hx*D,gy:car.y+hy*D,hx,hy,a:car.a,t:0,closeAt:0};
    }
  }else if(state==='warp'){
    warpT+=dt;
    if(!car.gone){
      const v=warpT<.12?car.mph*PX()*car.k:1700;      // al abrirse el portal el auto sale disparado
      car.x+=portal.hx*v*dt;car.y+=portal.hy*v*dt;
      if((car.x-portal.gx)*portal.hx+(car.y-portal.gy)*portal.hy>80){car.gone=true;win()}
    }
  }
  if(portal){portal.t+=dt;if(portal.closeAt&&portal.t>portal.closeAt+.3)portal=null}
  if(!car.gone)follow();
  // huellas de las ruedas traseras
  if(state==='play'||(state==='warp'&&!car.gone)){
    const px=-Math.sin(car.a)*13,py=Math.cos(car.a)*9,bx=car.x-Math.cos(car.a)*34,by=car.y+8-Math.sin(car.a)*12;
    trail.push({l:{x:bx+px,y:by+py},r:{x:bx-px,y:by-py}});if(trail.length>70)trail.shift();
    if(car.launch&&Math.random()<.9)for(const w of [{x:bx+px,y:by+py},{x:bx-px,y:by-py}]){ // humito de las ruedas traseras
      const g=['#d6d8de','#b9bcc5','#9a9ea9'][Math.floor(Math.random()*3)];
      parts.push({x:Math.round(w.x/2)*2,y:Math.round(w.y/2)*2-2,vx:-Math.cos(car.a)*rnd(20,50)+rnd(-12,12),vy:-Math.sin(car.a)*rnd(10,30)-rnd(8,22),life:rnd(.4,.8),max:.8,c:g,s:2,grow:9});
    }
    if(car.mph>83&&state==='play'&&Math.random()<.7)for(const w of [{x:bx+px,y:by+py},{x:bx-px,y:by-py}])parts.push({x:w.x+rnd(-3,3),y:w.y-2,vx:-Math.cos(car.a)*rnd(30,80),vy:-rnd(20,50),life:rnd(.15,.35),max:.35,c:['#ffd23f','#ff9f1c','#ff6a1a','#e8212b'][Math.floor(Math.random()*4)],s:2});
    if(car.skid){skids.push({x:Math.round(bx+px),y:Math.round(by+py)},{x:Math.round(bx-px),y:Math.round(by-py)});if(skids.length>6000)skids.splice(0,300)}
  }
  // ---- camioneta ----
  if(state==='play'||state==='warp'||state==='won'){
    if(!van.on){van.spawnT-=dt;if(van.spawnT<=0&&state==='play'){
      van.on=true;
      const opts=[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sy])=>({x:clamp(car.x+sx*W*.75,LOT.x0+60,LOT.x1-60),y:clamp(car.y+sy*H*.7,LOT.y0+60,LOT.y1-30)}));
      const p=opts.sort((a,b)=>dist(b,car)-dist(a,car))[0];van.x=p.x;van.y=p.y;van.a=Math.atan2(car.y-van.y,car.x-van.x);tone(90,70,.4,'sawtooth',.06)}}
    else{
      van.hitCd=Math.max(0,van.hitCd-dt);
      const dv=dist(van,car);
      if(state==='play'){
        const lead=.4,tx=car.x+Math.cos(car.a)*car.mph*PX()*lead,ty=car.y+Math.sin(car.a)*car.mph*PX()*lead;
        let sx=tx-van.x,sy=ty-van.y;const sm=Math.hypot(sx,sy)||1;sx/=sm;sy/=sm;
        const ahead={x:van.x+Math.cos(van.a)*50,y:van.y+Math.sin(van.a)*50};
        for(const b of nearStatics(ahead.x,ahead.y)){const dx=van.x-b.x,dy=van.y-b.y,d=Math.hypot(dx,dy);if(d<80){sx+=dx/d*(80-d)/40;sy+=dy/d*(80-d)/40}}
        const ta=Math.atan2(sy,sx);
        const far=dv>Math.hypot(W,H)*0.6;   // si quedó muy lejos, acelera para alcanzarte
        const vmax=CONFIG.camionetaVelMax*(far?1.3:1);
        van.mph+=(vmax-van.mph)*dt*.4;
        const diff=ang(ta-van.a);van.a=ang(van.a+clamp(diff,-2.3*dt,2.3*dt));
        if(Math.abs(diff)>1.2&&!far)van.mph-=10*dt;
      }else van.mph=Math.max(0,van.mph-40*dt);
      move(van,dt);bounceWalls(van,false);collide(van,false);
      if(state==='play'&&dv<CAR_R+VAN_R+4&&van.hitCd<=0&&car.hitCd<=0){
        const lost=Math.round(car.mph*.45);car.mph*=.55;van.mph*=.4;van.hitCd=1;car.hitCd=.3;
        const nx=(car.x-van.x)/(dv||1),ny=(car.y-van.y)/(dv||1);car.x+=nx*16;car.y+=ny*16;
        shake=Math.max(shake,6);boom(.3,.25,900);popText(car.x,car.y-50,lost>2?'-'+lost:'¡PUM!','#ffd23f');
      }
      if(state==='play'){
        van.fireT-=dt;
        const inView=Math.abs(van.x-cam.x)<W/2&&Math.abs(van.y-cam.y)<H/2;
        if(van.fireT<.8&&van.warn===0&&inView){van.warn=1;tone(880,880,.08,'square',.05)}
        if(van.fireT<=0){
          if(dv>110&&inView){
            const mx=van.x,my=van.y-60,a=Math.atan2(car.y-10-my,car.x-mx);
            missiles.push({x:mx+Math.cos(a)*20,y:my+Math.sin(a)*20,a,life:CONFIG.misilDuracion});
            tone(300,120,.35,'sawtooth',.07);burst(mx,my,10,['#d9dbe4','#8b8d96'],60,.5,3);
            van.warn=0;const [a1,b1]=CONFIG.misilCadencia;van.fireT=rnd(a1,b1)-Math.min(1.6,elapsed*.03);
          }else{van.fireT=.6;van.warn=0}
        }
      }
    }
  }
  // ---- misiles ----
  for(const m of missiles){
    m.life-=dt;
    if(state==='play'){const ta=Math.atan2(car.y-10-m.y,car.x-m.x);m.a=ang(m.a+clamp(ang(ta-m.a),-CONFIG.misilGiro*dt,CONFIG.misilGiro*dt))}
    m.x+=Math.cos(m.a)*CONFIG.misilVelocidad*dt;m.y+=Math.sin(m.a)*CONFIG.misilVelocidad*dt;
    if(Math.random()<.9)parts.push({x:m.x-Math.cos(m.a)*9,y:m.y-Math.sin(m.a)*9,vx:rnd(-8,8),vy:rnd(-14,-3),life:.55,max:.55,c:Math.random()<.5?'#c9ccd8':'#9a9eae',s:3});
    if(state==='play'&&!car.gone&&dist(m,{x:car.x,y:car.y-10})<24){
      m.dead=true;explode(m.x,m.y,true);
      if(car.inv<=0){lives--;renderLives();car.mph*=.12;car.inv=2;if(lives<=0)die();else popText(car.x,car.y-60,'¡AY!','#ff6a1a')}
      continue;
    }
    if(nearStatics(m.x,m.y+10).some(b=>Math.hypot(m.x-b.x,m.y+10-b.y)<b.r)){m.dead=true;explode(m.x,m.y,false);continue}
    for(const c of cones){if(!c.fly&&Math.hypot(m.x-c.x,m.y-(c.y-8))<12){m.dead=true;explode(m.x,m.y,false);c.fly=.0001;c.vx=rnd(-90,90);c.vy=rnd(-160,-80);coneQ.push(6);break}}
    if(!m.dead&&m.life<=0){m.dead=true;explode(m.x,m.y,false);
      if(state==='play'&&dist(m,car)<70){const lost=Math.round(car.mph*.3);car.mph*=.7;if(lost>2)popText(car.x,car.y-50,'-'+lost)}}
  }
  missiles=missiles.filter(m=>!m.dead);
  // ---- conos volando y reaparición ----
  for(const c of cones){if(c.fly){c.fly+=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=.96;c.vy=c.vy*.96+260*dt}}
  cones=cones.filter(c=>!c.fly||c.fly<1.1);
  for(let i=coneQ.length-1;i>=0;i--){coneQ[i]-=dt;if(coneQ[i]<=0){coneQ.splice(i,1);const p=freeSpot(450);if(p)cones.push({x:p.x,y:p.y,r:8,fly:0,vx:0,vy:0,v:Math.random()<.5?0:1})}}
  // ---- partículas, textos, fuego ----
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;if(p.grow)p.s=Math.min(8,p.s+p.grow*dt)}
  parts=parts.filter(p=>p.life>0);
  for(const t of texts){t.life-=dt;t.y-=26*dt}texts=texts.filter(t=>t.life>0);
  for(const b of booms)b.t+=dt;booms=booms.filter(b=>b.t<b.fd*12);
  updateTrails(dt);
  shake=Math.max(0,shake-dt*14);
  engine(state==='play'||state==='warp'?car.mph:0,state==='play'||(state==='warp'&&!car.gone));
}
function win(){
  portal.closeAt=portal.t+.05;
  // estela de fuego: la imagen de la dirección más parecida, girada al rumbo exacto, que sigue de largo después del portal
  let best_=null,bd=9;for(const k of DIRS){const m=FX_META.fuego[k],d=Math.abs(ang(portal.a-m.ang));if(d<bd){bd=d;best_=k}}
  trails.push({k:best_,rot:ang(portal.a-FX_META.fuego[best_].ang),gx:portal.gx,gy:portal.gy+6,hx:portal.hx,hy:portal.hy,t:0,ext:110});
  playMusic('final',false);
  const fl=$('flash');fl.style.transition='none';fl.style.opacity='1';requestAnimationFrame(()=>requestAnimationFrame(()=>{fl.style.transition='opacity 1.2s';fl.style.opacity='0'}));
  boom(1.2,.45,300);tone(60,30,.8,'sine',.3);shake=9;
  state='won';
  const t=elapsed;let rec='';
  if(best===null||t<best){best=t;rec=' <span class="rec">NEW RECORD!</span>';try{localStorage.setItem('88mph-best',String(t))}catch(e){}}
  setTimeout(()=>{if(state==='won'){$('winStat').innerHTML=`TIME&nbsp; ${fmt(t)}<br>BEST&nbsp; ${fmt(best)}${rec}<br>LIVES ${lives}/${CONFIG.vidas}`;showOnly('ovWin');endShown=true;restartAt=performance.now()+700}},1800);
}
function die(){ // el auto explota
  state='lost';car.mph=0;car.dead=performance.now();
  explode(car.x,car.y-20,true,1);boom(1.4,.5,260);tone(90,30,.9,'sawtooth',.12);shake=12;
  skids.push(...Array.from({length:160},()=>{const a=Math.random()*6.28,r=Math.sqrt(Math.random())*34;return{x:Math.round((car.x+Math.cos(a)*r)/2)*2,y:Math.round((car.y+Math.sin(a)*r*.5)/2)*2}}));
  if(music)music.volume=muted?0:CONFIG.volumenMusica*.35;
  setTimeout(()=>{stopMusic();$('loseStat').innerHTML=`TIME&nbsp; ${fmt(elapsed)}`+(best!==null?`<br>BEST&nbsp; ${fmt(best)}`:'');showOnly('ovLose');endShown=true;restartAt=performance.now()+700},1700);
}
function updateTrails(dt){
  for(const tr of trails){
    tr.t+=dt;const m=FX_META.fuego[tr.k],cs=Math.cos(tr.rot),sn=Math.sin(tr.rot),hx=tr.gx+tr.hx*tr.ext,hy=tr.gy+tr.hy*tr.ext;
    const life=tr.t<3.5?1:Math.max(0,1-(tr.t-3.5)/2.5),reveal=Math.min(1,tr.t/.25)*tr.ext;
    for(let i=0;i<Math.round(10*life);i++){ // lenguas de fuego que suben
      const [lx,ly]=m.pts[Math.floor(Math.random()*m.pts.length)],dx=lx-m.inner[0],dy=ly-m.inner[1];
      const x=hx+dx*cs-dy*sn,y=hy+dx*sn+dy*cs;
      if((x-tr.gx)*tr.hx+(y-tr.gy)*tr.hy>reveal)continue;
      parts.push({x,y,vx:rnd(-6,6),vy:-rnd(40,90),life:rnd(.15,.4),max:.4,c:['#fff3b0','#ffd23f','#ff9f1c','#ff6a1a','#e8212b'][Math.floor(Math.random()*5)],s:2});
    }
  }
  trails=trails.filter(t=>t.t<6.2);
}
function fmt(t){const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0')}

// ---------- dibujo ----------
const vis=(x,y,m=80)=>Math.abs(x-cam.x)<W/2+m&&Math.abs(y-cam.y)<H/2+m;
function groundShadow(x,y,rx,ry){cx.fillStyle='rgba(10,10,20,.4)';for(let j=-ry;j<=ry;j++){const w=Math.round(rx*Math.sqrt(1-(j/ry)**2));cx.fillRect(Math.round(x-w),Math.round(y+j),w*2,1)}}
function drawSprite(set,o,anchor,blinking,shadow){
  const im=set[dirOf(o.a)];if(!im.complete||!im.naturalWidth)return;
  if(blinking&&Math.floor(performance.now()/90)%2)return;
  if(shadow)groundShadow(o.x+2,o.y+im.height*(1-anchor)-10,Math.round(im.width*.36),7);
  cx.drawImage(im,Math.round(o.x-im.width/2),Math.round(o.y-im.height*anchor));
}
function drawLamp(l){ // poste de luz en pixeles dobles
  const x=l.x,y=l.y,r=(a,b,w,h,col)=>{cx.fillStyle=col;cx.fillRect(x+a,y+b,w,h)};
  r(2,-2,26,4,'rgba(10,10,20,.35)');
  r(-4,-4,8,4,'#1f2025');r(-2,-62,6,60,'#1f2025');r(-2,-66,18,6,'#1f2025');r(8,-68,14,8,'#1f2025');
  r(0,-60,2,58,'#7a7d88');r(2,-60,2,58,'#4a4c56');r(0,-64,14,2,'#4a4c56');r(10,-66,10,4,'#4a4c56');
  r(10,-62,10,2,'#f4d77e');
}
function drawRays(I){
  const d=dirOf(car.a),L=rayImg[d],im=carImg[d],off=FX_META.rayos[d];if(!im.naturalWidth)return;
  const bx=Math.round(car.x-im.width/2)+Math.round(off[0]),by=Math.round(car.y-im.height*.62)+Math.round(off[1]);
  cx.save();cx.globalCompositeOperation='lighter';
  if(L[3].naturalWidth){cx.globalAlpha=Math.min(1,(.15+.6*I)*(.75+.25*Math.random()));cx.drawImage(L[3],bx,by)}
  const thr=[0,.3,.62]; // primero los rayos de la trompa, después los del medio y al final los de atrás
  for(let k=0;k<3;k++){
    if(I<thr[k]||!L[k].naturalWidth)continue;const loc=(I-thr[k])/(1-thr[k]);
    for(let rep=0;rep<(I>.85?2:1);rep++){
      if(Math.random()>.45+.5*loc)continue;
      cx.globalAlpha=.55+.45*loc;cx.drawImage(L[k],bx+Math.round(rnd(-1.4,1.4)),by+Math.round(rnd(-1.4,1.4)));
    }
  }
  if(Math.random()<I*.22){cx.globalAlpha=1;for(let k=0;k<3;k++)if(L[k].naturalWidth&&I>=thr[k])cx.drawImage(L[k],bx,by)} // destello
  cx.restore();
  // chispazos sueltos saliendo de la trompa
  const fx=Math.cos(car.a),fy=Math.sin(car.a),nxp=car.x+fx*(im.width*.42),nyp=car.y-14+fy*(im.height*.35);
  for(let n=0;n<Math.round(I*3);n++){
    let x=nxp+rnd(-8,8),y=nyp+rnd(-8,8),a=Math.atan2(fy,fx)+rnd(-1.1,1.1);
    for(let t=0;t<6+I*10;t++){x+=Math.cos(a)*3+rnd(-2,2);y+=Math.sin(a)*2+rnd(-2,2);
      cx.fillStyle='rgba(120,220,255,.45)';cx.fillRect(Math.round(x)-1,Math.round(y)-1,4,4);cx.fillStyle='#ffffff';cx.fillRect(Math.round(x),Math.round(y),2,2)}
  }
  if(I>.15&&Math.random()<I*.25)tone(rnd(1800,3200),rnd(400,900),.05,'square',.02);
}
function drawBoom(b){
  const f=Math.min(11,Math.floor(b.t/b.fd)),im=explImg[f],an=FX_META.explosion[f];if(!im||!im.naturalWidth)return;
  const s=b.s;cx.drawImage(im,Math.round(b.x-an[0]*s),Math.round(b.y-an[1]*s),Math.round(im.width*s),Math.round(im.height*s));
}
function drawPortal(){
  const t=portal.t;let f;
  if(!portal.closeAt||t<portal.closeAt)f=t<.12?Math.min(4,Math.floor(t/.12*5)):(Math.floor(t*30)%2?4:3);
  else{const k=(t-portal.closeAt)/.3;f=k<.2?4:Math.min(7,5+Math.floor((k-.2)/.8*3))}
  const im=portalImg[f];if(!im.naturalWidth)return;
  const X=portal.gx,Y=portal.gy-16;
  cx.save();cx.translate(Math.round(X),Math.round(Y));cx.rotate(portal.a);cx.globalCompositeOperation='lighter';
  cx.globalAlpha=.9;cx.drawImage(im,-Math.round(im.width/2),-Math.round(im.height/2));
  cx.globalAlpha=.35;cx.drawImage(im,-Math.round(im.width/2)+Math.round(rnd(-1,1)),-Math.round(im.height/2)+Math.round(rnd(-1,1)));
  cx.restore();
}
function drawTrail(tr,now){
  const m=FX_META.fuego[tr.k],F=fireImg[tr.k];if(!F.base.naturalWidth||!F.llamas.naturalWidth)return;
  const hx=tr.gx+tr.hx*tr.ext,hy=tr.gy+tr.hy*tr.ext,reveal=Math.min(1,tr.t/.25)*tr.ext;
  const flame=tr.t<3.5?1:Math.max(0,1-(tr.t-3.5)/2.5),base=Math.max(.45,flame);
  cx.save();
  // sólo se ve hasta donde llegó el fuego (sigue de largo después del portal)
  const P={x:tr.gx+tr.hx*reveal,y:tr.gy+tr.hy*reveal},nx=tr.hx,ny=tr.hy,B=4000;
  cx.beginPath();cx.moveTo(P.x-ny*B,P.y+nx*B);cx.lineTo(P.x+ny*B,P.y-nx*B);cx.lineTo(P.x+ny*B-nx*B,P.y-nx*B-ny*B);cx.lineTo(P.x-ny*B-nx*B,P.y+nx*B-ny*B);cx.closePath();cx.clip();
  cx.translate(Math.round(hx),Math.round(hy));cx.rotate(tr.rot);cx.translate(-Math.round(m.inner[0]),-Math.round(m.inner[1]));
  cx.globalAlpha=base;cx.drawImage(F.base,0,0);
  if(flame>0){ // llamas: cada columna titila y sube un poco por su cuenta
    const img=F.llamas,vert=Math.abs(Math.cos(m.ang))<.5,n=vert?img.height:img.width;
    for(let i=0;i<n;i+=2){
      const w=Math.sin(now*17+i*.55)+Math.sin(now*29+i*1.7)*.6,o=-2*Math.max(0,Math.round(w+.6));
      if(w<-1.2)continue;
      cx.globalAlpha=flame*(w>.9?1:.85);
      if(vert)cx.drawImage(img,0,i,img.width,2,o,i,img.width,2);else cx.drawImage(img,i,0,2,img.height,i,o,2,img.height);
    }
  }
  cx.restore();
}
function drawMissile(m){
  const c=Math.cos(m.a),s=Math.sin(m.a);
  for(let i=-10;i<=9;i++){cx.fillStyle=i>=5?'#4f7a3a':i<=-8?'#ffd23f':'#2f3038';cx.fillRect(Math.round(m.x+c*i)-1,Math.round(m.y+s*i)-1,3,3)}
}
function drawVanPointer(){
  const dx=van.x-cam.x,dy=van.y-cam.y;
  if(Math.abs(dx)<W/2-6&&Math.abs(dy)<H/2-6)return;
  const a=Math.atan2(dy,dx),k=Math.min((W/2-14)/Math.abs(Math.cos(a)||1e-6),(H/2-14)/Math.abs(Math.sin(a)||1e-6));
  const x=Math.round(W/2+Math.cos(a)*k),y=Math.round(H/2+Math.sin(a)*k);
  if(Math.floor(performance.now()/250)%2)return;
  for(let r=0;r<10;r++){const w=10-r;cx.fillStyle=r<2?'#ffffff':'#e8212b';cx.fillRect(Math.round(x+Math.cos(a)*r)-Math.floor(w/2),Math.round(y+Math.sin(a)*r)-Math.floor(w/2),w,w)}
}
function draw(){
  const sx=shake?Math.round(rnd(-shake,shake)):0,sy=shake?Math.round(rnd(-shake,shake)):0;
  cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#4b4c54';cx.fillRect(0,0,W,H);
  if(!car)return;
  const vx0=Math.round((cam.x-W/2)/2)*2,vy0=Math.round((cam.y-H/2)/2)*2;
  const fw=Math.min(FW-vx0/2,Math.ceil(W/2)+1),fh=Math.min(FH-vy0/2,Math.ceil(H/2)+1);
  cx.drawImage(floor,vx0/2,vy0/2,fw,fh,sx,sy,fw*2,fh*2);
  cx.setTransform(1,0,0,1,-vx0+sx,-vy0+sy);
  cx.fillStyle='rgba(20,20,26,.55)';for(const k of skids)if(vis(k.x,k.y))cx.fillRect(k.x,k.y,2,2);
  const now=performance.now()/1000;
  for(const tr of trails)drawTrail(tr,now);
  const ents=[];
  for(const c of cones)if(vis(c.x,c.y))ents.push({y:c.y,f:()=>{const im=coneImgs[c.v||0];const ci=im.naturalWidth?im:coneImg;cx.drawImage(ci,Math.round(c.x-ci.width/2),Math.round(c.y-ci.height+4-(c.fly?Math.sin(Math.min(1,c.fly)*Math.PI)*24:0)))}});
  for(const l of lamps)if(vis(l.x,l.y,120))ents.push({y:l.y,f:()=>drawLamp(l)});
  const lineY=(pts,x)=>{x=clamp(x,pts[0][0],pts[pts.length-1][0]);for(let s=1;s<pts.length;s++){const [ax,ay]=pts[s-1],[bx,by]=pts[s];if(x<=bx)return ay+(by-ay)*(x-ax)/((bx-ax)||1)}return pts[pts.length-1][1]};
  for(const o of decor){if(!vis(o.x,o.y,300))continue;const im=scnImg[o.name];if(!im.complete||!im.naturalWidth)continue;
    if(o.pts)ents.push({y:lineY(o.pts,car.x)+6,f:()=>cx.drawImage(im,o.x-SCN.cerco.ax,o.y-SCN.cerco.ay)});
    else if(o.ready)ents.push({y:o.y,f:()=>cx.drawImage(im,o.dx,o.dy)})}
  const tw=209,th=173,tline=[[TRUCK.x-tw/2+tw*.20,TRUCK.y-th/2+th*.47],[TRUCK.x-tw/2+tw*.77,TRUCK.y-th/2+th*.82]];
  if(vis(TRUCK.x,TRUCK.y,200)&&truckImg.complete&&truckImg.naturalWidth)ents.push({y:lineY(tline,car.x)+8,f:()=>cx.drawImage(truckImg,TRUCK.x-Math.round(truckImg.width/2),TRUCK.y-Math.round(truckImg.height/2))});
  if(vis(doc.x,doc.y)){const im=docImg[doc.pose];if(im.complete&&im.naturalWidth)ents.push({y:doc.y-8,f:()=>{const hop=doc.hop>0?Math.round(Math.sin(doc.hop/.35*Math.PI)*10):0;cx.drawImage(im,Math.round(doc.x-im.width/2),Math.round(doc.y-im.height/2-hop))}})}
  if(!car.gone&&!(car.dead&&performance.now()-car.dead>150))ents.push({y:car.y,f:()=>{
    if(state==='warp'&&portal){ // el auto se mete en el portal: se recorta del lado de adelante del plano
      const P={x:portal.gx,y:portal.gy},nx=portal.hx,ny=portal.hy,B=4000;cx.save();cx.beginPath();
      cx.moveTo(P.x-ny*B,P.y+nx*B);cx.lineTo(P.x+ny*B,P.y-nx*B);cx.lineTo(P.x+ny*B-nx*B,P.y-nx*B-ny*B);cx.lineTo(P.x-ny*B-nx*B,P.y+nx*B-ny*B);cx.closePath();cx.clip();
      drawSprite(carImg,car,.62,false,false);cx.restore();
    }else drawSprite(carImg,car,.62,car.inv>0&&state==='play',false)}});
  if(van.on&&vis(van.x,van.y,120))ents.push({y:van.y,f:()=>{drawSprite(vanImg,van,.72,false,false);
    if(van.warn&&state==='play'&&Math.floor(performance.now()/120)%2){const x=Math.round(van.x)-3,y=Math.round(van.y)-112;cx.fillStyle='#1f2025';cx.fillRect(x-1,y-1,8,27);cx.fillStyle='#e8212b';cx.fillRect(x,y,6,16);cx.fillRect(x,y+19,6,6)}}});
  ents.sort((a,b)=>a.y-b.y);for(const e of ents)e.f();
  for(const m of missiles)drawMissile(m);
  for(const p of parts){cx.globalAlpha=p.spark?1:Math.max(0,p.life/p.max);cx.fillStyle=p.c;const s=p.grow?Math.round(p.s/2)*2:p.s;cx.fillRect(Math.round(p.x/2)*2-(p.grow?s/2:0),Math.round(p.y/2)*2-(p.grow?s/2:0),s,s)}
  cx.globalAlpha=1;
  for(const b of booms)drawBoom(b);
  // rayos desde 80 mph: más y más brillantes cuanto más cerca de 88
  const rayI=state==='warp'&&!car.gone?1:(state==='play'&&car.mph>=80?Math.min(1,(car.mph-80)/8):-1);
  if(rayI>=0)drawRays(rayI);
  if(portal)drawPortal();
  cx.font='8px "Press Start 2P", monospace';cx.textAlign='center';
  for(const t of texts){cx.globalAlpha=Math.min(1,t.life*2);cx.fillStyle='#16171d';cx.fillText(t.t,Math.round(t.x)+1,Math.round(t.y)+1);cx.fillStyle=t.c;cx.fillText(t.t,Math.round(t.x),Math.round(t.y))}
  cx.globalAlpha=1;
  cx.setTransform(1,0,0,1,0,0);
  if(van.on&&state==='play')drawVanPointer();
}
// aguja del velocímetro: 55 arriba al medio, cada 10 mph ≈ 30,75°; eje medido sobre la imagen
const nc=$('needle'),nx=nc.getContext('2d');
const NS=128,PIV={x:.5*NS,y:.54*NS};
const degFor=mph=>Math.max((mph-55)*3.075,-140); // en reposo descansa apenas debajo del 15
let shownMph=0;
function drawNeedle(mph){
  nx.clearRect(0,0,NS,NS);
  const ta=degFor(CONFIG.mphViaje)*Math.PI/180;nx.fillStyle='#b3141c';
  for(let r=48;r<=56;r++)nx.fillRect(Math.round(PIV.x+Math.sin(ta)*r)-2,Math.round(PIV.y-Math.cos(ta)*r)-2,4,4);
  const a=degFor(mph)*Math.PI/180,len=46,hot=mph>=80;
  for(let r=-8;r<=len;r++){const thick=r<len-12;nx.fillStyle=r<0?'#16171d':hot&&Math.floor(performance.now()/80)%2?'#3fb8ff':'#ff6a1a';
    const w=thick?4:2;nx.fillRect(Math.round(PIV.x+Math.sin(a)*r)-w/2,Math.round(PIV.y-Math.cos(a)*r)-w/2,w,w)}
  nx.fillStyle='#16171d';nx.fillRect(Math.round(PIV.x)-5,Math.round(PIV.y)-5,10,10);
}
const ro=$('readout');
function hud(){
  const mph=car&&!car.gone&&!car.dead?car.mph:(state==='won'?CONFIG.mphViaje:0);
  shownMph+=(Math.max(mph,0)-shownMph)*.35;
  drawNeedle(shownMph);
  const v=Math.floor(mph);ro.textContent=String(v).padStart(3,'0')+' MPH';ro.classList.toggle('hot',v>=80);
  $('time').textContent=fmt(elapsed||0);
}
function frame(t){
  const dt=Math.min(.05,(t-last)/1000);last=t;
  decorFootprints();
  if(state==='play'||state==='warp'||state==='won'||state==='lost')update(dt);
  draw();hud();requestAnimationFrame(frame);
}
resize();newRun();
playMusic('inicio',true);
requestAnimationFrame(frame);
})();
