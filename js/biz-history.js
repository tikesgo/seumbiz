import { resolveSeumBizAssetUrl } from "./biz-assets.js";
import { supabase } from "./supabaseClient.js";

const STATUS_LABELS = {
  pending: "접수대기",
  reviewing: "검수중",
  approved: "승인완료",
  rejected: "반려",
  canceled: "취소",
};

const STATUS_BADGE_CLASSES = {
  pending: "biz-badge--waiting",
  reviewing: "biz-badge--processing",
  approved: "biz-badge--approved",
  rejected: "biz-badge--rejected",
  canceled: "biz-badge--canceled",
};

const STATUS_FILTERS = {
  전체: "all",
  승인대기: "pending",
  접수대기: "pending",
  검수중: "reviewing",
  승인완료: "approved",
  반려: "rejected",
  취소: "canceled",
};

const PAGE_SIZE = 20;

const state = {
  summaryRows: [],
  pageRows: [],
  totalCount: 0,
  page: 1,
  status: "all",
  query: "",
  period: "all",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const tableBody = $(".history-table tbody");
const summaryCards = $$(".history-summary-card");
const filterChips = $$(".history-filter span");
const searchInput = $(".history-search input");
const periodButton = $(".history-toolbar-actions .history-outline-button");
const pagination = $(".history-pagination");
const detailModal = $("#purchaseDetailModal");
const detailState = $("[data-detail-state]");
const detailContent = $("[data-detail-content]");
const detailInfo = $("[data-detail-info]");
const detailItemsBody = $("[data-detail-items]");

let historyRequestId = 0;
let detailRequestId = 0;
let historyInitialized = false;

const formatNumber = (value) => Number(value || 0).toLocaleString("ko-KR");

const formatMoney = (value) => `${formatNumber(value)}원`;

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

const formatItemStatus = (status) => STATUS_LABELS[status] || status || "-";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getGiftcardDisplay = (row) => {
  const snapshotLogoUrl = row.giftcard_logo_url_snapshot || "";
  const currentLogoUrl = row.current_giftcard_logo_url || "";
  const logoUrl = isUsableGiftcardLogoUrl(snapshotLogoUrl) ? snapshotLogoUrl : currentLogoUrl;
  console.log("[SEUMBiz History] giftcard logo", {
    receipt_no: row.receipt_no || "",
    giftcard_code: row.giftcard_code || "",
    snapshotLogoUrl,
    currentLogoUrl,
    resolvedLogoUrl: logoUrl,
  });

  return {
    name: row.giftcard_name_snapshot || row.current_giftcard_name || row.giftcard_type || "-",
    logoUrl,
  };
};

const isUsableGiftcardLogoUrl = (url) => {
  const value = String(url || "").trim();
  return Boolean(value) && !value.startsWith("/assets/giftcards/");
};

const loadCurrentGiftcardMap = async (rows) => {
  const codes = [...new Set((rows || []).map((row) => row.giftcard_code).filter(Boolean))];
  const needsLegacyNameLookup = (rows || []).some((row) => {
    const snapshotLogo = String(row?.giftcard_logo_url_snapshot || "").trim();
    return !row?.giftcard_code || !snapshotLogo || snapshotLogo.startsWith("/assets/giftcards/");
  });
  const lookup = {
    byCode: new Map(),
    byName: new Map(),
  };
  if (!codes.length && !needsLegacyNameLookup) return lookup;

  let query = supabase.from("biz_giftcard_types").select("code,name,logo_url");
  if (codes.length && !needsLegacyNameLookup) {
    query = query.in("code", codes);
  }

  const { data, error } = await query;

  if (error) {
    console.error("SEUMBiz history giftcard fallback load failed", error);
    return lookup;
  }

  for (const row of data || []) {
    lookup.byCode.set(row.code, row);
    lookup.byName.set(normalizeGiftcardName(row.name), row);
  }

  return lookup;
};

const normalizeGiftcardName = (value) => String(value || "").replace(/\s+/g, "").toLowerCase();

const applyGiftcardFallbacks = (rows, giftcardLookup) =>
  (rows || []).map((row) => {
    const giftcard =
      giftcardLookup.byCode.get(row.giftcard_code) ||
      [row.giftcard_name_snapshot, row.giftcard_type]
        .map((name) => giftcardLookup.byName.get(normalizeGiftcardName(name)))
        .find(Boolean);
    return {
      ...row,
      current_giftcard_name: giftcard?.name || "",
      current_giftcard_logo_url: giftcard?.logo_url || "",
    };
  });

const renderGiftcardDisplay = (row) => {
  const giftcard = getGiftcardDisplay(row);
  const logoHtml = giftcard.logoUrl
    ? `<span class="history-giftcard-logo"><img src="${escapeHtml(resolveSeumBizAssetUrl(giftcard.logoUrl))}" alt="" loading="lazy" onerror="this.parentElement.classList.add('history-giftcard-logo--empty'); this.remove();" /></span>`
    : `<span class="history-giftcard-logo history-giftcard-logo--empty" aria-hidden="true"></span>`;

  return `
    <span class="history-giftcard-cell">
      ${logoHtml}
      <span>${escapeHtml(giftcard.name)}</span>
    </span>
  `;
};

const setTableMessage = (message, stateName = "empty") => {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="history-state-row history-state-row--${stateName}">
      <td colspan="7">${escapeHtml(message)}</td>
    </tr>
  `;
};

const resetSummary = () => {
  const values = [
    { number: "-", meta: "불러오는 중" },
    { number: "-", meta: "불러오는 중" },
    { number: "-", meta: "불러오는 중" },
    { number: "-", meta: "불러오는 중" },
  ];

  summaryCards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    const small = card.querySelector("small");
    if (strong) strong.textContent = values[index]?.number || "0";
    if (small) small.textContent = values[index]?.meta || "";
  });
};

const getSettlementAmount = (row) =>
  row.approved_settlement_amount ?? row.submitted_settlement_amount ?? row.expected_settlement_amount ?? 0;

const normalizeRows = (rows) =>
  rows.map((row) => {
    const items = Array.isArray(row.biz_purchase_items) ? row.biz_purchase_items : [];
    const calculatedCount = items.length;
    const calculatedFaceValue = items.reduce((sum, item) => sum + Number(item.face_value || 0), 0);

    return {
      ...row,
      item_count: Number(row.item_count || calculatedCount || 0),
      total_face_value: Number(row.total_face_value || calculatedFaceValue || 0),
      settlement_amount: Number(getSettlementAmount(row)),
    };
  });

const getPeriodCutoffIso = () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return cutoff.toISOString();
};

const buildPurchaseListQuery = () => {
  const authContext = window.SEUMBizAuth;
  let query = supabase
    .from("biz_purchase_requests")
    .select(
      `
        id,
        company_id,
        receipt_no,
        giftcard_type,
        giftcard_code,
        giftcard_name_snapshot,
        giftcard_logo_url_snapshot,
        giftcard_rate_snapshot,
        item_count,
        total_face_value,
        applied_rate,
        expected_settlement_amount,
        approved_settlement_amount,
        status,
        created_at,
        biz_purchase_items (
          id,
          face_value
        )
      `,
      { count: "exact" },
    )
    .eq("company_id", authContext.companyId);

  if (state.status !== "all") {
    query = query.eq("status", state.status);
  }

  if (state.period === "30d") {
    query = query.gte("created_at", getPeriodCutoffIso());
  }

  const search = state.query.trim();
  if (search) {
    const pattern = `%${search.replace(/[,*]/g, "")}%`;
    query = query.or(
      `receipt_no.ilike.${pattern},giftcard_type.ilike.${pattern},giftcard_name_snapshot.ilike.${pattern},giftcard_code.ilike.${pattern}`,
    );
  }

  return query.order("created_at", { ascending: false });
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
  fetchPurchasePage();
};

const renderSummary = () => {
  const now = new Date();
  const thisMonthRows = state.summaryRows.filter((row) => {
    const date = new Date(row.created_at);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const pendingRows = state.summaryRows.filter((row) => row.status === "pending" || row.status === "reviewing");
  const approvedRecentRows = state.summaryRows.filter((row) => {
    const date = new Date(row.created_at);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return row.status === "approved" && date >= cutoff;
  });
  const totalItems = thisMonthRows.reduce((sum, row) => sum + row.item_count, 0);
  const expectedAmount = state.summaryRows.reduce((sum, row) => sum + row.settlement_amount, 0);

  const values = [
    {
      number: `${formatNumber(thisMonthRows.length)}건`,
      meta: `총 ${formatNumber(totalItems)}개 핀번호`,
    },
    {
      number: `${formatNumber(pendingRows.length)}건`,
      meta: "검토 진행 중 접수",
    },
    {
      number: formatMoney(expectedAmount),
      meta: "승인 전 금액 포함",
    },
    {
      number: `${formatNumber(approvedRecentRows.length)}건`,
      meta: "최근 7일 기준",
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
    setTableMessage("표시할 매입 내역이 없습니다.");
    renderPagination();
    return;
  }

  tableBody.innerHTML = rows
    .map((row) => {
      const badgeClass = STATUS_BADGE_CLASSES[row.status] || "biz-badge--muted";
      const statusLabel = STATUS_LABELS[row.status] || row.status || "-";
      return `
        <tr data-purchase-id="${escapeHtml(row.id)}">
          <td>
            <button class="receipt-code" type="button" data-purchase-detail="${escapeHtml(row.id)}">${escapeHtml(row.receipt_no || "-")}<span aria-hidden="true">↗</span></button>
            <small class="receipt-meta">접수번호 기준 · 핀번호 ${formatNumber(row.item_count)}개</small>
          </td>
          <td>${renderGiftcardDisplay(row)}</td>
          <td class="history-count"><button class="history-count-link" type="button" data-purchase-detail="${escapeHtml(row.id)}">${formatNumber(row.item_count)}건</button></td>
          <td>${formatMoney(row.total_face_value)}</td>
          <td class="history-amount">${formatMoney(row.settlement_amount)}</td>
          <td>${formatDateTime(row.created_at)}</td>
          <td><span class="biz-badge ${badgeClass}">${escapeHtml(statusLabel)}</span></td>
        </tr>
      `;
    })
    .join("");

  renderPagination();
};

const setDetailState = (message, stateName = "") => {
  if (!detailState || !detailContent) return;
  detailState.textContent = message;
  detailState.dataset.state = stateName;
  detailState.hidden = false;
  detailContent.hidden = true;
};

const showDetailContent = () => {
  if (detailState) {
    detailState.textContent = "";
    detailState.dataset.state = "";
    detailState.hidden = true;
  }

  if (detailContent) {
    detailContent.hidden = false;
  }
};

const openDetailModal = () => {
  if (!detailModal) return;
  detailModal.hidden = false;
  document.body.classList.add("is-history-modal-open");
};

const closeDetailModal = () => {
  if (!detailModal) return;
  detailRequestId += 1;
  detailModal.hidden = true;
  document.body.classList.remove("is-history-modal-open");
};

const renderDetailInfo = (row) => {
  if (!detailInfo) return;
  const statusLabel = STATUS_LABELS[row.status] || row.status || "-";
  const approvedAmount = Number(row.approved_settlement_amount || 0);
  const rejectReason = row.status === "rejected" ? String(row.admin_memo || "").trim() : "";
  const values = [
    ["접수번호", row.receipt_no || "-"],
    ["상품권 종류", { html: renderGiftcardDisplay(row) }],
    ["접수시간", formatDateTime(row.created_at)],
    ["상태", statusLabel],
  ];

  if (rejectReason) {
    values.push(["반려 사유", rejectReason]);
  }

  values.push(
    ["총 건수", `${formatNumber(row.item_count)}건`],
    ["총 액면가", formatMoney(row.total_face_value)],
    ["예상 정산금", formatMoney(Number(row.expected_settlement_amount || 0))],
    [
      "승인 정산금",
      row.status === "approved" && approvedAmount > 0 ? formatMoney(approvedAmount) : "-",
    ],
  );

  detailInfo.innerHTML = values
    .map(
      ([label, value]) => `
        <div${label === "반려 사유" ? ' class="history-detail-reject-reason"' : ""}>
          <dt>${escapeHtml(label)}</dt>
          <dd>${typeof value === "object" && value?.html ? value.html : escapeHtml(value)}</dd>
        </div>
      `,
    )
    .join("");
};

const renderDetailItems = (items) => {
  if (!detailItemsBody) return;

  if (!items.length) {
    detailItemsBody.innerHTML = `
      <tr class="history-detail-empty">
        <td colspan="6">등록된 핀번호 상세가 없습니다.</td>
      </tr>
    `;
    return;
  }

  detailItemsBody.innerHTML = items
    .map((item, index) => {
      const statusLabel = formatItemStatus(item.status);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.pin_no || "-")}</td>
          <td>${formatMoney(item.face_value)}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>-</td>
        </tr>
      `;
    })
    .join("");
};

const openPurchaseDetail = async (purchaseId) => {
  const requestId = ++detailRequestId;
  const authContext = window.SEUMBizAuth;
  if (!purchaseId || !authContext?.companyId) return;

  openDetailModal();
  setDetailState("상세내역을 불러오는 중입니다.", "loading");

  const { data, error } = await supabase
    .from("biz_purchase_requests")
    .select(
      `
        id,
        company_id,
        receipt_no,
        giftcard_type,
        giftcard_code,
        giftcard_name_snapshot,
        giftcard_logo_url_snapshot,
        giftcard_rate_snapshot,
        item_count,
        total_face_value,
        applied_rate,
        expected_settlement_amount,
        approved_settlement_amount,
        status,
        admin_memo,
        created_at,
        biz_purchase_items (
          id,
          pin_no,
          face_value,
          status,
          created_at
        )
      `,
    )
    .eq("id", purchaseId)
    .eq("company_id", authContext.companyId)
    .maybeSingle();

  if (requestId !== detailRequestId) return;

  if (error) {
    setDetailState(error.message || "상세내역을 불러오지 못했습니다.", "error");
    return;
  }

  if (!data) {
    setDetailState("확인 가능한 접수 상세내역이 없습니다.", "empty");
    return;
  }

  const giftcardMap = await loadCurrentGiftcardMap([data]);
  const detailRow = normalizeRows(applyGiftcardFallbacks([data], giftcardMap))[0];
  const items = Array.isArray(data.biz_purchase_items)
    ? [...data.biz_purchase_items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : [];

  renderDetailInfo(detailRow);
  renderDetailItems(items);
  showDetailContent();
};

const render = () => {
  renderSummary();
  renderRows();
};

const loadPurchaseSummary = async () => {
  const authContext = window.SEUMBizAuth;
  if (!supabase || !authContext?.companyId) return;

  const { data, error } = await supabase
    .from("biz_purchase_requests")
    .select(
      "id, status, created_at, item_count, expected_settlement_amount, approved_settlement_amount, submitted_settlement_amount",
    )
    .eq("company_id", authContext.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("SEUMBiz history summary load failed", error);
    return;
  }

  state.summaryRows = normalizeRows(data || []);
  renderSummary();
};

const fetchPurchasePage = async () => {
  const requestId = ++historyRequestId;

  if (!supabase) {
    setTableMessage("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  const authContext = window.SEUMBizAuth;
  if (!authContext?.companyId) {
    setTableMessage("업체 인증 정보를 확인하는 중입니다.", "loading");
    return;
  }

  setTableMessage("매입 내역을 불러오는 중입니다.", "loading");

  const from = (state.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await buildPurchaseListQuery().range(from, to);

  if (requestId !== historyRequestId) return;

  if (error) {
    setTableMessage(error.message || "매입 내역을 불러오지 못했습니다.", "error");
    state.pageRows = [];
    state.totalCount = 0;
    renderPagination();
    return;
  }

  state.totalCount = count ?? 0;
  const giftcardMap = await loadCurrentGiftcardMap(data || []);
  state.pageRows = normalizeRows(applyGiftcardFallbacks(data || [], giftcardMap));
  renderRows();
};

const loadPurchaseHistory = async () => {
  state.pageRows = [];
  state.totalCount = 0;
  state.page = 1;
  resetSummary();
  await Promise.all([loadPurchaseSummary(), fetchPurchasePage()]);
};

const resetListFilters = () => {
  state.page = 1;
  fetchPurchasePage();
};

filterChips.forEach((chip) => {
  const status = STATUS_FILTERS[chip.textContent.trim()] || "all";
  chip.dataset.status = status;
  chip.addEventListener("click", () => {
    state.status = status;
    filterChips.forEach((item) => item.classList.toggle("is-active", item === chip));
    resetListFilters();
  });
});

searchInput?.addEventListener("input", (event) => {
  state.query = event.target.value;
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

tableBody?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const detailButton = target?.closest("[data-purchase-detail]");
  const row = target?.closest("tr[data-purchase-id]");
  const purchaseId = detailButton?.dataset.purchaseDetail || row?.dataset.purchaseId;

  if (purchaseId) {
    openPurchaseDetail(purchaseId);
  }
});

detailModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-detail-close]")) {
    closeDetailModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detailModal && !detailModal.hidden) {
    closeDetailModal();
  }
});

periodButton?.addEventListener("click", () => {
  state.period = state.period === "all" ? "30d" : "all";
  periodButton.classList.toggle("is-active", state.period === "30d");
  periodButton.lastChild.textContent = state.period === "30d" ? "최근 30일" : "전체 기간";
  resetListFilters();
});

const initPurchaseHistory = () => {
  if (historyInitialized || !window.SEUMBizAuth?.companyId) return;
  historyInitialized = true;
  loadPurchaseHistory();
};

document.addEventListener("seumbiz:auth-ready", initPurchaseHistory);
initPurchaseHistory();
