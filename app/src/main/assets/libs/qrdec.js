/* ===== Offline QR decoder (no library, no internet) ===== */
(function(root){
'use strict';
const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
(function(){let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]})();
const gmul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
const gdiv=(a,b)=>a?EXP[(LOG[a]+255-LOG[b])%255]:0;
function rsDecode(cw,nsym){
  const n=cw.length,S=new Array(nsym).fill(0);let any=false;
  for(let i=0;i<nsym;i++){let s=0;for(let k=0;k<n;k++)s=gmul(s,EXP[i])^cw[k];S[i]=s;if(s)any=true}
  if(!any)return true;
  let C=[1],B=[1],L=0,m=1,b=1;
  for(let r=0;r<nsym;r++){
    let d=S[r];for(let i=1;i<=L;i++)if(i<C.length)d^=gmul(C[i],S[r-i]);
    if(d===0){m++;continue}
    const T=C.slice(),coef=gdiv(d,b);
    while(C.length<B.length+m)C.push(0);
    for(let i=0;i<B.length;i++)C[i+m]^=gmul(coef,B[i]);
    if(2*L<=r){L=r+1-L;B=T;b=d;m=1}else m++;
  }
  if(L===0||L*2>nsym)return false;
  const pos=[];
  for(let j=0;j<n;j++){let v=0;const xi=(255-j)%255;for(let i=0;i<C.length;i++)if(C[i])v^=gmul(C[i],EXP[(xi*i)%255]);if(v===0)pos.push(j)}
  if(pos.length!==L)return false;
  const Om=new Array(nsym).fill(0);
  for(let i=0;i<nsym;i++){let v=0;for(let j=0;j<C.length&&j<=i;j++)v^=gmul(C[j],S[i-j]);Om[i]=v}
  for(const j of pos){
    const xi=(255-j)%255;let om=0,ld=0;
    for(let i=0;i<nsym;i++)if(Om[i])om^=gmul(Om[i],EXP[(xi*i)%255]);
    for(let i=1;i<C.length;i+=2)if(C[i])ld^=gmul(C[i],EXP[(xi*(i-1))%255]);
    if(!ld)return false;
    cw[n-1-j]^=gmul(EXP[j],gdiv(om,ld));
  }
  for(let i=0;i<nsym;i++){let s=0;for(let k=0;k<n;k++)s=gmul(s,EXP[i])^cw[k];if(s)return false}
  return true;
}
const ECPB=[
[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
[0,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
[0,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
[0,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]];
const NBLK=[
[0,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
[0,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
[0,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
[0,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]];
const ECL_FROM_BITS={1:0,0:1,3:2,2:3};
function alignPos(v){
  if(v===1)return[];
  const n=Math.floor(v/7)+2,step=v===32?26:Math.ceil((v*4+4)/(n*2-2))*2,r=[6];
  for(let p=v*4+10;r.length<n;p-=step)r.splice(1,0,p);return r;
}
function rawModules(v){let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r}
const fcache={};
function funcMap(v){
  if(fcache[v])return fcache[v];
  const D=17+4*v,f=new Uint8Array(D*D);
  const fill=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(x>=0&&y>=0&&x<D&&y<D)f[y*D+x]=1};
  fill(0,0,8,8);fill(D-8,0,D-1,8);fill(0,D-8,8,D-1);
  for(let i=0;i<D;i++){f[6*D+i]=1;f[i*D+6]=1}
  if(v>=2){const p=alignPos(v),n=p.length;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if((i===0&&j===0)||(i===0&&j===n-1)||(i===n-1&&j===0))continue;fill(p[i]-2,p[j]-2,p[i]+2,p[j]+2)}}
  if(v>=7){fill(D-11,0,D-9,5);fill(0,D-11,5,D-9)}
  return fcache[v]=f;
}
const FMT=[];
(function(){for(let d=0;d<32;d++){let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);FMT.push(((d<<10)|r)^0x5412)}})();
const pop=x=>{let c=0;while(x){c+=x&1;x>>>=1}return c};
function readFormat(m,D){
  const g=(x,y)=>m[y*D+x];
  let a=0,b=0;
  for(let i=0;i<=5;i++)a|=g(8,i)<<i;a|=g(8,7)<<6;a|=g(8,8)<<7;a|=g(7,8)<<8;for(let i=9;i<15;i++)a|=g(14-i,8)<<i;
  for(let i=0;i<8;i++)b|=g(D-1-i,8)<<i;for(let i=8;i<15;i++)b|=g(8,D-15+i)<<i;
  const out=[];
  for(const w of [a,b]){let best=-1,bd=99;for(let d=0;d<32;d++){const h=pop(w^FMT[d]);if(h<bd){bd=h;best=d}}if(bd<=3&&!out.some(o=>o.d===best))out.push({d:best,h:bd})}
  out.sort((x,y)=>x.h-y.h);
  return out.map(o=>({ec:ECL_FROM_BITS[o.d>>3],mask:o.d&7}));
}
const maskFn=(k,x,y)=>{switch(k){case 0:return(x+y)%2===0;case 1:return y%2===0;case 2:return x%3===0;case 3:return(x+y)%3===0;case 4:return(Math.floor(x/3)+Math.floor(y/2))%2===0;case 5:return(x*y)%2+(x*y)%3===0;case 6:return((x*y)%2+(x*y)%3)%2===0;default:return((x+y)%2+(x*y)%3)%2===0}};
function readCodewords(m,D,f,mask,v){
  const total=Math.floor(rawModules(v)/8),out=new Uint8Array(total);let bi=0;
  for(let right=D-1;right>=1;right-=2){
    if(right===6)right=5;
    for(let vert=0;vert<D;vert++)for(let j=0;j<2;j++){
      const x=right-j,up=((right+1)&2)===0,y=up?D-1-vert:vert;
      if(!f[y*D+x]&&bi<total*8){let bit=m[y*D+x];if(maskFn(mask,x,y))bit^=1;out[bi>>3]|=bit<<(7-(bi&7));bi++}
    }
  }
  return out;
}
function dataBytes(stream,v,ec){
  const nb=NBLK[ec][v],el=ECPB[ec][v],total=stream.length,ns=nb-total%nb,sl=Math.floor(total/nb);
  const dl=[];let maxd=0;
  for(let j=0;j<nb;j++){dl.push(sl-el+(j>=ns?1:0));if(dl[j]>maxd)maxd=dl[j]}
  const blocks=[];for(let j=0;j<nb;j++)blocks.push(new Array(dl[j]+el));
  let p=0;
  for(let i=0;i<maxd;i++)for(let j=0;j<nb;j++)if(i<dl[j])blocks[j][i]=stream[p++];
  for(let i=0;i<el;i++)for(let j=0;j<nb;j++)blocks[j][dl[j]+i]=stream[p++];
  const out=[];
  for(let j=0;j<nb;j++){if(!rsDecode(blocks[j],el))return null;for(let i=0;i<dl[j];i++)out.push(blocks[j][i])}
  return out;
}
const ALN='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
function parse(bytes,v){
  let bp=0;const nbits=bytes.length*8;
  const rd=n=>{let r=0;for(let i=0;i<n;i++){r=(r<<1)|((bytes[bp>>3]>>(7-(bp&7)))&1);bp++}return r};
  const cc=(a,b,c)=>v<=9?a:v<=26?b:c;
  let text='',chunks=[];
  const flush=()=>{if(!chunks.length)return;const u=new Uint8Array(chunks);chunks=[];let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(u)}catch(e){s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i])}text+=s};
  while(bp+4<=nbits){
    const mode=rd(4);
    if(mode===0)break;
    if(mode===1){let n=rd(cc(10,12,14));flush();while(n>=3&&bp+10<=nbits){const x=rd(10);if(x>999)return null;text+=String(x).padStart(3,'0');n-=3}if(n===2){const x=rd(7);text+=String(x).padStart(2,'0')}else if(n===1){text+=String(rd(4))}}
    else if(mode===2){let n=rd(cc(9,11,13));flush();while(n>=2&&bp+11<=nbits){const x=rd(11);text+=ALN[Math.floor(x/45)]+ALN[x%45];n-=2}if(n===1)text+=ALN[rd(6)]}
    else if(mode===4){let n=rd(cc(8,16,16));if(bp+n*8>nbits)return null;for(let i=0;i<n;i++)chunks.push(rd(8))}
    else if(mode===8){let n=rd(cc(8,10,12));flush();const u=[];for(let i=0;i<n&&bp+13<=nbits;i++){let x=rd(13);x=Math.floor(x/0xC0)*0x100+(x%0xC0);x+=x<0x1F00?0x8140:0xC140;u.push(x>>8,x&255)}try{text+=new TextDecoder('shift-jis').decode(new Uint8Array(u))}catch(e){}}
    else if(mode===7){const b0=rd(8);if(b0&0x80){rd(b0&0x40?16:8)}}
    else if(mode===3){rd(8)}
    else if(mode===5){}
    else return null;
  }
  flush();return text;
}
function decodeMatrix(m,D){
  const v=(D-17)/4;if(v<1||v>40||v!==Math.floor(v))return null;
  const f=funcMap(v);
  const fm=readFormat(m,D);
  for(const o of fm){
    const st=readCodewords(m,D,f,o.mask,v),db=dataBytes(st,v,o.ec);
    if(db){const t=parse(db,v);if(t!=null&&t!=='')return t}
  }
  return null;
}
function otsu(g,n){
  const h=new Float64Array(256);for(let i=0;i<n;i+=3)h[g[i]]++;
  let tot=0,sm=0;for(let i=0;i<256;i++){tot+=h[i];sm+=i*h[i]}
  let wb=0,sb=0,best=0,th=128;
  for(let t=0;t<256;t++){wb+=h[t];if(!wb)continue;const wf=tot-wb;if(!wf)break;sb+=t*h[t];const mb=sb/wb,mf=(sm-sb)/wf,bt=wb*wf*(mb-mf)*(mb-mf);if(bt>best){best=bt;th=t}}
  return th;
}
function binarize(g,w,h,win,off){
  const bin=new Uint8Array(w*h);
  if(!win){const t=otsu(g,w*h);for(let i=0;i<w*h;i++)bin[i]=g[i]<=t?1:0;return bin}
  const W=w+1,I=new Int32Array(W*(h+1));
  for(let y=0;y<h;y++){let r=0;for(let x=0;x<w;x++){r+=g[y*w+x];I[(y+1)*W+x+1]=I[y*W+x+1]+r}}
  const rad=win>>1;
  for(let y=0;y<h;y++){const y0=Math.max(0,y-rad),y1=Math.min(h,y+rad+1);
    for(let x=0;x<w;x++){const x0=Math.max(0,x-rad),x1=Math.min(w,x+rad+1),ar=(x1-x0)*(y1-y0);
      const s=I[y1*W+x1]-I[y0*W+x1]-I[y1*W+x0]+I[y0*W+x0];
      bin[y*w+x]=g[y*w+x]<s/ar-off?1:0}}
  return bin;
}
function scanAxis(bin,w,h,x,y,dx,dy,lim){
  const k=[0,0,0];let px=x,py=y;
  const val=()=>(px>=0&&py>=0&&px<w&&py<h)?bin[py*w+px]:-1;
  let c=0;
  while(val()===1){k[0]++;px+=dx;py+=dy;if(++c>lim)return null}
  c=0;while(val()===0){k[1]++;px+=dx;py+=dy;if(++c>lim)return null}
  c=0;while(val()===1){k[2]++;px+=dx;py+=dy;if(++c>lim)return null}
  return k;
}
function okRatio(a,b,c,d,e){
  const t=a+b+c+d+e,ms=t/7;if(t<7)return 0;
  const o=v=>v>=ms*0.4&&v<=ms*1.8;
  if(!(o(a)&&o(b)&&o(d)&&o(e)&&c>=ms*1.8&&c<=ms*4.4))return 0;
  return ms;
}
function cross(bin,w,h,cx,cy,vert,ms){
  const x=Math.round(cx),y=Math.round(cy);
  if(x<0||y<0||x>=w||y>=h||bin[y*w+x]!==1)return null;
  const dx=vert?0:1,dy=vert?1:0,lim=Math.ceil(ms*5);
  const A=scanAxis(bin,w,h,x,y,-dx,-dy,lim),B=scanAxis(bin,w,h,x,y,dx,dy,lim);
  if(!A||!B)return null;
  const center=A[0]+B[0]-1,m2=okRatio(A[2],A[1],center,B[1],B[2]);
  if(!m2)return null;
  const lo=(vert?y:x)-(A[0]-1),hi=(vert?y:x)+(B[0]-1),mid=(lo+hi)/2;
  return{p:mid,ms:m2};
}
function findFinders(bin,w,h){
  const cands=[],starts=[],lens=[];
  for(let y=0;y<h;y++){
    const base=y*w;let n=0,cur=bin[base],len=0,st=0;
    for(let x=0;x<w;x++){const b=bin[base+x];if(b===cur)len++;else{starts[n]=st;lens[n++]=len;st=x;len=1;cur=b}}
    starts[n]=st;lens[n++]=len;
    const c0=bin[base];
    for(let i=2;i+2<n;i++){
      if(((c0^(i&1))&1)!==1)continue;
      const ms=okRatio(lens[i-2],lens[i-1],lens[i],lens[i+1],lens[i+2]);
      if(!ms)continue;
      const cx=starts[i-2]+(lens[i-2]+lens[i-1]+lens[i]+lens[i+1]+lens[i+2])/2;
      const v=cross(bin,w,h,cx,y,true,ms);if(!v)continue;
      const hz=cross(bin,w,h,cx,v.p,false,v.ms);if(!hz)continue;
      const fx=hz.p,fy=v.p,fm=(v.ms+hz.ms)/2;
      let hit=null;
      for(const c of cands){if(Math.abs(c.x-fx)<=Math.max(c.ms,fm)*1.2&&Math.abs(c.y-fy)<=Math.max(c.ms,fm)*1.2){hit=c;break}}
      if(hit){const k=hit.n;hit.x=(hit.x*k+fx)/(k+1);hit.y=(hit.y*k+fy)/(k+1);hit.ms=(hit.ms*k+fm)/(k+1);hit.n++}
      else cands.push({x:fx,y:fy,ms:fm,n:1});
    }
  }
  return cands.filter(c=>c.n>=2).sort((a,b)=>b.n-a.n).slice(0,12);
}
function triples(c){
  const out=[];
  for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++)for(let k=j+1;k<c.length;k++){
    const P=[c[i],c[j],c[k]];
    const ms=P.map(p=>p.ms),mr=Math.max(...ms)/Math.min(...ms);if(mr>1.8)continue;
    const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const d01=d(P[0],P[1]),d02=d(P[0],P[2]),d12=d(P[1],P[2]);
    let tl,a,b;
    if(d12>=d01&&d12>=d02){tl=P[0];a=P[1];b=P[2]}else if(d02>=d01&&d02>=d12){tl=P[1];a=P[0];b=P[2]}else{tl=P[2];a=P[0];b=P[1]}
    const ax=a.x-tl.x,ay=a.y-tl.y,bx=b.x-tl.x,by=b.y-tl.y,la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);
    if(!la||!lb)continue;
    const cos=Math.abs((ax*bx+ay*by)/(la*lb)),rr=Math.max(la,lb)/Math.min(la,lb);
    if(cos>0.5||rr>1.6)continue;
    let TR=a,BL=b;if(ax*by-ay*bx<0){TR=b;BL=a}
    const msA=(P[0].ms+P[1].ms+P[2].ms)/3;
    if(Math.min(la,lb)/msA<14)continue;
    out.push({tl,TR,BL,s:cos+(rr-1)*0.5+(mr-1)*0.3-(P[0].n+P[1].n+P[2].n)*0.0005});
  }
  return out.sort((x,y)=>x.s-y.s);
}
function solveH(src,dst){
  const A=[];
  for(let i=0;i<4;i++){const[x,y]=src[i],[u,v]=dst[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y,u]);A.push([0,0,0,x,y,1,-v*x,-v*y,v])}
  for(let c=0;c<8;c++){
    let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;
    if(Math.abs(A[p][c])<1e-12)return null;
    [A[c],A[p]]=[A[p],A[c]];
    for(let r=0;r<8;r++)if(r!==c){const f=A[r][c]/A[c][c];for(let k=c;k<9;k++)A[r][k]-=f*A[c][k]}
  }
  return A.map((r,i)=>r[8]/r[i]);
}
function sampleGrid(bin,w,h,T,D,alignHit){
  const{tl,TR,BL}=T;
  const ux=(TR.x-tl.x)/(D-7),uy=(TR.y-tl.y)/(D-7),vx=(BL.x-tl.x)/(D-7),vy=(BL.y-tl.y)/(D-7);
  const aff=(mx,my)=>[tl.x+(mx-3.5)*ux+(my-3.5)*vx,tl.y+(mx-3.5)*uy+(my-3.5)*vy];
  let map=aff;
  if(D>=25){
    const ap=aff(D-6.5,D-6.5);let best=-1,bp=null;
    const px=(x,y)=>{x=Math.round(x);y=Math.round(y);return(x>=0&&y>=0&&x<w&&y<h)?bin[y*w+x]:0};
    for(let dy=-3;dy<=3;dy+=0.5)for(let dx=-3;dx<=3;dx+=0.5){
      const mx=D-6.5+dx,my=D-6.5+dy;let s=0;
      for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const q=aff(mx+a,my+b),want=Math.max(Math.abs(a),Math.abs(b))!==1?1:0;if(px(q[0],q[1])===want)s++}
      if(s>best){best=s;bp=[mx,my]}
    }
    if(best>=21){
      const q=aff(bp[0],bp[1]);
      const H=solveH([[3.5,3.5],[D-3.5,3.5],[3.5,D-3.5],[D-6.5,D-6.5]],[[tl.x,tl.y],[TR.x,TR.y],[BL.x,BL.y],[q[0],q[1]]]);
      if(H)map=(mx,my)=>{const z=H[6]*mx+H[7]*my+1;return[(H[0]*mx+H[1]*my+H[2])/z,(H[3]*mx+H[4]*my+H[5])/z]};
    }
  }
  const m=new Uint8Array(D*D),o=[[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]];
  for(let y=0;y<D;y++)for(let x=0;x<D;x++){
    let s=0;
    for(const[a,b]of o){const q=map(x+.5+a,y+.5+b),px=Math.round(q[0]),py=Math.round(q[1]);if(px>=0&&py>=0&&px<w&&py<h&&bin[py*w+px])s++}
    m[y*D+x]=s>=3?1:0;
  }
  return m;
}
function tryBin(bin,w,h){
  const f=findFinders(bin,w,h);
  if(f.length<3)return null;
  const T=triples(f);
  let tries=0;
  for(const t of T){
    if(tries++>=8)break;
    const ms=(t.tl.ms+t.TR.ms+t.BL.ms)/3;
    const side=(Math.hypot(t.TR.x-t.tl.x,t.TR.y-t.tl.y)+Math.hypot(t.BL.x-t.tl.x,t.BL.y-t.tl.y))/2;
    const est=side/ms+7,v0=Math.round((est-17)/4);
    const order=[v0,v0+1,v0-1,v0+2,v0-2].filter(v=>v>=1&&v<=40);
    for(const v of order.slice(0,4)){
      const D=17+4*v,m=sampleGrid(bin,w,h,t,D);
      const r=decodeMatrix(m,D);if(r)return r;
    }
  }
  return null;
}
function blur(g,w,h,r){
  const W=w+1,I=new Int32Array(W*(h+1)),o=new Uint8ClampedArray(w*h);
  for(let y=0;y<h;y++){let s=0;for(let x=0;x<w;x++){s+=g[y*w+x];I[(y+1)*W+x+1]=I[y*W+x+1]+s}}
  for(let y=0;y<h;y++){const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1);o[y*w+x]=(I[y1*W+x1]-I[y0*W+x1]-I[y1*W+x0]+I[y0*W+x0])/((x1-x0)*(y1-y0))}}
  return o;
}
function decodeGray(g,w,h){
  const m=Math.max(w,h);
  const wins=[Math.max(31,Math.round(m/6))|1,Math.max(21,Math.round(m/14))|1,0];
  const imgs=[g];
  for(const base of imgs){
    for(const win of wins){
      for(const off of (win?[7,3]:[0])){
        const bin=binarize(base,w,h,win,off);
        let r=tryBin(bin,w,h);if(r)return r;
        const inv=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)inv[i]=bin[i]^1;
        r=tryBin(inv,w,h);if(r)return r;
      }
    }
    if(base===g){
      const bl=blur(g,w,h,Math.max(2,Math.round(m/120))),s=new Uint8ClampedArray(w*h);
      for(let i=0;i<s.length;i++)s[i]=g[i]*2-bl[i];
      imgs.push(s);
    }
  }
  return null;
}
root.DSQR={decodeGray,decodeMatrix,rsDecode};
if(typeof module!=='undefined')module.exports=root.DSQR;
})(typeof window!=='undefined'?window:globalThis);
