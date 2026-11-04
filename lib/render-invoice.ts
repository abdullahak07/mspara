import {lineAmount, totals, inWords} from './invoice.mjs';
import type {Invoice} from './types';
type TextOp={type:'text';text:string;x:number;y:number;size:number;bold:boolean;align?:CanvasTextAlign;maxWidth?:number};
type Op=TextOp|{type:'clear';x:number;y:number;w:number;h:number};
let templatePromise:Promise<HTMLImageElement>|null=null;
function template(){return templatePromise??=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{templatePromise=null;reject(new Error('The invoice template could not load. Please retry.'));};image.src='/api/template';});}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number,size:number){
  ctx.font=`bold ${size}px "Times New Roman", serif`;const output:string[]=[];
  for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText((line?line+' ':'')+word).width<=width)line+=(line?' ':'')+word;else {if(line)output.push(line);line='';for(const char of word){if(ctx.measureText(line+char).width>width){output.push(line);line=char;}else line+=char;}}}output.push(line);}return output;
}
function fitLines(ctx:CanvasRenderingContext2D,text:string,width:number,height:number,initial=11.5){
  let normalized=text.replace(/\n[ \t]*\n+/g,'\n'),size=initial,result=lines(ctx,normalized,width,size);
  while(result.length*size*1.18>height&&size>6){size-=.25;result=lines(ctx,normalized,width,size);}
  if(result.length*size*1.18>height){normalized=normalized.replace(/\s+/g,' ');size=initial;result=lines(ctx,normalized,width,size);while(result.length*size*1.18>height&&size>6){size-=.25;result=lines(ctx,normalized,width,size);}}
  return {lines:result,size};
}
export function invoiceOperations(invoice:Invoice,ctx:CanvasRenderingContext2D):Op[][] {
  const rows=invoice.items.map((item,index)=>{const desc=fitLines(ctx,item.description,171,98,11.5);const height=Math.max(24,desc.lines.length*desc.size*1.18+10);return {item,index,desc,height};});
  const groups:typeof rows[]=[];let group:typeof rows=[],height=0;
  for(const row of rows){if(group.length&&height+row.height>112){groups.push(group);group=[];height=0;}group.push(row);height+=row.height;}if(group.length||!groups.length)groups.push(group);
  const result=totals(invoice);
  return groups.map((items,page)=>{
    const ops:Op[]=[];const clear=(x:number,y:number,w:number,h:number)=>ops.push({type:'clear',x,y,w,h});
    const text=(value:string,x:number,y:number,size=11.5,align:CanvasTextAlign='left',maxWidth?:number,bold=true)=>ops.push({type:'text',text:value,x,y,size,bold,align,maxWidth});
    clear(10,127,280,14);clear(294,127,301,14);
    text('Invoice No:  '+invoice.number,14,138.5,12,'left',272);
    const date=/^\d{4}-\d{2}-\d{2}$/.test(invoice.date)?invoice.date.split('-').reverse().join('/'):'—';text('Invoice Date: '+date,472,138.5,12,'center',294);
    clear(13,181,275,66);clear(298,170,297,77);
    const recipient=fitLines(ctx,invoice.recipient,268,61);recipient.lines.forEach((line,i)=>text(line,14,(recipient.lines.length>4?186:198)+i*recipient.size*1.18,recipient.size));
    const supply=fitLines(ctx,invoice.supply,254,70);supply.lines.forEach((line,i)=>text(line,337,180+i*supply.size*1.18,supply.size,'left',254));
    for(const [x,w] of [[9.5,214],[225.5,64.5],[294,98],[394,47],[445,127],[574,22]])clear(x,288,w,116);
    let y=groups.length===1&&items.length===1&&items[0].desc.lines.length<4?326:303;
    for(const row of items){const {item,index,desc}=row;text(`${index+1}.`,27,y,12.5,'left',18);desc.lines.forEach((line,i)=>text(line,45,y+i*desc.size*1.18,desc.size,'left',171));text(item.hsn,258,y,10.5,'center',60);text(`${item.quantity} ${item.unit}`.trim(),341,y,11.5,'center',94);text(item.rate,418,y,11.5,'center',45);const amount=lineAmount(item);text(String(Math.floor(amount/100)),507,y,11.5,'center',121);text(String(amount%100).padStart(2,'0'),585,y,11,'center',20);y+=row.height;}
    clear(139,472,455,15);clear(445,489,127,42);clear(574,489,22,42);clear(445,533,127,14);clear(574,533,22,14);clear(331,551,109,27);clear(445,551,127,27);clear(574,551,22,27);clear(445,582,127,33);clear(574,582,22,33);
    if(page===groups.length-1){const words=fitLines(ctx,inWords(result.total),448,13,9);text(words.lines.join(' '),142,481,words.size,'left',450);text(String(Math.floor(result.subtotal/100)),484,519,11.5,'center',120);text(String(result.subtotal%100).padStart(2,'0'),585,515,11,'center',20);text('-',468,541,10);text(Number(invoice.gst)>0?`Add: GST ${invoice.gst}%`:'Add: GST-',331,561,9,'left',108);text(result.tax?String(Math.floor(result.tax/100)):'-',484,562,11.5,'center',120);if(result.tax)text(String(result.tax%100).padStart(2,'0'),585,562,11,'center',20);text(String(Math.floor(result.total/100)),484,594,11.5,'center',120);text(String(result.total%100).padStart(2,'0'),585,603,11,'center',20);}else{text('Continued on next page',142,481,9);text('—',484,519);text('Add: GST-',331,561,9);text('—',484,562);text('—',484,594);}
    if(groups.length>1)text(`Invoice ${invoice.number} · Page ${page+1} of ${groups.length}`,306,750,9,'center',580,false);return ops;
  });
}
export async function renderInvoice(invoice:Invoice):Promise<HTMLCanvasElement[]>{const img=await template(),measure=document.createElement('canvas').getContext('2d')!;return invoiceOperations(invoice,measure).map(operations=>{const canvas=document.createElement('canvas');canvas.width=1836;canvas.height=2376;const ctx=canvas.getContext('2d')!;ctx.scale(3,3);ctx.drawImage(img,0,0,612,792);for(const op of operations){if(op.type==='clear'){ctx.fillStyle='#fff';ctx.fillRect(op.x,op.y,op.w,op.h);}else {ctx.fillStyle='#000';ctx.font=`${op.bold?'bold':'normal'} ${op.size}px "Times New Roman", serif`;ctx.textAlign=op.align||'left';ctx.fillText(op.text,op.x,op.y,op.maxWidth);}}return canvas;});}
let pdfScript:Promise<void>|null=null;
async function loadPdf(){return pdfScript??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/pdf-lib.min.js';script.onload=()=>resolve();script.onerror=()=>{pdfScript=null;reject(new Error('PDF tools could not load. Please try again.'));};document.head.appendChild(script);});}
export async function downloadInvoice(invoice:Invoice){await loadPdf();const pages=await renderInvoice(invoice);const PDFLib=(window as unknown as {PDFLib:{PDFDocument:{create:()=>Promise<any>}}}).PDFLib;const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(`Invoice ${invoice.number} - MS Paramount Sales Corporation`);pdf.setAuthor('MS Paramount Sales Corporation');for(const canvas of pages){const png=await pdf.embedPng(canvas.toDataURL('image/png'));pdf.addPage([612,792]).drawImage(png,{x:0,y:0,width:612,height:792});}const bytes=await pdf.save();const blob=new Blob([bytes],{type:'application/pdf'}),name=`Invoice-${invoice.number.replace(/[^a-z0-9_-]/gi,'-')}.pdf`;downloadBlob(blob,name);return {blob,name};}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
