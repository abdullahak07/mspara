import test from 'node:test';
import assert from 'node:assert/strict';
import {lineAmount, totals, inWords, nextNumber, initialState, validateInvoice, saveInvoice, newDraft, today, validateWorkspace, resumeState} from '../lib/invoice.mjs';

test('sample multiplication and words agree, correcting source typo',()=>{
  assert.equal(lineAmount({quantity:'4',rate:'300.66'}),120264);
  assert.equal(inWords(120264),'One Thousand Two Hundred Two Rupees and Sixty Four Paise Only');
});
test('decimal multiplication rounds each line half up in paise',()=>{
  assert.equal(lineAmount({quantity:'1.5',rate:'10.01'}),1502);
  assert.equal(lineAmount({quantity:'3',rate:'0.10'}),30);
  assert.equal(lineAmount({quantity:'1',rate:'1.005'}),101);
});
test('manual amount and optional tax are calculated correctly',()=>{
  assert.equal(lineAmount({quantity:'4',rate:'300.66',amountOverride:'1250.25'}),125025);
  assert.deepEqual(totals({items:[{quantity:'4',rate:'300.66'}],gst:'18'}),{subtotal:120264,tax:21648,total:141912});
});
test('Indian numbering supports zero, lakh, crore and paise',()=>{
  assert.equal(inWords(0),'Zero Rupees Only');
  assert.equal(inWords(105),'One Rupee and Five Paise Only');
  assert.equal(inWords(10000000),'One Lakh Rupees Only');
  assert.equal(inWords(1000000000),'One Crore Rupees Only');
});
test('next invoice increments past history and preserves prefix/padding',()=>{
  assert.equal(nextNumber([{number:'16'},{number:'9'}]),'17');
  assert.equal(nextNumber([{number:'INV-0099'}]),'INV-0100');
});
test('new invoice has today and keeps default addresses but resets identity',()=>{
  const s=initialState('2026-11-02');
  assert.equal(s.invoices[0].number,'16'); assert.equal(s.draft.number,'17');
  assert.equal(s.draft.date,'2026-11-02');
  const next=newDraft(s,'2026-11-03');
  assert.equal(next.date,'2026-11-03'); assert.equal(next.recipient,s.recipients[0].details);
  assert.notEqual(next.id,s.invoices[0].id);
  assert.equal(today(new Date(2026,0,1,0,1)),'2026-01-01');
});
test('save snapshots are independent, reject duplicate number, update same invoice',()=>{
  const s=initialState('2026-11-02'); let saved=saveInvoice(s,s.draft);
  assert.equal(saved.invoices.length,2);
  saved.draft.items[0].rate='1'; assert.equal(saved.invoices[0].items[0].rate,'300.66');
  assert.throws(()=>saveInvoice(saved,{...saved.draft,id:'another'}),/already exists/);
  saved=saveInvoice(saved,{...saved.draft,items:[{...saved.draft.items[0],rate:'12'}]});
  assert.equal(saved.invoices.length,2); assert.equal(saved.invoices[0].items[0].rate,'12');
});
test('invalid date, blank goods, negative and excessive values are rejected',()=>{
  const i=initialState('2026-11-02').draft;
  assert.equal(validateInvoice(i),null);
  assert.match(validateInvoice({...i,date:'2026-02-31'}),/date/i);
  assert.match(validateInvoice({...i,items:[{...i.items[0],quantity:'-1'}]}),/quantity/i);
  assert.match(validateInvoice({...i,items:[{...i.items[0],description:''}]}),/description/i);
  assert.match(validateInvoice({...i,items:[{...i.items[0],rate:'10000000000'}]}),/rate/i);
});
test('workspace storage validation rejects malformed or duplicate history',()=>{
  const s=initialState('2026-11-02'); assert.equal(validateWorkspace(s),null);
  assert.ok(validateWorkspace({...s,invoices:[s.invoices[0],s.invoices[0]]}));
  assert.ok(validateWorkspace({}));
});
test('reopening a saved invoice starts the next number today; unfinished explicit dates survive',()=>{
  const initial=initialState('2026-11-02');
  const saved=saveInvoice(initial,initial.draft);
  const resumed=resumeState(saved,'2026-11-03');
  assert.equal(resumed.draft.number,'18');assert.equal(resumed.draft.date,'2026-11-03');
  assert.equal(resumed.invoices[0].date,'2026-11-02');
  initial.draft.date='2026-10-01';initial.draft.autoDate=false;
  assert.equal(resumeState(initial,'2026-11-03').draft.date,'2026-10-01');
  initial.draft.autoDate=true;
  assert.equal(resumeState(initial,'2026-11-03').draft.date,'2026-11-03');
});
test('oversized and incomplete numeric edits never crash live totals',()=>{
  const invoice=initialState().draft;
  for(const v of ['1'+'0'.repeat(160),'1e999','-', '', '99999999999999999999']){
    const broken={...invoice,items:[{...invoice.items[0],quantity:v,rate:v}]};
    assert.doesNotThrow(()=>inWords(totals(broken).total));
    assert.ok(validateInvoice(broken));
  }
});
