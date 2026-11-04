'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
module.exports=({assert,test})=>{
  test('career.js: browser script loads and every documented row has 16 fields',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../career.js'),'utf8'),context);
    const entries=Object.entries(context.window.KBO_CAREER);
    assert.ok(entries.length>100);
    const types=new Set(); let rows=0;
    // Both documented schemas have year, team, and fourteen nonnegative integer stats.
    for(const [name,entry] of entries){
      assert.ok(['B','P'].includes(entry.t),name); types.add(entry.t);
      assert.ok(Array.isArray(entry.y),name);
      for(const row of entry.y){
        rows++; assert.equal(row.length,16,name);
        assert.ok(Number.isInteger(row[0]) && row[0]>=1982,name);
        assert.equal(typeof row[1],'string',name); assert.ok(row[1].length>0,name);
        for(const stat of row.slice(2)) assert.ok(Number.isInteger(stat)&&stat>=0,name);
      }
    }
    assert.equal(types.size,2); assert.ok(rows>500);
  });
};
