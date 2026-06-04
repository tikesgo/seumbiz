import { getSeumBizAdminAssetBaseUrl, resolveSeumBizAssetUrl } from "./biz-assets.js";
import { supabase } from "./supabaseClient.js";

const FACE_VALUE_MAP = new Map([
  ["1", 10000],
  ["3", 30000],
  ["5", 50000],
  ["10", 100000],
  ["20", 200000],
  ["30", 300000],
  ["50", 500000],
  ["100", 1000000],
  ["10000", 10000],
  ["30000", 30000],
  ["50000", 50000],
  ["100000", 100000],
  ["200000", 200000],
  ["300000", 300000],
  ["500000", 500000],
  ["1000000", 1000000],
]);

const PIN_PATTERN = /\b(?:\d{4}-\d{4}-\d{4}-\d{4}|\d{16})\b/;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const submitButton = $("#purchaseRequestSubmit");
const statusElement = $("#purchaseRequestStatus");
const bulkTextarea = $("#pinBulkText");
const faceValueHelp = $("#faceValueHelp");
const giftCardPicker = $("[data-gift-card-picker]");
const faceValueButtons = $("[data-face-value-buttons]");
const previewBody = $(".ocr-table tbody");
const singlePinInput = $("#singlePinInput");
const addSingleButton = $("#addSinglePin");
const addBulkButton = $("#addBulkPins");
const manualRow = $(".single-manual-row");
const selectedGiftLabel = $("[data-selected-gift-label]");
const registerCount = $("[data-register-count]");
const registerTotal = $("[data-register-total]");
const clearPendingButton = $("#clearPendingItems");
const ocrInput = $("#giftCardImage");
const runOcrButton = $("#runOcrButton");
const ocrReviewList = $("#ocrReviewList");
const addOcrResultsButton = $("#addOcrResultsButton");
const clearOcrResultsButton = $("#clearOcrResultsButton");
const ocrReviewSummary = $("#ocrReviewSummary");
const ocrStatus = $("#ocrStatus");

let selectedFaceValue = null;
let giftcards = [];
let selectedGiftcardCode = "";
let selectedGiftcard = null;
let pendingItems = [];
let ocrReviewItems = [];
let isOcrRunning = false;
let isAuthReady = Boolean(window.SEUMBizAuth?.companyId);

const LOGIN_EXPIRED_MESSAGE = "\uB85C\uADF8\uC778\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.";
const AUTH_WAIT_MESSAGE = "\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.";
const OCR_AMOUNT_PENDING_STATUS = "\uAE08\uC561 \uBBF8\uD655\uC815";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value) => {
  if (!value) return "금액 필요";
  return `${Number(value).toLocaleString("ko-KR")}원`;
};

const formatFaceValueLabel = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 10000 && amount % 10000 === 0) {
    return `${amount / 10000}만원`;
  }
  return formatMoney(amount);
};

const normalizeGiftcard = (row) => {
  const logoUrl = String(row?.logo_url || "").trim();
  return {
    code: String(row?.code || "").trim(),
    name: String(row?.name || "").trim(),
    logo_url: logoUrl,
    logo_src: resolveSeumBizAssetUrl(logoUrl),
    default_rate: Number(row?.default_rate) || 0,
    enabled_amounts: Array.isArray(row?.enabled_amounts)
      ? row.enabled_amounts.map((amount) => Number(amount)).filter((amount) => Number.isFinite(amount) && amount > 0)
      : [],
  };
};

const setStatus = (message, type = "") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.state = type;
};

const setSubmitting = (isSubmitting) => {
  if (!submitButton) return;
  submitButton.dataset.submitting = isSubmitting ? "true" : "false";
  submitButton.disabled = isSubmitting || !isAuthReady;
  submitButton.textContent = isSubmitting ? "\uB4F1\uB85D \uC911..." : "\uB4F1\uB85D\uD558\uAE30";
};

const setSubmitReady = () => {
  if (!submitButton || submitButton.dataset.submitting === "true") return;
  isAuthReady = Boolean(window.SEUMBizAuth?.companyId);
  submitButton.disabled = !isAuthReady;
  submitButton.textContent = "\uB4F1\uB85D\uD558\uAE30";
};

const redirectToLogin = () => {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = "/biz-login.html?next=" + next;
};

const ensureActiveSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;

  if (error) {
    console.error("SEUMBiz register session check failed", error);
  }

  if (!session?.access_token) {
    await supabase.auth.signOut().catch(() => {});
    return false;
  }

  return true;
};

const getRpcErrorMessage = (error) => {
  const message = String(error?.message || "");
  if (/permission denied|JWT|session|auth/i.test(message)) {
    return LOGIN_EXPIRED_MESSAGE;
  }
  return "\uB9E4\uC785 \uC2E0\uCCAD \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.";
};

const getSelectedGiftType = () => {
  if (!selectedGiftcard) return null;

  return {
    value: selectedGiftcard.code,
    code: selectedGiftcard.code,
    label: selectedGiftcard.name,
    name: selectedGiftcard.name,
    logo_url: selectedGiftcard.logo_url,
    logo_src: selectedGiftcard.logo_src,
    default_rate: selectedGiftcard.default_rate,
    enabled_amounts: selectedGiftcard.enabled_amounts,
  };
};

const renderFaceValueButtons = () => {
  if (!faceValueButtons) return;

  const amounts = selectedGiftcard?.enabled_amounts || [];
  if (!amounts.length) {
    faceValueButtons.innerHTML = `<p class="face-value-empty">선택 가능한 액면가가 없습니다.</p>`;
    setSelectedFaceValue(null);
    return;
  }

  faceValueButtons.innerHTML = amounts
    .map(
      (amount) =>
        `<button type="button" data-face-value="${amount}" class="${Number(amount) === selectedFaceValue ? "is-active" : ""}">${escapeHtml(formatFaceValueLabel(amount))}</button>`,
    )
    .join("");

  if (selectedFaceValue && !amounts.includes(selectedFaceValue)) {
    setSelectedFaceValue(null);
  }
};

const selectGiftcard = (code) => {
  selectedGiftcardCode = code;
  selectedGiftcard = giftcards.find((giftcard) => giftcard.code === code) || null;
  setSelectedFaceValue(null);
  renderFaceValueButtons();
  updateGiftSelection();
  renderPreview();
};

const renderGiftcards = () => {
  if (!giftCardPicker) return;

  giftCardPicker.classList.remove("is-loading", "is-error", "is-empty");

  if (!giftcards.length) {
    selectedGiftcardCode = "";
    selectedGiftcard = null;
    giftCardPicker.classList.add("is-empty");
    giftCardPicker.innerHTML = `<div class="gift-option-placeholder">등록 가능한 상품권이 없습니다.</div>`;
    renderFaceValueButtons();
    renderPreview();
    return;
  }

  if (!selectedGiftcardCode || !giftcards.some((giftcard) => giftcard.code === selectedGiftcardCode)) {
    selectedGiftcardCode = giftcards[0].code;
  }
  selectedGiftcard = giftcards.find((giftcard) => giftcard.code === selectedGiftcardCode) || giftcards[0];

  giftCardPicker.innerHTML = giftcards
    .map((giftcard) => {
      const isSelected = giftcard.code === selectedGiftcard?.code;
      return `
        <label class="gift-option ${isSelected ? "is-selected" : ""}">
          <input type="radio" name="giftCardType" value="${escapeHtml(giftcard.code)}" ${isSelected ? "checked" : ""} />
          <span class="gift-check" aria-hidden="true">✓</span>
          <span class="gift-logo gift-logo--image"><img src="${escapeHtml(giftcard.logo_src || resolveSeumBizAssetUrl(giftcard.logo_url))}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-error'); this.remove();" /></span>
          <strong>${escapeHtml(giftcard.name)}</strong>
        </label>
      `;
    })
    .join("");

  renderFaceValueButtons();
  updateGiftSelection();
  renderPreview();
};

const loadGiftcards = async () => {
  if (!giftCardPicker) return;

  giftCardPicker.classList.add("is-loading");
  giftCardPicker.innerHTML = `<div class="gift-option-placeholder">상품권 목록을 불러오는 중입니다.</div>`;

  try {
    const { data, error } = await supabase
      .from("biz_giftcard_types")
      .select("code,name,logo_url,default_rate,enabled_amounts,is_visible,is_active,sort_order")
      .eq("is_visible", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    console.error("SEUMBiz giftcard query result", {
      count: Array.isArray(data) ? data.length : null,
      data,
      error,
    });

    if (error) throw error;

    giftcards = (data || [])
      .map(normalizeGiftcard)
      .filter((giftcard) => giftcard.code && giftcard.name && giftcard.logo_url);

    renderGiftcards();
  } catch (error) {
    console.error("SEUMBiz giftcard list load failed", error);
    giftcards = [];
    selectedGiftcardCode = "";
    selectedGiftcard = null;
    giftCardPicker.classList.remove("is-loading");
    giftCardPicker.classList.add("is-error");
    giftCardPicker.innerHTML = `<div class="gift-option-placeholder">상품권 목록을 불러오지 못했습니다.</div>`;
    renderFaceValueButtons();
    renderPreview();
  }
};

const normalizePin = (value) => String(value || "").replace(/\D/g, "").trim();

const isValidPin = (value) => /^\d{16}$/.test(value);

const parseFaceValueToken = (value) => {
  const normalized = String(value || "").replaceAll(",", "").trim();
  return FACE_VALUE_MAP.get(normalized) || null;
};

const extractFaceValueFromText = (text) => {
  const token = String(text || "").match(/\b\d{1,3}(?:,\d{3})+|\b\d+\b/);
  if (!token) return null;
  return parseFaceValueToken(token[0]);
};

const parseBulkLine = (line) => {
  const match = String(line || "").match(PIN_PATTERN);
  if (!match) return null;

  const rawPin = match[0];
  const pin = normalizePin(rawPin);
  const rest = `${line.slice(0, match.index)} ${line.slice(match.index + rawPin.length)}`;
  const lineFaceValue = extractFaceValueFromText(rest);

  return {
    pin_no: pin,
    face_value: lineFaceValue || selectedFaceValue,
    source: "bulk",
  };
};

const getItemStatus = (item, pinCounts) => {
  if (!isValidPin(item.pin_no)) return { label: "형식 오류", className: "is-error" };
  if (pinCounts.get(item.pin_no) > 1) return { label: "중복", className: "is-error" };
  if (!item.face_value && item.source === "ocr") return { label: OCR_AMOUNT_PENDING_STATUS, className: "is-warning" };
  if (!item.face_value) return { label: "금액 필요", className: "is-warning" };
  if (
    item.source === "ocr" &&
    selectedGiftcard?.enabled_amounts?.length &&
    !selectedGiftcard.enabled_amounts.includes(Number(item.face_value))
  ) {
    return { label: "검토 필요", className: "is-warning" };
  }
  return { label: "정상", className: "is-ready" };
};

const getItemsWithStatus = () => {
  const giftType = getSelectedGiftType();
  const pinCounts = pendingItems.reduce((map, item) => {
    map.set(item.pin_no, (map.get(item.pin_no) || 0) + 1);
    return map;
  }, new Map());

  return pendingItems.map((item, index) => {
    const status = getItemStatus(item, pinCounts);
    return {
      ...item,
      no: index + 1,
      giftcard_type: item.giftcard_type || giftType?.label || "-",
      giftcard_logo_url: item.giftcard_logo_url || giftType?.logo_url || "",
      giftcard_code: item.giftcard_code || giftType?.code || "",
      status: status.label,
      statusClass: status.className,
    };
  });
};

const renderPreviewGiftcard = (item) => {
  const name = item.giftcard_type || "-";
  const logoUrl = item.giftcard_logo_url || "";
  const logo = logoUrl
    ? `<span class="preview-giftcard-logo"><img src="${escapeHtml(resolveSeumBizAssetUrl(logoUrl))}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-empty'); this.remove();" /></span>`
    : `<span class="preview-giftcard-logo is-empty" aria-hidden="true"></span>`;

  return `<span class="preview-giftcard-cell">${logo}<span>${escapeHtml(name)}</span></span>`;
};

const renderPreview = () => {
  if (!previewBody) return;

  const items = getItemsWithStatus();
  const totalFaceValue = items.reduce((sum, item) => sum + (Number(item.face_value) || 0), 0);

  if (registerCount) registerCount.textContent = items.length.toLocaleString("ko-KR");
  if (registerTotal) registerTotal.textContent = totalFaceValue ? formatMoney(totalFaceValue) : "0원";
  if (clearPendingButton) clearPendingButton.disabled = items.length === 0;

  if (!items.length) {
    previewBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state"><span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M14 18h20l3 8v12H11V26l3-8z" /><path d="M11 26h9l2 4h4l2-4h9" /></svg></span><strong>등록 예정 핀번호가 없습니다.</strong></div>
        </td>
      </tr>
    `;
    return;
  }

  previewBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.no}</td>
          <td>${escapeHtml(item.pin_no)}</td>
          <td>${renderPreviewGiftcard(item)}</td>
          <td>${escapeHtml(formatMoney(item.face_value))}</td>
          <td><span class="preview-status ${item.statusClass}">${escapeHtml(item.status)}</span></td>
        </tr>
      `,
    )
    .join("");
};

const setSelectedFaceValue = (value) => {
  selectedFaceValue = value ? Number(value) : null;

  Array.from(faceValueButtons?.querySelectorAll("button") || []).forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.faceValue) === selectedFaceValue);
  });

  if (faceValueHelp) {
    faceValueHelp.textContent = selectedFaceValue
      ? `선택된 액면가 ${formatMoney(selectedFaceValue)}가 금액 없는 핀번호에 적용됩니다.`
      : selectedGiftcard
        ? "붙여넣은 줄에 금액이 있으면 줄 금액을 우선 적용합니다."
        : "상품권을 선택하면 사용 가능한 액면가가 표시됩니다.";
  }
};

const addPendingItems = (items) => {
  if (!items.length) {
    setStatus("추가할 핀번호가 없습니다.", "error");
    return;
  }

  pendingItems = [...pendingItems, ...items];
  renderPreview();
};

const validateBaseSelection = () => {
  const giftType = getSelectedGiftType();

  if (!giftType) {
    setStatus("상품권 종류를 선택해주세요.", "error");
    return null;
  }

  if (!selectedFaceValue) {
    setStatus("액면가를 먼저 선택해주세요.", "error");
    return null;
  }

  return giftType;
};

const validateGiftTypeOnly = () => {
  const giftType = getSelectedGiftType();

  if (!giftType) {
    setStatus("상품권 종류를 선택해주세요.", "error");
    return null;
  }

  return giftType;
};

const getManualPin = () => {
  if (!manualRow) return "";
  return Array.from(manualRow.querySelectorAll("input"))
    .map((input) => normalizePin(input.value))
    .join("");
};

const fillManualPin = (value) => {
  if (!manualRow) return false;
  const pin = normalizePin(value).slice(0, 16);
  if (pin.length !== 16) return false;

  Array.from(manualRow.querySelectorAll("input")).forEach((input, index) => {
    input.value = pin.slice(index * 4, index * 4 + 4);
  });

  return true;
};

const clearDirectInputs = () => {
  if (singlePinInput) singlePinInput.value = "";
  manualRow?.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
};

const addSinglePin = () => {
  const giftType = validateBaseSelection();
  if (!giftType) return;

  const pin = normalizePin(singlePinInput?.value) || getManualPin();
  if (!pin) {
    setStatus("핀번호를 입력해주세요.", "error");
    return;
  }

  addPendingItems([
    {
      pin_no: pin,
      face_value: selectedFaceValue,
      giftcard_code: giftType.code,
      giftcard_type: giftType.label,
      giftcard_logo_url: giftType.logo_url,
      source: "single",
    },
  ]);
  clearDirectInputs();
  setStatus("등록 예정 목록에 추가했습니다.", "ok");
  singlePinInput?.focus();
};

const addBulkPins = () => {
  const giftType = validateGiftTypeOnly();
  if (!giftType) return;

  const items = (bulkTextarea?.value || "")
    .split(/\r?\n/)
    .map((line) => parseBulkLine(line))
    .filter(Boolean)
    .map((item) => ({
      ...item,
      giftcard_code: giftType.code,
      giftcard_type: giftType.label,
      giftcard_logo_url: giftType.logo_url,
    }));

  addPendingItems(items);

  if (items.some((item) => !item.face_value)) {
    setStatus("금액이 없는 핀번호가 있습니다. 액면가를 선택하거나 줄에 금액을 함께 입력해주세요.", "error");
  } else {
    setStatus("대량 핀번호를 등록 예정 목록에 추가했습니다.", "ok");
  }
};

const setOcrStatus = (message, type = "") => {
  if (!ocrStatus) return;
  ocrStatus.textContent = message;
  ocrStatus.dataset.state = type;
};

const setOcrRunning = (isRunning) => {
  isOcrRunning = isRunning;
  if (runOcrButton) {
    runOcrButton.disabled = isRunning;
    runOcrButton.textContent = isRunning ? "OCR 등록 중..." : "OCR로 등록";
  }
};

const getOcrFiles = () => Array.from(ocrInput?.files || []);

const validateOcrFiles = (files) => {
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
  const maxFileSize = 5 * 1024 * 1024;
  const maxTotalSize = 50 * 1024 * 1024;

  if (!files.length) {
    setOcrStatus("OCR을 실행할 이미지를 선택해주세요.", "error");
    return false;
  }

  if (files.length > 10) {
    setOcrStatus("OCR 이미지는 한 번에 최대 10장까지 등록할 수 있습니다.", "error");
    return false;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > maxTotalSize) {
    setOcrStatus("전체 이미지 용량은 50MB 이하만 업로드할 수 있습니다.", "error");
    return false;
  }

  const hasInvalidFile = files.some((file) => !allowedTypes.has(file.type) || file.size > maxFileSize);
  if (hasInvalidFile) {
    setOcrStatus("지원하지 않는 형식 또는 5MB 초과 이미지는 실패 항목으로 표시됩니다.", "");
  }

  return true;
};

const getOcrReviewStatus = (item) => {
  const pin = normalizePin(item.pin_no);
  const faceValue = Number(item.face_value) || 0;
  const warning = String(item.warning || "");
  const warningText = warning.toLowerCase();

  if (
    item.failed &&
    (warningText.includes("rate limit") ||
      warningText.includes("rate_limit") ||
      warningText.includes("429") ||
      warningText.includes("too many requests"))
  ) {
    return { label: "API 제한", className: "is-api-limit" };
  }

  if (
    item.failed &&
    (warning.includes("지원하지 않는 이미지 형식") ||
      warning.includes("HEIC") ||
      warning.includes("JPG, PNG, WEBP") ||
      warning.includes("5MB"))
  ) {
    return { label: "이미지 형식 오류", className: "is-error" };
  }

  if (item.failed && !pin) return { label: "OCR 실패", className: "is-error" };
  if (!isValidPin(pin)) return { label: "형식 오류", className: "is-error" };
  if (!faceValue) return { label: "금액 미확정", className: "is-warning" };
  if (selectedGiftcard?.enabled_amounts?.length && !selectedGiftcard.enabled_amounts.includes(faceValue)) {
    return { label: "검토 필요", className: "is-warning" };
  }
  if (item.warning) return { label: "검토 필요", className: "is-warning" };
  return { label: "정상", className: "is-ready" };
};

const getOcrReviewMetaMessage = (item, confidence) => {
  const warning = String(item.warning || "");
  const warningText = warning.toLowerCase();
  if (
    item.failed &&
    (warningText.includes("rate limit") ||
      warningText.includes("rate_limit") ||
      warningText.includes("429") ||
      warningText.includes("too many requests"))
  ) {
    return "OpenAI 처리 제한으로 잠시 후 다시 시도해주세요.";
  }
  return `신뢰도 ${confidence}${warning ? ` · ${warning}` : ""}`;
};

const renderOcrReviewItems = () => {
  if (!ocrReviewList || !addOcrResultsButton) return;

  if (!ocrReviewItems.length) {
    ocrReviewList.hidden = true;
    ocrReviewList.innerHTML = "";
    addOcrResultsButton.hidden = true;
    addOcrResultsButton.disabled = true;
    if (clearOcrResultsButton) clearOcrResultsButton.hidden = true;
    if (ocrReviewSummary) {
      ocrReviewSummary.hidden = true;
      ocrReviewSummary.textContent = "OCR 결과 0건";
    }
    return;
  }

  ocrReviewList.hidden = false;
  addOcrResultsButton.hidden = false;
  addOcrResultsButton.disabled = false;
  if (clearOcrResultsButton) clearOcrResultsButton.hidden = false;
  if (ocrReviewSummary) {
    ocrReviewSummary.hidden = false;
    ocrReviewSummary.textContent = `OCR 결과 ${ocrReviewItems.length.toLocaleString("ko-KR")}건`;
  }
  ocrReviewList.innerHTML = ocrReviewItems
    .map((item, index) => {
      const status = getOcrReviewStatus(item);
      const confidence =
        item.confidence === null || item.confidence === undefined
          ? "-"
          : `${Math.round(Number(item.confidence) * 100)}%`;
      const metaMessage = getOcrReviewMetaMessage(item, confidence);
      return `
        <article class="ocr-review-card ${status.className}">
          <div class="ocr-review-card-head">
            <strong>${escapeHtml(item.image_name || `이미지 ${index + 1}`)}</strong>
            <div class="ocr-review-card-actions">
              <span class="preview-status ${status.className}">${escapeHtml(status.label)}</span>
              <button class="ocr-review-remove-button" type="button" data-ocr-remove="${index}" aria-label="OCR 결과 제거">×</button>
            </div>
          </div>
          <label class="ocr-review-pin-field">
            <span>PIN 번호</span>
            <input type="text" inputmode="numeric" maxlength="19" value="${escapeHtml(item.pin_no || "")}" data-ocr-pin="${index}" placeholder="16자리 PIN" />
          </label>
          <label class="ocr-review-amount-field">
            <span>액면가</span>
            <input type="text" inputmode="numeric" value="${item.face_value ? escapeHtml(item.face_value) : ""}" data-ocr-face-value="${index}" placeholder="예: 100000" />
          </label>
          <p class="ocr-review-meta">${escapeHtml(metaMessage)}</p>
        </article>
      `;
    })
    .join("");
};

const clearOcrReviewItems = () => {
  ocrReviewItems = [];
  renderOcrReviewItems();
  setOcrStatus("OCR 결과를 비웠습니다.", "");
};

const removeOcrReviewItem = (index) => {
  if (!Number.isInteger(index) || index < 0 || index >= ocrReviewItems.length) return;
  ocrReviewItems.splice(index, 1);
  renderOcrReviewItems();
  setOcrStatus(ocrReviewItems.length ? "선택한 OCR 결과를 제거했습니다." : "OCR 결과를 비웠습니다.", "");
};

const normalizeOcrResponseItems = (items, giftType) =>
  (items || []).map((item, index) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,
    image_name: item.image_name || `image-${index + 1}`,
    pin_no: normalizePin(item.pin_no),
    face_value: item.face_value ? Number(item.face_value) : null,
    confidence: item.confidence ?? null,
    warning: item.warning || "",
    raw_text: item.raw_text || "",
    failed: Boolean(item.failed),
    giftcard_code: giftType.code,
    giftcard_type: giftType.label,
    giftcard_logo_url: giftType.logo_url,
    source: "ocr",
  }));

const getOcrResultMessage = (payload, itemCount) => {
  const failureCount = Number(payload?.failureCount || 0);
  const processedCount = Number(payload?.processedCount || 0);
  const successCount = Number(payload?.successCount || 0);

  if (!itemCount) {
    return failureCount
      ? `${failureCount.toLocaleString("ko-KR")}개 이미지 OCR이 실패했습니다. 실패 파일을 확인해주세요.`
      : "OCR 결과가 없습니다. 이미지를 다시 확인해주세요.";
  }

  if (failureCount) {
    const base = processedCount
      ? `${processedCount.toLocaleString("ko-KR")}개 중 ${successCount.toLocaleString("ko-KR")}개 이미지 OCR 결과를 불러왔습니다.`
      : "일부 이미지 OCR 결과를 불러왔습니다.";
    return `${base} 실패 파일은 결과 카드에서 확인해주세요.`;
  }

  return "OCR 결과를 확인하고 필요한 부분을 수정해주세요.";
};

const notifyPurchaseRequestTelegram = async (row) => {
  const purchaseRequestId = row?.request_id || row?.purchase_request_id || row?.id || "";
  if (!purchaseRequestId && !row?.receipt_no) return;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;

    await fetch(`${getSeumBizAdminAssetBaseUrl()}/api/seumbiz/telegram/purchase-request`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        purchase_request_id: purchaseRequestId,
        receipt_no: row?.receipt_no || null,
      }),
    });
  } catch (error) {
    console.warn("SEUMBiz Telegram purchase notification skipped", error);
  }
};

const handleRunOcr = async () => {
  if (isOcrRunning) return;

  const giftType = validateGiftTypeOnly();
  if (!giftType) return;

  const files = getOcrFiles();
  if (!validateOcrFiles(files)) return;

  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session?.access_token) {
    setOcrStatus(LOGIN_EXPIRED_MESSAGE, "error");
    await supabase.auth.signOut().catch(() => {});
    window.setTimeout(redirectToLogin, 700);
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  setOcrRunning(true);
  setOcrStatus("OCR을 실행하고 있습니다.", "");

  try {
    const response = await fetch(`${getSeumBizAdminAssetBaseUrl()}/api/seumbiz/ocr-giftcard`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    const hasPartialItems = Array.isArray(payload.items) && payload.items.length > 0;
    if ((!response.ok || payload.ok === false) && !hasPartialItems) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    if (payload.failures?.length) {
      console.error("SEUMBiz OCR partial failures", payload.failures);
    }

    const newReviewItems = normalizeOcrResponseItems(payload.items || [], giftType);
    ocrReviewItems = [...ocrReviewItems, ...newReviewItems];
    renderOcrReviewItems();
    setOcrStatus(getOcrResultMessage(payload, newReviewItems.length), payload.failureCount ? "error" : "ok");
  } catch (error) {
    console.error("SEUMBiz OCR failed", error);
    setOcrStatus(`OCR 처리에 실패했습니다. ${error.message || "기존 등록 예정 목록은 유지됩니다."}`, "error");
  } finally {
    setOcrRunning(false);
  }
};

const handleOcrReviewInput = (event) => {
  const pinInput = event.target.closest("[data-ocr-pin]");
  const faceInput = event.target.closest("[data-ocr-face-value]");

  if (pinInput) {
    const index = Number(pinInput.dataset.ocrPin);
    ocrReviewItems[index].pin_no = normalizePin(pinInput.value);
    pinInput.value = ocrReviewItems[index].pin_no;
  }

  if (faceInput) {
    const index = Number(faceInput.dataset.ocrFaceValue);
    const amount = Number(String(faceInput.value || "").replace(/[^\d]/g, ""));
    ocrReviewItems[index].face_value = Number.isFinite(amount) && amount > 0 ? amount : null;
    faceInput.value = ocrReviewItems[index].face_value || "";
  }

  renderOcrReviewItems();
};

const addReviewedOcrItems = () => {
  const giftType = validateGiftTypeOnly();
  if (!giftType) return;

  const readyItems = ocrReviewItems
    .filter((item) => isValidPin(item.pin_no))
    .map((item) => ({
      pin_no: item.pin_no,
      face_value: item.face_value || null,
      giftcard_code: giftType.code,
      giftcard_type: giftType.label,
      giftcard_logo_url: giftType.logo_url,
      source: "ocr",
    }));

  if (!readyItems.length) {
    setOcrStatus("등록 예정 목록에 추가할 정상 PIN이 없습니다.", "error");
    return;
  }

  addPendingItems(readyItems);
  ocrReviewItems = ocrReviewItems.filter((item) => !isValidPin(item.pin_no));
  renderOcrReviewItems();
  setOcrStatus("OCR 결과를 등록 예정 목록에 추가했습니다.", "ok");
};

const buildItems = () =>
  getItemsWithStatus().map((item) => ({
    pin_no: item.pin_no,
    face_value: item.face_value || null,
    ocr_source: item.source === "ocr" ? "ocr" : item.source || null,
  }));

const resetInputs = () => {
  if (bulkTextarea) {
    bulkTextarea.value = "";
    updateBulkCounter();
  }

  pendingItems = [];
  ocrReviewItems = [];
  setSelectedFaceValue(null);
  clearDirectInputs();
  renderOcrReviewItems();
  renderPreview();
};

const clearPendingItems = () => {
  pendingItems = [];
  renderPreview();
  setStatus("등록 예정 목록을 비웠습니다.", "");
};

const updateGiftSelection = () => {
  $$(".gift-option").forEach((option) => {
    const input = option.querySelector('input[type="radio"]');
    option.classList.toggle("is-selected", Boolean(input?.checked));
  });

  const giftType = getSelectedGiftType();
  if (selectedGiftLabel && giftType) {
    selectedGiftLabel.textContent = giftType.label;
  }
};

const setRegisterTab = (tabName) => {
  $$("[data-register-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.registerTab === tabName);
  });

  $$("[data-register-panel]").forEach((panel) => {
    const isActive = panel.dataset.registerPanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
};

const updateBulkCounter = () => {
  const counter = $(".paste-box span");
  if (!counter || !bulkTextarea) return;
  counter.textContent = `${bulkTextarea.value.length.toLocaleString("ko-KR")} / 10,000`;
};

const handleManualInput = (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.closest(".pin-row")) return;

  if (!selectedFaceValue) {
    setStatus("직접 입력은 액면가를 먼저 선택해주세요.", "error");
  }

  input.value = input.value.replace(/\D/g, "").slice(0, 4);

  if (input.value.length === 4) {
    const rowInputs = Array.from(input.closest(".pin-row").querySelectorAll("input"));
    const nextInput = rowInputs[rowInputs.indexOf(input) + 1];
    nextInput?.focus();
  }
};

const handleManualPaste = (event) => {
  const text = event.clipboardData?.getData("text") || "";
  if (!text) return;

  if (fillManualPin(text)) {
    event.preventDefault();
    manualRow?.querySelector("input:last-of-type")?.focus();
  }
};

const handleSingleInput = () => {
  if (!singlePinInput) return;
  const raw = singlePinInput.value;
  const normalized = normalizePin(raw);
  singlePinInput.value = normalized.length > 16 ? normalized.slice(0, 16) : raw.replace(/[^\d-]/g, "").slice(0, 19);
};

const handleSubmit = async () => {
  if (submitButton?.dataset.submitting === "true") return;

  const hasSession = await ensureActiveSession();
  if (!hasSession) {
    setStatus(LOGIN_EXPIRED_MESSAGE, "error");
    window.setTimeout(redirectToLogin, 700);
    return;
  }

  if (!window.SEUMBizAuth?.companyId) {
    setSubmitReady();
    setStatus(AUTH_WAIT_MESSAGE, "error");
    return;
  }

  const authContext = window.SEUMBizAuth;
  const giftType = getSelectedGiftType();
  const previewItems = getItemsWithStatus();

  if (!authContext?.companyId) {
    setStatus("업체 인증 정보를 확인하는 중입니다. 잠시 후 다시 시도해주세요.", "error");
    return;
  }

  if (!giftType) {
    setStatus("상품권 종류를 선택해주세요.", "error");
    return;
  }

  if (previewItems.length === 0) {
    setStatus("등록 예정 목록에 핀번호를 1개 이상 추가해주세요.", "error");
    return;
  }

  if (previewItems.some((item) => item.giftcard_code && item.giftcard_code !== giftType.code)) {
    setStatus("선택한 상품권과 등록 예정 목록의 상품권이 다릅니다. 목록을 정리한 뒤 다시 등록해주세요.", "error");
    return;
  }

  const hasBlockingItem = previewItems.some((item) => {
    const isOcrAmountPending = item.source === "ocr" && !item.face_value && item.status === OCR_AMOUNT_PENDING_STATUS;
    return item.statusClass === "is-error" || (item.statusClass === "is-warning" && !isOcrAmountPending);
  });

  if (hasBlockingItem) {
    setStatus("중복, 금액 필요, 형식 오류 상태를 먼저 정리해주세요. OCR 금액 미확정 항목은 접수 후 관리자 검수에서 확정됩니다.", "error");
    return;
  }

  setSubmitting(true);
  setStatus("매입 신청을 등록하고 있습니다.", "");

  try {
    const { data, error } = await supabase.rpc("create_purchase_request", {
      p_giftcard_code: giftType.code,
      p_items: buildItems(),
      p_submitted_memo: null,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    void notifyPurchaseRequestTelegram(row);
    setStatus(`매입 신청이 접수되었습니다. 접수번호: ${row?.receipt_no || "확인 필요"}`, "ok");
    resetInputs();
  } catch (error) {
    console.error("SEUMBiz create_purchase_request failed", error);
    const message = getRpcErrorMessage(error);
    setStatus(message, "error");
    if (message === LOGIN_EXPIRED_MESSAGE) {
      await supabase.auth.signOut().catch(() => {});
      window.setTimeout(redirectToLogin, 700);
    }
  } finally {
    setSubmitting(false);
  }
};

document.addEventListener("change", (event) => {
  if (event.target.matches('input[name="giftCardType"]')) {
    selectGiftcard(event.target.value);
    event.target.closest("details")?.removeAttribute("open");
  }
});

faceValueButtons?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-face-value]");
  if (!button) return;
  setSelectedFaceValue(button.dataset.faceValue);
});

bulkTextarea?.addEventListener("input", updateBulkCounter);
singlePinInput?.addEventListener("input", handleSingleInput);
manualRow?.addEventListener("input", handleManualInput);
manualRow?.addEventListener("paste", handleManualPaste);
addSingleButton?.addEventListener("click", addSinglePin);
addBulkButton?.addEventListener("click", addBulkPins);
clearPendingButton?.addEventListener("click", clearPendingItems);
submitButton?.addEventListener("click", handleSubmit);
runOcrButton?.addEventListener("click", handleRunOcr);
addOcrResultsButton?.addEventListener("click", addReviewedOcrItems);
clearOcrResultsButton?.addEventListener("click", clearOcrReviewItems);
ocrReviewList?.addEventListener("change", handleOcrReviewInput);
ocrReviewList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ocr-remove]");
  if (!button) return;
  removeOcrReviewItem(Number(button.dataset.ocrRemove));
});
ocrInput?.addEventListener("change", () => {
  const files = getOcrFiles();
  ocrReviewItems = [];
  renderOcrReviewItems();
  if (files.length > 10) {
    setOcrStatus("OCR 이미지는 한 번에 최대 10장까지 등록할 수 있습니다.", "error");
    return;
  }
  setOcrStatus(files.length ? `${files.length.toLocaleString("ko-KR")}개 이미지가 선택되었습니다.` : "", "");
});

document.addEventListener("seumbiz:auth-ready", () => {
  setSubmitReady();
});

$$("[data-register-tab]").forEach((button) => {
  button.addEventListener("click", () => setRegisterTab(button.dataset.registerTab));
});

loadGiftcards();
updateBulkCounter();
setSubmitReady();
renderPreview();
