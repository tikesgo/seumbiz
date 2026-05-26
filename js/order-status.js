import { supabase } from "./supabaseClient.js";
import { createProductLogo, loadGiftCardLogoMap, resolveProductImageUrl } from "./product-logo.js";

const statusForm = document.querySelector("[data-order-status-form]");
const customerNameInput = document.querySelector("#orderCustomerName");
const phoneInput = document.querySelector("#orderStatusPhone");
const statusMessage = document.querySelector("[data-order-status-message]");
const statusResult = document.querySelector("[data-order-status-result]");
const submitButton = document.querySelector(".order-status-submit-button");
let giftCardLogoMap = new Map();

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
    접수완료: "order-status-badge--received",
    대기: "order-status-badge--waiting",
    진행중: "order-status-badge--working",
    처리중: "order-status-badge--working",
    완료: "order-status-badge--done",
    승인: "order-status-badge--done",
    취소: "order-status-badge--canceled",
  };
  return classMap[value] || "order-status-badge--default";
};

const createField = (label, value) => {
  const wrapper = document.createElement("div");
  wrapper.className = "order-status-field";

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

  const product = document.createElement("span");
  product.className = "order-status-item-product";
  const productName = item?.name || item?.productName || item?.product_name || "상품권";
  product.append(
    createProductLogo({
      imageUrl: resolveProductImageUrl(item, giftCardLogoMap),
      name: productName,
      className: "order-status-item-logo",
    }),
  );

  const name = document.createElement("span");
  name.textContent = productName;
  product.append(name);

  const amount = document.createElement("span");
  amount.className = "order-status-item-amount";
  amount.textContent = formatWon(item?.amount);

  const pin = document.createElement("span");
  pin.className = "order-status-item-pin";
  const pinCode = String(item?.pinCode || item?.pin_code || item?.pincode || item?.pin || "");
  pin.textContent = pinCode ? `끝 4자리 ${pinCode.slice(-4)}` : "핀번호 없음";

  row.append(product, amount, pin);
  return row;
};

const renderOrder = (order) => {
  clearResult();
  if (!statusResult) return;
  const customerName = order.customer_name || order.name || order.customerName || "-";
  const statusText = getStatusValue(order.status);

  const card = document.createElement("article");
  card.className = "order-status-card";

  const head = document.createElement("div");
  head.className = "order-status-card-head";

  const title = document.createElement("div");
  title.className = "order-status-card-title";
  const label = document.createElement("span");
  label.textContent = "접수번호";
  const receipt = document.createElement("strong");
  receipt.textContent = order.receipt_no || "-";
  title.append(label, receipt);

  const badge = document.createElement("span");
  badge.className = `order-status-badge ${getStatusClass(order.status)}`;
  badge.textContent = statusText;
  head.append(title, badge);

  const fields = document.createElement("div");
  fields.className = "order-status-fields";
  fields.append(
    createField("고객명", customerName),
    createField("연락처", order.phone),
    createField("총 금액", formatWon(order.total_amount)),
    createField("접수일", formatDateTime(order.requested_at || order.created_at)),
  );

  const itemsSection = document.createElement("section");
  itemsSection.className = "order-status-items";
  const itemsTitle = document.createElement("h3");
  itemsTitle.textContent = "등록 상품권";
  const itemList = document.createElement("ul");
  itemList.className = "order-status-item-list";

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

  const customerName = String(customerNameInput?.value || "").trim();
  const phone = String(phoneInput?.value || "").trim();

  if (!customerName) {
    setMessage("이름을 입력해주세요.");
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
      .eq("customer_name", customerName)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    const order = Array.isArray(data) ? data[0] : null;

    if (!order) {
      setMessage("일치하는 접수 내역이 없습니다.");
      return;
    }

    console.log("[order-status] order:", order);
    console.log("[order-status] items:", order.items);
    console.log("[order-status] order.status:", order.status);
    giftCardLogoMap = await loadGiftCardLogoMap(supabase);
    setMessage("");
    renderOrder(order);
  } catch (error) {
    console.error("[order-status] order lookup failed:", error);
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
