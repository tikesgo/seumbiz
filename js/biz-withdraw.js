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
let isSubmitting = false;
let withdrawRecentRequestId = 0;
let withdrawInitialized = false;

const $ = (selector) => document.querySelector(selector);
const amountInput = $("#withdrawAmount");
const submitButton = $("#withdrawSubmitButton");
const statusElement = $("#withdrawRequestStatus");
const recentList = $("#withdrawRecentList");
const balanceSummary = $(".withdraw-balance-summary strong");
const currentBalanceInline = $("[data-withdraw-current-balance]");
const alertModal = $("#withdrawAlertModal");
const alertTitle = $("#withdrawAlertTitle");
const alertMessage = $("#withdrawAlertMessage");
const alertDetail = $("#withdrawAlertDetail");

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
  document.body.classList.remove("is-withdraw-alert-open");
  amountInput?.focus();
};

const setSubmitting = (value) => {
  isSubmitting = value;
  if (!submitButton) return;
  submitButton.disabled = value;
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

const updateBalance = () => {
  const authContext = window.SEUMBizAuth;
  currentBalance = Number(authContext?.balanceAmount || 0);
  if (balanceSummary) balanceSummary.textContent = formatMoney(currentBalance);
  if (currentBalanceInline) currentBalanceInline.textContent = formatMoney(currentBalance);
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

  if (amount > currentBalance) {
    return {
      title: "출금 신청 불가",
      message: "현재 업체 잔액보다 큰 금액은 출금 신청할 수 없습니다.",
      detail: `
        <dl>
          <div><dt>현재 잔액</dt><dd>${formatMoney(currentBalance)}</dd></div>
          <div><dt>신청 금액</dt><dd>${formatMoney(amount)}</dd></div>
        </dl>
      `,
    };
  }

  return null;
};

const handleSubmit = async () => {
  if (isSubmitting) return;

  if (!supabase) {
    setStatus("Supabase 연결 설정을 확인해주세요.", "error");
    return;
  }

  const amount = getAmount();
  const validationError = validateAmount(amount);

  if (validationError) {
    setStatus("", "");
    openWithdrawAlert(validationError);
    return;
  }

  setSubmitting(true);
  setStatus("출금 신청을 등록하고 있습니다.", "");

  try {
    const { data, error } = await supabase.rpc("create_withdraw_request", {
      p_amount: amount,
      p_memo: "업체 잔액 출금 신청",
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    void notifyWithdrawRequestTelegram(row);
    setStatus(`출금 신청이 접수되었습니다. 신청 금액: ${formatMoney(row?.amount || amount)}`, "ok");
    if (amountInput) amountInput.value = "";
    await loadRecentRequests();
  } catch (error) {
    setStatus(error.message || "출금 신청 등록에 실패했습니다.", "error");
  } finally {
    setSubmitting(false);
  }
};

document.addEventListener("click", (event) => {
  const amountButton = event.target.closest("[data-withdraw-amount]");
  if (amountButton) {
    setAmount((getAmount() || 0) + Number(amountButton.dataset.withdrawAmount || 0));
    setStatus("", "");
    return;
  }

  const correctButton = event.target.closest("[data-withdraw-correct]");
  if (correctButton) {
    if (amountInput) amountInput.value = "";
    setStatus("", "");
    amountInput?.focus();
    return;
  }

});

amountInput?.addEventListener("input", () => setStatus("", ""));
submitButton?.addEventListener("click", handleSubmit);

alertModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-withdraw-alert-close]")) {
    closeWithdrawAlert();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && alertModal && !alertModal.hidden) {
    closeWithdrawAlert();
  }
});

const initWithdraw = () => {
  if (withdrawInitialized || !window.SEUMBizAuth?.companyId) return;
  withdrawInitialized = true;
  updateBalance();
  loadRecentRequests();
};

document.addEventListener("seumbiz:auth-ready", initWithdraw);
initWithdraw();
