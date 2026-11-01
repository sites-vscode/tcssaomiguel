const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const db=supabase.createClient(TCS_SUPABASE_URL,TCS_SUPABASE_KEY);
let families=[],bills=[],reports=[],billFilter='all';
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const currentMonth=()=>new Date().toISOString().slice(0,7);
const monthName=m=>{const [y,n]=m.split('-');return new Date(+y,+n-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})};
const esc=s=>{const d=document.createElement('div');d.textContent=s||'';return d.innerHTML};
const formatGeneratedAt=iso=>{if(!iso)return '';return new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})};
async function loadData(){const [f,b,r]=await Promise.all([db.from('families').select('*').order('name'),db.from('bills').select('*').order('month',{ascending:false}),db.from('reports').select('*').order('month',{ascending:false})]);if(f.error||b.error||r.error)document.body.insertAdjacentHTML('afterbegin','<div style="position:fixed;z-index:99;top:10px;left:50%;transform:translateX(-50%);background:#ffe3e3;color:#900;padding:12px;border-radius:8px">Execute supabase.sql no painel SQL do Supabase.</div>');families=f.data||[];bills=b.data||[];reports=r.data||[];render();renderSavedReports()}
function openSection(id){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));$('#pageTitle').textContent={dashboard:'Visão geral',families:'Famílias',bills:'Contas',documents:'Documentos'}[id];$('.sidebar').classList.remove('open')}
$$('.nav-item').forEach(b=>b.onclick=()=>openSection(b.dataset.view));$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
function render(){const m=currentMonth(),mb=bills.filter(b=>b.month===m);$('#familyCount').textContent=families.length;$('#mandatoryCount').textContent=bills.filter(b=>b.mandatory).length;$('#monthTotal').textContent=money(mb.reduce((s,b)=>s+Number(b.amount),0));$('#nextMonth').textContent=monthName(m);renderFamilies();renderBills();renderRecent()}
function renderFamilies(){const el=$('#familyList');if(!families.length){el.innerHTML='<div class="panel empty-state" style="grid-column:1/-1">Cadastre a primeira família.</div>';return}el.innerHTML=families.map(f=>`<article class="family-card"><div class="avatar">${esc((f.name||'?')[0])}</div><h3>${esc(f.name)}</h3><p>${f.people.length} pessoa(s)</p><p>${f.people.map(esc).join(', ')}</p><div class="card-actions"><button onclick="editFamily('${f.id}')">Editar</button><button onclick="removeFamily('${f.id}')">Excluir</button></div></article>`).join('')}
function renderRecent(){const recent=[...bills].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,5);$('#recentBills').className=recent.length?'table-wrap':'empty-state';$('#recentBills').innerHTML=recent.length?`<table><thead><tr><th>Conta</th><th>Tipo</th><th>Mês</th><th>Valor</th></tr></thead><tbody>${recent.map(b=>`<tr><td>${esc(b.name)}</td><td>${b.mandatory?'Obrigatória':'Por família'}</td><td>${monthName(b.month)}</td><td>${money(b.amount)}</td></tr>`).join('')}</tbody></table>`:'Nenhuma conta cadastrada.'}
function renderBills(){const list=bills.filter(b=>billFilter==='all'||(billFilter==='mandatory'?b.mandatory:!b.mandatory));if(!list.length){$('#billList').innerHTML='<div class="empty-state">Nenhuma conta nesta categoria.</div>';return}$('#billList').innerHTML=`<table><thead><tr><th>Conta</th><th>Competência</th><th>Tipo</th><th>Famílias</th><th>Valor</th><th></th></tr></thead><tbody>${list.map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td>${monthName(b.month)}</td><td><span class="badge ${b.mandatory?'required':''}">${b.mandatory?'Obrigatória':'Por família'}</span></td><td>${b.mandatory?'Todas':(b.family_ids||[]).map(id=>families.find(f=>f.id===id)?.name).filter(Boolean).map(esc).join(', ')||'—'}</td><td><strong>${money(b.amount)}</strong></td><td><button onclick="editBill('${b.id}')" style="border:0;background:#edf3f8;color:#052f5f;padding:7px;border-radius:6px;margin-right:5px">Editar</button><button onclick="removeBill('${b.id}')" style="border:0;background:none;color:#a00">Excluir</button></td></tr>`).join('')}</tbody></table>`}
$('#newFamily').onclick=()=>openFamilyModal();$('#peopleCount').oninput=()=>buildPeople([]);
function buildPeople(values=[]){const n=Math.max(1,+$('#peopleCount').value||1);$('#peopleNames').innerHTML='<div class="person-input"><strong>Nome das pessoas</strong></div>'+Array.from({length:n},(_,i)=>`<label class="person-input">Pessoa ${i+1}<input class="person-name" required value="${esc(values[i]||'')}" placeholder="Nome completo"></label>`).join('')}
function openFamilyModal(f=null){$('#familyForm').reset();$('#familyId').value=f?.id||'';$('#familyName').value=f?.name||'';$('#peopleCount').value=f?.people?.length||1;buildPeople(f?.people||[]);$('#familyModal').showModal()}
function editFamily(id){openFamilyModal(families.find(f=>f.id===id))}window.editFamily=editFamily;
async function removeFamily(id){if(confirm('Excluir esta família?')){await db.from('families').delete().eq('id',id);await loadData()}}window.removeFamily=removeFamily;
$('#familyForm').onsubmit=async e=>{e.preventDefault();const name=$('#familyName').value.trim(),people=$$('.person-name').map(i=>i.value.trim()).filter(Boolean);if(!name||!people.length)return;const id=$('#familyId').value,row={name,people},result=id?await db.from('families').update(row).eq('id',id):await db.from('families').insert(row);if(result.error)return alert('Erro ao salvar: '+result.error.message);$('#familyModal').close();await loadData()};
function renderBillFamilies(){ $('#billFamilies').innerHTML=families.length?families.map(f=>`<label class="check-row"><input type="checkbox" value="${f.id}"> ${esc(f.name)} <small>— ${f.people.length} pessoa(s)</small></label>`).join(''):'Cadastre uma família antes de criar a conta.';refreshAllocationFields(); }
function openBillModal(bill=null){ $('#billForm').reset();$('#billId').value=bill?.id||'';$('#billName').value=bill?.name||'';$('#billAmount').value=bill?.amount||'';$('#billMonth').value=bill?.month||currentMonth();renderBillFamilies();if(bill){$('input[name="mandatory"]'+(bill.mandatory?'[value="yes"]':'[value="no"]')).checked=true;if(!bill.mandatory)bill.family_ids.forEach(id=>{const box=$(`#billFamilies input[value="${id}"]`);if(box)box.checked=true});}updateMandatory();refreshAllocationFields(bill?.allocations||{});$('#billModal').showModal() }$('#newBill').onclick=()=>openBillModal();
function editBill(id){openBillModal(bills.find(b=>b.id===id))}window.editBill=editBill;
function selectedPayers(){const mandatory=$('input[name="mandatory"]:checked')?.value==='yes';return mandatory?families:families.filter(f=>$('#billFamilies input[value="'+f.id+'"]')?.checked)}
function refreshAllocationFields(saved={}){if(!$('#allocationFields'))return;const payers=selectedPayers(),total=Number($('#billAmount').value)||0,share=payers.length?total/payers.length:0;$('#allocationFields').innerHTML=payers.length?`<legend>Valor aproximado por família</legend><small>Você pode arredondar cada valor. A soma não precisa ser alterada automaticamente.</small>${payers.map(f=>`<label class="allocation-form-row">${esc(f.name)}<input type="number" min="0" step="0.01" class="family-allocation" data-family="${f.id}" value="${(saved[f.id] ?? share).toFixed(2)}"></label>`).join('')}`:'<legend>Valor aproximado por família</legend><small>Selecione uma opção acima e as famílias.</small>'}
function updateMandatory(){ $('#familyPicker').classList.toggle('hidden',$('input[name="mandatory"]:checked')?.value==='yes');refreshAllocationFields(); }$$('input[name="mandatory"]').forEach(i=>i.onchange=updateMandatory);$('#billFamilies').addEventListener('change',()=>refreshAllocationFields());$('#billAmount').addEventListener('input',()=>{const values=[...$$('.family-allocation')];if(!values.length)return;const total=Number($('#billAmount').value)||0;values.forEach(i=>{if(!i.dataset.manual)i.value=(total/values.length).toFixed(2)});});
$('#billForm').onsubmit=async e=>{e.preventDefault();const mandatory=$('input[name="mandatory"]:checked')?.value==='yes',family_ids=mandatory?families.map(f=>f.id):$$('#billFamilies input:checked').map(i=>i.value);if(!mandatory&&!family_ids.length)return alert('Selecione uma família.');const allocations={};$$('.family-allocation').forEach(i=>allocations[i.dataset.family]=Number(i.value)||0);const id=$('#billId').value,row={name:$('#billName').value.trim(),amount:+$('#billAmount').value,month:$('#billMonth').value,mandatory,family_ids,allocations};const result=id?await db.from('bills').update(row).eq('id',id):await db.from('bills').insert(row);if(result.error)return alert('Erro ao salvar: '+result.error.message);$('#billModal').close();await loadData()};
async function removeBill(id){if(confirm('Excluir esta conta?')){await db.from('bills').delete().eq('id',id);await loadData()}}window.removeBill=removeBill;
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
    const rows = accounts.length ? accounts.map(account => `<tr><td>${esc(account.name)}${account.mandatory ? ' <small>(obrigatória)</small>' : ''}</td><td><strong>${money(account.amount)}</strong></td></tr>`).join('') : '<tr><td colspan="2" class="no-bills">Nenhuma conta atribuída.</td></tr>';
    return `<section class="family-report"><h2>${esc(family.name)}</h2><table class="family-report-table"><thead><tr><th>Conta</th><th>Valor da família</th></tr></thead><tbody>${rows}<tr class="family-total"><td>Total da família</td><td>${money(total)}</td></tr></tbody></table></section>`;
  }).join('');
}
function publicReportLink(report){
  const base=location.href.split('/').slice(0,-1).join('/') + '/document.html?documento=';
  return base + encodeURIComponent(report.public_token);
}
function showReport(month,list,fd=families){
 const allocations=reports.find(r=>r.month===month)?.snapshot?.allocations || {};
 const total=list.reduce((s,b)=>s+Number(b.amount),0),mandatory=list.filter(b=>b.mandatory).reduce((s,b)=>s+Number(b.amount),0);
 const saved=reports.find(r=>r.month===month);
 const link=saved?.public_token?{month,public_token:saved.public_token}:null;
 $('#reportPreview').innerHTML=`<div id="generatedReport" class="report"><div class="report-head"><img class="report-logo" src="logo.png"><h1>Tribunal de Contas do Sítio</h1><strong>São Miguel</strong><p>Documento mensal — ${monthName(month)}</p></div><h3 class="report-section-title">Contas por família</h3>${familyReportRows(list,fd,allocations)}<div style="text-align:right;margin-top:20px"><strong>Total geral do sítio: ${money(total)}</strong><br><span>Total das contas obrigatórias: ${money(mandatory)}</span></div><p style="margin-top:60px;font-size:11px">Gerado pelo TCS em ${formatGeneratedAt(saved?.snapshot?.generated_at || new Date().toISOString())}.</p></div><div class="report-actions"><button class="primary" id="downloadImage">Baixar imagem</button><button class="secondary" id="downloadPdf">Baixar PDF</button><button class="secondary" id="publicLinkButton">${link?'Copiar link do documento':'Gerar link do documento'}</button></div><div id="publicLinkArea" class="public-link" ${link?'':'hidden'}></div>`;
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
function bindDownloads(month){$('#downloadImage').onclick=async()=>{const canvas=await html2canvas($('#generatedReport'),{scale:2}),a=document.createElement('a');a.download=`TCS-${month}.png`;a.href=canvas.toDataURL('image/png');a.click()};$('#downloadPdf').onclick=async()=>{const canvas=await html2canvas($('#generatedReport'),{scale:2}),{jsPDF}=window.jspdf,pdf=new jsPDF('p','mm','a4');pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297);pdf.save(`TCS-${month}.pdf`)}}
function renderSavedReports(){if(!reports.length){$('#savedReports').innerHTML='Nenhum documento salvo.';return}$('#savedReports').innerHTML=reports.map(r=>`<article class="family-card" style="display:inline-block;width:220px;margin:8px"><small>${r.created_at?new Date(r.created_at).toLocaleDateString('pt-BR'):''}</small><h3>${monthName(r.month)}</h3><div class="card-actions"><button onclick="openSavedReport('${r.month}')">Abrir</button></div></article>`).join('')}
function openSavedReport(month){const r=reports.find(x=>x.month===month);if(!r)return;$('#reportMonth').value=month;showReport(month,r.snapshot.bills||[],r.snapshot.families||families)}window.openSavedReport=openSavedReport;
$('#reportMonth').value=currentMonth();$('#billMonth').value=currentMonth();
function applyTheme(theme){document.body.classList.toggle('dark-theme',theme==='dark');document.body.dataset.theme=theme;const toggle=$('#themeToggle');if(toggle){toggle.textContent=theme==='dark'?'☀':'☾';toggle.title=theme==='dark'?'Ativar modo claro':'Ativar modo escuro';toggle.setAttribute('aria-label',toggle.title)}}
applyTheme(localStorage.getItem('tcs-theme')||'light');
$('#themeToggle')?.addEventListener('click',()=>{const theme=document.body.dataset.theme==='dark'?'light':'dark';localStorage.setItem('tcs-theme',theme);applyTheme(theme)});
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginError').textContent='Entrando...';const {error}=await db.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error){$('#loginError').textContent='E-mail ou senha inválidos.'}else showAuthenticated();};
$('#logoutBtn').onclick=async()=>{await db.auth.signOut();showLogin()};
function showAuthenticated(){ $('#loginScreen').style.display='none';$('#appContent').classList.remove('app-hidden');loadData(); }
function showLogin(){ $('#loginScreen').style.display='grid';$('#appContent').classList.add('app-hidden'); }
db.auth.onAuthStateChange((_event,session)=>session?showAuthenticated():showLogin());
db.auth.getSession().then(({data:{session}})=>session?showAuthenticated():showLogin());
