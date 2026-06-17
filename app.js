// Finance Dashboard — app logic
// Persists data to localStorage under key "finance-dashboard-state"

(function () {
  const STORAGE_KEY = 'finance-dashboard-state';

  let state = {
    income: [],
    expenses: [],
    assets: [],
    debts: [],
    investments: []
  };
  let charts = {};

  const CURRENCY = '₱'; // change to '$', '€', etc. as needed
  const fmt = n => CURRENCY + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtSigned = n => (n < 0 ? '-' : '') + CURRENCY + Math.abs(Number(n || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const uid = () => Math.random().toString(36).slice(2, 9);

  const EXPENSE_CATEGORIES = [
    'Electricity', 'Water', 'Rent', 'Prulife insurance', 'St. Peter plan',
    'Internet', 'Load', 'Food', 'Transport', 'Healthcare',
    'Entertainment', 'Shopping', 'Other'
  ];

  const ACCENT = '#7CB518';
  const ACCENT_DARK = '#4D6B16';

  // ---------- persistence ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }

  // ---------- helpers ----------
  function monthKey(dateStr) { return (dateStr || '').slice(0, 7); }
  function currentMonth() { return new Date().toISOString().slice(0, 7); }

  function totalIncomeForMonth(m) {
    return state.income.filter(i => monthKey(i.date) === m).reduce((s, i) => s + Number(i.amount), 0);
  }
  function totalExpenseForMonth(m) {
    return state.expenses.filter(e => monthKey(e.date) === m).reduce((s, e) => s + Number(e.amount), 0);
  }
  function totalAssets() { return state.assets.reduce((s, a) => s + Number(a.value), 0); }
  function totalDebts() { return state.debts.reduce((s, d) => s + Number(d.balance), 0); }
  function totalInvestedValue() { return state.investments.reduce((s, i) => s + Number(i.currentValue), 0); }
  function totalInvestedCost() { return state.investments.reduce((s, i) => s + Number(i.amountInvested), 0); }

  function last6Months() {
    const months = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(dt.toISOString().slice(0, 7));
    }
    return months;
  }

  function monthLabel(m) {
    const [y, mo] = m.split('-');
    const dt = new Date(Number(y), Number(mo) - 1, 1);
    return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  function delBtn(attr, id) {
    return `<button class="icon-btn" data-${attr}="${id}" aria-label="Delete entry"><i class="ti ti-trash"></i></button>`;
  }

  function legendRow(canvasId, container, items) {
    const canvas = container.querySelector('#' + canvasId);
    if (!canvas) return;
    const wrapper = canvas.closest('div');
    if (wrapper.previousElementSibling && wrapper.previousElementSibling.classList.contains('chart-legend')) return;
    const div = document.createElement('div');
    div.className = 'chart-legend';
    div.innerHTML = items.map(it =>
      `<span style="display:flex;align-items:center;gap:4px;"><span class="legend-dot" style="background:${it.color};"></span>${it.label}</span>`
    ).join('');
    wrapper.parentNode.insertBefore(div, wrapper);
  }

  // ---------- OVERVIEW ----------
  function renderOverview() {
    const el = document.getElementById('panel-overview');
    const cm = currentMonth();
    const income = totalIncomeForMonth(cm);
    const expense = totalExpenseForMonth(cm);
    const net = income - expense;
    const assets = totalAssets() + totalInvestedValue();
    const debts = totalDebts();
    const netWorth = assets - debts;

    el.innerHTML = `
      <div class="metric-grid">
        <div class="metric-card"><p class="label">Income this month</p><p class="value">${fmt(income)}</p></div>
        <div class="metric-card"><p class="label">Spending this month</p><p class="value">${fmt(expense)}</p></div>
        <div class="metric-card"><p class="label">Net cashflow</p><p class="value" style="color:${net >= 0 ? ACCENT_DARK : 'var(--danger)'};">${fmtSigned(net)}</p></div>
        <div class="metric-card"><p class="label">Net worth</p><p class="value">${fmtSigned(netWorth)}</p></div>
      </div>
      <div style="margin-bottom:0.75rem;font-size:14px;color:var(--text-secondary);">Cashflow trend (last 6 months)</div>
      <div class="chart-wrap"><canvas id="overviewChart" role="img" aria-label="Line chart of income and expenses over the last six months"></canvas></div>
      <div class="two-col">
        <div class="card">
          <p style="font-weight:600;margin:0 0 8px;">Assets vs debts</p>
          <table style="width:100%;font-size:13px;">
            <tr><td style="padding:4px 0;color:var(--text-secondary);">Cash & assets</td><td style="text-align:right;">${fmt(totalAssets())}</td></tr>
            <tr><td style="padding:4px 0;color:var(--text-secondary);">Investments</td><td style="text-align:right;">${fmt(totalInvestedValue())}</td></tr>
            <tr><td style="padding:4px 0;color:var(--text-secondary);">Total debts</td><td style="text-align:right;color:var(--danger);">-${fmt(debts)}</td></tr>
            <tr style="border-top:1px solid var(--border-color);"><td style="padding:6px 0 0;font-weight:600;">Net worth</td><td style="text-align:right;padding:6px 0 0;font-weight:600;">${fmtSigned(netWorth)}</td></tr>
          </table>
        </div>
        <div class="card">
          <p style="font-weight:600;margin:0 0 8px;">This month by category</p>
          <div id="overviewCatList" style="font-size:13px;"></div>
        </div>
      </div>
    `;

    const months = last6Months();
    const incomeData = months.map(m => totalIncomeForMonth(m));
    const expenseData = months.map(m => totalExpenseForMonth(m));
    if (charts.overview) charts.overview.destroy();
    charts.overview = new Chart(document.getElementById('overviewChart'), {
      type: 'line',
      data: {
        labels: months.map(monthLabel),
        datasets: [
          { label: 'Income', data: incomeData, borderColor: ACCENT_DARK, backgroundColor: 'rgba(124,181,24,0.12)', fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'Expenses', data: expenseData, borderColor: '#993C1D', backgroundColor: 'rgba(153,60,29,0.08)', fill: true, tension: 0.3, pointRadius: 3, borderDash: [5, 3] }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: v => CURRENCY + v.toLocaleString() } } }
      }
    });

    const catTotals = {};
    state.expenses.filter(e => monthKey(e.date) === cm).forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    });
    const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const catListEl = document.getElementById('overviewCatList');
    if (catEntries.length === 0) {
      catListEl.innerHTML = `<p class="muted">No expenses logged yet this month.</p>`;
    } else {
      const total = catEntries.reduce((s, [, v]) => s + v, 0);
      catListEl.innerHTML = catEntries.slice(0, 8).map(([cat, val]) => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span style="color:var(--text-secondary);">${cat}</span>
          <span>${fmt(val)} <span class="muted">(${Math.round(val / total * 100)}%)</span></span>
        </div>
      `).join('');
    }

    legendRow('overviewChart', el, [
      { label: 'Income', color: ACCENT_DARK },
      { label: 'Expenses', color: '#993C1D' }
    ]);
  }

  // ---------- CASHFLOW ----------
  function renderCashflow() {
    const el = document.getElementById('panel-cashflow');
    el.innerHTML = `
      <div class="form-grid">
        <div>
          <p style="font-weight:600;margin:0 0 8px;">Add income</p>
          <div class="form-col">
            <input type="text" id="incSource" placeholder="Source (e.g. Salary)" />
            <input type="number" id="incAmount" placeholder="Amount" />
            <input type="date" id="incDate" value="${new Date().toISOString().slice(0, 10)}" />
            <button id="incAdd">Add income</button>
          </div>
        </div>
        <div>
          <p style="font-weight:600;margin:0 0 8px;">Add expense</p>
          <div class="form-col">
            <input type="text" id="expDesc" placeholder="Description" />
            <input type="number" id="expAmount" placeholder="Amount" />
            <select id="expCategory">${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <input type="date" id="expDate" value="${new Date().toISOString().slice(0, 10)}" />
            <button id="expAdd">Add expense</button>
          </div>
        </div>
      </div>
      <div style="margin-bottom:0.75rem;font-size:14px;color:var(--text-secondary);">Spending by category (this month)</div>
      <div class="chart-wrap" style="height:240px;"><canvas id="catChart" role="img" aria-label="Pie chart of spending by category this month"></canvas></div>
      <div class="two-col">
        <div>
          <p style="font-weight:600;margin:0 0 8px;">Recent income</p>
          <div id="incomeList"></div>
        </div>
        <div>
          <p style="font-weight:600;margin:0 0 8px;">Recent expenses</p>
          <div id="expenseList"></div>
        </div>
      </div>
    `;

    document.getElementById('incAdd').onclick = () => {
      const source = document.getElementById('incSource').value.trim();
      const amount = parseFloat(document.getElementById('incAmount').value);
      const date = document.getElementById('incDate').value;
      if (!source || !amount || !date) return;
      state.income.unshift({ id: uid(), source, amount, date });
      saveState(); renderCashflow(); renderOverview();
    };
    document.getElementById('expAdd').onclick = () => {
      const desc = document.getElementById('expDesc').value.trim();
      const amount = parseFloat(document.getElementById('expAmount').value);
      const category = document.getElementById('expCategory').value;
      const date = document.getElementById('expDate').value;
      if (!desc || !amount || !date) return;
      state.expenses.unshift({ id: uid(), desc, amount, category, date });
      saveState(); renderCashflow(); renderOverview();
    };

    const incList = document.getElementById('incomeList');
    if (state.income.length === 0) {
      incList.innerHTML = `<p class="muted">No income logged yet.</p>`;
    } else {
      incList.innerHTML = state.income.slice(0, 8).map(i => `
        <div class="list-row">
          <div><div>${i.source}</div><div class="muted">${i.date}</div></div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:${ACCENT_DARK};">+${fmt(i.amount)}</span>
            ${delBtn('del-income', i.id)}
          </div>
        </div>
      `).join('');
      incList.querySelectorAll('[data-del-income]').forEach(btn => {
        btn.onclick = () => {
          state.income = state.income.filter(i => i.id !== btn.dataset.delIncome);
          saveState(); renderCashflow(); renderOverview();
        };
      });
    }

    const expList = document.getElementById('expenseList');
    if (state.expenses.length === 0) {
      expList.innerHTML = `<p class="muted">No expenses logged yet.</p>`;
    } else {
      expList.innerHTML = state.expenses.slice(0, 8).map(e => `
        <div class="list-row">
          <div><div>${e.desc}</div><div class="muted">${e.category} · ${e.date}</div></div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--danger);">-${fmt(e.amount)}</span>
            ${delBtn('del-expense', e.id)}
          </div>
        </div>
      `).join('');
      expList.querySelectorAll('[data-del-expense]').forEach(btn => {
        btn.onclick = () => {
          state.expenses = state.expenses.filter(e => e.id !== btn.dataset.delExpense);
          saveState(); renderCashflow(); renderOverview();
        };
      });
    }

    const cm = currentMonth();
    const catTotals = {};
    state.expenses.filter(e => monthKey(e.date) === cm).forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    });
    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);
    if (charts.cat) charts.cat.destroy();
    const palette = ['#7CB518', '#4D6B16', '#A4D65E', '#2F4310', '#C5E59A', '#1D9E75', '#854F0B', '#185FA5', '#993556', '#5F5E5A', '#993C1D', '#534AB7', '#0F6E56'];
    if (labels.length > 0) {
      charts.cat = new Chart(document.getElementById('catChart'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => palette[i % palette.length]) }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      legendRow('catChart', el, labels.map((l, i) => ({ label: l, color: palette[i % palette.length] })));
    } else {
      document.getElementById('catChart').parentElement.innerHTML = `<p class="muted">No expenses this month to chart yet.</p>`;
    }
  }

  // ---------- BALANCE SHEET ----------
  function renderBalance() {
    const el = document.getElementById('panel-balance');
    const assets = totalAssets();
    const investedVal = totalInvestedValue();
    const debts = totalDebts();
    const netWorth = assets + investedVal - debts;
    el.innerHTML = `
      <div class="metric-grid">
        <div class="metric-card"><p class="label">Total assets</p><p class="value">${fmt(assets + investedVal)}</p></div>
        <div class="metric-card"><p class="label">Total liabilities</p><p class="value">${fmt(debts)}</p></div>
        <div class="metric-card"><p class="label">Net worth</p><p class="value" style="color:${netWorth >= 0 ? ACCENT_DARK : 'var(--danger)'};">${fmtSigned(netWorth)}</p></div>
      </div>
      <p style="font-weight:600;margin:0 0 8px;">Add asset</p>
      <div class="form-row">
        <input type="text" id="assetName" placeholder="Name (e.g. Savings account)" style="flex:2;min-width:160px;" />
        <input type="number" id="assetValue" placeholder="Value" style="flex:1;min-width:100px;" />
        <button id="assetAdd">Add</button>
      </div>
      <div id="assetList" style="margin-bottom:2rem;"></div>
    `;
    document.getElementById('assetAdd').onclick = () => {
      const name = document.getElementById('assetName').value.trim();
      const value = parseFloat(document.getElementById('assetValue').value);
      if (!name || !value) return;
      state.assets.unshift({ id: uid(), name, value });
      saveState(); renderBalance(); renderOverview();
    };
    const listEl = document.getElementById('assetList');
    if (state.assets.length === 0) {
      listEl.innerHTML = `<p class="muted">No assets added yet.</p>`;
    } else {
      listEl.innerHTML = state.assets.map(a => `
        <div class="list-row">
          <span>${a.name}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span>${fmt(a.value)}</span>
            ${delBtn('del-asset', a.id)}
          </div>
        </div>
      `).join('');
      listEl.querySelectorAll('[data-del-asset]').forEach(btn => {
        btn.onclick = () => {
          state.assets = state.assets.filter(a => a.id !== btn.dataset.delAsset);
          saveState(); renderBalance(); renderOverview();
        };
      });
    }
  }

  // ---------- DEBTS ----------
  function renderDebts() {
    const el = document.getElementById('panel-debts');
    const debts = totalDebts();
    el.innerHTML = `
      <div class="metric-card" style="max-width:240px;margin-bottom:2rem;">
        <p class="label">Total debt balance</p><p class="value">${fmt(debts)}</p>
      </div>
      <p style="font-weight:600;margin:0 0 8px;">Add debt</p>
      <div class="form-row">
        <input type="text" id="debtName" placeholder="Name (e.g. Credit card)" style="flex:2;min-width:140px;" />
        <input type="number" id="debtBalance" placeholder="Balance" style="flex:1;min-width:90px;" />
        <input type="number" id="debtRate" placeholder="Interest %" style="flex:1;min-width:90px;" />
        <input type="number" id="debtMin" placeholder="Min payment" style="flex:1;min-width:100px;" />
        <button id="debtAdd">Add</button>
      </div>
      <div id="debtList"></div>
    `;
    document.getElementById('debtAdd').onclick = () => {
      const name = document.getElementById('debtName').value.trim();
      const balance = parseFloat(document.getElementById('debtBalance').value);
      const rate = parseFloat(document.getElementById('debtRate').value) || 0;
      const minPayment = parseFloat(document.getElementById('debtMin').value) || 0;
      if (!name || !balance) return;
      state.debts.unshift({ id: uid(), name, balance, rate, minPayment, originalBalance: balance });
      saveState(); renderDebts(); renderOverview();
    };
    const listEl = document.getElementById('debtList');
    if (state.debts.length === 0) {
      listEl.innerHTML = `<p class="muted">No debts added yet.</p>`;
    } else {
      listEl.innerHTML = state.debts.map(d => {
        const orig = d.originalBalance || d.balance;
        const paidPct = orig > 0 ? Math.max(0, Math.min(100, Math.round((1 - d.balance / orig) * 100))) : 0;
        return `
        <div class="card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;">${d.name}</span>
            ${delBtn('del-debt', d.id)}
          </div>
          <table style="width:100%;font-size:13px;margin-bottom:8px;">
            <tr><td style="color:var(--text-secondary);padding:2px 0;">Balance</td><td style="text-align:right;">${fmt(d.balance)}</td></tr>
            <tr><td style="color:var(--text-secondary);padding:2px 0;">Interest rate</td><td style="text-align:right;">${d.rate}%</td></tr>
            <tr><td style="color:var(--text-secondary);padding:2px 0;">Min payment</td><td style="text-align:right;">${fmt(d.minPayment)}</td></tr>
          </table>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div class="progress-bar"><div class="progress-fill" style="width:${paidPct}%;"></div></div>
            <span class="muted" style="min-width:60px;text-align:right;">${paidPct}% paid</span>
          </div>
          <div style="display:flex;gap:8px;">
            <input type="number" placeholder="Log payment" data-pay-input="${d.id}" style="flex:1;" />
            <button data-pay-btn="${d.id}">Apply payment</button>
          </div>
        </div>`;
      }).join('');
      listEl.querySelectorAll('[data-del-debt]').forEach(btn => {
        btn.onclick = () => {
          state.debts = state.debts.filter(d => d.id !== btn.dataset.delDebt);
          saveState(); renderDebts(); renderOverview();
        };
      });
      listEl.querySelectorAll('[data-pay-btn]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.payBtn;
          const input = listEl.querySelector(`[data-pay-input="${id}"]`);
          const amt = parseFloat(input.value);
          if (!amt) return;
          const debt = state.debts.find(d => d.id === id);
          if (debt) debt.balance = Math.max(0, debt.balance - amt);
          saveState(); renderDebts(); renderOverview();
        };
      });
    }
  }

  // ---------- INVESTMENTS ----------
  function renderInvestments() {
    const el = document.getElementById('panel-investments');
    const cost = totalInvestedCost();
    const value = totalInvestedValue();
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost * 100) : 0;
    el.innerHTML = `
      <div class="metric-grid">
        <div class="metric-card"><p class="label">Total invested</p><p class="value">${fmt(cost)}</p></div>
        <div class="metric-card"><p class="label">Current value</p><p class="value">${fmt(value)}</p></div>
        <div class="metric-card"><p class="label">Gain / loss</p><p class="value" style="color:${gain >= 0 ? ACCENT_DARK : 'var(--danger)'};">${fmtSigned(gain)} (${gainPct.toFixed(1)}%)</p></div>
      </div>
      <p style="font-weight:600;margin:0 0 8px;">Add holding</p>
      <div class="form-row">
        <input type="text" id="invName" placeholder="Name (e.g. Index fund)" style="flex:2;min-width:140px;" />
        <input type="number" id="invCost" placeholder="Amount invested" style="flex:1;min-width:120px;" />
        <input type="number" id="invValue" placeholder="Current value" style="flex:1;min-width:110px;" />
        <button id="invAdd">Add</button>
      </div>
      <div id="invList"></div>
    `;
    document.getElementById('invAdd').onclick = () => {
      const name = document.getElementById('invName').value.trim();
      const amountInvested = parseFloat(document.getElementById('invCost').value);
      const currentValue = parseFloat(document.getElementById('invValue').value);
      if (!name || !amountInvested || isNaN(currentValue)) return;
      state.investments.unshift({ id: uid(), name, amountInvested, currentValue });
      saveState(); renderInvestments(); renderOverview();
    };
    const listEl = document.getElementById('invList');
    if (state.investments.length === 0) {
      listEl.innerHTML = `<p class="muted">No investments added yet.</p>`;
    } else {
      listEl.innerHTML = state.investments.map(inv => {
        const g = inv.currentValue - inv.amountInvested;
        const gp = inv.amountInvested > 0 ? (g / inv.amountInvested * 100) : 0;
        return `
        <div class="list-row">
          <div>
            <div>${inv.name}</div>
            <div class="muted">Invested ${fmt(inv.amountInvested)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;text-align:right;">
            <div>
              <div>${fmt(inv.currentValue)}</div>
              <div style="font-size:12px;color:${g >= 0 ? ACCENT_DARK : 'var(--danger)'};">${fmtSigned(g)} (${gp.toFixed(1)}%)</div>
            </div>
            ${delBtn('del-inv', inv.id)}
          </div>
        </div>`;
      }).join('');
      listEl.querySelectorAll('[data-del-inv]').forEach(btn => {
        btn.onclick = () => {
          state.investments = state.investments.filter(i => i.id !== btn.dataset.delInv);
          saveState(); renderInvestments(); renderOverview();
        };
      });
    }
  }

  function renderAll() {
    renderOverview();
    renderCashflow();
    renderBalance();
    renderDebts();
    renderInvestments();
  }

  // ---------- tabs ----------
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    function activateTab(name) {
      tabs.forEach(t => {
        const active = t.dataset.tab === name;
        t.classList.toggle('active-tab', active);
      });
      document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
      document.getElementById('panel-' + name).style.display = 'block';
    }
    tabs.forEach(t => t.onclick = () => activateTab(t.dataset.tab));
    activateTab('overview');
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderAll();
    initTabs();
  });
})();
