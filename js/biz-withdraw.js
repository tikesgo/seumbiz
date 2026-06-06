import { supabase } from "./supabaseClient.js";
import { getSeumBizAdminAssetBaseUrl } from "./biz-assets.js";

const STATUS_LABELS = {
  pending: "출금대기",
  completed: "출금완료",
  rejected: "반려",
  canceled: "취소",
};

const STATUS_BADGE_CLASSES = {
  pending: "biz-badge--waiting",
  completed: "biz-badge--approved",
  rejected: "biz-badge--rejected",
  canceled: "biz-badge--canceled",
};

let currentBalance = 0;
let pendingWithdrawTotal = 0;
let isSubmitting = false;
let pendingWithdrawAmount = 0;
let withdrawRecentRequestId = 0;
let withdrawInitialized = false;

const $ = (selector) => document.querySelector(selector);
const amountInput = $("#withdrawAmount");
const submitButton = $("#withdrawSubmitButton");
const statusElement = $("#withdrawRequestStatus");
const recentList = $("#withdrawRecentList");
const balanceSummary = $(".withdraw-balance-summary strong");
const currentBalanceInline = $("[data-withdraw-current-balance]");
const projectedBalanceInline = $("[data-withdraw-projected-balance]");
const availableAmountInline = $("[data-withdraw-available-amount]");
const availableNote = $("#withdrawAvailableNote");
const negativeBlockedNote = $("#withdrawNegativeBlockedNote");
const alertModal = $("#withdrawAlertModal");
const alertTitle = $("#withdrawAlertTitle");
const alertMessage = $("#withdrawAlertMessage");
const alertDetail = $("#withdrawAlertDetail");
const confirmModal = $("#withdrawConfirmModal");
const confirmNotice = $("#withdrawConfirmNotice");
const confirmDetail = $("#withdrawConfirmDetail");
const confirmSubmitBtn = $("#withdrawConfirmSubmitBtn");

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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setStatus = (message, type = "") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.state = type;
};

const getAvailableWithdrawAmount = () => {
  if (currentBalance < 0) return 0;
  return Math.max(0, currentBalance - pendingWithdrawTotal);
};

const buildAmountDetailHtml = (items) =>
  `<dl>${items
    .map(
      (item) => `
        <div>
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${escapeHtml(item.value)}</dd>
        </div>
      `,
    )
    .join("")}</dl>`;

const openWithdrawAlert = ({ title, message, detail = "" }) => {
  if (!alertModal || !alertTitle || !alertMessage || !alertDetail) {
    setStatus(message, "error");
    return;
  }

  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertDetail.innerHTML = detail;
  alertDetail.hidden = !detail;
  alertModal.hidden = false;
  document.body.classList.add("is-withdraw-alert-open");
};

const closeWithdrawAlert = () => {
  if (!alertModal) return;
  alertModal.hidden = true;
  if (!confirmModal || confirmModal.hidden) {
    document.body.classList.remove("is-withdraw-alert-open");
  }
  amountInput?.focus();
};

const setConfirmSubmitting = (value) => {
  if (!confirmSubmitBtn) return;
  confirmSubmitBtn.disabled = value;
  confirmSubmitBtn.textContent = value ? "처리 중..." : "신청 확정";
};

const setSubmitting = (value) => {
  isSubmitting = value;
  updateWithdrawFormState();
  if (!submitButton) return;
  submitButton.lastChild.textContent = value ? " 출금 신청 중..." : " 출금 신청하기";
};

const getAmount = () => {
  const raw = amountInput?.value.trim().replaceAll(",", "") || "";
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.floor(value);
};

const setAmount = (value) => {
  if (!amountInput) return;
  amountInput.value = String(Math.max(0, Math.floor(Number(value || 0))));
};

const setRecentMessage = (message, type = "empty") => {
  if (!recentList) return;
  recentList.innerHTML = `<p class="withdraw-recent-state withdraw-recent-state--${type}">${escapeHtml(message)}</p>`;
};

const updateWithdrawFormState = () => {
  const isNegativeBalance = currentBalance < 0;
  const availableAmount = getAvailableWithdrawAmount();
  const canSubmit = !isNegativeBalance && availableAmount >= 10000 && !isSubmitting;

  if (negativeBlockedNote) {
    negativeBlockedNote.hidden = !isNegativeBalance;
  }

  if (availableNote) {
    availableNote.hidden = isNegativeBalance || pendingWithdrawTotal <= 0;
  }

  if (availableAmountInline) {
    availableAmountInline.textContent = formatMoney(availableAmount);
  }

  if (amountInput) {
    amountInput.disabled = isNegativeBalance || isSubmitting;
  }

  if (submitButton) {
    submitButton.disabled = !canSubmit;
  }

  document.querySelectorAll("[data-withdraw-amount], [data-withdraw-correct]").forEach((button) => {
    button.disabled = isNegativeBalance || isSubmitting;
  });
};

const updateBalance = () => {
  const authContext = window.SEUMBizAuth;
  currentBalance = Number(authContext?.balanceAmount || 0);
  if (balanceSummary) balanceSummary.textContent = formatMoney(currentBalance);
  if (currentBalanceInline) currentBalanceInline.textContent = formatMoney(currentBalance);
  updateProjectedBalance();
  updateWithdrawFormState();
};

const getWithdrawConfirmDisplay = (amount) => {
  const availableAmount = getAvailableWithdrawAmount();
  return {
    processingType: "출금신청",
    projectedLabel: "출금신청 후 예상 잔액",
    projectedBalance: currentBalance - amount,
    notice: "신청 확정 후 관리자 확인을 거쳐 처리됩니다.",
    availableAmount,
  };
};

const openWithdrawConfirm = (amount) => {
  if (!confirmModal || !confirmNotice || !confirmDetail) return;

  const display = getWithdrawConfirmDisplay(amount);
  pendingWithdrawAmount = amount;

  confirmNotice.textContent = display.notice;
  const detailItems = [
    { label: "현재 업체 잔액", value: formatMoney(currentBalance) },
  ];

  if (pendingWithdrawTotal > 0) {
    detailItems.push(
      { label: "대기 중 출금 합계", value: formatMoney(pendingWithdrawTotal) },
      { label: "출금 가능 금액", value: formatMoney(display.availableAmount) },
    );
  }

  detailItems.push(
    { label: "신청 금액", value: formatMoney(amount) },
    { label: display.projectedLabel, value: formatMoney(display.projectedBalance) },
    { label: "처리 유형", value: display.processingType },
  );

  confirmDetail.innerHTML = buildAmountDetailHtml(detailItems);

  setConfirmSubmitting(false);
  confirmModal.hidden = false;
  document.body.classList.add("is-withdraw-alert-open");
  confirmSubmitBtn?.focus();
};

const closeWithdrawConfirm = () => {
  if (!confirmModal) return;
  confirmModal.hidden = true;
  pendingWithdrawAmount = 0;
  setConfirmSubmitting(false);
  if (!alertModal || alertModal.hidden) {
    document.body.classList.remove("is-withdraw-alert-open");
  }
  amountInput?.focus();
};

const updateProjectedBalance = () => {
  if (!projectedBalanceInline) return;

  if (currentBalance < 0) {
    projectedBalanceInline.textContent = "-";
    projectedBalanceInline.classList.remove("is-negative", "is-positive");
    return;
  }

  const amount = getAmount();
  const hasValidAmount = amount !== null && amount > 0;

  if (!hasValidAmount) {
    projectedBalanceInline.textContent = "-";
    projectedBalanceInline.classList.remove("is-negative", "is-positive");
    return;
  }

  const projectedBalance = currentBalance - amount;
  projectedBalanceInline.textContent = formatMoney(projectedBalance);
  projectedBalanceInline.classList.toggle("is-negative", projectedBalance < 0);
  projectedBalanceInline.classList.toggle("is-positive", projectedBalance > 0);
};

const renderRecentRequests = (rows) => {
  if (!recentList) return;

  if (!rows.length) {
    setRecentMessage("최근 출금 신청 내역이 없습니다.");
    return;
  }

  recentList.innerHTML = rows
    .map((row) => {
      const label = STATUS_LABELS[row.status] || row.status || "-";
      const badgeClass = STATUS_BADGE_CLASSES[row.status] || "biz-badge--canceled";
      const memo = row.memo || row.admin_memo || "카카오톡 확인 예정";
      return `
        <article class="withdraw-recent-item">
          <div>
            <strong>${formatMoney(row.amount)}</strong>
            <small>${escapeHtml(memo)}</small>
          </div>
          <div>
            <span class="biz-badge ${badgeClass}">${escapeHtml(label)}</span>
            <time>${formatDateTime(row.created_at)}</time>
          </div>
        </article>
      `;
    })
    .join("");
};

const loadPendingWithdrawTotal = async () => {
  const authContext = window.SEUMBizAuth;
  if (!supabase || !authContext?.companyId) {
    pendingWithdrawTotal = 0;
    updateWithdrawFormState();
    return;
  }

  const { data, error } = await supabase
    .from("biz_withdraw_requests")
    .select("amount")
    .eq("company_id", authContext.companyId)
    .eq("status", "pending");

  pendingWithdrawTotal = error
    ? 0
    : (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

  updateProjectedBalance();
  updateWithdrawFormState();
};

const loadRecentRequests = async () => {
  const requestId = ++withdrawRecentRequestId;

  if (!supabase) {
    setRecentMessage("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  const authContext = window.SEUMBizAuth;
  if (!authContext?.companyId) {
    setRecentMessage("업체 인증 정보를 확인하는 중입니다.", "loading");
    return;
  }

  setRecentMessage("최근 출금 신청 내역을 불러오는 중입니다.", "loading");

  const { data, error } = await supabase
    .from("biz_withdraw_requests")
    .select("id, amount, status, memo, admin_memo, created_at")
    .eq("company_id", authContext.companyId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (requestId !== withdrawRecentRequestId) return;

  if (error) {
    setRecentMessage(error.message || "최근 출금 신청 내역을 불러오지 못했습니다.", "error");
    return;
  }

  renderRecentRequests(data || []);
};

const notifyWithdrawRequestTelegram = async (row) => {
  const withdrawRequestId = row?.withdraw_request_id || row?.id || "";
  if (!withdrawRequestId) return;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;

    await fetch(`${getSeumBizAdminAssetBaseUrl()}/api/seumbiz/telegram/withdraw-request`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        withdraw_request_id: withdrawRequestId,
      }),
    });
  } catch (error) {
    console.warn("SEUMBiz Telegram withdraw notification skipped", error);
  }
};

const validateAmount = (amount) => {
  if (currentBalance < 0) {
    return {
      title: "출금 신청 불가",
      message: "선지급금(마이너스 잔액) 상태에서는 출금 신청할 수 없습니다. 매입 승인 시 자동으로 상계됩니다.",
    };
  }

  if (!amount || amount <= 0) {
    return {
      title: "출금 금액 확인",
      message: "출금 신청할 금액을 입력해주세요.",
    };
  }

  if (amount < 10000) {
    return {
      title: "출금 신청 불가",
      message: "최소 출금 가능 금액은 10,000원입니다.",
    };
  }

  const availableAmount = getAvailableWithdrawAmount();
  if (amount > availableAmount) {
    const detailItems = [{ label: "현재 잔액", value: formatMoney(currentBalance) }];
    if (pendingWithdrawTotal > 0) {
      detailItems.push(
        { label: "대기 중 출금 합계", value: formatMoney(pendingWithdrawTotal) },
        { label: "출금 가능 금액", value: formatMoney(availableAmount) },
      );
    }

    return {
      title: "출금 신청 불가",
      message: "신청 금액이 출금 가능 금액을 초과했습니다.",
      detail: buildAmountDetailHtml(detailItems),
    };
  }

  return null;
};

const submitWithdrawRequest = async (amount) => {
  if (isSubmitting || !amount) return;

  if (!supabase) {
    setStatus("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  setSubmitting(true);
  setConfirmSubmitting(true);
  setStatus("출금 신청을 등록하고 있습니다.", "");

  try {
    const { data, error } = await supabase.rpc("create_withdraw_request", {
      p_amount: amount,
      p_memo: "업체 잔액 출금 신청",
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    void notifyWithdrawRequestTelegram(row);
    closeWithdrawConfirm();
    setStatus(`출금 신청이 접수되었습니다. 신청 금액: ${formatMoney(row?.amount || amount)}`, "ok");
    if (amountInput) amountInput.value = "";
    await loadPendingWithdrawTotal();
    updateProjectedBalance();
    await loadRecentRequests();
  } catch (error) {
    closeWithdrawConfirm();
    setStatus(error.message || "출금 신청 등록에 실패했습니다.", "error");
  } finally {
    setSubmitting(false);
    setConfirmSubmitting(false);
  }
};

const handleSubmit = async () => {
  if (isSubmitting) return;
  if (confirmModal && !confirmModal.hidden) return;

  const amount = getAmount();
  const validationError = validateAmount(amount);

  if (validationError) {
    setStatus("", "");
    openWithdrawAlert(validationError);
    return;
  }

  openWithdrawConfirm(amount);
};

const handleConfirmSubmit = async () => {
  if (isSubmitting || !pendingWithdrawAmount) return;
  await submitWithdrawRequest(pendingWithdrawAmount);
};

document.addEventListener("click", (event) => {
  const amountButton = event.target.closest("[data-withdraw-amount]");
  if (amountButton) {
    if (currentBalance < 0 || amountButton.disabled) return;
    setAmount((getAmount() || 0) + Number(amountButton.dataset.withdrawAmount || 0));
    updateProjectedBalance();
    setStatus("", "");
    return;
  }

  const correctButton = event.target.closest("[data-withdraw-correct]");
  if (correctButton) {
    if (currentBalance < 0 || correctButton.disabled) return;
    if (amountInput) amountInput.value = "";
    updateProjectedBalance();
    setStatus("", "");
    amountInput?.focus();
    return;
  }
});

amountInput?.addEventListener("input", () => {
  updateProjectedBalance();
  setStatus("", "");
});
submitButton?.addEventListener("click", handleSubmit);
confirmSubmitBtn?.addEventListener("click", handleConfirmSubmit);

alertModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-withdraw-alert-close]")) {
    closeWithdrawAlert();
  }
});

confirmModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-withdraw-confirm-close]")) {
    closeWithdrawConfirm();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (confirmModal && !confirmModal.hidden) {
    closeWithdrawConfirm();
    return;
  }

  if (alertModal && !alertModal.hidden) {
    closeWithdrawAlert();
  }
});

const initWithdraw = async () => {
  if (withdrawInitialized || !window.SEUMBizAuth?.companyId) return;
  withdrawInitialized = true;
  updateBalance();
  await loadPendingWithdrawTotal();
  await loadRecentRequests();
};

document.addEventListener("seumbiz:auth-ready", initWithdraw);
initWithdraw();
