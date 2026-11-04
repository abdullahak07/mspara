import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveQueue} from '../lib/save-queue.mjs';
test('clean flush does not block later edits',async()=>{
  let draft='one',saved='one',writes=[];
  const flush=createSaveQueue({read:()=>draft,saved:()=>saved,write:async x=>writes.push(x),commit:x=>{saved=x;}});
  await flush();draft='two';await flush();assert.deepEqual(writes,['two']);assert.equal(saved,'two');
});
test('new edits during a write are saved in sequence',async()=>{
  let draft='one',saved='',writes=[];
  const flush=createSaveQueue({read:()=>draft,saved:()=>saved,write:async x=>{writes.push(x);if(x==='one')draft='two';},commit:x=>{saved=x;}});
  await Promise.all([flush(),flush()]);assert.deepEqual(writes,['one','two']);assert.equal(saved,'two');
});
test('failed writes can be retried',async()=>{
  let saved='',fail=true;
  const flush=createSaveQueue({read:()=>'draft',saved:()=>saved,write:async()=>{if(fail)throw new Error('offline');},commit:x=>{saved=x;}});
  await assert.rejects(flush(),/offline/);fail=false;await flush();assert.equal(saved,'draft');
});
