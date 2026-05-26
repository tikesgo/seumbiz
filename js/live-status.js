import { loadLiveStatusRows } from "./live-status-core.js";
import { createProductLogo } from "./product-logo.js";

const liveStatusList = document.querySelector("[data-live-status-list]");
const ORDER_LIMIT = 20;
const ROLLING_MIN_ROWS = 4;

const formatWon = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;

const getStatusValue = (status) => {
  const value = String(status || "").trim();
  return value || "접수완료";
};

const getStatusClass = (status) => {
  const value = getStatusValue(status);
  const classMap = {
    접수완료: "live-status-badge--received",
    대기: "live-status-badge--waiting",
    진행중: "live-status-badge--working",
    처리중: "live-status-badge--working",
    완료: "live-status-badge--done",
    승인: "live-status-badge--done",
    취소: "live-status-badge--canceled",
  };
  return classMap[value] || "live-status-badge--default";
};

const setMessage = (message, type = "info") => {
  if (!liveStatusList) return;
  const paragraph = document.createElement("p");
  paragraph.className = `live-status-message${type === "error" ? " is-error" : ""}`;
  paragraph.textContent = message;
  liveStatusList.classList.remove("is-rolling");
  liveStatusList.replaceChildren(paragraph);
};

const createLiveRow = ({ productName, imageUrl, amount, maskedCustomerName, statusText }) => {
  const row = document.createElement("article");
  row.className = "live-status-row";

  const product = document.createElement("span");
  product.className = "live-status-product";
  product.append(createProductLogo({ imageUrl, name: productName, className: "live-status-product-logo" }));

  const productText = document.createElement("span");
  productText.textContent = productName;
  product.append(productText);

  const amountElement = document.createElement("span");
  amountElement.className = "live-status-amount";
  amountElement.textContent = formatWon(amount);

  const customer = document.createElement("span");
  customer.className = "live-status-customer";
  customer.textContent = maskedCustomerName;

  const badge = document.createElement("span");
  badge.className = `live-status-badge ${getStatusClass(statusText)}`;
  badge.textContent = getStatusValue(statusText);

  row.append(product, amountElement, customer, badge);
  return row;
};

const renderRows = (rows) => {
  if (!liveStatusList) return;

  if (!rows.length) {
    setMessage("표시할 실시간 매입현황이 없습니다.");
    return;
  }

  liveStatusList.classList.toggle("is-rolling", rows.length >= ROLLING_MIN_ROWS);
  const track = document.createElement("div");
  track.className = "live-status-track";
  track.append(...rows.map(createLiveRow));

  if (rows.length >= ROLLING_MIN_ROWS) {
    track.append(...rows.map(createLiveRow));
  }

  liveStatusList.replaceChildren(track);
};

const loadLiveStatus = async () => {
  if (!liveStatusList) return;

  try {
    const rows = await loadLiveStatusRows({ limit: ORDER_LIMIT });
    renderRows(rows);
  } catch (error) {
    console.error("[live-status] orders load failed:", error);
    setMessage(error?.message || "실시간 매입현황을 불러오지 못했습니다.", "error");
  }
};

loadLiveStatus();
