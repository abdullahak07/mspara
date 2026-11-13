import {lineAmount, totals, inWords} from './invoice.mjs';
import type {Invoice} from './types';
type TextOp={type:'text';text:string;x:number;y:number;size:number;bold:boolean;align?:CanvasTextAlign;maxWidth?:number};
type Op=TextOp|{type:'clear';x:number;y:number;w:number;h:number};
let templatePromise:Promise<HTMLImageElement>|null=null;
function template(){return templatePromise??=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{templatePromise=null;reject(new Error('The invoice template could not load. Please retry.'));};image.src='/api/template';});}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number,size:number){
  ctx.font=`bold ${size}px Arial, Helvetica, sans-serif`;const output:string[]=[];
  for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText((line?line+' ':'')+word).width<=width)line+=(line?' ':'')+word;else {if(line)output.push(line);line='';for(const char of word){if(ctx.measureText(line+char).width>width){output.push(line);line=char;}else line+=char;}}}output.push(line);}return output;
}
function fitLines(ctx:CanvasRenderingContext2D,text:string,width:number,height:number,initial=11.5){
  let normalized=text.replace(/\n[ \t]*\n+/g,'\n'),size=initial,result=lines(ctx,normalized,width,size);
  while(result.length*size*1.18>height&&size>6){size-=.25;result=lines(ctx,normalized,width,size);}
  if(result.length*size*1.18>height){normalized=normalized.replace(/\s+/g,' ');size=initial;result=lines(ctx,normalized,width,size);while(result.length*size*1.18>height&&size>6){size-=.25;result=lines(ctx,normalized,width,size);}}
  return {lines:result,size};
}
export function invoiceOperations(invoice:Invoice,ctx:CanvasRenderingContext2D):Op[][] {
  const rows=invoice.items.map((item,index)=>{const desc=fitLines(ctx,item.description,198,140,10);return {item,index,desc,height:Math.max(28,desc.lines.length*desc.size*1.18+14)};});
  const groups:typeof rows[]=[];let group:typeof rows=[],height=0;
  for(const row of rows){if(group.length&&height+row.height>154){groups.push(group);group=[];height=0;}group.push(row);height+=row.height;}if(group.length||!groups.length)groups.push(group);
  const result=totals(invoice),amount=(paise:number)=>(paise/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  return groups.map((items,page)=>{
    const ops:Op[]=[];
    const text=(value:string,x:number,y:number,size=10,align:CanvasTextAlign='left',maxWidth?:number,bold=false)=>ops.push({type:'text',text:value,x,y,size,bold,align,maxWidth});
    text('Invoice No: '+invoice.number,48,197,10,'left',246,true);
    const date=/^\d{4}-\d{2}-\d{2}$/.test(invoice.date)?invoice.date.split('-').reverse().join('/'):'—';text('Invoice Date: '+date,564,197,10,'right',246,true);
    for(const [value,x] of [[invoice.recipient,48],[invoice.supply,318]] as const){const fitted=fitLines(ctx,value,246,51,10);fitted.lines.forEach((line,i)=>text(line,x,245+i*fitted.size*1.18,fitted.size,'left',246));}
    let y=356;
    for(const {item,index,desc,height} of items){text(String(index+1),50,y,9,'center',20);desc.lines.forEach((line,i)=>text(line,76,y+i*desc.size*1.18,desc.size,'left',198));text(item.hsn,317,y,9,'center',50);text(`${item.quantity} ${item.unit}`.trim(),384,y,9,'center',60);text(Number(item.rate||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:4}),480,y,9,'right',60);text(amount(lineAmount(item)),564,y,9,'right',60);y+=height;}
    text(`GST ${invoice.gst||'0'}%`,354,582,9,'left',110);
    if(page===groups.length-1){text(amount(result.subtotal),564,545,10,'right',100);text(amount(result.tax),564,582,10,'right',100);text(amount(result.total),564,617,11,'right',100,true);const words=fitLines(ctx,inWords(result.total),540,25,10);words.lines.forEach((line,i)=>text(line,36,665+i*words.size*1.18,words.size,'left',540));}
    else {text('Continued',564,545,9,'right',100);text('—',564,582,10,'right');text('—',564,617,10,'right');text('Continued on next page. Totals appear on the final page.',36,665,10);}
    if(groups.length>1)text(`Page ${page+1} of ${groups.length}`,306,782,8,'center',540);return ops;
  });
}
export async function renderInvoice(invoice:Invoice):Promise<HTMLCanvasElement[]>{const img=await template(),measure=document.createElement('canvas').getContext('2d')!;return invoiceOperations(invoice,measure).map(operations=>{const canvas=document.createElement('canvas');canvas.width=1836;canvas.height=2376;const ctx=canvas.getContext('2d')!;ctx.scale(3,3);ctx.drawImage(img,0,0,612,792);for(const op of operations){if(op.type==='clear'){ctx.fillStyle='#fff';ctx.fillRect(op.x,op.y,op.w,op.h);}else {ctx.fillStyle='#202020';ctx.font=`${op.bold?'bold':'normal'} ${op.size}px Arial, Helvetica, sans-serif`;ctx.textAlign=op.align||'left';ctx.fillText(op.text,op.x,op.y,op.maxWidth);}}return canvas;});}
let pdfScript:Promise<void>|null=null;
async function loadPdf(){return pdfScript??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/pdf-lib.min.js';script.onload=()=>resolve();script.onerror=()=>{pdfScript=null;reject(new Error('PDF tools could not load. Please try again.'));};document.head.appendChild(script);});}
export async function downloadInvoice(invoice:Invoice){await loadPdf();const pages=await renderInvoice(invoice);const PDFLib=(window as unknown as {PDFLib:{PDFDocument:{create:()=>Promise<any>}}}).PDFLib;const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(`Invoice ${invoice.number} - MS Paramount Sales Corporation`);pdf.setAuthor('MS Paramount Sales Corporation');for(const canvas of pages){const png=await pdf.embedPng(canvas.toDataURL('image/png'));pdf.addPage([612,792]).drawImage(png,{x:0,y:0,width:612,height:792});}const bytes=await pdf.save();const blob=new Blob([bytes],{type:'application/pdf'}),name=`Invoice-${invoice.number.replace(/[^a-z0-9_-]/gi,'-')}.pdf`;downloadBlob(blob,name);return {blob,name};}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
