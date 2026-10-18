const assert=require('node:assert/strict');require('../stocktake-core.js');const C=global.StocktakeCore;
const a=C.teamKey('right'),b=C.teamKey('left');
let item={sku:'001',teamId:'right',teamName:'يمين',expectedQty:12.5,actualQty:null,countStatus:'pending'};
assert.equal(C.forTeam(item,'left').countStatus,'pending');
// Independent field updates commute even when two teams started from the same snapshot.
for(const order of [[a,b],[b,a]]){const x={...item,teamCounts:{}};for(const k of order)x.teamCounts[k]={quantity:k===a?10.25:2.25};assert.equal(C.aggregate(x).actualQty,12.5);assert.equal(C.aggregate(x).countStatus,'matched');assert.equal(C.result(C.aggregate(x)).actual,12.5)}
item.teamCounts={[a]:{quantity:10.25},[b]:{quantity:2.25}};
item.teamCounts[b]={quantity:3.25};assert.equal(C.aggregate(item).actualQty,13.5);assert.equal(C.forTeam(item,'left')._teamActual,3.25);assert.equal(C.forTeam(item,'right')._teamActual,10.25);
item.teamCounts[b]={quantity:0};assert.equal(C.aggregate(item).actualQty,10.25);assert.notEqual(C.forTeam(item,'left').countStatus,'pending');
const legacy={...item,actualQty:7,teamCounts:{[b]:{quantity:2}}};assert.equal(C.aggregate(legacy).actualQty,9);assert.equal(C.teamCount(C.aggregate(legacy),'right'),7);legacy.teamCounts[a]={quantity:8};assert.equal(C.aggregate(legacy).actualQty,10);assert.equal(C.aggregate(C.aggregate(legacy)).actualQty,10);
assert.equal(Number.isNaN(C.forTeam(legacy,'third')._teamActual),true);console.log('PASS shared campaign: independent counts, order independence, revisions, zero, legacy preservation and no double aggregation');
