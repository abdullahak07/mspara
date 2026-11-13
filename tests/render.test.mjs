import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceOperations} from '../lib/render-invoice.ts';
import {initialState} from '../lib/invoice.mjs';
const measure={font:'',measureText(text){return {width:text.length*Number(this.font.match(/[\d.]+/)[0])*.55};}};
test('excessive line breaks are fitted inside the goods box',()=>{
  const invoice=initialState().draft;invoice.items[0].description=Array(30).fill('Part').join('\n');
  const pages=invoiceOperations(invoice,measure);
  const description=pages.flat().filter(x=>x.type==='text'&&x.text.includes('Part'));
  assert.ok(description.length);assert.ok(description.every(x=>x.y>=338&&x.y<=504));
});
test('more items paginate and each item appears once',()=>{
  const invoice=initialState().draft;
  invoice.items=Array.from({length:20},(_,i)=>({...invoice.items[0],id:String(i),description:`Goods item ${i}`}));
  const pages=invoiceOperations(invoice,measure);assert.ok(pages.length>1);
  assert.equal(pages.flat().filter(x=>x.type==='text'&&x.text.startsWith('Goods item')).length,20);
  for(const page of pages)assert.ok(page.filter(x=>x.type==='text'&&x.text.startsWith('Goods item')).every(x=>x.y<504));
});

test('amounts have two decimal places in one aligned column',()=>{const invoice=initialState().draft;invoice.items[0].quantity='1';invoice.items[0].rate='11500.66';const page=invoiceOperations(invoice,measure)[0];assert.ok(page.some(x=>x.type==='text'&&x.text==='11,500.66'&&x.x===564&&x.y===356&&x.align==='right'));});
