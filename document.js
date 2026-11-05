const db = supabase.createClient(TCS_SUPABASE_URL, TCS_SUPABASE_KEY);
const token = new URLSearchParams(location.search).get('documento');

const toCents = value => Math.round((Number(value) || 0) * 100);
const centsToMoney = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sumCents = values => values.reduce((total, value) => total + toCents(value), 0);
const escapeHtml = value => { const element = document.createElement('div'); element.textContent = value ?? ''; return element.innerHTML; };
const formatMonth = month => {
  const [year, number] = String(month).split('-');
  return new Date(Number(year), Number(number) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const formatGeneratedAt = iso => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não disponível';

function splitBillCents(bill, payerCount) {
  if (!payerCount) return 0;
  const total = toCents(bill.amount);
  return Math.floor(total / payerCount);
}

function billForFamily(bill, family, families, legacyAllocations) {
  const payers = bill.mandatory ? families : families.filter(item => (bill.family_ids || []).includes(item.id));
  if (!payers.some(item => item.id === family.id)) return null;

  const key = `${bill.id || bill.name}__${family.id}`;
  if (bill.allocations && bill.allocations[family.id] !== undefined) return toCents(bill.allocations[family.id]);
  if (legacyAllocations[key] !== undefined) return toCents(legacyAllocations[key]);

  const base = splitBillCents(bill, payers.length);
  const remainder = toCents(bill.amount) - base * payers.length;
  return base + (payers.findIndex(item => item.id === family.id) < remainder ? 1 : 0);
}

function familySections(families, bills, legacyAllocations) {
  return families.map(family => {
    const accounts = bills.map(bill => {
      const cents = billForFamily(bill, family, families, legacyAllocations);
      return cents === null ? null : { name: bill.name, mandatory: Boolean(bill.mandatory), cents };
    }).filter(Boolean);
    const total = accounts.reduce((sum, account) => sum + account.cents, 0);

    const rows = accounts.length ? accounts.map(account => `
      <tr>
        <td class="expense-name">
          <span>${escapeHtml(account.name)}</span>
          ${account.mandatory ? '<span class="expense-type">Conta geral</span>' : '<span class="expense-type additional">Conta parcial</span>'}
        </td>
        <td class="expense-value">${centsToMoney(account.cents)}</td>
      </tr>`).join('') : '<tr><td colspan="2" class="empty-family">Nenhuma conta atribuída a esta família.</td></tr>';

    return `
      <section class="family-section">
        <div class="family-heading">
          <div><span>Família</span><h2>${escapeHtml(family.name)}</h2></div>
          <div class="family-count">${family.people?.length || 0} integrante(s)</div>
        </div>
        <table class="family-table">
          <thead><tr><th>Descrição da despesa</th><th>Valor correspondente</th></tr></thead>
          <tbody>${rows}<tr class="family-total"><td>Total individual da família</td><td>${centsToMoney(total)}</td></tr></tbody>
        </table>
      </section>`;
  }).join('');
}

async function load() {
  if (!token) return;

  const { data, error } = await db.from('reports').select('month,snapshot,created_at').eq('public_token', token).maybeSingle();
  if (error || !data) {
    document.querySelector('#publicDocument').innerHTML = '<section class="public-message"><h1>Documento não encontrado</h1><p>O link pode estar inválido, expirado ou removido.</p></section>';
    return;
  }

  const snapshot = data.snapshot || {};
  const families = Array.isArray(snapshot.families) ? snapshot.families : [];
  const bills = Array.isArray(snapshot.bills) ? snapshot.bills : [];
  let mandatoryCents = 0;
  let additionalCents = 0;
  const familyTotalCents = families.reduce((grandTotal, family) => {
    return grandTotal + bills.reduce((familyTotal, bill) => {
      const cents = billForFamily(bill, family, families, snapshot.allocations || {});
      if (cents !== null) {
        if (bill.mandatory) mandatoryCents += cents;
        else additionalCents += cents;
      }
      return familyTotal + (cents || 0);
    }, 0);
  }, 0);
  const totalCents = familyTotalCents || mandatoryCents + additionalCents;
  const generated = formatGeneratedAt(snapshot.generated_at || data.created_at);

  document.title = `TCS — ${formatMonth(data.month)}`;
  document.querySelector('#publicDocument').innerHTML = `
    <article class="official-document">
      <header class="institutional-header">
        <div class="header-logo"><img src="logo.png" alt="Logo Tribunal de Contas do Sítio São Miguel"></div>
      </header>
      <div class="document-title">
        <span>Prestação de contas</span>
        <h1>Demonstrativo Financeiro Mensal</h1>
        <div class="reference-period">${escapeHtml(formatMonth(data.month))}</div>
      </div>

      <section class="summary-section" aria-label="Resumo financeiro">
        <div class="summary-heading"><span>Resumo financeiro</span><i></i></div>
        <div class="summary-grid">
          <div class="summary-card primary-summary"><span>Total geral do sítio</span><strong>${centsToMoney(totalCents)}</strong></div>
          <div class="summary-card"><span>Contas gerais</span><strong>${centsToMoney(mandatoryCents)}</strong></div>
          <div class="summary-card"><span>Contas parciais</span><strong>${centsToMoney(additionalCents)}</strong></div>
          <div class="summary-card"><span>Famílias incluídas</span><strong>${families.length}</strong></div>
        </div>
      </section>

      <section class="families-section">
        <div class="section-heading"><span>Contas por família</span><i></i></div>
        ${familySections(families, bills, snapshot.allocations || {})}
      </section>

      <section class="closing-summary">
        <div class="closing-heading">Fechamento financeiro</div>
        <div class="closing-grid">
          <div><span>Contas gerais</span><strong>${centsToMoney(mandatoryCents)}</strong></div>
          <div><span>Contas parciais</span><strong>${centsToMoney(additionalCents)}</strong></div>
          <div class="closing-total"><span>Total geral do sítio</span><strong>${centsToMoney(totalCents)}</strong></div>
        </div>
      </section>

      <footer class="document-footer">
        <div><strong>Tribunal de Contas do Sítio São Miguel</strong><span>Gerado em ${generated}</span></div>
        <div class="document-id"><span>Documento</span><strong>${escapeHtml(token)}</strong></div>
      </footer>
    </article>`;
}

if (!token) {
  document.querySelector('#publicDocument').innerHTML = '<section class="public-message"><h1>Link incompleto</h1><p>Informe o identificador do documento.</p></section>';
} else {
  load();
}
