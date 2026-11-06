const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const db=supabase.createClient(TCS_SUPABASE_URL,TCS_SUPABASE_KEY);
let families=[],bills=[],reports=[],periods=[],billFilter='all',dashboardMonth='';
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const currentMonth=()=>new Date().toISOString().slice(0,7);
const monthName=m=>{const [y,n]=m.split('-');return new Date(+y,+n-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})};
const esc=s=>{const d=document.createElement('div');d.textContent=s||'';return d.innerHTML};
const formatGeneratedAt=iso=>{if(!iso)return '';return new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})};
async function loadData(){const [f,b,r,p]=await Promise.all([db.from('families').select('*').order('name'),db.from('bills').select('*').order('month',{ascending:false}),db.from('reports').select('*').order('month',{ascending:false}),db.from('financial_periods').select('*').order('month',{ascending:false})]);if(f.error||b.error||r.error||p.error)document.body.insertAdjacentHTML('afterbegin','<div style="position:fixed;z-index:99;top:10px;left:50%;transform:translateX(-50%);background:#ffe3e3;color:#900;padding:12px;border-radius:8px">Execute a atualização SQL mais recente do Supabase.</div>');families=f.data||[];bills=b.data||[];reports=r.data||[];periods=p.error?[]:(p.data||[]);render();renderSavedReports();renderPeriods();renderComparison()}
const periodClosed=month=>periods.some(period=>period.month===month&&period.closed===true);
function openSection(id){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));$('#pageTitle').textContent={dashboard:'Visão geral',families:'Famílias',bills:'Contas',documents:'Documentos',periods:'Período Financeiro',comparison:'Comparativo'}[id];$('.sidebar').classList.remove('open')}
$$('.nav-item').forEach(b=>b.onclick=()=>openSection(b.dataset.view));$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
function render(){dashboardMonth=dashboardMonth||currentMonth();const m=dashboardMonth,mb=bills.filter(b=>b.month===m),activeFamilies=families.filter(f=>f.active!==false);const general=mb.filter(b=>b.mandatory);const partial=mb.filter(b=>!b.mandatory);const total=mb.reduce((s,b)=>s+Number(b.amount),0);$('#dashboardMonth').value=m;$('#dashboardPeriodName').textContent=monthName(m);$('#familyCount').textContent=activeFamilies.length;$('#mandatoryCount').textContent=general.length;$('#partialCount').textContent=partial.length;$('#monthTotal').textContent=money(total);$('#familyAverage').textContent=money(activeFamilies.length?total/activeFamilies.length:0);$('#billsCount').textContent=mb.length;$('#nextMonth').textContent=monthName(m);renderLastDocument();renderMonthlyChart();renderDistribution(general,partial);renderFamilies();renderBills();renderRecent()}
function renderLastDocument(){const last=[...reports].sort((a,b)=>String(b.month).localeCompare(String(a.month))).find(r=>r.month<=dashboardMonth);$('#lastDocument').textContent=last?monthName(last.month):'—'}
function renderMonthlyChart(){const months=[6,5,4,3,2,1,0].map(offset=>{const date=new Date(`${dashboardMonth}-01T12:00:00`);date.setMonth(date.getMonth()-offset);return date.toISOString().slice(0,7)});const totals=months.map(month=>bills.filter(b=>b.month===month).reduce((sum,bill)=>sum+Number(bill.amount),0));const max=Math.max(...totals,1);$('#monthlyChart').innerHTML=months.map((month,index)=>`<div class="chart-column"><div class="chart-value">${money(totals[index]).replace('R$ ','')}</div><div class="chart-bar" style="height:${Math.max(8,totals[index]/max*150)}px"></div><span>${monthName(month).split(' ')[0].slice(0,3)}</span></div>`).join('')}
function renderDistribution(general,partial){const generalTotal=general.reduce((sum,bill)=>sum+Number(bill.amount),0),partialTotal=partial.reduce((sum,bill)=>sum+Number(bill.amount),0),total=generalTotal+partialTotal;$('#expenseDistribution').innerHTML=`<div><span>Conta geral</span><strong>${money(generalTotal)}</strong><i><b style="width:${total?generalTotal/total*100:0}%"></b></i></div><div><span>Conta parcial</span><strong>${money(partialTotal)}</strong><i><b class="partial-bar" style="width:${total?partialTotal/total*100:0}%"></b></i></div>`}
$('#dashboardMonth').onchange=e=>{dashboardMonth=e.target.value||currentMonth();render()};
function renderFamilies(){const el=$('#familyList');if(!families.length){el.innerHTML='<div class="panel empty-state" style="grid-column:1/-1">Cadastre a primeira família.</div>';return}el.innerHTML=families.map(f=>`<article class="family-card"><div class="avatar">${esc((f.name||'?')[0])}</div><h3>${esc(f.name)}</h3><span class="family-status ${f.active===false?'inactive':''}">${f.active===false?'Inativa':'Ativa'}</span><p>${f.people.length} pessoa(s)</p><p>${f.people.map(esc).join(', ')}</p><div class="card-actions"><button onclick="editFamily('${f.id}')">Editar</button><button onclick="removeFamily('${f.id}')">Excluir</button></div></article>`).join('')}
function renderRecent(){const recent=[...bills].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,5);$('#recentBills').className=recent.length?'table-wrap':'empty-state';$('#recentBills').innerHTML=recent.length?`<table><thead><tr><th>Conta</th><th>Tipo</th><th>Mês</th><th>Valor</th></tr></thead><tbody>${recent.map(b=>`<tr><td>${esc(b.name)}</td><td>${b.mandatory?'Conta geral':'Conta parcial'}</td><td>${monthName(b.month)}</td><td>${money(b.amount)}</td></tr>`).join('')}</tbody></table>`:'Nenhuma conta cadastrada.'}
function renderBills(){const list=bills.filter(b=>billFilter==='all'||(billFilter==='mandatory'?b.mandatory:!b.mandatory));if(!list.length){$('#billList').innerHTML='<div class="empty-state">Nenhuma conta nesta categoria.</div>';return}$('#billList').innerHTML=`<table><thead><tr><th>Conta</th><th>Competência</th><th>Tipo</th><th>Famílias</th><th>Valor</th><th></th></tr></thead><tbody>${list.map(b=>{const closed=periodClosed(b.month);return `<tr><td><strong>${esc(b.name)}</strong>${closed?' <span class="badge">Período fechado</span>':''}</td><td>${monthName(b.month)}</td><td><span class="badge ${b.mandatory?'required':''}">${b.mandatory?'Conta geral':'Conta parcial'}</span></td><td>${b.mandatory?'Todas':(b.family_ids||[]).map(id=>families.find(f=>f.id===id)?.name).filter(Boolean).map(esc).join(', ')||'—'}</td><td><strong>${money(b.amount)}</strong></td><td>${closed?'—':`<button onclick="editBill('${b.id}')" style="border:0;background:#edf3f8;color:#052f5f;padding:7px;border-radius:6px;margin-right:5px">Editar</button><button onclick="removeBill('${b.id}')" style="border:0;background:none;color:#a00">Excluir</button>`}</td></tr>`}).join('')}</tbody></table>`}
$('#newFamily').onclick=()=>openFamilyModal();$('#peopleCount').oninput=()=>buildPeople([]);
function buildPeople(values=[]){const n=Math.max(1,+$('#peopleCount').value||1);$('#peopleNames').innerHTML='<div class="person-input"><strong>Nome das pessoas</strong></div>'+Array.from({length:n},(_,i)=>`<label class="person-input">Pessoa ${i+1}<input class="person-name" required value="${esc(values[i]||'')}" placeholder="Nome completo"></label>`).join('')}
function openFamilyModal(f=null){$('#familyForm').reset();$('#familyId').value=f?.id||'';$('#familyName').value=f?.name||'';$('#peopleCount').value=f?.people?.length||1;$('#familyActive').checked=f?.active!==false;buildPeople(f?.people||[]);$('#familyModal').showModal()}window.openFamilyModal=openFamilyModal;
function editFamily(id){openFamilyModal(families.find(f=>f.id===id))}window.editFamily=editFamily;
async function removeFamily(id){if(confirm('Excluir esta família?')){await db.from('families').delete().eq('id',id);await loadData()}}window.removeFamily=removeFamily;
$('#familyForm').onsubmit=async e=>{e.preventDefault();const name=$('#familyName').value.trim(),people=$$('.person-name').map(i=>i.value.trim()).filter(Boolean);if(!name||!people.length)return;const id=$('#familyId').value,row={name,people,active:$('#familyActive').checked},result=id?await db.from('families').update(row).eq('id',id):await db.from('families').insert(row);if(result.error)return alert('Erro ao salvar: '+result.error.message);$('#familyModal').close();await loadData()};
function renderBillFamilies(){ const participants=activeFamilies();$('#billFamilies').innerHTML=participants.length?participants.map(f=>`<label class="check-row"><input type="checkbox" value="${f.id}"> ${esc(f.name)} <small>— ${f.people.length} pessoa(s)</small></label>`).join(''):'Cadastre uma família ativa antes de criar a conta.';refreshAllocationFields(); }
function openBillModal(bill=null){if(bill&&periodClosed(bill.month))return alert('Este período está fechado. Reabra-o antes de editar ou excluir contas.');$('#billForm').reset();$('#billId').value=bill?.id||'';$('#billName').value=bill?.name||'';$('#billAmount').value=bill?.amount||'';$('#billMonth').value=bill?.month||dashboardMonth||currentMonth();if(periodClosed($('#billMonth').value))return alert('Este período está fechado. Não é possível cadastrar ou alterar contas neste mês. Reabra o período antes de continuar.');renderBillFamilies();if(bill){(bill.family_ids||[]).forEach(id=>{const box=$(`#billFamilies input[value="${id}"]`);if(box)box.checked=true})}else activeFamilies().forEach(f=>{const box=$(`#billFamilies input[value="${f.id}"]`);if(box)box.checked=true});updateMandatory();refreshAllocationFields(bill?.allocations||{});$('#billModal').showModal() }window.openBillModal=openBillModal;$('#newBill').onclick=()=>openBillModal();
function editBill(id){const bill=bills.find(b=>b.id===id);if(bill&&periodClosed(bill.month))return alert('Este período está fechado.');openBillModal(bill)}window.editBill=editBill;
function activeFamilies(){return families.filter(f=>f.active!==false)}
function selectedPayers(){return activeFamilies().filter(f=>$('#billFamilies input[value="'+f.id+'"]')?.checked)}
function refreshAllocationFields(saved={}){if(!$('#allocationFields'))return;const payers=selectedPayers(),total=Number($('#billAmount').value)||0,share=payers.length?total/payers.length:0;$('#allocationFields').innerHTML=payers.length?`<legend>Valor aproximado por família</legend><small>Você pode arredondar cada valor. A soma não precisa ser alterada automaticamente.</small>${payers.map(f=>`<label class="allocation-form-row">${esc(f.name)}<input type="number" min="0" step="0.01" class="family-allocation" data-family="${f.id}" value="${(saved[f.id] ?? share).toFixed(2)}"></label>`).join('')}`:'<legend>Valor aproximado por família</legend><small>Selecione uma opção acima e as famílias.</small>'}
function updateMandatory(){const payers=selectedPayers(),participants=activeFamilies();const automatic=payers.length>0&&payers.length===participants.length;const preview=$('#billClassification');if(preview)preview.innerHTML=`<strong>${automatic?'Conta Geral':'Conta Parcial'}</strong><span>${payers.length} de ${participants.length} famílias participantes</span>`;refreshAllocationFields()}
$('#billFamilies').addEventListener('change',updateMandatory);$('#billAmount').addEventListener('input',()=>{const values=[...$$('.family-allocation')];if(!values.length)return;const total=Number($('#billAmount').value)||0;values.forEach(i=>{if(!i.dataset.manual)i.value=(total/values.length).toFixed(2)});});
$('#billMonth')?.addEventListener('change',()=>{const month=$('#billMonth').value;if(periodClosed(month)){alert('Este período está fechado. Não é possível cadastrar contas neste mês.');$('#billMonth').value=$('#billId').value?bills.find(bill=>bill.id===$('#billId').value)?.month||dashboardMonth||currentMonth():dashboardMonth||currentMonth()}});
$('#billForm').onsubmit=async e=>{
  e.preventDefault();
  const month=$('#billMonth').value;
  if(periodClosed(month))return alert('Este período está fechado e não permite alterações nas contas.');
  const family_ids=$$('#billFamilies input:checked').map(input=>input.value);
  if(!family_ids.length)return alert('Selecione pelo menos uma família participante.');
  const mandatory=family_ids.length===activeFamilies().length;
  const allocations={};
  $$('.family-allocation').forEach(input=>allocations[input.dataset.family]=Number(input.value)||0);
  const id=$('#billId').value;
  const row={name:$('#billName').value.trim(),amount:+$('#billAmount').value,month:$('#billMonth').value,mandatory,family_ids,allocations};
  const result=id?await db.from('bills').update(row).eq('id',id):await db.from('bills').insert(row);
  if(result.error)return alert('Erro ao salvar: '+result.error.message);
  $('#billModal').close();await loadData();
};
async function removeBill(id){const bill=bills.find(item=>item.id===id);if(bill&&periodClosed(bill.month))return alert('Este período está fechado. Reabra-o antes de alterar as contas.');if(confirm('Excluir esta conta?')){await db.from('bills').delete().eq('id',id);await loadData()}}window.removeBill=removeBill;
$$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');billFilter=t.dataset.billTab;renderBills()});
function familyReportRows(list, fd, allocations = {}){
  return fd.map(family => {
    const accounts = list.map(bill => {
      const selected = bill.mandatory ? fd : fd.filter(f => (bill.family_ids || []).includes(f.id));
      if (!selected.some(f => f.id === family.id)) return null;
      const billId = bill.id || bill.name;
      const baseShare = Number(bill.amount) / selected.length;
      const key=`${billId}__${family.id}`;
      const configured = bill.allocations && bill.allocations[family.id] !== undefined;
      return {name: bill.name, mandatory: bill.mandatory, amount: configured ? Number(bill.allocations[family.id]) : (allocations[key] ?? baseShare), key};
    }).filter(Boolean);
    const total = accounts.reduce((sum, account) => sum + account.amount, 0);
    const rows = accounts.length ? accounts.map(account => `<tr><td>${esc(account.name)}${account.mandatory ? ' <small>(Conta geral)</small>' : ''}</td><td><strong>${money(account.amount)}</strong></td></tr>`).join('') : '<tr><td colspan="2" class="no-bills">Nenhuma conta atribuída.</td></tr>';
    return `<section class="family-report"><h2>${esc(family.name)}</h2><table class="family-report-table"><thead><tr><th>Conta</th><th>Valor da família</th></tr></thead><tbody>${rows}<tr class="family-total"><td>Total da família</td><td>${money(total)}</td></tr></tbody></table></section>`;
  }).join('');
}
function publicReportLink(report){
  const base=location.href.split('/').slice(0,-1).join('/') + '/document.html?documento=';
  return base + encodeURIComponent(report.public_token);
}
const reportToCents=value=>Math.round((Number(value)||0)*100);
const reportMoney=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function reportBillForFamily(bill,family,families,allocations={}){
 const payers=bill.mandatory?families:families.filter(item=>(bill.family_ids||[]).includes(item.id));
 if(!payers.some(item=>item.id===family.id))return null;
 const key=`${bill.id||bill.name}__${family.id}`;
 if(bill.allocations&&bill.allocations[family.id]!==undefined)return reportToCents(bill.allocations[family.id]);
 if(allocations[key]!==undefined)return reportToCents(allocations[key]);
 const total=reportToCents(bill.amount),base=Math.floor(total/payers.length),remainder=total-base*payers.length;
 return base+(payers.findIndex(item=>item.id===family.id)<remainder?1:0);
}
function reportFamilySections(list,fd,allocations){
 return fd.map(family=>{
  const accounts=list.map(bill=>{const cents=reportBillForFamily(bill,family,fd,allocations);return cents===null?null:{bill,cents}}).filter(Boolean);
  const total=accounts.reduce((sum,account)=>sum+account.cents,0);
  const rows=accounts.length?accounts.map(({bill,cents})=>`<tr><td class="expense-name"><span>${esc(bill.name)}</span><span class="expense-type ${bill.mandatory?'':'additional'}">${bill.mandatory?'Conta geral':'Conta parcial'}</span></td><td class="expense-value">${reportMoney(cents)}</td></tr>`).join(''):'<tr><td colspan="2" class="empty-family">Nenhuma conta atribuída a esta família.</td></tr>';
  return `<section class="family-section"><div class="family-heading"><div><span>Família</span><h2>${esc(family.name)}</h2></div><div class="family-count">${family.people?.length||0} integrante(s)</div></div><table class="family-table"><thead><tr><th>Descrição da despesa</th><th>Valor correspondente</th></tr></thead><tbody>${rows}<tr class="family-total"><td>Total individual da família</td><td>${reportMoney(total)}</td></tr></tbody></table></section>`;
 }).join('');
}
function showReport(month,list,fd=families){
 const snapshot=reports.find(r=>r.month===month)?.snapshot||{};
 const allocations=snapshot.allocations||{};
 let mandatoryCents=0,additionalCents=0,totalCents=0;
 fd.forEach(family=>list.forEach(bill=>{const cents=reportBillForFamily(bill,family,fd,allocations);if(cents!==null){totalCents+=cents;if(bill.mandatory)mandatoryCents+=cents;else additionalCents+=cents}}));
 const saved=reports.find(r=>r.month===month);
 const link=saved?.public_token?{month,public_token:saved.public_token}:null;
 const generated=formatGeneratedAt(saved?.snapshot?.generated_at||new Date().toISOString());
 $('#reportPreview').innerHTML=`<div id="generatedReport" class="official-document"><header class="institutional-header"><div class="header-logo"><img src="logo.png" alt="Logo Tribunal de Contas do Sítio São Miguel"></div></header><div class="document-title"><span>Prestação de contas</span><h1>Demonstrativo Financeiro Mensal</h1><div class="reference-period">${esc(monthName(month))}</div></div><section class="summary-section"><div class="summary-heading"><span>Resumo financeiro</span><i></i></div><div class="summary-grid"><div class="summary-card primary-summary"><span>Total geral do sítio</span><strong>${reportMoney(totalCents)}</strong></div><div class="summary-card"><span>Contas gerais</span><strong>${reportMoney(mandatoryCents)}</strong></div><div class="summary-card"><span>Contas parciais</span><strong>${reportMoney(additionalCents)}</strong></div><div class="summary-card"><span>Famílias incluídas</span><strong>${fd.length}</strong></div></div></section><section class="families-section"><div class="section-heading"><span>Contas por família</span><i></i></div>${reportFamilySections(list,fd,allocations)}</section><section class="closing-summary"><div class="closing-heading">Fechamento financeiro</div><div class="closing-grid"><div><span>Contas gerais</span><strong>${reportMoney(mandatoryCents)}</strong></div><div><span>Contas parciais</span><strong>${reportMoney(additionalCents)}</strong></div><div class="closing-total"><span>Total geral do sítio</span><strong>${reportMoney(totalCents)}</strong></div></div></section><footer class="document-footer"><div><strong>Tribunal de Contas do Sítio São Miguel</strong><span>Gerado em ${generated}</span></div><div class="document-id"><span>Documento</span><strong>${esc(saved?.public_token||'Aguardando link público')}</strong></div></footer></div><div class="report-actions"><button class="primary" id="downloadImage">Baixar imagem</button><button class="secondary" id="downloadPdf">Baixar PDF</button><button class="secondary" id="publicLinkButton">${link?'Copiar link do documento':'Gerar link do documento'}</button></div><div id="publicLinkArea" class="public-link" ${link?'':'hidden'}></div>`;
 bindDownloads(month);
 bindAllocationInputs();
 if(link){renderPublicLink(link)}
 $('#publicLinkButton').onclick=()=>{link?copyPublicLink(link):ensurePublicLink(month,list)};
}
function bindAllocationInputs(){
 $$('.allocation-input').forEach(input=>input.addEventListener('input',()=>{
   const section=input.closest('.family-report');
   let total=[...section.querySelectorAll('.allocation-input')].reduce((sum,item)=>sum+Math.max(0,Number(item.value)||0),0);
   section.querySelector('.family-total td:last-child').textContent=money(total);
 }));
}
function currentAllocations(){const values={};$$('.allocation-input').forEach(input=>{values[input.dataset.key]=Number(input.value)||0});return values}
function renderPublicLink(report){const area=$('#publicLinkArea');area.hidden=false;const link=publicReportLink(report);area.innerHTML=`<small>Link público</small><input readonly value="${link}"><a class="primary" href="${link}" target="_blank">Abrir documento público</a>`;$('#publicLinkButton').textContent='Copiar link do documento';$('#publicLinkButton').onclick=()=>copyPublicLink(report)}
async function copyPublicLink(report){await navigator.clipboard.writeText(publicReportLink(report));$('#publicLinkButton').textContent='Link copiado!'}
async function ensurePublicLink(month,list){
 let report=reports.find(r=>r.month===month),public_token=report?.public_token||crypto.randomUUID().replaceAll('-','').slice(0,16);
 const {error}=await db.from('reports').upsert({month,public_token,snapshot:{families,bills:list,allocations:currentAllocations(),generated_at:new Date().toISOString()}},{onConflict:'month'});
 if(error){alert('Não foi possível criar o link: '+error.message);return}
 report={month,public_token,snapshot:{families,bills:list,allocations:currentAllocations(),generated_at:new Date().toISOString()}};
 const index=reports.findIndex(r=>r.month===month);index>=0?reports[index]=report:reports.push(report);
 renderPublicLink(report);renderSavedReports();
}
$('#generateReport').onclick=async()=>{const month=$('#reportMonth').value;if(!month)return alert('Selecione um mês.');$('#reportPreview').innerHTML='<p style="margin-top:180px"><strong>Gerando documento...</strong><br><small>'+monthName(month)+'</small></p>';await new Promise(r=>setTimeout(r,700));const list=bills.filter(b=>b.month===month);const previous=reports.find(r=>r.month===month);const allocations=$$('.allocation-input').length?currentAllocations():previous?.snapshot?.allocations||{};showReport(month,list);const existing=reports.find(r=>r.month===month);const public_token=existing?.public_token||crypto.randomUUID().replaceAll('-','').slice(0,16);await db.from('reports').upsert({month,public_token,snapshot:{families,bills:list,allocations,generated_at:new Date().toISOString()}},{onConflict:'month'});await loadData();showReport(month,list)};
function bindDownloads(month){$('#downloadImage').onclick=async()=>{const canvas=await html2canvas($('#generatedReport'),{scale:2,useCORS:true,backgroundColor:'#ffffff'}),a=document.createElement('a');a.download=`TCS-${month}.png`;a.href=canvas.toDataURL('image/png');a.click()};$('#downloadPdf').onclick=async()=>{const canvas=await html2canvas($('#generatedReport'),{scale:2,useCORS:true,backgroundColor:'#ffffff'}),{jsPDF}=window.jspdf,pdf=new jsPDF('p','mm','a4'),pageWidth=210,pageHeight=297,imageWidth=pageWidth,imageHeight=canvas.height*imageWidth/canvas.width;const pageContentHeight=277;let heightLeft=imageHeight,y=10;pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,y,imageWidth,imageHeight);heightLeft-=pageContentHeight;while(heightLeft>0){y=heightLeft-imageHeight;pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,y,imageWidth,imageHeight);heightLeft-=pageContentHeight}pdf.save(`TCS-${month}.pdf`)}}
function renderPeriods(){
 const month=$('#periodMonth')?.value||dashboardMonth||currentMonth();
 if($('#periodMonth')&&!$('#periodMonth').value)$('#periodMonth').value=month;
 const billsInMonth=bills.filter(bill=>bill.month===month);
 const report=reports.find(item=>item.month===month);
 const closed=periodClosed(month);
 const available=billsInMonth.length>0&&Boolean(report);
 $('#periodStatus').innerHTML=`<small>STATUS DO PERÍODO</small><h3>${esc(monthName(month))}</h3><p><span class="period-status ${closed?'closed':'open'}">${closed?'Fechado':'Aberto'}</span></p><div class="period-requirements"><span class="${billsInMonth.length?'ok':'missing'}">${billsInMonth.length?'✓':'○'} Pelo menos uma conta cadastrada (${billsInMonth.length})</span><span class="${report?'ok':'missing'}">${report?'✓':'○'} Documento gerado</span></div><button type="button" id="togglePeriod" class="primary full" ${available?'':'disabled'}>${closed?'Reabrir período financeiro':'Fechar período financeiro'}</button>${closed&&available?'':'<small class="period-help">O fechamento exige conta cadastrada e documento gerado.</small>'}`;
 $('#togglePeriod')?.addEventListener('click',()=>toggleFinancialPeriod(month));
 const months=[...new Set([...bills.map(bill=>bill.month),...reports.map(report=>report.month),...periods.map(period=>period.month)])].sort((a,b)=>b.localeCompare(a));
 $('#periodList').innerHTML=months.length?`<table><thead><tr><th>Mês</th><th>Contas</th><th>Documento</th><th>Status</th></tr></thead><tbody>${months.map(item=>`<tr><td>${esc(monthName(item))}</td><td>${bills.filter(bill=>bill.month===item).length}</td><td>${reports.some(report=>report.month===item)?'Gerado':'Não gerado'}</td><td><span class="period-status ${periodClosed(item)?'closed':'open'}">${periodClosed(item)?'Fechado':'Aberto'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">Nenhum período cadastrado.</div>';
}
async function toggleFinancialPeriod(month){
 const closed=periodClosed(month);
 if(!closed&&!bills.some(bill=>bill.month===month))return alert('Cadastre pelo menos uma conta neste mês.');
 if(!closed&&!reports.some(report=>report.month===month))return alert('Gere o documento deste mês antes de fechá-lo.');
 if(!confirm(closed?`Reabrir o período financeiro de ${monthName(month)}?`: `Fechar definitivamente o período financeiro de ${monthName(month)}?`))return;
 const {error}=await db.from('financial_periods').upsert({month,closed:!closed,closed_at:closed?null:new Date().toISOString()},{onConflict:'month'});
 if(error)return alert('Não foi possível atualizar o período: '+error.message);
 await loadData();renderPeriods();
}
window.toggleFinancialPeriod=toggleFinancialPeriod;
$('#periodMonth')?.addEventListener('change',renderPeriods);
const normalizeComparisonName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const previousMonth=month=>{const [year,number]=String(month||'').split('-').map(Number);const date=new Date(year,number-2,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`};
const comparisonCents=value=>Math.round((Number(value)||0)*100);
const comparisonMoney=cents=>money(cents/100);
function comparisonTotals(month){
 const totals=new Map();
 bills.filter(bill=>bill.month===month).forEach(bill=>{
  const key=normalizeComparisonName(bill.name);
  totals.set(key,{name:bill.name,cents:(totals.get(key)?.cents||0)+comparisonCents(bill.amount)});
 });
 return totals;
}
function renderComparison(){
 if(!$('#comparisonBaseMonth')||!$('#comparisonTargetMonth'))return;
 const months=[...new Set(bills.map(bill=>bill.month))].sort((a,b)=>b.localeCompare(a));
 const target=$('#comparisonTargetMonth').value||months[0]||currentMonth();
 let base=$('#comparisonBaseMonth').value||months.find(month=>month!==target)||previousMonth(target);
 $('#comparisonBaseMonth').value=base||previousMonth(target);
 $('#comparisonTargetMonth').value=target;
 const baseMonth=$('#comparisonBaseMonth').value;
 const targetMonth=$('#comparisonTargetMonth').value;
 const baseTotals=comparisonTotals(baseMonth);
 const targetTotals=comparisonTotals(targetMonth);
 const names=[...new Set([...baseTotals.keys(),...targetTotals.keys()])];
 const baseTotal=[...baseTotals.values()].reduce((sum,item)=>sum+item.cents,0);
 const targetTotal=[...targetTotals.values()].reduce((sum,item)=>sum+item.cents,0);
 const totalDifference=targetTotal-baseTotal;
 const totalPercent=baseTotal?totalDifference/baseTotal*100:null;
 const summaryClass=totalDifference>0?'up':totalDifference<0?'down':'stable';
 $('#comparisonSummary').innerHTML=`<div class="stats comparison-summary"><article><span>Total de ${esc(monthName(baseMonth))}</span><strong>${comparisonMoney(baseTotal)}</strong></article><article><span>Total de ${esc(monthName(targetMonth))}</span><strong>${comparisonMoney(targetTotal)}</strong></article><article class="${summaryClass}"><span>Variação geral</span><strong>${totalDifference>0?'▲':totalDifference<0?'▼':'='} ${totalDifference===0?'0,00%':Math.abs(totalPercent||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}</strong><small>${comparisonMoney(Math.abs(totalDifference))} ${totalDifference>0?'a mais':totalDifference<0?'a menos':'sem alteração'}</small></article></div>`;
 if(!baseMonth||!targetMonth){$('#comparisonList').innerHTML='<div class="panel empty-state">Selecione os dois meses para comparar.</div>';return}
 const items=names.map(key=>{
  const before=baseTotals.get(key)?.cents||0;
  const after=targetTotals.get(key)?.cents||0;
  const difference=after-before;
  const percent=before?difference/before*100:null;
  const status=difference>0?'up':difference<0?'down':'stable';
  const name=targetTotals.get(key)?.name||baseTotals.get(key)?.name||key;
  let message;
  if(!before&&after>0)message='Esta conta foi adicionada neste mês';
  else if(before>0&&after===0)message='Esta conta deixou de existir neste mês';
  else if(difference===0)message='Esta conta manteve-se estável em comparação ao mês anterior.';
  else message=`Esta conta ${difference>0?'aumentou':'diminuiu'} ${Math.abs(percent||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% (${comparisonMoney(Math.abs(difference))}) em relação ao mês anterior.`;
  return {name,status,difference,percent,before,after,message};
 }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 $('#comparisonList').innerHTML=items.length?items.map(item=>`<article class="comparison-card ${item.status}"><div><span class="comparison-badge">${item.status==='up'?'Aumentou':item.status==='down'?'Diminuiu':'Estável'}</span><h3>${esc(item.name)}</h3></div><p>${esc(item.message)}</p><div class="comparison-values"><span>${esc(monthName(baseMonth))}<strong>${comparisonMoney(item.before)}</strong></span><span>${esc(monthName(targetMonth))}<strong>${comparisonMoney(item.after)}</strong></span></div></article>`).join(''):`<div class="panel empty-state">Nenhuma conta cadastrada nos meses selecionados.</div>`;
}
$('#comparisonBaseMonth')?.addEventListener('change',renderComparison);
$('#comparisonTargetMonth')?.addEventListener('change',renderComparison);
function renderSavedReports(){if(!reports.length){$('#savedReports').innerHTML='<div class="empty-state">Nenhum documento salvo.</div>';return}$('#savedReports').innerHTML=reports.map(r=>`<article class="saved-report-card"><small>${r.created_at?new Date(r.created_at).toLocaleDateString('pt-BR'):''}</small><h3>${esc(monthName(r.month))}</h3><div class="card-actions"><button type="button" class="open-report" data-month="${esc(r.month)}">Abrir</button>${periodClosed(r.month)?'':`<button type="button" class="danger-action delete-report" data-id="${esc(r.id||'')}" data-month="${esc(r.month)}">Excluir</button>`}</div></article>`).join('');$$('.open-report').forEach(button=>button.addEventListener('click',()=>openSavedReport(button.dataset.month)));$$('.delete-report').forEach(button=>button.addEventListener('click',()=>deleteSavedReport(button.dataset.id,button.dataset.month)))}
function openSavedReport(month){const r=reports.find(x=>x.month===month);if(!r)return;$('#reportMonth').value=month;showReport(month,r.snapshot?.bills||[],r.snapshot?.families||families)}window.openSavedReport=openSavedReport;
async function deleteSavedReport(id,month){if(periodClosed(month))return alert('Este período está fechado. Reabra-o antes de excluir o documento.');if(!id)return alert('Não foi possível identificar o documento salvo.');if(!confirm(`Excluir definitivamente o documento de ${monthName(month)}? O link público deixará de funcionar.`))return;const {error}=await db.from('reports').delete().eq('id',id);if(error)return alert('Não foi possível excluir o documento: '+error.message);reports=reports.filter(report=>String(report.id)!==String(id));renderSavedReports();renderPeriods();if($('#reportMonth')?.value===month)$('#reportPreview').innerHTML='<img src="logo.png" alt="TCS"><p>Documento excluído. Gere novamente quando desejar.</p>'}window.deleteSavedReport=deleteSavedReport;
$('#reportMonth').value=currentMonth();$('#billMonth').value=currentMonth();if($('#periodMonth'))$('#periodMonth').value=currentMonth();
function applyTheme(theme){document.body.classList.toggle('dark-theme',theme==='dark');document.body.dataset.theme=theme;const toggle=$('#themeToggle');if(toggle){toggle.textContent=theme==='dark'?'☀':'☾';toggle.title=theme==='dark'?'Ativar modo claro':'Ativar modo escuro';toggle.setAttribute('aria-label',toggle.title)}}
applyTheme(localStorage.getItem('tcs-theme')||'light');
$('#themeToggle')?.addEventListener('click',()=>{const theme=document.body.dataset.theme==='dark'?'light':'dark';localStorage.setItem('tcs-theme',theme);applyTheme(theme)});
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginError').textContent='Entrando...';const {error}=await db.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error){$('#loginError').textContent='E-mail ou senha inválidos.'}else showAuthenticated();};
$('#logoutBtn').onclick=async()=>{await db.auth.signOut();showLogin()};
function showAuthenticated(){ $('#loginScreen').style.display='none';$('#appContent').classList.remove('app-hidden');loadData(); }
function showLogin(){ $('#loginScreen').style.display='grid';$('#appContent').classList.add('app-hidden'); }
db.auth.onAuthStateChange((_event,session)=>session?showAuthenticated():showLogin());
db.auth.getSession().then(({data:{session}})=>session?showAuthenticated():showLogin());
