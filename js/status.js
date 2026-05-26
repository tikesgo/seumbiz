import { supabase } from "./supabaseClient.js";

const statusForm = document.querySelector("[data-status-form]");
const receiptNoInput = document.querySelector("#receiptNo");
const phoneInput = document.querySelector("#statusPhone");
const statusMessage = document.querySelector("[data-status-message]");
const statusResult = document.querySelector("[data-status-result]");
const submitButton = document.querySelector(".status-submit-button");

const onlyPhoneChars = (value) => value.replace(/[^\d-]/g, "");

const formatWon = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const setMessage = (message, type = "error") => {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.hidden = !message;
  statusMessage.classList.toggle("is-info", type === "info");
};

const clearResult = () => {
  if (!statusResult) return;
  statusResult.replaceChildren();
};

const getStatusValue = (status) => {
  const value = String(status || "").trim();
  return value || "기본";
};

const getStatusClass = (status) => {
  const value = getStatusValue(status);
  const classMap = {
    접수완료: "status-badge--received",
    대기: "status-badge--waiting",
    진행중: "status-badge--working",
    처리중: "status-badge--working",
    완료: "status-badge--done",
    승인: "status-badge--done",
    취소: "status-badge--canceled",
  };
  return classMap[value] || "status-badge--default";
};

const createField = (label, value) => {
  const wrapper = document.createElement("div");
  wrapper.className = "status-field";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value || "-";

  wrapper.append(labelElement, valueElement);
  return wrapper;
};

const normalizeItems = (items) => (Array.isArray(items) ? items : []);

const createItemRow = (item) => {
  const row = document.createElement("li");

  const name = document.createElement("span");
  name.textContent = item?.name || item?.productName || item?.product_name || "상품권";

  const amount = document.createElement("span");
  amount.className = "status-item-amount";
  amount.textContent = formatWon(item?.amount);

  const pin = document.createElement("span");
  pin.className = "status-item-pin";
  const pinCode = String(item?.pinCode || item?.pin_code || item?.pincode || item?.pin || "");
  pin.textContent = pinCode ? `끝 4자리 ${pinCode.slice(-4)}` : "핀번호 없음";

  row.append(name, amount, pin);
  return row;
};

const renderOrder = (order) => {
  clearResult();
  if (!statusResult) return;
  const customerName = order.customer_name || order.name || order.customerName || "-";
  const statusText = getStatusValue(order.status);

  const card = document.createElement("article");
  card.className = "status-card";

  const head = document.createElement("div");
  head.className = "status-card-head";

  const title = document.createElement("div");
  title.className = "status-card-title";
  const label = document.createElement("span");
  label.textContent = "접수번호";
  const receipt = document.createElement("strong");
  receipt.textContent = order.receipt_no || "-";
  title.append(label, receipt);

  const badge = document.createElement("span");
  badge.className = `status-badge ${getStatusClass(order.status)}`;
  badge.textContent = statusText;
  head.append(title, badge);

  const fields = document.createElement("div");
  fields.className = "status-fields";
  fields.append(
    createField("고객명", customerName),
    createField("연락처", order.phone),
    createField("총 금액", formatWon(order.total_amount)),
    createField("접수일", formatDateTime(order.requested_at || order.created_at)),
  );

  const itemsSection = document.createElement("section");
  itemsSection.className = "status-items";
  const itemsTitle = document.createElement("h3");
  itemsTitle.textContent = "등록 상품권";
  const itemList = document.createElement("ul");
  itemList.className = "status-item-list";

  const items = normalizeItems(order.items);
  if (items.length) {
    itemList.append(...items.map(createItemRow));
  } else {
    const empty = document.createElement("li");
    empty.textContent = "등록된 상품권 정보가 없습니다.";
    itemList.append(empty);
  }

  itemsSection.append(itemsTitle, itemList);
  card.append(head, fields, itemsSection);
  statusResult.append(card);
};

const setLoading = (isLoading) => {
  if (!submitButton) return;
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "조회 중" : "조회";
};

const handleSubmit = async (event) => {
  event.preventDefault();
  clearResult();

  const receiptNo = String(receiptNoInput?.value || "").trim();
  const phone = String(phoneInput?.value || "").trim();

  if (!receiptNo) {
    setMessage("접수번호를 입력해주세요.");
    return;
  }

  if (!phone) {
    setMessage("연락처를 입력해주세요.");
    return;
  }

  if (!supabase) {
    setMessage("Supabase 환경변수가 설정되지 않았습니다.");
    return;
  }

  setLoading(true);
  setMessage("접수 내역을 조회 중입니다.", "info");

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, receipt_no, customer_name, phone, status, total_amount, items, requested_at, created_at")
      .eq("receipt_no", receiptNo)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      setMessage("일치하는 접수 내역이 없습니다.");
      return;
    }

    console.log("[status] order:", data);
    console.log("[status] items:", data.items);
    console.log("[status] order.status:", data.status);
    setMessage("");
    renderOrder(data);
  } catch (error) {
    console.error("[status] order lookup failed:", error);
    setMessage(error?.message || "접수 내역을 조회하지 못했습니다.");
  } finally {
    setLoading(false);
  }
};

if (phoneInput) {
  phoneInput.addEventListener("input", () => {
    phoneInput.value = onlyPhoneChars(phoneInput.value);
  });
}

if (statusForm) {
  statusForm.addEventListener("submit", handleSubmit);
}
