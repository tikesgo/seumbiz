import { supabase } from "./supabaseClient.js";

const LEDGER_LABELS = {
  purchase_approved: "매입 승인",
  withdraw_completed: "출금 완료",
  admin_deduct: "관리자 차감",
  admin_advance: "관리자 선지급",
  admin_restore: "관리자 복구",
  manual_adjust: "관리자 수동 조정",
  manual_credit: "관리자 수동 적립",
  manual_debit: "관리자 수동 차감",
};

const LEDGER_BADGE_CLASSES = {
  purchase_approved: "ledger-type--credit",
  withdraw_completed: "ledger-type--debit",
  admin_deduct: "ledger-type--debit",
  admin_advance: "ledger-type--debit",
  admin_restore: "ledger-type--restore",
  manual_adjust: "ledger-type--restore",
  manual_credit: "ledger-type--credit",
  manual_debit: "ledger-type--debit",
};

const PAGE_SIZE = 20;

const state = {
  summaryRows: [],
  pageRows: [],
  totalCount: 0,
  totalLedgerBalance: 0,
  page: 1,
  period: "all",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const summaryCards = $$(".ledger-summary-card");
const tableBody = $(".ledger-table tbody");
const periodButton = $(".ledger-toolbar-actions .ledger-outline-button");
const pagination = $(".ledger-pagination");
let ledgerRequestId = 0;
let ledgerInitialized = false;

const formatNumber = (value) => Number(value || 0).toLocaleString("ko-KR");

const formatMoney = (value) => `${formatNumber(Math.abs(Number(value || 0)))}원`;

const formatSignedMoney = (value) => {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatMoney(amount)}`;
};

const formatBalanceMoney = (value) => {
  const amount = Number(value || 0);
  return amount < 0 ? `-${formatMoney(amount)}` : formatMoney(amount);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setTableMessage = (message, stateName = "empty") => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="ledger-state-row ledger-state-row--${stateName}">
      <td colspan="5">${escapeHtml(message)}</td>
    </tr>
  `;
};

const getLedgerLabel = (type) => LEDGER_LABELS[type] || "원장 조정";

const getLedgerBadgeClass = (type) => LEDGER_BADGE_CLASSES[type] || "ledger-type--restore";

const getReasonTitle = (row) => {
  if (row.reason) return row.reason;
  return getLedgerLabel(row.ledger_type);
};

const getReasonMeta = (row) => {
  if (row.purchase_request_id) return `매입 접수: ${row.purchase_request_id.slice(0, 8)}`;
  if (row.withdraw_request_id) return `출금 요청: ${row.withdraw_request_id.slice(0, 8)}`;
  if (row.created_by) return `관리자 처리: ${row.created_by.slice(0, 8)}`;
  return "업체 잔액 원장";
};

const getPeriodCutoffIso = () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return cutoff.toISOString();
};

const buildLedgerListQuery = (columns) => {
  const authContext = window.SEUMBizAuth;
  let query = supabase
    .from("biz_balance_ledger")
    .select(columns, { count: columns.includes("ledger_type") ? "exact" : undefined })
    .eq("company_id", authContext.companyId);

  if (state.period === "30d") {
    query = query.gte("created_at", getPeriodCutoffIso());
  }

  return query.order("created_at", { ascending: false });
};

const rowsWithRunningBalance = (rows, startingBalance) => {
  let runningBalance = startingBalance;

  return rows.map((row) => {
    const rowWithBalance = {
      ...row,
      running_balance: runningBalance,
    };
    runningBalance -= Number(row.amount || 0);
    return rowWithBalance;
  });
};

const getVisiblePages = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= 1) return totalPages ? [1] : [];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisible + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const renderPagination = () => {
  if (!pagination) return;

  const total = state.totalCount;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(state.page, 1), totalPages);
  state.page = page;

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);
  const rangeLabel =
    total === 0
      ? "전체 0건"
      : `전체 ${formatNumber(total)}건 중 ${formatNumber(rangeStart)}-${formatNumber(rangeEnd)}건`;

  const pages = getVisiblePages(page, totalPages);
  const pageButtons = pages
    .map((pageNumber) =>
      pageNumber === page
        ? `<strong aria-current="page">${pageNumber}</strong>`
        : `<button type="button" data-page="${pageNumber}">${pageNumber}</button>`,
    )
    .join("");

  const prevControl =
    page > 1
      ? `<button type="button" data-page-action="prev">이전</button>`
      : `<span class="is-disabled" aria-disabled="true">이전</span>`;
  const nextControl =
    page < totalPages
      ? `<button type="button" data-page-action="next">다음</button>`
      : `<span class="is-disabled" aria-disabled="true">다음</span>`;

  pagination.innerHTML = `<span>${escapeHtml(rangeLabel)}</span>${prevControl}${pageButtons}${nextControl}`;
};

const goToPage = (nextPage) => {
  const totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));
  const page = Math.min(Math.max(nextPage, 1), totalPages);
  if (page === state.page) return;
  state.page = page;
  fetchLedgerPage();
};

const renderSummary = () => {
  const totalBalance = state.summaryRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalIncome = state.summaryRows
    .filter((row) => Number(row.amount || 0) > 0)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalOutcome = state.summaryRows
    .filter((row) => Number(row.amount || 0) < 0)
    .reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  const values = [
    {
      number: formatBalanceMoney(totalBalance),
      meta: "원장 로그 합계 기준",
    },
    {
      number: formatMoney(totalIncome),
      meta: "매입 승인 및 수동 적립",
    },
    {
      number: formatMoney(totalOutcome),
      meta: "출금 완료 및 차감 로그",
    },
    {
      number: `${formatNumber(state.summaryRows.length)}건`,
      meta: "전체 원장 기준",
    },
  ];

  summaryCards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    const small = card.querySelector("small");
    if (strong) strong.textContent = values[index]?.number || "-";
    if (small) small.textContent = values[index]?.meta || "";
  });
};

const renderRows = () => {
  if (!tableBody) return;

  const rows = state.pageRows;

  if (rows.length === 0) {
    setTableMessage("표시할 업체 잔액 내역이 없습니다.");
    renderPagination();
    return;
  }

  tableBody.innerHTML = rows
    .map((row) => {
      const amount = Number(row.amount || 0);
      const amountClass = amount >= 0 ? "is-plus" : "is-minus";
      const label = getLedgerLabel(row.ledger_type);
      const badgeClass = getLedgerBadgeClass(row.ledger_type);
      const memo = row.memo || row.reason || "-";

      return `
        <tr>
          <td>
            <div class="ledger-reason">
              <span class="ledger-type ${badgeClass}">${escapeHtml(label)}</span>
              <div>
                <strong>${escapeHtml(getReasonTitle(row))}</strong>
                <small>${escapeHtml(getReasonMeta(row))}</small>
              </div>
            </div>
          </td>
          <td class="ledger-amount ${amountClass}">${formatSignedMoney(amount)}</td>
          <td class="ledger-balance">${formatBalanceMoney(row.running_balance)}</td>
          <td>${formatDateTime(row.created_at)}</td>
          <td>${escapeHtml(memo)}</td>
        </tr>
      `;
    })
    .join("");

  renderPagination();
};

const render = () => {
  renderSummary();
  renderRows();
};

const loadLedgerSummary = async () => {
  const authContext = window.SEUMBizAuth;
  if (!supabase || !authContext?.companyId) return;

  const { data, error } = await supabase
    .from("biz_balance_ledger")
    .select("amount, ledger_type, created_at")
    .eq("company_id", authContext.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("SEUMBiz ledger summary load failed", error);
    return;
  }

  state.summaryRows = data || [];
  state.totalLedgerBalance = state.summaryRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  renderSummary();
};

const fetchLedgerPage = async () => {
  const requestId = ++ledgerRequestId;

  if (!supabase) {
    setTableMessage("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  const authContext = window.SEUMBizAuth;
  if (!authContext?.companyId) {
    setTableMessage("업체 인증 정보를 확인하는 중입니다.", "loading");
    return;
  }

  setTableMessage("업체 잔액 내역을 불러오는 중입니다.", "loading");

  const from = (state.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const listColumns =
    "id, company_id, purchase_request_id, withdraw_request_id, amount, ledger_type, reason, memo, created_by, created_at";

  const { data, error, count } = await buildLedgerListQuery(listColumns).range(from, to);

  if (requestId !== ledgerRequestId) return;

  if (error) {
    setTableMessage(error.message || "업체 잔액 내역을 불러오지 못했습니다.", "error");
    state.pageRows = [];
    state.totalCount = 0;
    renderPagination();
    return;
  }

  state.totalCount = count ?? 0;

  let startingBalance = state.totalLedgerBalance;
  if (from > 0) {
    const { data: precedingRows, error: precedingError } = await buildLedgerListQuery("amount").range(0, from - 1);
    if (requestId !== ledgerRequestId) return;

    if (precedingError) {
      setTableMessage(precedingError.message || "업체 잔액 내역을 불러오지 못했습니다.", "error");
      state.pageRows = [];
      renderPagination();
      return;
    }

    const precedingSum = (precedingRows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    startingBalance = state.totalLedgerBalance - precedingSum;
  }

  state.pageRows = rowsWithRunningBalance(data || [], startingBalance);
  renderRows();
};

const loadLedger = async () => {
  state.pageRows = [];
  state.totalCount = 0;
  state.page = 1;
  await Promise.all([loadLedgerSummary(), fetchLedgerPage()]);
};

const resetListFilters = () => {
  state.page = 1;
  fetchLedgerPage();
};

periodButton?.addEventListener("click", () => {
  state.period = state.period === "all" ? "30d" : "all";
  periodButton.classList.toggle("is-active", state.period === "30d");
  periodButton.lastChild.textContent = state.period === "30d" ? "최근 30일" : "전체 기간";
  resetListFilters();
});

pagination?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const pageButton = target?.closest("[data-page]");
  const actionButton = target?.closest("[data-page-action]");

  if (pageButton) {
    goToPage(Number(pageButton.dataset.page));
    return;
  }

  if (actionButton?.dataset.pageAction === "prev") {
    goToPage(state.page - 1);
    return;
  }

  if (actionButton?.dataset.pageAction === "next") {
    goToPage(state.page + 1);
  }
});

const initLedger = () => {
  if (ledgerInitialized || !window.SEUMBizAuth?.companyId) return;
  ledgerInitialized = true;
  loadLedger();
};

document.addEventListener("seumbiz:auth-ready", initLedger);
initLedger();
