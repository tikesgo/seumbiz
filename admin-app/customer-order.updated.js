import { supabase } from "./supabaseClient.js";

const ADMIN_API_BASE = "http://localhost:4173";

const lookupForm = document.querySelector("#lookupForm");
const lookupPhone = document.querySelector("#lookupPhone");
const lookupHolder = document.querySelector("#lookupHolder");
const lookupMessage = document.querySelector("#lookupMessage");
const lookupResult = document.querySelector("#lookupResult");

const formatWon = (value) => `${value.toLocaleString("ko-KR")}원`;
const normalizePhone = (value) => value.replace(/\D/g, "");
const normalizeName = (value) => value.replace(/\s/g, "").toLowerCase();

const formatDate = (value) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeOrder = (order) => ({
  receiptNo: order.receipt_no || order.receiptNo || "-",
  accountHolder: order.account_holder || order.accountHolder || "",
  totalAmount: order.total_amount || order.totalAmount || 0,
  status: order.status || "접수완료",
  requestedAt: order.requested_at || order.requestedAt || order.created_at,
  items: order.items || [],
});

const getOrdersByPhone = async (phone) => {
  const response = await fetch(`${ADMIN_API_BASE}/api/orders?phone=${encodeURIComponent(phone)}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Order lookup failed");
  }

  return (result.orders || [])
    .map(normalizeOrder)
    .sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
};

const showMessage = (message) => {
  lookupMessage.textContent = message;
  lookupMessage.hidden = false;
  lookupResult.hidden = true;
};

const renderResults = (receipts) => {
  lookupMessage.hidden = true;
  lookupResult.hidden = false;

  const cards = receipts
    .map((receipt) => {
      const giftSummary = receipt.items.map((item) => item.productName || item.product_name || item.name).join(", ");
      return `
        <article class="lookup-result-card">
          <div class="lookup-result-head">
            <div>
              <strong>조회 결과</strong>
              <small>접수번호 ${receipt.receiptNo}</small>
            </div>
            <span class="status-chip">${receipt.status}</span>
          </div>
          <dl class="lookup-result-list">
            <div>
              <dt>상품권 종류</dt>
              <dd>${giftSummary}</dd>
            </div>
            <div>
              <dt>신청 금액</dt>
              <dd>${formatWon(receipt.totalAmount)}</dd>
            </div>
            <div>
              <dt>신청 시간</dt>
              <dd>${formatDate(receipt.requestedAt)}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>${receipt.status}</dd>
            </div>
          </dl>
        </article>
      `;
    })
    .join("");

  lookupResult.innerHTML = `
    <div class="lookup-result-head">
      <strong>최근 접수 내역 ${receipts.length}건</strong>
      <span class="status-chip">최신순</span>
    </div>
    <div class="lookup-result-stack">${cards}</div>
  `;
};

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = normalizePhone(lookupPhone.value);
  const holder = normalizeName(lookupHolder.value);

  if (!phone || !holder) {
    showMessage("휴대폰 번호와 예금주명을 모두 입력해주세요.");
    return;
  }

  if (phone.length < 10) {
    showMessage("휴대폰 번호를 정확히 입력해주세요.");
    return;
  }

  let receipts = [];
  try {
   const normalizedHolder = normalizeName(holder);

receipts = (await getOrdersByPhone(normalizePhone(phone))).filter((receipt) =>
  normalizeName(receipt.accountHolder || receipt.account_holder || "") === normalizedHolder
);
  } catch (error) {
    console.error(error);
    showMessage("접수 내역 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  if (receipts.length === 0) {
    showMessage("입력한 휴대폰 번호와 예금주명으로 저장된 접수 내역이 없습니다.");
    return;
  }

  renderResults(receipts);
});

