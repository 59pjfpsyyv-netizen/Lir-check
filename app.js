const APP_VERSION="v2";
const CACHE_VERSION="lir-check-v2";

const COMPARTMENTS=[
 {id:1,name:"Bodega anterior",max:20412,lines:6},
 {id:2,name:"Bodega anterior",max:20412,lines:6},
 {id:3,name:"Bodega posterior",max:15870,lines:6},
 {id:4,name:"Bodega posterior",max:null,lines:6},
 {id:5,name:"Bodega posterior",max:null,lines:6}
];

const ULD_WEIGHTS={AKE:75,AKN:127,AKH:80,ALF:175,"PAJ/PAC":120,PMC:125};
const BAG_TYPES=new Set(["B","BF","BS","BT"]);
const SUPPORTED_TYPES=["X","N","B","BF","BS","BT","C","M","CC"];

const state={rows:COMPARTMENTS.map(c=>Array.from({length:c.lines},()=>({uld:"",type:"",value:""})))};
const $=id=>document.getElementById(id);
const n=v=>{const x=Number(String(v??"").replace(",", "."));return Number.isFinite(x)?x:0};
const f=x=>Number.isInteger(x)?String(x):x.toFixed(1).replace(".",",");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function render(){
 $("compartments").innerHTML=COMPARTMENTS.map((c,i)=>`
 <section class="card cpt-card">
  <div class="cpt-head"><span class="cpt-name">CPT ${c.id} · ${esc(c.name)}</span><span class="cpt-max">${c.max?`MAX ${f(c.max)} kg`:""}</span></div>
  <div class="cpt-body">
   <div id="rows${i}"></div>
   <div class="cpt-mini" id="summary${i}"></div>
   <button class="add-row" type="button" data-add="${i}">＋ Añadir línea</button>
  </div>
 </section>`).join("");
 COMPARTMENTS.forEach((_,i)=>renderRows(i));
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.add;state.rows[i].push({uld:"",type:"",value:""});renderRows(i)}));
}
function renderRows(i){
 $("rows"+i).innerHTML=state.rows[i].map((r,j)=>`
 <div class="lir-row">
  <div class="row-num">${j+1}</div>
  <label><div class="field-label">ULD</div><input data-cell="${i}:${j}:uld" type="text" autocapitalize="characters" autocomplete="off" maxlength="8" value="${esc(r.uld)}" placeholder="AKE"></label>
  <label><div class="field-label">TIPO</div><select class="type-select" data-cell="${i}:${j}:type">
   <option value="">TIPO</option>${SUPPORTED_TYPES.map(t=>`<option value="${t}" ${r.type===t?"selected":""}>${t}</option>`).join("")}
  </select></label>
  <label><div class="field-label" id="valueLabel${i}_${j}">VALOR</div><input data-cell="${i}:${j}:value" inputmode="decimal" type="number" min="0" step="0.1" value="${esc(r.value)}" placeholder="kg / bags"></label>
  <button class="delete-row" type="button" data-del="${i}:${j}" aria-label="Eliminar línea">×</button>
 </div>`).join("");
 $("rows"+i).querySelectorAll("[data-cell]").forEach(el=>{
  const [ci,ri,key]=el.dataset.cell.split(":");
  el.addEventListener("input",e=>{state.rows[+ci][+ri][key]=e.target.value;updateRowLabel(+ci,+ri);updateSummary(+ci)});
  el.addEventListener("change",e=>{state.rows[+ci][+ri][key]=e.target.value;updateRowLabel(+ci,+ri);updateSummary(+ci)});
  if(key==="uld") el.addEventListener("blur",e=>{e.target.value=e.target.value.toUpperCase();state.rows[+ci][+ri].uld=e.target.value;updateSummary(+ci)});
 });
 $("rows"+i).querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{const [ci,ri]=b.dataset.del.split(":").map(Number);state.rows[ci].splice(ri,1);if(!state.rows[ci].length)state.rows[ci].push({uld:"",type:"",value:""});renderRows(ci)}));
 state.rows[i].forEach((_,j)=>updateRowLabel(i,j));updateSummary(i);
}
function updateRowLabel(i,j){
 const t=state.rows[i][j].type;
 const el=$("valueLabel"+i+"_"+j);
 if(el) el.textContent=BAG_TYPES.has(t)?"BAGS":(t==="X"||t==="N"||t===""?"VALOR":"KG");
}
function calc(i){
 let bags=0,uld=0,C=0,M=0,O=0,unsupported=0,unknownULD=[];
 state.rows[i].forEach(r=>{
  const t=r.type, v=n(r.value), code=String(r.uld||"").trim().toUpperCase();
  if(code && t!=="N"){
   if(ULD_WEIGHTS[code]!==undefined) uld+=ULD_WEIGHTS[code];
   else unknownULD.push(code);
  }
  if(BAG_TYPES.has(t)) bags+=v;
  else if(t==="C") C+=v;
  else if(t==="M") M+=v;
  else if(t==="CC") unsupported+=v;
 });
 const avg=n($("avgBagWeight").value);
 const B=bags*avg;
 return {bags,B,uld,C,M,O,total:B+uld+C+M+O,unsupported,unknownULD};
}
function updateSummary(i){
 const x=calc(i);
 $("summary"+i).innerHTML=`<span class="chip">B <strong>${f(x.B)} kg</strong></span><span class="chip">ULD <strong>${f(x.uld)} kg</strong></span><span class="chip">C <strong>${f(x.C)} kg</strong></span><span class="chip">M <strong>${f(x.M)} kg</strong></span>`;
}
function calculate(){
 const data=COMPARTMENTS.map((c,i)=>({c,x:calc(i)}));
 $("resultCard").hidden=false;
 const total=data.reduce((s,d)=>s+d.x.total,0);
 $("resultBadge").textContent="Calculada";$("resultBadge").className="result-badge ok";
 $("results").innerHTML=`
 <table class="hcc-table">
  <thead><tr><th>CPT</th><th>B</th><th>C</th><th>ULD</th><th>M</th><th>O</th><th>TOTAL</th></tr></thead>
  <tbody>${data.map(d=>`<tr><td><strong>${d.c.id}</strong></td><td>${f(d.x.B)}</td><td>${f(d.x.C)}</td><td>${f(d.x.uld)}</td><td>${f(d.x.M)}</td><td>${f(d.x.O)}</td><td class="total">${f(d.x.total)}</td></tr>`).join("")}</tbody>
 </table>
 <div class="hcc-total"><span>TOTAL AVIÓN</span><span>${f(total)} kg</span></div>
 ${warnings(data)}`;
 $("resultCard").scrollIntoView({behavior:"smooth",block:"start"});
}
function warnings(data){
 const unknown=[...new Set(data.flatMap(d=>d.x.unknownULD))];
 const cc=data.reduce((s,d)=>s+d.x.unsupported,0);
 let html="";
 if(unknown.length) html+=`<div class="warning">⚠ ULD no reconocido: ${unknown.map(esc).join(", ")}. Su peso NO se ha sumado.</div>`;
 if(cc) html+=`<div class="warning">⚠ Hay ${f(cc)} kg introducidos como CC. Este tipo queda pendiente de definir y NO se ha sumado a C/M.</div>`;
 return html+`<div class="note">B, BF, BS y BT se agrupan como equipaje (B). X no añade carga; si hay ULD, sí añade su tara. N no añade ULD. BL y E se han dejado fuera de esta versión.</div>`;
}
function clearAll(){
 state.rows=COMPARTMENTS.map(c=>Array.from({length:c.lines},()=>({uld:"",type:"",value:""})));
 $("avgBagWeight").value="16.6";render();$("resultCard").hidden=true;window.scrollTo({top:0,behavior:"smooth"});
}
$("avgBagWeight").addEventListener("input",()=>COMPARTMENTS.forEach((_,i)=>updateSummary(i)));
$("calculateButton").addEventListener("click",calculate);
$("resetButton").addEventListener("click",clearAll);$("resetTop").addEventListener("click",clearAll);
$("version").textContent=APP_VERSION;
render();
if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
