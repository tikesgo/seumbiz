import { hasSupabaseConfig, supabase } from "./supabaseClient.js";
import { createProductLogo } from "./product-logo.js";

const productList = document.querySelector("[data-bulk-product-list]");
const pinTextInput = document.querySelector("[data-bulk-pin-text]");
const clearPinsButton = document.querySelector("[data-clear-pins]");
const extractPinsButton = document.querySelector("[data-extract-pins]");
const summary = document.querySelector("[data-bulk-summary]");
const previewBody = document.querySelector("[data-bulk-preview-body]");
const form = document.querySelector("[data-bulk-form]");
const message = document.querySelector("[data-bulk-submit-message]");
const submitButton = document.querySelector(".bulk-submit-button");
const customerNameInput = document.querySelector("#customerName");
const customerPhoneInput = document.querySelector("#customerPhone");
const bankNameInput = document.querySelector("#bankName");
const accountNumberInput = document.querySelector("#accountNumber");
const accountHolderInput = document.querySelector("#accountHolder");
const memoInput = document.querySelector("#bulkMemo");

let selectedGiftCard = null;
let extractedPins = [];
let isSubmitting = false;

const formatPin = (pinCode) => pinCode.replace(/(\d{4})(?=\d)/g, "$1-");
const formatMoney = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;
const onlyPhoneChars = (value) => value.replace(/[^\d-]/g, "");

const createReceiptNo = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `SG${date}-${time}`;
};

const setMessage = (text, type = "error") => {
  if (!message) return;
  message.hidden = !text;
  message.textContent = text;
  message.classList.toggle("is-info", type === "info");
  message.classList.toggle("is-success", type === "success");
  message.classList.toggle("is-error", type === "error");
};

const renderProductMessage = (text, type = "info") => {
  if (!productList) return;
  const paragraph = document.createElement("p");
  paragraph.className = `bulk-message${type === "error" ? " is-error" : ""}`;
  paragraph.textContent = text;
  productList.replaceChildren(paragraph);
};

const sortGiftCards = (cards) =>
  [...cards].sort((a, b) => {
    const aOrder = Number(a.sort_order);
    const bOrder = Number(b.sort_order);
    const hasAOrder = Number.isFinite(aOrder);
    const hasBOrder = Number.isFinite(bOrder);

    if (hasAOrder && hasBOrder && aOrder !== bOrder) return aOrder - bOrder;
    if (hasAOrder !== hasBOrder) return hasAOrder ? -1 : 1;
    return String(a.name || "").localeCompare(String(b.name || ""), "ko-KR");
  });

const createProductButton = (card) => {
  const button = document.createElement("button");
  button.className = "bulk-product-button";
  button.type = "button";
  button.dataset.giftCardId = card.id;
  button.setAttribute("aria-pressed", "false");

  button.append(
    createProductLogo({
      imageUrl: card.image_url,
      name: card.name || "상품권",
      className: "bulk-product-logo",
    }),
  );

  const name = document.createElement("span");
  name.textContent = card.name || "상품권";
  button.append(name);

  button.addEventListener("click", () => {
    selectedGiftCard = card;
    productList.querySelectorAll(".bulk-product-button").forEach((item) => {
      const isSelected = item.dataset.giftCardId === String(card.id);
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });
    setMessage("");
  });

  return button;
};

const loadGiftCards = async () => {
  if (!productList) return;
  renderProductMessage("상품권을 불러오는 중입니다.");

  if (!hasSupabaseConfig || !supabase) {
    renderProductMessage("Supabase 환경변수가 설정되지 않았습니다.", "error");
    return;
  }

  try {
    const { data, error } = await supabase.from("gift_cards").select("id, name, image_url, is_active, sort_order");
    if (error) throw error;

    const activeCards = Array.isArray(data) ? data.filter((card) => card?.is_active === true) : [];
    if (!activeCards.length) {
      renderProductMessage("선택 가능한 상품권이 없습니다.");
      return;
    }

    productList.replaceChildren(...sortGiftCards(activeCards).map(createProductButton));
  } catch (error) {
    console.error("[bulk] gift_cards load failed:", error);
    renderProductMessage(error?.message || "상품권 목록을 불러오지 못했습니다.", "error");
  }
};

const parseBulkAmount = (value) => {
  const normalized = String(value || "").replace(/,/g, "").trim();
  if (!normalized) return 0;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return amount < 10000 ? amount * 10000 : amount;
};

const findAmountAfterPin = (line, pinMatch) => {
  const tail = line.slice((pinMatch.index || 0) + pinMatch[0].length);
  const amountMatch = tail.match(/(?:\d{1,3}(?:,\d{3})+|\d+)/);
  return parseBulkAmount(amountMatch?.[0]);
};

const extractPinCodes = (text) => {
  const lines = String(text || "").split(/\r?\n/);
  const pinPattern = /(?<!\d)(\d{16}|\d{4}[\s-]+\d{4}[\s-]+\d{4}[\s-]+\d{4})(?!\d)/;
  const matches = lines
    .map((line) => {
      const pinMatch = line.match(pinPattern);
      if (!pinMatch) return null;

      return {
        pinCode: pinMatch[0].replace(/\D/g, ""),
        amount: findAmountAfterPin(line, pinMatch),
      };
    })
    .filter(Boolean);
  const seen = new Set();

  return matches
    .filter((item) => item.pinCode.length === 16)
    .map((item) => {
      const isDuplicate = seen.has(item.pinCode);
      seen.add(item.pinCode);
      return {
        pinCode: item.pinCode,
        amount: item.amount,
        status: isDuplicate ? "duplicate" : "normal",
        isDuplicate,
      };
    });
};

const getPinStatusLabel = (item) => (item.isDuplicate || item.status === "duplicate" ? "중복" : "정상");

const renderSummary = () => {
  if (!summary) return;
  const total = extractedPins.length;
  const duplicates = extractedPins.filter((item) => item.isDuplicate).length;
  const normal = total - duplicates;
  const totalAmount = extractedPins
    .filter((item) => !item.isDuplicate)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  summary.replaceChildren(
    createSummaryItem(`\uCD1D \uCD94\uCD9C ${total}\uC7A5`),
    createSummaryItem(`\uC815\uC0C1 ${normal}\uC7A5`),
    createSummaryItem(`\uC911\uBCF5 ${duplicates}\uC7A5`),
    createSummaryItem(`\uCD1D \uAE08\uC561 ${formatMoney(totalAmount)}`),
  );
};

const createSummaryItem = (text) => {
  const item = document.createElement("span");
  item.textContent = text;
  return item;
};

const renderPreview = () => {
  if (!previewBody) return;
  renderSummary();

  if (!extractedPins.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "핀번호를 추출하면 결과가 표시됩니다.";
    row.append(cell);
    previewBody.replaceChildren(row);
    return;
  }

  const rows = extractedPins.map((item, index) => {
    const row = document.createElement("tr");
    row.className = item.isDuplicate ? "bulk-preview-row-duplicate" : "";

    const number = document.createElement("td");
    number.textContent = String(index + 1);
    const pin = document.createElement("td");
    pin.textContent = formatPin(item.pinCode);
    const amount = document.createElement("td");
    amount.textContent = item.amount ? formatMoney(item.amount) : "-";
    const status = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `bulk-status ${item.isDuplicate ? "bulk-status-duplicate" : "bulk-status-normal"}`;
    statusBadge.textContent = getPinStatusLabel(item);
    status.append(statusBadge);

    row.append(number, pin, amount, status);
    return row;
  });

  previewBody.replaceChildren(...rows);
};

const getValidPins = () => extractedPins.filter((item) => !item.isDuplicate);

const getCustomerData = () => ({
  customerName: String(customerNameInput?.value || "").trim(),
  customerPhone: String(customerPhoneInput?.value || "").trim(),
  bankName: String(bankNameInput?.value || "").trim(),
  accountNumber: String(accountNumberInput?.value || "").trim(),
  accountHolder: String(accountHolderInput?.value || "").trim(),
  memo: String(memoInput?.value || "").trim(),
});

const getMissingFields = () => {
  const data = getCustomerData();
  const labels = {
    customerName: "이름",
    customerPhone: "연락처",
    bankName: "은행",
    accountNumber: "계좌번호",
    accountHolder: "예금주",
  };

  return Object.entries(labels)
    .filter(([key]) => !data[key])
    .map(([, label]) => label);
};

const createBulkItems = () => {
  const customerData = getCustomerData();
  return getValidPins().map((item, index) => ({
    index: index + 1,
    giftCardId: selectedGiftCard.id,
    name: selectedGiftCard.name || "상품권",
    pin: item.pinCode,
    pinCode: item.pinCode,
    amount: Number(item.amount || 0),
    status: "normal",
    image_url: selectedGiftCard.image_url || "",
    orderType: "bulk",
    memo: customerData.memo,
  }));
};

const createBulkOrderPayload = () => {
  const customerData = getCustomerData();
  const bulkItems = createBulkItems();
  const totalAmount = bulkItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    customer_name: customerData.customerName,
    phone: customerData.customerPhone,
    bank_name: customerData.bankName,
    account_number: customerData.accountNumber,
    account_holder: customerData.accountHolder,
    order_type: "bulk",
    bulk_items: bulkItems,
    items: bulkItems,
    total_amount: totalAmount,
    status: "접수완료",
    requested_at: new Date().toISOString(),
    receipt_no: createReceiptNo(),
  };
};

clearPinsButton?.addEventListener("click", () => {
  if (pinTextInput) pinTextInput.value = "";
  extractedPins = [];
  renderPreview();
  setMessage("");
});

extractPinsButton?.addEventListener("click", () => {
  extractedPins = extractPinCodes(pinTextInput?.value || "");
  renderPreview();
  setMessage(extractedPins.length ? "" : "추출된 16자리 핀번호가 없습니다.");
});

form?.addEventListener("input", (event) => {
  if (event.target.matches("#customerPhone, #accountNumber")) {
    event.target.value = onlyPhoneChars(event.target.value);
  }
  setMessage("");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  if (!selectedGiftCard) {
    setMessage("상품권 종류를 선택해주세요.");
    return;
  }

  if (!extractedPins.length) {
    setMessage("핀번호를 먼저 추출해주세요.");
    return;
  }

  const validPins = getValidPins();
  if (!validPins.length) {
    setMessage("정상 핀번호가 없습니다. 중복을 제외하고 다시 확인해주세요.");
    return;
  }

  const missingFields = getMissingFields();
  if (missingFields.length) {
    setMessage(`${missingFields.join(", ")} 입력이 필요합니다.`);
    return;
  }

  if (!supabase) {
    setMessage("Supabase 환경변수가 설정되지 않았습니다.");
    return;
  }

  const payload = createBulkOrderPayload();
  console.log("[bulk orders] insert payload:", payload);

  isSubmitting = true;
  if (submitButton) submitButton.disabled = true;
  setMessage("대량매입 접수를 저장하는 중입니다.", "info");

  try {
    const { data, error } = await supabase.from("orders").insert(payload).select("id, receipt_no").single();
    if (error) throw error;

    console.log("[bulk orders] inserted:", data);
    setMessage(`대량매입 접수가 완료되었습니다. 접수번호: ${data.receipt_no || payload.receipt_no}`, "success");
    form.reset();
    selectedGiftCard = null;
    extractedPins = [];
    renderPreview();
    productList?.querySelectorAll(".bulk-product-button").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  } catch (error) {
    console.error("[bulk orders] insert failed:", error);
    setMessage(error?.message || "대량매입 접수 저장에 실패했습니다.");
  } finally {
    isSubmitting = false;
    if (submitButton) submitButton.disabled = false;
  }
});

renderPreview();
loadGiftCards();
