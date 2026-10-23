// Run with: node --experimental-default-type=module --test tests/dora-drills.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,compileDrill,validateDrill,newDrill,exportDrills,importDrills,saveDrills,loadDrills} from '../js/robots/dora/drills.js';

test('all factory drills have three difficulty levels and valid Dora ball fields',()=>{
 const ds=defaults();assert.ok(ds.length>=6);
 assert.ok(ds.every(validateDrill));
 assert.deepEqual(ds.find(d=>d.name==='Left–right').levels[0].length,2);
});
test('Dora variants and shuffle never exceed 28 slots',()=>{
 const d=newDrill('Practice');
 d.levels[0]=Array.from({length:28},(_,i)=>[{direction:i%90,speed:20,spin:0,arc:0,frequencyLevel:20,angle:0}]);
 assert.equal(compileDrill(d,1,{shuffle:true}).length,28);
 d.levels[0].push([{direction:45,speed:20,spin:0,arc:0,frequencyLevel:20,angle:0}]);
 assert.equal(validateDrill(d),false);
});
test('storage roundtrip remains separate from Nova keys',()=>{
 const stored=new Map();
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const ds=defaults();saveDrills(ds);
 assert.deepEqual(loadDrills(),ds);
 assert.equal([...stored.keys()][0],'openpong_dora_drills_v1');
});
test('import validates and roundtrips Dora native presets',()=>{
 const ds=defaults();assert.deepEqual(importDrills(exportDrills(ds)),ds);
 assert.throws(()=>importDrills('{"format":"openpong-dora","version":1,"drills":[{}]}'));
});
