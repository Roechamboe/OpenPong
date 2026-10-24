// Run with: node --experimental-default-type=module --test tests/dora-drills.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,compileDrill,validateDrill,newDrill,exportDrills,importDrills,saveDrills,loadDrills} from '../js/robots/dora/drills.js';

test('all factory drills have three difficulty levels and valid Dora ball fields',()=>{
 const ds=defaults();assert.equal(ds.length,34);
 assert.ok(ds.every(validateDrill));
 assert.equal(ds.find(d=>d.name==='drive(f)-drive(b)').levels[0].length,2);
 assert.equal(ds.find(d=>d.name==='random-drive').shuffle,true);
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

test('factory migration preserves existing saved Dora drills and custom edits',()=>{
 const stored=new Map();
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const old=defaults().slice(0,2);
 old[0].levels[0][0][0].speed=72;
 const custom=newDrill('My drill');
 old.push(custom);
 stored.set('openpong_dora_drills_v1',JSON.stringify(old));
 const upgraded=loadDrills();
 assert.equal(upgraded.length,35);
 assert.equal(upgraded.find(d=>d.id===old[0].id).levels[0][0][0].speed,72);
 assert.ok(upgraded.some(d=>d.id===custom.id));
 assert.equal(stored.get('openpong_dora_factory_version'),'4');
});

test('legacy Dora starter drills move to custom library without losing settings',()=>{
 const stored=new Map();
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const original=newDrill('Center drive','basic');
 original.id='center-drive';
 original.levels[0][0][0].speed=71;
 stored.set('openpong_dora_drills_v1',JSON.stringify([original]));
 stored.set('openpong_dora_factory_version','2');
 const migrated=loadDrills();
 assert.equal(migrated.filter(d=>d.category==='basic').length,6);
 const preserved=migrated.find(d=>d.id==='center-drive');
 assert.equal(preserved.category,'custom-a');
 assert.equal(preserved.levels[0][0][0].speed,71);
 assert.equal(stored.get('openpong_dora_factory_version'),'4');
});

test('factory drill names match the main branch preset keys in category order',()=>{
 const names={
 basic:['push(b)','push(f)','drive(b)','drive(f)','loop(b)','loop(f)'],
 combined:['loop(b)-drive(b)','loop(f)-drive(f)','drive(f)-drive(b)','push(f)-drive(f)','push(b)-loop(b)','loop(f)-drive(b)','push(f)-loop(b)','drive(f)-drive(f)','push(b)-loop(f)','push(f)-loop(f)','loop(f)-loop(f)','loop(b)-drive(f)'],
 complex:['push(b)-loop(f)-drive(b)','push(f)-loop(b)-drive(f)','loop(f)-drive(f)-drive(b)','loop(b)-drive(f)-drive(b)','drive(f)-drive(f)-drive(f)','push(f)-loop(f)-drive(f)','push(b)-loop(b)-drive(b)','push(f)-loop(b)-drive(b)','loop(f)-drive(b)-drive(f)','loop(b)-drive(b)-drive(f)','push(b)-loop(f)-drive(f)','push(b)-loop(b)-drive(f)','drive(b)-drive(f)-drive(f)','random-drive','23-random-drive','all-random']
 };
 for(const [cat,expected] of Object.entries(names))
  assert.deepEqual(defaults().filter(d=>d.category===cat).map(d=>d.name),expected);
});

test('physical forehand half-long reference exactly matches drive(f) difficulty 1',()=>{
 const d=defaults().find(d=>d.id==='drive(f)');
 assert.deepEqual(d.levels[0][0][0],{
  direction:15,speed:30,spin:10,arc:15,frequencyLevel:35,angle:180
 });
});
test('factory ball profiles stay valid across all three difficulty levels',()=>{
 const ds=defaults();
 assert.equal(ds.length,34);
 for(const d of ds){
  assert.ok(validateDrill(d),d.id);
  assert.equal(d.levels.length,3);
 }
});
test('migration refreshes untouched factory levels while retaining edited levels',()=>{
 const stored=new Map();
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const d=defaults().find(x=>x.id==='drive(f)');
 // Prior generator produced these known values in the first two levels.
 d.levels[0]=[[{direction:60,speed:40,spin:10,arc:3,frequencyLevel:65,angle:0}]];
 d.levels[1]=[[{direction:60,speed:45,spin:13,arc:3,frequencyLevel:75,angle:0}]];
 d.levels[1][0][0].speed=72; // user tweak should survive
 stored.set('openpong_dora_drills_v1',JSON.stringify([d]));
 stored.set('openpong_dora_factory_version','3');
 const migrated=loadDrills().find(x=>x.id==='drive(f)');
 assert.equal(migrated.levels[0][0][0].direction,15);
 assert.equal(migrated.levels[0][0][0].speed,30);
 assert.equal(migrated.levels[1][0][0].speed,72);
 assert.equal(stored.get('openpong_dora_factory_version'),'4');
});
