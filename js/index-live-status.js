import { loadLiveStatusRows } from "./live-status-core.js";
import { createProductLogo } from "./product-logo.js";

const previewList = document.querySelector("[data-index-live-status-list]");
const PREVIEW_LIMIT = 8;
const ROLLING_MIN_ROWS = 5;

const formatWon = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;

const getStatusClass = (status) => {
  const value = String(status || "").trim();
  const classMap = {
    접수완료: "index-live-status-badge--received",
    대기: "index-live-status-badge--waiting",
    진행중: "index-live-status-badge--working",
    처리중: "index-live-status-badge--working",
    완료: "index-live-status-badge--done",
    승인: "index-live-status-badge--done",
    취소: "index-live-status-badge--canceled",
  };
  return classMap[value] || "index-live-status-badge--default";
};

const setMessage = (message, type = "info") => {
  if (!previewList) return;
  const paragraph = document.createElement("p");
  paragraph.className = `index-live-status-message${type === "error" ? " is-error" : ""}`;
  paragraph.textContent = message;
  previewList.classList.remove("is-rolling");
  previewList.replaceChildren(paragraph);
};

const toPreviewRowData = ({ productName, imageUrl, amount, maskedCustomerName, statusText }) => ({
  productName,
  imageUrl,
  amount,
  maskedCustomerName,
  statusText,
});

const createPreviewRow = ({ productName, imageUrl, amount, maskedCustomerName, statusText }) => {
  const row = document.createElement("article");
  row.className = "index-live-status-row";

  const product = document.createElement("span");
  product.className = "index-live-status-product";
  product.append(createProductLogo({ imageUrl, name: productName, className: "index-live-status-logo" }));

  const productText = document.createElement("span");
  productText.textContent = productName;
  product.append(productText);

  const amountElement = document.createElement("span");
  amountElement.className = "index-live-status-amount";
  amountElement.textContent = formatWon(amount);

  const customer = document.createElement("span");
  customer.className = "index-live-status-customer";
  customer.textContent = maskedCustomerName;

  const badge = document.createElement("span");
  badge.className = `index-live-status-badge ${getStatusClass(statusText)}`;
  badge.textContent = statusText;

  row.append(product, amountElement, customer, badge);
  return row;
};

const renderPreview = (rows) => {
  if (!previewList) return;

  if (!rows.length) {
    setMessage("표시할 실시간 매입현황이 없습니다.");
    return;
  }

  previewList.classList.toggle("is-rolling", rows.length >= ROLLING_MIN_ROWS);
  const previewRows = rows.map(toPreviewRowData);
  const track = document.createElement("div");
  track.className = "index-live-status-track";
  track.append(...previewRows.map(createPreviewRow));

  if (rows.length >= ROLLING_MIN_ROWS) {
    track.append(...previewRows.map(createPreviewRow));
  }

  previewList.replaceChildren(track);
};

const loadIndexLiveStatus = async () => {
  if (!previewList) return;
  setMessage("실시간 매입현황을 불러오는 중입니다.");

  try {
    const rows = await loadLiveStatusRows({ limit: PREVIEW_LIMIT });
    renderPreview(rows);
  } catch (error) {
    console.error("[index-live-status] orders load failed:", error);
    setMessage(error?.message || "실시간 매입현황을 불러오지 못했습니다.", "error");
  }
};

loadIndexLiveStatus();
