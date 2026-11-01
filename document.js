const db=supabase.createClient(TCS_SUPABASE_URL,TCS_SUPABASE_KEY);
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>{const d=document.createElement('div');d.textContent=s||'';return d.innerHTML};
const monthName=m=>{const [y,n]=m.split('-');return new Date(+y,+n-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})};
const token=new URLSearchParams(location.search).get('documento');
const formatGeneratedAt=iso=>iso?new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
async function load(){
 if(!token)return
 const {data,error}=await db.from('reports').select('month,snapshot').eq('public_token',token).maybeSingle();
 if(error||!data){document.querySelector('#publicDocument').innerHTML='<div class="public-error"><h1>Documento não encontrado</h1><p>O link pode estar inválido ou ter sido removido.</p></div>';return}
 const snapshot=data.snapshot||{},families=snapshot.families||[],bills=snapshot.bills||[];
 const rows=familyRows(families,bills,snapshot.allocations || {});
 const total=bills.reduce((s,b)=>s+Number(b.amount),0),mandatory=bills.filter(b=>b.mandatory).reduce((s,b)=>s+Number(b.amount),0);
 document.title=`TCS — ${monthName(data.month)}`;
 document.querySelector('#publicDocument').innerHTML=`<article class="report public-report"><div class="report-head"><img class="report-logo" src="logo.png"><h1>Tribunal de Contas do Sítio</h1><strong>São Miguel</strong><p>Documento mensal — ${monthName(data.month)}</p></div><h3 class="report-section-title">Contas por família</h3>${rows}<div class="public-totals"><strong>Total geral do sítio: ${money(total)}</strong><br><span>Total das contas obrigatórias: ${money(mandatory)}</span></div><p class="public-generated">Gerado pelo TCS em ${formatGeneratedAt(snapshot.generated_at)}.</p></article>`;
}
function familyRows(families,bills,allocations={}){return families.map(family=>{const accounts=bills.map(bill=>{const payers=bill.mandatory?families:families.filter(f=>(bill.family_ids||[]).includes(f.id));if(!payers.some(f=>f.id===family.id))return null;const key=`${bill.id||bill.name}__${family.id}`;return{name:bill.name,mandatory:bill.mandatory,amount:allocations[key] ?? Number(bill.amount)/payers.length}}).filter(Boolean);const total=accounts.reduce((s,a)=>s+a.amount,0);return `<section class="family-report"><h2>${esc(family.name)}</h2><table class="family-report-table"><thead><tr><th>Conta</th><th>Valor da família</th></tr></thead><tbody>${accounts.length?accounts.map(a=>`<tr><td>${esc(a.name)}${a.mandatory?' <small>(obrigatória)</small>':''}</td><td>${money(a.amount)}</td></tr>`).join(''):'<tr><td colspan="2" class="no-bills">Nenhuma conta atribuída.</td></tr>'}<tr class="family-total"><td>Total da família</td><td>${money(total)}</td></tr></tbody></table></section>`}).join('')}
if(!token)document.querySelector('#publicDocument').innerHTML='<div class="public-error"><h1>Link incompleto</h1><p>Informe o identificador do documento.</p></div>';else load();
