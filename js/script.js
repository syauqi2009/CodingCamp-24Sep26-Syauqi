/**
 * Expense & Budget Visualizer
 * js/script.js
 *
 * Phase 4–12: Core + Input + Balance + History + Chart + Custom Categories + Dark/Light Mode
 *   - DOM references
 *   - Application state
 *   - Local Storage helpers
 *   - Initial Balance
 *   - Transaction CRUD (add, delete, render)
 *   - Form handling, validation, user feedback
 *   - Summary (Total Expense / Total Balance)
 *   - Rupiah formatter
 *
 * Not yet implemented (later phases):
 *   - Chart.js visualization  (Phase 9)
 *   - Sorting                 (Phase 11)
 */
'use strict';
/* =============================================================
   LOCAL STORAGE KEYS
   ============================================================= */
const LS_KEYS = {
  transactions:     'expenseVisualizer_transactions',
  initialBalance:   'expenseVisualizer_initialBalance',
  customCategories: 'expenseVisualizer_customCategories',
  theme:            'expenseVisualizer_theme',
};
/* =============================================================
   DOM REFERENCES
   ============================================================= */
const DOM = {
  // Header
  themeToggle:           document.getElementById('theme-toggle'),
  // Dashboard
  initialBalanceInput:   document.getElementById('initial-balance-input'),
  saveInitialBalance:    document.getElementById('save-initial-balance'),
  initialBalanceDisplay: document.getElementById('initial-balance'),
  totalExpenseDisplay:   document.getElementById('total-expense'),
  totalBalanceDisplay:   document.getElementById('total-balance'),
  errorInitialBalance:   document.getElementById('error-initial-balance'),
  // Transaction form
  transactionForm:   document.getElementById('transaction-form'),
  txName:            document.getElementById('transaction-name'),
  txAmount:          document.getElementById('transaction-amount'),
  txCategory:        document.getElementById('transaction-category'),
  txDate:            document.getElementById('transaction-date'),
  errorName:         document.getElementById('error-name'),
  errorAmount:       document.getElementById('error-amount'),
  errorCategory:     document.getElementById('error-category'),
  errorDate:         document.getElementById('error-date'),
  // Custom category (placeholders — wired in Phase 10)
  categoryForm:          document.getElementById('category-form'),
  customCategoryInput:   document.getElementById('custom-category'),
  customCategoryList:    document.getElementById('custom-category-list'),
  customCategoryEmpty:   document.getElementById('custom-category-empty'),
  customCategoriesGroup: document.getElementById('custom-categories-group'),
  errorCustomCategory:   document.getElementById('error-custom-category'),
  // Transaction history
  sortSelect:        document.getElementById('sort-transactions'),
  transactionList:   document.getElementById('transaction-list'),
  transactionEmpty:  document.getElementById('transaction-empty'),
  // Chart (placeholder — wired in Phase 9)
  expenseChart: document.getElementById('expense-chart'),
  chartEmpty:   document.getElementById('chart-empty'),
};
/* =============================================================
   APPLICATION STATE
   ============================================================= */
let state = {
  initialBalance:   0,
  transactions:     [],   // Array of transaction objects
  customCategories: [],   // Array of category name strings (Phase 10)
};
/* =============================================================
   CURRENCY FORMATTER
   ============================================================= */
/**
 * Format a number as Indonesian Rupiah.
 * Example: 5000000 → "Rp5.000.000"
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style:                 'currency',
    currency:              'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
/* =============================================================
   DATE FORMATTER
   ============================================================= */
/**
 * Format a YYYY-MM-DD string to a human-readable Indonesian date.
 * Example: "2026-09-24" → "24 Sep 2026"
 *
 * Appends T00:00:00 to prevent UTC offset from shifting the day.
 *
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  } catch {
    return dateStr;
  }
}
/* =============================================================
   LOCAL STORAGE HELPERS
   ============================================================= */
/**
 * Safely read and JSON-parse a value from localStorage.
 * Returns defaultValue if the key is missing or the JSON is invalid.
 *
 * @param {string} key
 * @param {*}      defaultValue
 * @returns {*}
 */
function lsGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    console.warn('[LS] Failed to parse key:', key);
    return defaultValue;
  }
}
/**
 * JSON-stringify and write a value to localStorage.
 * Silently swallows errors (e.g. storage quota exceeded).
 *
 * @param {string} key
 * @param {*}      value
 */
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[LS] Failed to write key:', key, err);
  }
}
/* =============================================================
   LOAD & SAVE STATE
   ============================================================= */
/**
 * Load all persisted data from localStorage into state.
 * Falls back to safe defaults if data is missing or corrupt.
 */
function loadData() {
  const savedBalance = lsGet(LS_KEYS.initialBalance, 0);
  state.initialBalance = (typeof savedBalance === 'number' && savedBalance >= 0)
    ? savedBalance
    : 0;
  const savedTx = lsGet(LS_KEYS.transactions, []);
  state.transactions = Array.isArray(savedTx)
    ? savedTx.filter(isValidTransaction)
    : [];
  const savedCategories = lsGet(LS_KEYS.customCategories, []);
  state.customCategories = Array.isArray(savedCategories)
    ? savedCategories.filter(c => typeof c === 'string' && c.trim().length > 0)
    : [];
}
/** Persist current transactions to localStorage. */
function saveTransactions() {
  lsSet(LS_KEYS.transactions, state.transactions);
}
/** Persist current initial balance to localStorage. */
function saveInitialBalance() {
  lsSet(LS_KEYS.initialBalance, state.initialBalance);
}
/** Persist custom categories to localStorage. */
function saveCustomCategories() {
  lsSet(LS_KEYS.customCategories, state.customCategories);
}
/**
 * Runtime type guard: ensure a value loaded from localStorage
 * is a well-formed transaction object.
 *
 * @param {*} tx
 * @returns {boolean}
 */
function isValidTransaction(tx) {
  return (
    tx !== null &&
    typeof tx === 'object' &&
    (typeof tx.id === 'number' || typeof tx.id === 'string') &&
    typeof tx.name     === 'string' && tx.name.trim().length     > 0 &&
    typeof tx.amount   === 'number' && tx.amount                 > 0 &&
    typeof tx.category === 'string' && tx.category.trim().length > 0 &&
    typeof tx.date     === 'string' && tx.date.trim().length     > 0 &&
    isValidDateString(tx.date)
  );
}
/* =============================================================
   DATE VALIDATION HELPER
   ============================================================= */
/**
 * Return true if the string is a valid YYYY-MM-DD date.
 *
 * @param {string} str
 * @returns {boolean}
 */
function isValidDateString(str) {
  if (typeof str !== 'string') return false;
  // Must match YYYY-MM-DD pattern
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const date = new Date(str + 'T00:00:00');
  return !isNaN(date.getTime());
}
/* =============================================================
   CALCULATIONS
   ============================================================= */
/**
 * Sum all transaction amounts.
 * @returns {number}
 */
function calculateTotalExpense() {
  return state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
}
/**
 * Initial balance minus total expense.
 * @returns {number}
 */
function calculateTotalBalance() {
  return state.initialBalance - calculateTotalExpense();
}
/* =============================================================
   SUMMARY / DASHBOARD UPDATE
   ============================================================= */
/**
 * Refresh the three balance cards in the Dashboard section.
 */
function updateSummary() {
  const totalExpense = calculateTotalExpense();
  const totalBalance = calculateTotalBalance();
  DOM.initialBalanceDisplay.textContent = formatCurrency(state.initialBalance);
  DOM.totalExpenseDisplay.textContent   = formatCurrency(totalExpense);
  DOM.totalBalanceDisplay.textContent   = formatCurrency(totalBalance);
  // Visual cue: remaining balance turns red when overspent
  DOM.totalBalanceDisplay.style.color = totalBalance < 0
    ? 'var(--card-expense-accent)'
    : '';
}
/* =============================================================
   INITIAL BALANCE
   ============================================================= */
/**
 * Read the initial balance input, validate, save, and update UI.
 */
function handleSaveInitialBalance() {
  clearFieldError(DOM.errorInitialBalance);
  const raw   = DOM.initialBalanceInput.value.trim();
  const value = parseFloat(raw);
  if (raw === '' || isNaN(value)) {
    showFieldError(DOM.errorInitialBalance, 'Masukkan nominal saldo awal yang valid.');
    return;
  }
  if (value < 0) {
    showFieldError(DOM.errorInitialBalance, 'Saldo awal tidak boleh negatif.');
    return;
  }
  state.initialBalance = value;
  saveInitialBalance();
  updateSummary();
}
/**
 * Pre-fill the initial balance input with the persisted value on page load.
 */
function restoreInitialBalanceInput() {
  // Restore if LS key exists — covers both > 0 and deliberately-set 0
  const persisted = localStorage.getItem(LS_KEYS.initialBalance);
  if (persisted !== null && state.initialBalance >= 0) {
    DOM.initialBalanceInput.value = state.initialBalance;
  }
}
/* =============================================================
   FORM FEEDBACK HELPERS
   ============================================================= */
/**
 * Display an error message in a field-level <span.input-error>.
 *
 * @param {HTMLElement|null} el
 * @param {string}           msg
 */
function showFieldError(el, msg) {
  if (!el) return;
  el.textContent = msg;
}
/**
 * Clear a field-level error message.
 *
 * @param {HTMLElement|null} el
 */
function clearFieldError(el) {
  if (!el) return;
  el.textContent = '';
}
/**
 * Show a transient success banner below the submit button.
 * The banner auto-dismisses after 3 seconds.
 *
 * Reuses / creates a single <p id="form-success"> element
 * appended to the <form> — no HTML changes required.
 */
function showFormSuccess(message) {
  let banner = document.getElementById('form-success');
  if (!banner) {
    banner = document.createElement('p');
    banner.id        = 'form-success';
    banner.className = 'form-success-msg';
    // Inline style keeps CSS untouched while giving the banner visibility
    banner.style.cssText = [
      'margin-top: 10px',
      'padding: 10px 16px',
      'border-radius: 6px',
      'font-size: 13px',
      'font-weight: 500',
      'background-color: var(--card-remaining-bg)',
      'color: var(--card-remaining-accent)',
      'border: 1px solid var(--card-remaining-accent)',
    ].join(';');
    // Insert after the submit button (last child of form)
    DOM.transactionForm.appendChild(banner);
  }
  banner.textContent    = message;
  banner.style.display  = 'block';
  // Clear any previous auto-dismiss timer
  if (banner._dismissTimer) clearTimeout(banner._dismissTimer);
  banner._dismissTimer = setTimeout(() => {
    banner.style.display = 'none';
  }, 3000);
}
/* =============================================================
   FORM VALIDATION
   ============================================================= */
/**
 * Validate all fields of the Add Transaction form.
 * Shows per-field error messages and returns false on failure.
 *
 * @param {{ name:string, rawAmount:string, category:string, date:string }} fields
 * @returns {boolean}
 */
function validateTransactionForm(fields) {
  let valid = true;
  // Clear all existing errors first
  clearFieldError(DOM.errorName);
  clearFieldError(DOM.errorAmount);
  clearFieldError(DOM.errorCategory);
  clearFieldError(DOM.errorDate);
  // --- Name ---
  if (fields.name === '') {
    // name has already been trimmed before passing in
    showFieldError(DOM.errorName, 'Nama transaksi tidak boleh kosong.');
    valid = false;
  }
  // --- Amount ---
  const amountNum = parseFloat(fields.rawAmount);
  if (fields.rawAmount === '') {
    showFieldError(DOM.errorAmount, 'Jumlah transaksi wajib diisi.');
    valid = false;
  } else if (isNaN(amountNum)) {
    showFieldError(DOM.errorAmount, 'Masukkan jumlah yang valid (hanya angka).');
    valid = false;
  } else if (amountNum <= 0) {
    showFieldError(DOM.errorAmount, 'Jumlah harus lebih besar dari 0.');
    valid = false;
  } else if (amountNum < 1) {
    // Catches edge cases like 0.5 that pass > 0 but are below Rp1
    showFieldError(DOM.errorAmount, 'Jumlah minimum adalah Rp1.');
    valid = false;
  }
  // --- Category ---
  if (!fields.category || fields.category === '') {
    showFieldError(DOM.errorCategory, 'Pilih kategori transaksi.');
    valid = false;
  }
  // --- Date ---
  if (!fields.date || fields.date === '') {
    showFieldError(DOM.errorDate, 'Pilih tanggal transaksi.');
    valid = false;
  } else if (!isValidDateString(fields.date)) {
    showFieldError(DOM.errorDate, 'Format tanggal tidak valid.');
    valid = false;
  }
  return valid;
}
/* =============================================================
   ADD TRANSACTION
   ============================================================= */
/**
 * Handle the Add Transaction form submission.
 * Follows the exact 11-step sequence from the requirement.
 *
 * @param {Event} event
 */
function handleAddTransaction(event) {
  event.preventDefault();
  // Step 1 & 2: Get values and trim strings
  const fields = {
    name:      DOM.txName.value.trim(),
    rawAmount: DOM.txAmount.value.trim(),
    category:  DOM.txCategory.value,
    date:      DOM.txDate.value,
  };
  // Step 3: Validate
  if (!validateTransactionForm(fields)) return;
  // Step 4: Convert amount to number
  const amount = parseFloat(fields.rawAmount);
  // Step 5: Generate unique ID
  const id = Date.now();
  // Step 6: Build transaction object
  const transaction = {
    id,
    name:     fields.name,
    amount,
    category: fields.category,
    date:     fields.date,
  };
  // Step 7: Add to state (newest first)
  state.transactions.unshift(transaction);
  // Step 8: Persist to Local Storage immediately
  saveTransactions();
  // Step 9: Re-render transaction list
  renderTransactions();
  // Step 10: Update summary cards
  updateSummary();
  // Step 11: Reset form and show success feedback
  resetTransactionForm();
  showFormSuccess('Transaksi berhasil ditambahkan.');
  // Phase 9 hook — updateChart is called here so chart stays in sync
  updateChart();
}
/**
 * Reset the Add Transaction form to its default empty state.
 * Clears both values and validation error messages.
 */
function resetTransactionForm() {
  DOM.transactionForm.reset();
  clearFieldError(DOM.errorName);
  clearFieldError(DOM.errorAmount);
  clearFieldError(DOM.errorCategory);
  clearFieldError(DOM.errorDate);
}
/* =============================================================
   DELETE TRANSACTION
   ============================================================= */
/**
 * Remove a transaction by id, persist, and refresh the UI.
 *
 * @param {number|string} id
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderTransactions();
  updateSummary();
  updateChart();
}
/* =============================================================
   SAFE DOM CREATION HELPERS
   ============================================================= */
/**
 * Create an element with a text node — never sets innerHTML with user data.
 *
 * @param {string} tag
 * @param {string} text
 * @param {string} [className]
 * @returns {HTMLElement}
 */
function createTextElement(tag, text, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;   // XSS-safe: treated as plain text, never HTML
  return el;
}
/* =============================================================
   RENDER TRANSACTIONS
   ============================================================= */
/**
 * Re-render the full transaction list from state.
 * Applies current sort order, toggles the empty state message.
 */
function renderTransactions() {
  // Wipe the current list safely
  DOM.transactionList.innerHTML = '';
  const transactions = getSortedTransactions();
  if (transactions.length === 0) {
    DOM.transactionEmpty.style.display = '';
    DOM.transactionList.style.display  = 'none';
    return;
  }
  DOM.transactionEmpty.style.display = 'none';
  DOM.transactionList.style.display  = '';
  transactions.forEach(tx => {
    DOM.transactionList.appendChild(createTransactionItem(tx));
  });
}
/**
 * Build a single <li> element for a transaction.
 * All user-sourced strings go through textContent — never innerHTML.
 *
 * @param {object} tx
 * @returns {HTMLLIElement}
 */
function createTransactionItem(tx) {
  const li = document.createElement('li');
  li.className  = 'transaction-item';
  li.dataset.id = tx.id;
  // Name
  const name = createTextElement('span', tx.name, 'transaction-item__name');
  // Meta: category badge + formatted date
  const meta          = document.createElement('span');
  meta.className      = 'transaction-item__meta';
  const categoryBadge = createTextElement('span', tx.category, 'transaction-item__category');
  const dateLabel     = createTextElement('span', formatDate(tx.date));
  meta.appendChild(categoryBadge);
  meta.appendChild(dateLabel);
  // Amount — formatted for display only; raw number lives in state
  const amount = createTextElement('span', formatCurrency(tx.amount), 'transaction-item__amount');
  // Delete button
  const deleteBtn       = document.createElement('button');
  deleteBtn.className   = 'transaction-item__delete btn';
  deleteBtn.type        = 'button';
  deleteBtn.textContent = 'Hapus';
  // aria-label built from tx.name via textContent-safe setAttribute
  deleteBtn.setAttribute('aria-label', `Hapus transaksi: ${tx.name}`);
  deleteBtn.dataset.id  = tx.id;
  deleteBtn.addEventListener('click', () => deleteTransaction(tx.id));
  li.appendChild(name);
  li.appendChild(meta);
  li.appendChild(amount);
  li.appendChild(deleteBtn);
  return li;
}
/* =============================================================
   SORTING  (Phase 11 will extend this)
   ============================================================= */
/**
 * Return a sorted *copy* of state.transactions.
 * The original array in state is never mutated.
 *
 * @returns {Array}
 */
function getSortedTransactions() {
  const sortValue = DOM.sortSelect ? DOM.sortSelect.value : 'date-desc';
  const copy      = [...state.transactions];
  switch (sortValue) {
    case 'date-asc':
      // Older date first; same date → older insertion (smaller id) first
      return copy.sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.id - b.id;
      });
    case 'date-desc':
      // Newer date first; same date → newer insertion (larger id) first
      return copy.sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : b.id - a.id;
      });
    case 'amount-desc':   return copy.sort((a, b) =>  b.amount - a.amount);
    case 'amount-asc':    return copy.sort((a, b) =>  a.amount - b.amount);
    case 'category-asc':  return copy.sort((a, b) =>  a.category.localeCompare(b.category, 'id'));
    case 'category-desc': return copy.sort((a, b) =>  b.category.localeCompare(a.category, 'id'));
    default:              return copy;
  }
}
/* =============================================================
   CHART — Pie Chart via Chart.js
   ============================================================= */
/**
 * Singleton Chart.js instance.
 * Kept in module scope so we can destroy/update without re-querying the DOM.
 * @type {Chart|null}
 */
let chartInstance = null;
/**
 * Colour palette for pie slices.
 * Cycles if there are more categories than colours.
 */
const CHART_COLORS = [
  '#4f6ef7', // blue   — Food
  '#f7a94f', // orange — Transportation
  '#e05252', // red    — Shopping
  '#27ae7a', // green  — Education
  '#a04ff7', // purple — Entertainment
  '#f7d34f', // yellow — Other
  '#4fc3f7', // sky
  '#f74f8e', // pink
  '#4ff7b3', // teal
  '#f7654f', // coral
];
/**
 * Build a category→total map from state.transactions.
 *
 * @returns {{ labels: string[], data: number[] }}
 */
function buildChartData() {
  const totals = {};
  state.transactions.forEach(tx => {
    const cat = tx.category;
    totals[cat] = (totals[cat] || 0) + tx.amount;
  });
  const labels = Object.keys(totals);
  const data   = labels.map(label => totals[label]);
  return { labels, data };
}
/**
 * Create or update the Pie Chart using Chart.js.
 *
 * - If no transactions exist, destroy any existing chart and show the empty state.
 * - If the chart already exists, update its data in place (no flicker).
 * - If no chart exists yet, create a new Chart instance.
 */
function renderExpenseChart() {
  const canvas = DOM.expenseChart;
  const empty  = DOM.chartEmpty;
  if (!canvas) return;
  // ── Empty state ──────────────────────────────────────────────
  if (state.transactions.length === 0) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    canvas.style.display = 'none';
    if (empty) empty.style.display = '';
    return;
  }
  // ── Build data ───────────────────────────────────────────────
  const { labels, data } = buildChartData();
  // Assign colours — cycle if needed
  const backgroundColors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  // ── Update existing chart (no flicker) ───────────────────────
  if (chartInstance) {
    chartInstance.data.labels            = labels;
    chartInstance.data.datasets[0].data  = data;
    chartInstance.data.datasets[0].backgroundColor = backgroundColors;
    chartInstance.update();
    canvas.style.display = '';
    if (empty) empty.style.display = 'none';
    return;
  }
  // ── Create new chart ──────────────────────────────────────────
  canvas.style.display = '';
  if (empty) empty.style.display = 'none';
  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:      backgroundColors,
        borderColor:          '#ffffff',
        borderWidth:          2,
        hoverBorderWidth:     3,
        hoverOffset:          6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          position:  'bottom',
          labels: {
            padding:   16,
            boxWidth:  14,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            // Show: "Food — Rp25.000 (45%)"
            label(context) {
              const label  = context.label  || '';
              const value  = context.parsed || 0;
              const total  = context.dataset.data.reduce((s, v) => s + v, 0);
              const pct    = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              const fmt    = new Intl.NumberFormat('id-ID', {
                style:    'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(value);
              return ` ${label} — ${fmt} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}
/**
 * Public entry point called from every state-change site.
 * Delegates to renderExpenseChart() which handles all cases.
 */
function updateChart() {
  renderExpenseChart();
}
/* =============================================================
   DARK / LIGHT MODE — Phase 12
   ============================================================= */
/**
 * Apply a theme by setting data-theme on <html> and updating the toggle button.
 *
 * @param {"light"|"dark"} theme
 */
function applyTheme(theme, skipChartRebuild = false) {
  const root  = document.documentElement;
  const btn   = DOM.themeToggle;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  // Update button label and aria-label
  if (btn) {
    const label = btn.querySelector(".theme-label");
    if (label) {
      label.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
    }
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }
  // Rebuild chart so Chart.js legend/tooltip re-reads computed text colours.
  // Skip on initial load — init() calls updateChart() itself after all setup.
  if (!skipChartRebuild) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    updateChart();
  }
}
/**
 * Toggle between light and dark theme, persist the choice to Local Storage.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  lsSet(LS_KEYS.theme, next);
  applyTheme(next);
}
/**
 * Load the saved theme preference from Local Storage and apply it.
 * Defaults to "light" if no preference is stored.
 */
function loadTheme() {
  const saved = lsGet(LS_KEYS.theme, "light");
  // skipChartRebuild = true: chart will be built by init() after all data is loaded
  applyTheme(saved === "dark" ? "dark" : "light", true);
}
/* =============================================================
   CUSTOM CATEGORIES — Phase 10
   ============================================================= */
/**
 * Inject custom categories into the <optgroup id="custom-categories-group">
 * inside the transaction form's category <select>.
 *
 * Called after any change to state.customCategories.
 */
function renderCustomCategoryOptions() {
  const group = DOM.customCategoriesGroup;
  if (!group) return;
  // Clear existing options in the custom group
  group.innerHTML = '';
  state.customCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = cat;
    group.appendChild(opt);
  });
}
/**
 * Render the tag list of custom categories below the category form.
 * Each tag has a remove (×) button.
 *
 * Uses DOM API exclusively — no innerHTML with user data.
 */
function renderCustomCategoryList() {
  const list  = DOM.customCategoryList;
  const empty = DOM.customCategoryEmpty;
  if (!list) return;
  // Clear existing tags
  list.innerHTML = '';
  if (state.customCategories.length === 0) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  state.customCategories.forEach(cat => {
    const li     = document.createElement('li');
    li.className = 'category-tag';
    const label       = document.createElement('span');
    label.textContent = cat;   // XSS-safe
    const removeBtn       = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'category-tag__delete';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Hapus kategori: ${cat}`);
    removeBtn.addEventListener('click', () => deleteCustomCategory(cat));
    li.appendChild(label);
    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}
/**
 * Handle the Add Custom Category form submission.
 *
 * Validation:
 *  - must not be empty or only whitespace
 *  - must not already exist (case-insensitive)
 *
 * @param {Event} event
 */
function handleAddCustomCategory(event) {
  event.preventDefault();
  clearFieldError(DOM.errorCustomCategory);
  const raw  = DOM.customCategoryInput ? DOM.customCategoryInput.value : '';
  const name = raw.trim();
  // --- Validate: empty ---
  if (name === '') {
    showFieldError(DOM.errorCustomCategory, 'Nama kategori tidak boleh kosong.');
    return;
  }
  // --- Validate: duplicate (case-insensitive) ---
  const nameLower      = name.toLowerCase();
  const defaultCats    = ['food','transportation','shopping','education','entertainment','other'];
  const existsDefault  = defaultCats.includes(nameLower);
  const existsCustom   = state.customCategories.some(c => c.toLowerCase() === nameLower);
  if (existsDefault || existsCustom) {
    showFieldError(DOM.errorCustomCategory, `Kategori "${name}" sudah ada.`);
    return;
  }
  // --- Add ---
  state.customCategories.push(name);
  saveCustomCategories();
  // Update dropdown and tag list
  renderCustomCategoryOptions();
  renderCustomCategoryList();
  // Reset input
  if (DOM.customCategoryInput) DOM.customCategoryInput.value = '';
  clearFieldError(DOM.errorCustomCategory);
}
/**
 * Remove a custom category by name.
 *
 * Note: existing transactions that used this category are NOT modified —
 * their data stays intact in Local Storage. The category just won't
 * appear in the dropdown for new transactions.
 *
 * @param {string} name
 */
function deleteCustomCategory(name) {
  state.customCategories = state.customCategories.filter(
    c => c.toLowerCase() !== name.toLowerCase()
  );
  saveCustomCategories();
  renderCustomCategoryOptions();
  renderCustomCategoryList();
}
/* =============================================================
   EVENT LISTENERS
   ============================================================= */
/**
 * Attach all event listeners once after DOM is ready.
 */
function attachEventListeners() {
  // Initial balance
  if (DOM.saveInitialBalance) {
    DOM.saveInitialBalance.addEventListener('click', handleSaveInitialBalance);
  }
  if (DOM.initialBalanceInput) {
    DOM.initialBalanceInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleSaveInitialBalance(); }
    });
  }
  // Add transaction form
  if (DOM.transactionForm) {
    DOM.transactionForm.addEventListener('submit', handleAddTransaction);
  }
  // Sort dropdown — re-render without mutating stored data
  if (DOM.sortSelect) {
    DOM.sortSelect.addEventListener('change', renderTransactions);
  }
  // Custom category form — Phase 10
  if (DOM.categoryForm) {
    DOM.categoryForm.addEventListener('submit', handleAddCustomCategory);
  }
  // Theme toggle — Phase 12
  if (DOM.themeToggle) {
    DOM.themeToggle.addEventListener('click', toggleTheme);
  }
}
/* =============================================================
   INITIALIZATION
   ============================================================= */
/**
 * Bootstrap the application once the DOM is fully parsed.
 */
function init() {
  loadData();
  loadTheme();                     // Phase 12: apply saved theme before first render
  restoreInitialBalanceInput();
  attachEventListeners();
  renderCustomCategoryOptions();   // Phase 10: populate dropdown from LS
  renderCustomCategoryList();      // Phase 10: show existing custom category tags
  renderTransactions();
  updateSummary();
  updateChart();
}
document.addEventListener('DOMContentLoaded', init);