export const DEFAULT_RECIPIENT = {id:'amu-chairman',label:'The Chairman · Chemical Engineering, AMU',details:'Name: The Chairman,\nDepartment of Chemical Engineering,\nZHCET, AMU Aligarh (UP)-202002'};
export const DEFAULT_SUPPLY = {id:'amu-ta-store',label:'TA Store · Chemical Engineering, AMU',details:'Name: TA Store, Chemical\nEngineering, ZHCET\nAMU Aligarh (UP) - 202002'};
const clone = value => structuredClone(value);
export const uid = () => {
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  return [...bytes].map((byte,index)=>([4,6,8,10].includes(index)?'-':'')+byte.toString(16).padStart(2,'0')).join('');
};
export function today(date = new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function decimal(value, places=4) {
  const s=String(value??'');
  if(s.length>24 || !/^\d+(\.\d*)?$/.test(s) || !Number.isFinite(Number(s)) || Number(s)>1000000000) return 0n;
  const [whole,fraction='']=s.split('.');
  return BigInt(whole)*10n**BigInt(places)+BigInt((fraction+'0'.repeat(places)).slice(0,places));
}
export function lineAmount(item) {
  if(item.amountOverride!==null && item.amountOverride!==undefined && item.amountOverride!=='') return Number((decimal(item.amountOverride,4)+50n)/100n);
  return Number((decimal(item.quantity)*decimal(item.rate)+500000n)/1000000n);
}
export function totals(invoice) {
  const subtotal=(invoice.items||[]).reduce((sum,item)=>sum+lineAmount(item),0);
  const tax=Number((BigInt(subtotal)*decimal(invoice.gst||'0',2)+5000n)/10000n);
  return {subtotal,tax,total:subtotal+tax};
}
export function money(paise) {return (paise/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
const small=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numberWords(n) {
  n=Math.floor(n);
  if(n<20) return small[n];
  if(n<100) return tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:'');
  for(const [base,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand'],[100,'Hundred']]) if(n>=base) return numberWords(Math.floor(n/base))+' '+label+(n%base?' '+numberWords(n%base):'');
  return '';
}
export function inWords(paise) {
  if(!Number.isSafeInteger(paise)||paise<0)return 'Enter valid amounts';
  const rupees=Math.floor(paise/100),p=paise%100;
  return `${numberWords(rupees)} ${rupees===1?'Rupee':'Rupees'}${p?' and '+numberWords(p)+(p===1?' Paisa':' Paise'):''} Only`;
}
export function nextNumber(invoices) {
  if(!invoices.length) return '17';
  const latest=invoices[0].number;
  const m=latest.match(/^(.*?)(\d+)$/);
  if(!m) return latest+'-1';
  const prefix=m[1], digits=m[2];
  let max=BigInt(digits);
  for(const invoice of invoices){const v=invoice.number.match(/^(.*?)(\d+)$/); if(v&&v[1]===prefix&&BigInt(v[2])>max) max=BigInt(v[2]);}
  let result=prefix+String(max+1n).padStart(digits.length,'0');
  while(invoices.some(i=>i.number===result)){max++;result=prefix+String(max+1n).padStart(digits.length,'0');}
  return result;
}
export function newDraft(state,date=today()) {
  const previous=state.invoices[0];
  return {id:uid(),number:nextNumber(state.invoices),date,autoDate:true,recipientId:state.recipients[0].id,recipient:state.recipients[0].details,supplyId:state.supplies[0].id,supply:state.supplies[0].details,items:previous?clone(previous.items):[{id:uid(),description:'',hsn:'',quantity:'1',unit:'No',rate:'',amountOverride:null}],gst:previous?.gst||'0'};
}
export function initialState(date=today()) {
  const original={id:'original-invoice-16',number:'16',date:'2026-11-02',autoDate:false,recipientId:DEFAULT_RECIPIENT.id,recipient:DEFAULT_RECIPIENT.details,supplyId:DEFAULT_SUPPLY.id,supply:DEFAULT_SUPPLY.details,items:[{id:'chloroform',description:'Chloroform 500ml',hsn:'',quantity:'4',unit:'No',rate:'300.66',amountOverride:null}],gst:'0',savedAt:'2026-11-02T00:00:00.000Z'};
  const state={schemaVersion:1,recipients:[clone(DEFAULT_RECIPIENT)],supplies:[clone(DEFAULT_SUPPLY)],invoices:[original]};
  return {...state,draft:newDraft(state,date)};
}
export function resumeState(state,date=today()) {
  const next=clone(state),record=next.invoices.find(i=>i.id===next.draft.id);
  if(record&&JSON.stringify(record)===JSON.stringify(next.draft))next.draft=newDraft(next,date);
  else if(next.draft.autoDate)next.draft.date=date;
  return next;
}
function validNumeric(v,max,places=4){return /^\d+(\.\d*)?$/.test(String(v))&&Number(v)<=max&&(String(v).split('.')[1]?.length||0)<=places;}
export function validateInvoice(i) {
  if(!i || typeof i.id!=='string' || !i.id || i.id.length>100)return 'Invalid invoice.';
  if(typeof i.number!=='string'||!i.number.trim()||i.number.length>40)return 'Enter an invoice number (up to 40 characters).';
  if(typeof i.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(i.date)||!Number.isFinite(Date.parse(i.date))||new Date(i.date).toISOString().slice(0,10)!==i.date) return 'Enter a valid invoice date.';
  if(typeof i.recipient!=='string'||!i.recipient.trim()||i.recipient.length>500) return 'Enter recipient details (up to 500 characters).';
  if(typeof i.supply!=='string'||!i.supply.trim()||i.supply.length>500) return 'Enter delivery details (up to 500 characters).';
  if(!Array.isArray(i.items)||i.items.length<1||i.items.length>60)return 'Add between 1 and 60 items.';
  for(let n=0;n<i.items.length;n++) {
    const item=i.items[n],prefix=`Item ${n+1}: `;
    if(typeof item.description!=='string'||!item.description.trim()||item.description.length>240)return prefix+'enter a description (up to 240 characters).';
    if(!validNumeric(item.quantity,1000000)||Number(item.quantity)<=0)return prefix+'enter a positive quantity, up to 1,000,000 (4 decimal places).';
    if(!validNumeric(item.rate,100000000))return prefix+'enter a rate from 0 to 10,00,00,000 (4 decimal places).';
    if(typeof item.hsn!=='string'||item.hsn.length>20||typeof item.unit!=='string'||item.unit.length>16)return prefix+'check the HSN code and unit.';
    if(item.amountOverride!==null&&item.amountOverride!==undefined&&item.amountOverride!==''&&!validNumeric(item.amountOverride,999999999,2))return prefix+'enter a valid amount (2 decimal places).';
  }
  if(!validNumeric(i.gst||'0',100,2))return 'GST must be between 0 and 100%.';
  if(totals(i).total>99999999999)return 'Invoice total must be below ₹100 crore.';
  return null;
}
export function saveInvoice(state,invoice) {
  const error=validateInvoice(invoice); if(error)throw new Error(error);
  const clean=clone(invoice);clean.number=clean.number.trim();clean.autoDate=false;clean.savedAt=new Date().toISOString();
  if(state.invoices.some(i=>i.number===clean.number&&i.id!==clean.id))throw new Error(`Invoice ${clean.number} already exists. Choose another number.`);
  const next=clone(state);next.invoices=[clean,...next.invoices.filter(i=>i.id!==clean.id)];next.draft=clone(clean);return next;
}
function text(v,max){return typeof v==='string'&&v.length<=max;}
export function validateWorkspace(s) {
  if(!s||s.schemaVersion!==1||!Array.isArray(s.invoices)||s.invoices.length>2000||!s.draft)return 'Invalid invoice data.';
  for(const list of [s.recipients,s.supplies]){if(!Array.isArray(list)||!list.length||list.length>200)return 'Invalid address list.';for(const a of list){if(!a||!text(a.id,100)||!text(a.label,100)||!text(a.details,500))return 'Invalid address.';}}
  const numbers=new Set(),ids=new Set();
  for(const i of s.invoices){const error=validateInvoice(i);if(error)return error;if(ids.has(i.id)||numbers.has(i.number))return 'Duplicate invoice.';ids.add(i.id);numbers.add(i.number);}
  const d=s.draft;
  if(!text(d.id,100)||!text(d.number,40)||!text(d.date,10)||!text(d.recipient,500)||!text(d.supply,500)||!text(d.gst,10)||!Array.isArray(d.items)||d.items.length>60)return 'Invalid draft.';
  for(const i of d.items){if(!i||!text(i.id,100)||!text(i.description,240)||!text(i.hsn,20)||!text(i.quantity,20)||!text(i.rate,20)||!text(i.unit,16)||(i.amountOverride!=null&&!text(i.amountOverride,20)))return 'Invalid draft item.';}
  return null;
}

export function deleteSavedInvoice(state,id,date=today()) {
  if(!state.invoices.some(invoice=>invoice.id===id))throw new Error('This invoice is no longer in your saved invoices.');
  const next=clone(state);
  // Choose the next number before removal, so deleting the open invoice cannot recreate it.
  if(next.draft.id===id)next.draft=newDraft(next,date);
  next.invoices=next.invoices.filter(invoice=>invoice.id!==id);
  return next;
}
