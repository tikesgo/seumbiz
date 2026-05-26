import { hasSupabaseConfig, supabase } from "./supabaseClient.js";
import { createProductLogo } from "./product-logo.js";

const giftCardList = document.querySelector("#giftCardList");
const detailPanel = document.querySelector("[data-detail-panel]");
const customerForm = document.querySelector("[data-customer-form]");
const submitMessage = document.querySelector("[data-submit-message]");
const finalSubmitButton = document.querySelector(".final-submit-button");
const customerNameInput = document.querySelector("#customerName");
const customerPhoneInput = document.querySelector("#customerPhone");
const bankNameInput = document.querySelector("#bankName");
const accountNumberInput = document.querySelector("#accountNumber");
const accountHolderInput = document.querySelector("#accountHolder");
const completeModal = document.querySelector("[data-complete-modal]");
const completeReceipt = document.querySelector("[data-complete-receipt]");
const copyReceiptButton = document.querySelector("[data-copy-receipt]");
const completeModalCloseButtons = [...document.querySelectorAll("[data-complete-modal-close]")];
let selectedGiftCardId = null;
let selectedGiftCard = null;
let selectedAmount = null;
const registeredGiftCards = [];
let isSubmittingOrder = false;
let latestReceiptNo = "";

const amountOptions = [10000, 30000, 50000, 100000, 300000, 500000];

const renderMessage = (message, type = "info") => {
  if (!giftCardList) return;

  const paragraph = document.createElement("p");
  paragraph.className = `gift-card-message${type === "error" ? " is-error" : ""}`;
  paragraph.textContent = message;
  giftCardList.replaceChildren(paragraph);
};

const formatWon = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;

const onlyPhoneChars = (value) => value.replace(/[^\d-]/g, "");

const createReceiptNo = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `SG${date}-${time}`;
};

const getRateLabel = (card) => {
  const rate = card?.rate ?? card?.purchase_rate;
  if (rate === undefined || rate === null || rate === "") return "매입률 확인중";
  return `매입률 ${rate}%`;
};

const normalizeAmountOption = (option) => {
  const value = typeof option === "number" ? option : Number(option?.value ?? option?.amount ?? option);
  return Number.isFinite(value) ? value : null;
};

const getAmountOptions = (card) => {
  const cardOptions = Array.isArray(card?.amount_options) ? card.amount_options.map(normalizeAmountOption).filter(Boolean) : [];
  return [...new Set([...amountOptions, ...cardOptions])].sort((a, b) => a - b);
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

const createGiftCardButton = (card) => {
  const button = document.createElement("button");
  button.className = "gift-card-button";
  button.type = "button";
  button.dataset.giftCardId = card.id;
  button.setAttribute("aria-pressed", "false");

  button.append(
    createProductLogo({
      imageUrl: card.image_url,
      name: card.name || "상품권",
      className: "gift-card-logo",
    }),
  );

  const name = document.createElement("span");
  name.textContent = card.name || "상품권";
  button.append(name);

  button.addEventListener("click", () => {
    selectedGiftCardId = card.id;
    selectedGiftCard = card;
    selectedAmount = null;
    console.log("[gift_cards] selectedGiftCard:", selectedGiftCard);
    giftCardList.querySelectorAll(".gift-card-button").forEach((item) => {
      const isSelected = item.dataset.giftCardId === String(selectedGiftCardId);
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });
    renderGiftDetail();
  });

  return button;
};

const createPinInput = (index) => {
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.maxLength = 4;
  input.placeholder = "4자리";
  input.dataset.pinIndex = String(index);
  input.setAttribute("aria-label", `핀번호 ${index + 1}번째 4자리`);
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    if (input.value.length === 4) {
      const next = detailPanel.querySelector(`[data-pin-index="${index + 1}"]`);
      if (next) next.focus();
    }
  });
  return input;
};

const getPinValues = () => [...detailPanel.querySelectorAll("[data-pin-index]")].map((input) => input.value.trim());

const getPinCode = () => getPinValues().join("");

const getCustomerFormData = () => {
  return {
    customerName: String(customerNameInput?.value || "").trim(),
    customerPhone: String(customerPhoneInput?.value || "").trim(),
    bankName: String(bankNameInput?.value || "").trim(),
    accountNumber: String(accountNumberInput?.value || "").trim(),
    accountHolder: String(accountHolderInput?.value || "").trim(),
  };
};

const logCustomerInputValues = () => {
  console.log("[orders] customerNameInput.value:", customerNameInput?.value || "");
  console.log("[orders] customerPhoneInput.value:", customerPhoneInput?.value || "");
  console.log("[orders] bankNameInput.value:", bankNameInput?.value || "");
  console.log("[orders] accountNumberInput.value:", accountNumberInput?.value || "");
  console.log("[orders] accountHolderInput.value:", accountHolderInput?.value || "");
};

const getTotalAmount = () => registeredGiftCards.reduce((sum, item) => sum + item.amount, 0);

const getMissingCustomerFields = () => {
  const data = getCustomerFormData();
  const labels = {
    customerName: "이름",
    customerPhone: "연락처",
    bankName: "입금은행",
    accountNumber: "계좌번호",
    accountHolder: "예금주",
  };

  return Object.entries(data)
    .filter(([, value]) => !value)
    .map(([key]) => labels[key]);
};

const openCompleteModal = (receiptNo) => {
  if (!completeModal) return;
  latestReceiptNo = receiptNo;
  if (completeReceipt) completeReceipt.textContent = `접수번호: ${receiptNo}`;
  if (copyReceiptButton) copyReceiptButton.textContent = "접수번호 복사";
  completeModal.hidden = false;
  document.body.classList.add("is-complete-modal-open");
};

const closeCompleteModal = () => {
  if (!completeModal) return;
  completeModal.hidden = true;
  document.body.classList.remove("is-complete-modal-open");
};

const setSubmitMessage = (message, type = "error") => {
  if (!submitMessage) return;
  submitMessage.hidden = !message;
  submitMessage.classList.toggle("is-success", type === "success");
  submitMessage.classList.toggle("is-error", type === "error");
  submitMessage.classList.toggle("is-info", type === "info");
  submitMessage.replaceChildren();

  if (!message) return;
  submitMessage.textContent = message;
};

const updateFinalSubmitState = (showMessage = false) => {
  if (!finalSubmitButton) return;
  const missingFields = getMissingCustomerFields();
  const hasRegisteredItems = registeredGiftCards.length > 0;
  finalSubmitButton.disabled = isSubmittingOrder || !hasRegisteredItems || missingFields.length > 0;
  finalSubmitButton.textContent = isSubmittingOrder ? "접수 저장 중입니다." : "최종 신청";

  if (!showMessage) return;
  if (!hasRegisteredItems) {
    setSubmitMessage("등록된 상품권이 1개 이상 필요합니다.");
    return;
  }
  if (missingFields.length) {
    setSubmitMessage(`${missingFields.join(", ")} 입력이 필요합니다.`);
    return;
  }
  setSubmitMessage("");
};

const createOrderPayload = () => {
  const customerData = getCustomerFormData();
  return {
    customer_name: customerData.customerName,
    phone: customerData.customerPhone,
    bank_name: customerData.bankName,
    account_number: customerData.accountNumber,
    account_holder: customerData.accountHolder,
    items: registeredGiftCards.map((item) => ({
      giftCardId: item.giftCardId,
      name: item.name,
      amount: item.amount,
      pinCode: item.pinCode,
      image_url: item.image_url || "",
    })),
    total_amount: getTotalAmount(),
    status: "접수완료",
    requested_at: new Date().toISOString(),
    receipt_no: createReceiptNo(),
  };
};

const renderRegisteredList = () => {
  const wrapper = document.createElement("section");
  wrapper.className = "registered-panel";

  const summary = document.createElement("div");
  summary.className = "registered-summary";
  const count = document.createElement("span");
  count.textContent = `등록 건수 ${registeredGiftCards.length}건`;
  const total = document.createElement("strong");
  total.textContent = `총 금액 ${formatWon(registeredGiftCards.reduce((sum, item) => sum + item.amount, 0))}`;
  summary.append(count, total);

  if (!registeredGiftCards.length) {
    const empty = document.createElement("p");
    empty.className = "registered-empty";
    empty.textContent = "아직 등록된 상품권이 없습니다.";
    wrapper.append(summary, empty);
    return wrapper;
  }

  const list = document.createElement("ul");
  list.className = "registered-list";
  registeredGiftCards.forEach((item, index) => {
    const row = document.createElement("li");
    const info = document.createElement("div");
    info.className = "registered-item-info";
    const name = document.createElement("span");
    name.textContent = item.name;
    const pin = document.createElement("small");
    pin.textContent = `핀번호 끝 4자리 ${item.pinCode.slice(-4)}`;
    info.append(name, pin);

    const actions = document.createElement("div");
    actions.className = "registered-item-actions";
    const amount = document.createElement("strong");
    amount.textContent = formatWon(item.amount);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "registered-delete-button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => {
      registeredGiftCards.splice(index, 1);
      console.log("[gift_cards] registeredGiftCards after delete:", registeredGiftCards);
      updateFinalSubmitState(true);
      renderGiftDetail();
    });
    actions.append(amount, deleteButton);
    row.append(info, actions);
    list.append(row);
  });

  wrapper.append(summary, list);
  return wrapper;
};

const validateDetail = () => {
  const pins = getPinValues();
  return Boolean(selectedGiftCard && selectedAmount && pins.length === 4 && pins.every((pin) => pin.length === 4));
};

const renderGiftDetail = () => {
  if (!detailPanel) return;

  if (!selectedGiftCard) {
    detailPanel.innerHTML = `
      <div class="detail-empty">
        <h2>상세 입력</h2>
        <p>상품권을 선택하면 핀번호와 금액을 입력할 수 있습니다.</p>
      </div>
    `;
    return;
  }

  const root = document.createElement("div");
  root.className = "gift-detail";

  const head = document.createElement("div");
  head.className = "gift-detail-head";
  const titleWrap = document.createElement("div");
  titleWrap.className = "gift-detail-title-wrap";
  titleWrap.append(
    createProductLogo({
      imageUrl: selectedGiftCard.image_url,
      name: selectedGiftCard.name || "상품권",
      className: "gift-detail-logo",
    }),
  );
  const titleText = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = selectedGiftCard.name || "상품권";
  const description = document.createElement("p");
  description.textContent = "금액과 핀번호를 입력한 뒤 등록해주세요.";
  titleText.append(title, description);
  titleWrap.append(titleText);
  const rate = document.createElement("span");
  rate.className = "rate-badge";
  rate.textContent = getRateLabel(selectedGiftCard);
  head.append(titleWrap, rate);

  const amountGrid = document.createElement("div");
  amountGrid.className = "amount-button-grid";
  const options = getAmountOptions(selectedGiftCard);
  options.forEach((option) => {
    const value = normalizeAmountOption(option);
    if (!value) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "amount-button";
    button.textContent = formatWon(value);
    button.classList.toggle("is-selected", selectedAmount === value);
    button.addEventListener("click", () => {
      selectedAmount = value;
      renderGiftDetail();
    });
    amountGrid.append(button);
  });

  const selectedBox = document.createElement("div");
  selectedBox.className = "selected-amount-box";
  const selectedLabel = document.createElement("span");
  selectedLabel.textContent = "선택 금액";
  const selectedValue = document.createElement("strong");
  selectedValue.textContent = selectedAmount ? formatWon(selectedAmount) : "금액을 선택해주세요";
  selectedBox.append(selectedLabel, selectedValue);

  const pinGrid = document.createElement("div");
  pinGrid.className = "pin-input-grid";
  for (let index = 0; index < 4; index += 1) pinGrid.append(createPinInput(index));

  const detailError = document.createElement("p");
  detailError.className = "detail-error-message";
  detailError.hidden = true;

  const registerButton = document.createElement("button");
  registerButton.type = "button";
  registerButton.className = "register-button";
  registerButton.textContent = "등록";
  registerButton.disabled = true;
  pinGrid.addEventListener("input", () => {
    registerButton.disabled = !validateDetail();
  });
  registerButton.addEventListener("click", () => {
    if (!validateDetail()) return;
    const pinCode = getPinCode();
    if (registeredGiftCards.some((item) => item.pinCode === pinCode)) {
      detailError.textContent = "이미 등록된 핀번호입니다.";
      detailError.hidden = false;
      return;
    }

    registeredGiftCards.push({
      giftCardId: selectedGiftCard.id,
      name: selectedGiftCard.name || "상품권",
      amount: selectedAmount,
      pinCode,
      image_url: selectedGiftCard.image_url || "",
    });
    console.log("[gift_cards] registeredGiftCards:", registeredGiftCards);
    updateFinalSubmitState(true);
    renderGiftDetail();
  });

  root.append(head, amountGrid, selectedBox, pinGrid, detailError, registerButton, renderRegisteredList());
  detailPanel.replaceChildren(root);
};

const renderGiftCards = (cards) => {
  if (!giftCardList) return;

  if (!cards.length) {
    renderMessage("현재 선택 가능한 상품권이 없습니다.");
    return;
  }

  selectedGiftCardId = null;
  selectedGiftCard = null;
  selectedAmount = null;
  giftCardList.replaceChildren(...cards.map(createGiftCardButton));
  renderGiftDetail();
};

const loadGiftCards = async () => {
  if (!giftCardList) return;
  renderMessage("상품권을 불러오는 중입니다.");
  console.log("[gift_cards] hasSupabaseConfig:", hasSupabaseConfig);

  if (!supabase) {
    const message = "Supabase 환경변수가 설정되지 않았습니다.";
    console.error("[gift_cards] config error:", message);
    renderMessage(message, "error");
    return;
  }

  try {
    const { data, error } = await supabase.from("gift_cards").select("*");
    console.log("[gift_cards] data:", data);
    console.log("[gift_cards] error:", error);

    if (error) throw error;

    const activeCards = Array.isArray(data) ? data.filter((card) => card?.is_active === true) : [];
    console.log("[gift_cards] activeCards:", activeCards);
    renderGiftCards(sortGiftCards(activeCards));
  } catch (error) {
    console.error("gift_cards load failed", error);
    renderMessage(error?.message || "상품권 목록을 불러오지 못했습니다.", "error");
  }
};

loadGiftCards();

if (customerForm) {
  customerForm.addEventListener("input", (event) => {
    if (event.target.matches("#customerPhone, #accountNumber")) {
      event.target.value = onlyPhoneChars(event.target.value);
    }
    setSubmitMessage("");
    updateFinalSubmitState(true);
  });

  customerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmittingOrder) return;

    logCustomerInputValues();

    if (!registeredGiftCards.length) {
      setSubmitMessage("등록된 상품권이 1개 이상 필요합니다.");
      updateFinalSubmitState();
      return;
    }

    const missingFields = getMissingCustomerFields();
    if (missingFields.length) {
      setSubmitMessage(`${missingFields.join(", ")} 입력이 필요합니다.`);
      updateFinalSubmitState();
      return;
    }

    const draftPayload = {
      ...getCustomerFormData(),
      registeredGiftCards,
      totalAmount: getTotalAmount(),
    };
    const payload = createOrderPayload();

    console.log("[orders] draft payload:", draftPayload);
    console.log("[orders] insert payload:", payload);

    if (!supabase) {
      setSubmitMessage("Supabase 환경변수가 설정되지 않았습니다.");
      return;
    }

    isSubmittingOrder = true;
    setSubmitMessage("접수 저장 중입니다.", "info");
    updateFinalSubmitState();

    try {
      const { data, error } = await supabase.from("orders").insert(payload).select("id, receipt_no").single();
      if (error) throw error;

      console.log("[orders] inserted:", data);
      registeredGiftCards.length = 0;
      customerForm.reset();
      selectedAmount = null;
      renderGiftDetail();
      setSubmitMessage("");
      openCompleteModal(data.receipt_no || payload.receipt_no);
    } catch (error) {
      console.error("[orders] insert failed:", error);
      setSubmitMessage(error?.message || "접수 저장에 실패했습니다.");
    } finally {
      isSubmittingOrder = false;
      updateFinalSubmitState();
    }
  });
}

completeModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeCompleteModal);
});

if (copyReceiptButton) {
  copyReceiptButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(latestReceiptNo);
      copyReceiptButton.textContent = "복사 완료";
    } catch {
      copyReceiptButton.textContent = "복사 실패";
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && completeModal && !completeModal.hidden) {
    closeCompleteModal();
  }
});

updateFinalSubmitState();
