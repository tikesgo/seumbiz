import { supabase } from "./supabaseClient.js";

const todayAmountElement = document.querySelector("[data-dashboard-today-amount]");
const pendingWithdrawElement = document.querySelector("[data-dashboard-withdraw-pending]");
const purchaseList = document.querySelector("[data-dashboard-purchases]");
const ledgerList = document.querySelector("[data-dashboard-ledger]");

let dashboardRequestId = 0;
let dashboardInitialized = false;

const LEDGER_LABELS = {
  purchase_approved: "매입 승인",
  withdraw_completed: "출금 완료",
  manual_credit: "관리자 수동 적립",
  manual_debit: "관리자 수동 차감",
  manual_adjust: "관리자 조정",
  admin_deduct: "관리자 차감",
  admin_advance: "관리자 선지급",
  admin_restore: "복구",
};

const formatNumber = (value) => Number(value || 0).toLocaleString("ko-KR");
const formatMoney = (value) => `${formatNumber(value)}원`;

const formatShortDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}.${day} ${hours}:${minutes}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setMetricLoading = () => {
  if (todayAmountElement) todayAmountElement.textContent = "-";
  if (pendingWithdrawElement) pendingWithdrawElement.textContent = "-";
};

const setListState = (element, message, state = "loading") => {
  if (!element) return;
  element.innerHTML = `<li class="dashboard-state-item dashboard-state-item--${state}">${escapeHtml(message)}</li>`;
};

const getBrandInitial = (giftcardType) => {
  const text = String(giftcardType || "").trim();
  return text.charAt(0).toUpperCase() || "-";
};

const getSettlementAmount = (row) =>
  Number(row.approved_settlement_amount ?? row.expected_settlement_amount ?? 0);

const renderPurchases = (rows) => {
  if (!purchaseList) return;

  if (!rows.length) {
    setListState(purchaseList, "최근 매입 신청 내역이 없습니다.", "empty");
    return;
  }

  purchaseList.innerHTML = rows
    .slice(0, 5)
    .map(
      (row) => `
        <li>
          <span class="dashboard-brand-mark" aria-hidden="true">${escapeHtml(getBrandInitial(row.giftcard_type))}</span>
          <div>
            <strong>${escapeHtml(row.receipt_no || "-")}</strong>
            <p>${escapeHtml(row.giftcard_type || "-")} · ${formatNumber(row.item_count)}건</p>
          </div>
          <span class="dashboard-list-meta"><b>${formatMoney(getSettlementAmount(row))}</b><small>${formatShortDateTime(row.created_at)}</small></span>
        </li>
      `,
    )
    .join("");
};

const renderLedger = (rows) => {
  if (!ledgerList) return;

  if (!rows.length) {
    setListState(ledgerList, "최근 잔액 활동이 없습니다.", "empty");
    return;
  }

  ledgerList.innerHTML = rows
    .slice(0, 5)
    .map((row) => {
      const amount = Number(row.amount || 0);
      const isPositive = amount > 0;
      const iconClass = isPositive ? "activity-plus" : "activity-minus";
      const icon = isPositive ? "↑" : "↓";
      const label = LEDGER_LABELS[row.ledger_type] || row.ledger_type || "잔액 활동";
      const memo = row.memo || row.reason || "원장 기록";

      return `
        <li>
          <span class="dashboard-activity-icon ${iconClass}" aria-hidden="true">${icon}</span>
          <div>
            <strong>${escapeHtml(label)}</strong>
            <p>${escapeHtml(memo)} · ${formatShortDateTime(row.created_at)}</p>
          </div>
          <span class="dashboard-activity-amount ${isPositive ? "positive" : ""}"><b>${isPositive ? "+" : ""}${formatMoney(amount)}</b><small>원장 기준</small></span>
        </li>
      `;
    })
    .join("");
};

const loadDashboard = async () => {
  const requestId = ++dashboardRequestId;
  const authContext = window.SEUMBizAuth;

  if (!supabase || !authContext?.companyId) {
    setMetricLoading();
    setListState(purchaseList, "업체 정보를 확인하는 중입니다.", "loading");
    setListState(ledgerList, "업체 정보를 확인하는 중입니다.", "loading");
    return;
  }

  setMetricLoading();
  setListState(purchaseList, "최근 매입 신청을 불러오는 중입니다.", "loading");
  setListState(ledgerList, "최근 잔액 활동을 불러오는 중입니다.", "loading");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayIso = today.toISOString();

  const [purchaseResult, todayPurchaseResult, ledgerResult, withdrawResult] = await Promise.all([
    supabase
      .from("biz_purchase_requests")
      .select("id, receipt_no, giftcard_type, item_count, total_face_value, expected_settlement_amount, approved_settlement_amount, created_at")
      .eq("company_id", authContext.companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("biz_purchase_requests")
      .select("id, total_face_value, created_at")
      .eq("company_id", authContext.companyId)
      .gte("created_at", todayIso),
    supabase
      .from("biz_balance_ledger")
      .select("id, amount, ledger_type, reason, memo, created_at")
      .eq("company_id", authContext.companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("biz_withdraw_requests")
      .select("id, amount, status, created_at")
      .eq("company_id", authContext.companyId)
      .order("created_at", { ascending: false }),
  ]);

  if (requestId !== dashboardRequestId) return;

  if (purchaseResult.error) {
    console.error("[SEUMBiz dashboard] purchase requests load failed:", purchaseResult.error);
    setListState(purchaseList, "최근 매입 신청을 불러오지 못했습니다.", "error");
  } else {
    const purchases = purchaseResult.data || [];
    if (todayPurchaseResult.error) {
      if (todayAmountElement) todayAmountElement.textContent = "-";
    } else {
      const todayRows = todayPurchaseResult.data || [];
      const todayAmount = todayRows.reduce((sum, row) => sum + Number(row.total_face_value || 0), 0);
      if (todayAmountElement) todayAmountElement.textContent = formatMoney(todayAmount);
    }
    renderPurchases(purchases);
  }

  if (ledgerResult.error) {
    setListState(ledgerList, ledgerResult.error.message || "최근 잔액 활동을 불러오지 못했습니다.", "error");
  } else {
    renderLedger(ledgerResult.data || []);
  }

  if (withdrawResult.error) {
    if (pendingWithdrawElement) pendingWithdrawElement.textContent = "-";
  } else {
    const pendingAmount = (withdrawResult.data || [])
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (pendingWithdrawElement) pendingWithdrawElement.textContent = formatMoney(pendingAmount);
  }
};

const initDashboard = () => {
  if (dashboardInitialized || !window.SEUMBizAuth?.companyId) return;
  dashboardInitialized = true;
  loadDashboard();
};

document.addEventListener("seumbiz:auth-ready", initDashboard);
initDashboard();
