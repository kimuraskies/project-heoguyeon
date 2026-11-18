'use strict';
// Test data only. Never included by build_fm.js.
function fixtures(){
  const option=(l,fx=[],extra={})=>Object.assign({l,d:'검증용 선택지',fx},extra);
  const make=(title,opts)=>({who:'테스트 담당',icon:'🧪',title,body:'이벤트 엔진 검증',opts});
  return [
    {id:'test-starts',stage:'stove',rarity:'common',cool:2,pick:c=>({vet:c.find(p=>p.type==='B')}),when:c=>!!c.vet,
      make:c=>make('선발 약속',[option('약속',[['mor',c.vet,8]],{promise:{kind:'starts',who:c.vet,n:2,within:4},then:{id:'test-check',afterGames:4}}),option('유지')])},
    {id:'test-notrade',stage:'stove',rarity:'uncommon',cool:2,pick:c=>({vet:c.find(p=>p.type==='B')}),
      make:c=>make('잔류 약속',[option('약속',[],{promise:{kind:'notrade',who:c.vet,within:8}}),option('유지')])},
    {id:'test-camp',stage:'camp',rarity:'rare',cool:4,make:c=>make('캠프',[option('확률',[['chance',.5,[['fans',2]],[['conf',-2]]]]),option('유지')])},
    {id:'test-season',stage:'season',rarity:'common',cool:2,when:c=>c.games>=10,
      make:c=>make('시즌',[option('지원',[['money',2]]),option('유지')])},
    {id:'test-season-rare',stage:'season',rarity:'rare',cool:4,pick:c=>({vet:c.find(p=>p.type==='P')}),
      make:c=>make('투수',[option('약속',[],{promise:{kind:'starts',who:c.vet,n:2,within:12}}),option('유지')])},
    {id:'test-check',stage:'season',rarity:'common',cool:2,chain:true,
      make:c=>make('지난 선택 확인',[option('확인',[['flag','checked',!!c.prev]],{res:'확인했습니다.'})])}
  ];
}
module.exports=fixtures;
