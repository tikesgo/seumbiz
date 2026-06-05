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
const registerAdminNote = $("[data-register-admin-note]");
const registerAdminCount = $("[data-register-admin-count]");
const clearPendingButton = $("#clearPendingItems");
const ocrInput = $("#giftCardImage");
const runOcrButton = $("#runOcrButton");
const ocrReviewList = $("#ocrReviewList");
const addOcrResultsButton = $("#addOcrResultsButton");
const clearOcrResultsButton = $("#clearOcrResultsButton");
const ocrReviewSummary = $("#ocrReviewSummary");
const ocrStatus = $("#ocrStatus");
const ocrPanel = document.querySelector('[data-register-panel="ocr"]');
const ocrDropzone = document.querySelector("[data-ocr-dropzone]");
const ocrImagePreview = $("#ocrImagePreview");
const ocrImagePreviewGrid = $("#ocrImagePreviewGrid");
const ocrImagePreviewEmpty = $("#ocrImagePreviewEmpty");
const ocrImagePreviewCount = $("#ocrImagePreviewCount");
const clearOcrImagesButton = $("#clearOcrImagesButton");

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
const OCR_PIN_READY_STATUS = "PIN \uCD94\uCD9C \uC644\uB8CC";
const OCR_BARCODE_FAST_PATH_ENABLED = true;
const OCR_UPLOAD_BATCH_SIZE = 2;
const OCR_GROUP_SIZE = 5;
const OCR_MAX_FILES = 10;
const OCR_ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const OCR_MAX_FILE_BYTES = 5 * 1024 * 1024;
const OCR_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const BARCODE_DECODE_PATHS = new Set(["barcode_detector", "barcode_zxing"]);

let ocrPasteSequence = 0;
const ocrImagePreviewUrls = [];

const sliceOcrFileGroups = (files) => {
  const groups = [];
  for (let offset = 0; offset < files.length; offset += OCR_GROUP_SIZE) {
    groups.push(files.slice(offset, offset + OCR_GROUP_SIZE));
  }
  return groups;
};

const OCR_ERROR_LABELS = {
  openai_error: { label: "OCR 서버 오류", className: "is-error" },
  openai_rate_limit: { label: "API 제한", className: "is-api-limit" },
  invalid_file: { label: "이미지 형식 오류", className: "is-error" },
  pin_not_found: { label: "PIN 미검출", className: "is-error" },
  pin_format: { label: "형식 오류", className: "is-error" },
  // OCR 패스트패스/보조 OCR의 최우선 목적은 PIN 16자리 추출입니다.
  // face_value는 관리자 승인 단계에서 확정되므로, 카드 UI에서는 금액 문구를 최소화합니다.
  amount_missing: { label: "PIN 추출 완료", className: "is-ready" },
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value) => {
  if (!value) return "0원";
  return `${Number(value).toLocaleString("ko-KR")}원`;
};

const formatPendingListFaceValue = (item) => {
  if (item.face_value) return formatMoney(item.face_value);
  if (item.source === "ocr") return "관리자 확인";
  return "—";
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
  if (!item.face_value && item.source === "ocr") return { label: OCR_PIN_READY_STATUS, className: "is-ready" };
  if (!item.face_value) return { label: "액면가 선택", className: "is-warning" };
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
  const adminPendingCount = items.filter((item) => item.source === "ocr" && !item.face_value).length;

  if (registerCount) registerCount.textContent = items.length.toLocaleString("ko-KR");
  if (registerTotal) registerTotal.textContent = formatMoney(totalFaceValue);
  if (registerAdminNote) registerAdminNote.hidden = adminPendingCount === 0;
  if (registerAdminCount) registerAdminCount.textContent = adminPendingCount.toLocaleString("ko-KR");
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
          <td class="${item.source === "ocr" && !item.face_value ? "preview-face-pending" : ""}">${escapeHtml(formatPendingListFaceValue(item))}</td>
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
  if (clearOcrImagesButton) {
    clearOcrImagesButton.disabled = isRunning;
  }
  ocrDropzone?.classList.toggle("is-disabled", isRunning);
  renderOcrImagePreview();
};

const getOcrFiles = () => Array.from(ocrInput?.files || []);

const isOcrTabActive = () => Boolean(ocrPanel && !ocrPanel.hidden);

const getPasteTimestamp = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}-${map.hour}${map.minute}${map.second}`;
};

const extensionForMime = (mime) => {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
};

const createPasteFileName = (mime, sequence) => {
  const seq = String(sequence).padStart(2, "0");
  return `paste-${getPasteTimestamp()}-${seq}.${extensionForMime(mime)}`;
};

const setOcrInputFiles = (files) => {
  if (!ocrInput) return;
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  ocrInput.files = transfer.files;
};

const resetOcrReviewOnFileChange = () => {
  ocrReviewItems = [];
  renderOcrReviewItems();
};

const revokeOcrImagePreviewUrls = () => {
  ocrImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  ocrImagePreviewUrls.length = 0;
};

const isPasteOcrFile = (file) => /^paste-/i.test(String(file?.name || ""));

const getOcrImageLabel = (file, index, files) => {
  if (isPasteOcrFile(file)) {
    const pasteIndex = files.slice(0, index + 1).filter((item) => isPasteOcrFile(item)).length;
    return `붙여넣기 이미지 ${pasteIndex}`;
  }
  return file.name || `이미지 ${index + 1}`;
};

const renderOcrImagePreview = () => {
  if (!ocrImagePreview || !ocrImagePreviewGrid || !ocrImagePreviewCount) return;

  revokeOcrImagePreviewUrls();

  const files = getOcrFiles();
  ocrImagePreviewCount.textContent = `${files.length} / ${OCR_MAX_FILES}장`;

  if (!files.length) {
    if (ocrImagePreviewEmpty) ocrImagePreviewEmpty.hidden = false;
    ocrImagePreviewGrid.hidden = true;
    ocrImagePreviewGrid.innerHTML = "";
    if (clearOcrImagesButton) {
      clearOcrImagesButton.hidden = true;
      clearOcrImagesButton.disabled = isOcrRunning;
    }
    return;
  }

  if (ocrImagePreviewEmpty) ocrImagePreviewEmpty.hidden = true;
  ocrImagePreviewGrid.hidden = false;
  if (clearOcrImagesButton) {
    clearOcrImagesButton.hidden = false;
    clearOcrImagesButton.disabled = isOcrRunning;
  }

  ocrImagePreviewGrid.innerHTML = files
    .map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      ocrImagePreviewUrls.push(previewUrl);
      const label = getOcrImageLabel(file, index, files);
      const removeDisabled = isOcrRunning ? "disabled" : "";
      return `
        <article class="ocr-image-preview-card">
          <button
            class="ocr-image-preview-remove-button"
            type="button"
            data-ocr-image-remove="${index}"
            aria-label="${escapeHtml(label)} 삭제"
            ${removeDisabled}
          >×</button>
          <div class="ocr-image-preview-thumb">
            <img src="${previewUrl}" alt="" loading="lazy" />
          </div>
          <p class="ocr-image-preview-label" title="${escapeHtml(label)}">${escapeHtml(label)}</p>
        </article>
      `;
    })
    .join("");
};

const removeOcrImageAt = (index) => {
  if (isOcrRunning) return;
  const files = getOcrFiles();
  if (!Number.isInteger(index) || index < 0 || index >= files.length) return;

  const remaining = files.filter((_, fileIndex) => fileIndex !== index);
  setOcrInputFiles(remaining);
  syncOcrInputChange();
};

const clearOcrImages = () => {
  if (isOcrRunning) return;
  setOcrInputFiles([]);
  syncOcrInputChange();
};

const syncOcrInputChange = (options = {}) => {
  const files = getOcrFiles();
  resetOcrReviewOnFileChange();

  if (files.length > OCR_MAX_FILES) {
    setOcrStatus("OCR 이미지는 최대 10장까지 등록할 수 있습니다.", "error");
    renderOcrImagePreview();
    return { ok: false, files };
  }

  if (options.pasteAdded) {
    setOcrStatus(
      `붙여넣기 이미지 ${options.pasteAdded.toLocaleString("ko-KR")}장이 추가되었습니다. 총 ${files.length}/${OCR_MAX_FILES}장`,
      "ok",
    );
    renderOcrImagePreview();
    return { ok: true, files };
  }

  setOcrStatus(files.length ? `${files.length.toLocaleString("ko-KR")}개 이미지가 선택되었습니다.` : "", "");
  renderOcrImagePreview();
  return { ok: true, files };
};

const extractClipboardImageFiles = (clipboardData) => {
  const blobs = [];
  for (const item of Array.from(clipboardData?.items || [])) {
    if (!item.type.startsWith("image/")) continue;
    const blob = item.getAsFile();
    if (blob) blobs.push(blob);
  }
  return blobs;
};

const blobToOcrFile = (blob, sequence) => {
  const mime = OCR_ALLOWED_IMAGE_TYPES.has(blob.type) ? blob.type : "image/png";
  return new File([blob], createPasteFileName(mime, sequence), {
    type: mime,
    lastModified: Date.now(),
  });
};

const appendOcrFiles = (newFiles) => {
  const existing = getOcrFiles();
  const merged = [...existing, ...newFiles];

  if (merged.length > OCR_MAX_FILES) {
    return { ok: false, reason: "max_files", added: 0, total: existing.length };
  }

  const oversized = newFiles.find((file) => file.size > OCR_MAX_FILE_BYTES);
  if (oversized) {
    return { ok: false, reason: "max_file_size", added: 0, total: existing.length };
  }

  const totalSize = merged.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > OCR_MAX_TOTAL_BYTES) {
    return { ok: false, reason: "max_total_size", added: 0, total: existing.length };
  }

  setOcrInputFiles(merged);
  return { ok: true, added: newFiles.length, total: merged.length };
};

const isOcrPasteTarget = (target) => {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return true;
  if (target.isContentEditable) return true;
  if (target.closest(".paste-box, #pinBulkText, .single-manual-row, [data-ocr-pin], [data-ocr-face-value]")) {
    return true;
  }
  return false;
};

const handleOcrPaste = (event) => {
  if (!isOcrTabActive() || isOcrRunning || isOcrPasteTarget(event.target)) return;

  const blobs = extractClipboardImageFiles(event.clipboardData);
  if (!blobs.length) return;

  event.preventDefault();
  event.stopPropagation();

  const existing = getOcrFiles();
  if (existing.length >= OCR_MAX_FILES) {
    setOcrStatus("OCR 이미지는 최대 10장까지 등록할 수 있습니다.", "error");
    return;
  }

  const newFiles = [];
  for (const blob of blobs) {
    if (existing.length + newFiles.length >= OCR_MAX_FILES) break;
    ocrPasteSequence += 1;
    newFiles.push(blobToOcrFile(blob, ocrPasteSequence));
  }

  if (!newFiles.length) {
    setOcrStatus("OCR 이미지는 최대 10장까지 등록할 수 있습니다.", "error");
    return;
  }

  const result = appendOcrFiles(newFiles);
  if (!result.ok) {
    if (result.reason === "max_total_size") {
      setOcrStatus("전체 이미지 용량은 50MB 이하만 업로드할 수 있습니다.", "error");
      return;
    }
    if (result.reason === "max_file_size") {
      setOcrStatus("지원하지 않는 형식 또는 5MB 초과 이미지는 실패 항목으로 표시됩니다.", "error");
      return;
    }
    setOcrStatus("OCR 이미지는 최대 10장까지 등록할 수 있습니다.", "error");
    return;
  }

  syncOcrInputChange({ pasteAdded: result.added });
};

const validateOcrFiles = (files) => {
  if (!files.length) {
    setOcrStatus("OCR을 실행할 이미지를 선택해주세요.", "error");
    return false;
  }

  if (files.length > OCR_MAX_FILES) {
    setOcrStatus("OCR 이미지는 최대 10장까지 등록할 수 있습니다.", "error");
    return false;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > OCR_MAX_TOTAL_BYTES) {
    setOcrStatus("전체 이미지 용량은 50MB 이하만 업로드할 수 있습니다.", "error");
    return false;
  }

  const hasInvalidFile = files.some((file) => !OCR_ALLOWED_IMAGE_TYPES.has(file.type) || file.size > OCR_MAX_FILE_BYTES);
  if (hasInvalidFile) {
    setOcrStatus("지원하지 않는 형식 또는 5MB 초과 이미지는 실패 항목으로 표시됩니다.", "");
  }

  return true;
};

const getOcrReviewStatus = (item) => {
  const pin = normalizePin(item.pin_no);
  const faceValue = Number(item.face_value) || 0;
  const errorType = String(item.error_type || "").trim();

  if (errorType && OCR_ERROR_LABELS[errorType]) {
    return OCR_ERROR_LABELS[errorType];
  }

  const warning = String(item.warning || "");
  const warningText = warning.toLowerCase();

  if (
    item.failed &&
    (warningText.includes("rate limit") ||
      warningText.includes("rate_limit") ||
      warningText.includes("429") ||
      warningText.includes("too many requests"))
  ) {
    return OCR_ERROR_LABELS.openai_rate_limit;
  }

  if (
    item.failed &&
    (warning.includes("지원하지 않는 이미지 형식") ||
      warning.includes("HEIC") ||
      warning.includes("JPG, PNG, WEBP") ||
      warning.includes("5MB"))
  ) {
    return OCR_ERROR_LABELS.invalid_file;
  }

  if (item.failed) return OCR_ERROR_LABELS.openai_error;
  if (!pin || warning.includes("PIN 번호를 찾지 못했습니다")) return OCR_ERROR_LABELS.pin_not_found;
  if (!isValidPin(pin)) return OCR_ERROR_LABELS.pin_format;
  if (!faceValue) return OCR_ERROR_LABELS.amount_missing;
  if (selectedGiftcard?.enabled_amounts?.length && !selectedGiftcard.enabled_amounts.includes(faceValue)) {
    return { label: "검토 필요", className: "is-warning" };
  }
  if (item.warning) return { label: "검토 필요", className: "is-warning" };
  return { label: "정상", className: "is-ready" };
};

const isBarcodeDecodePath = (decodePath) => BARCODE_DECODE_PATHS.has(String(decodePath || "").trim());

const getOcrReviewMetaMessage = (item, confidence) => {
  if (
    OCR_BARCODE_FAST_PATH_ENABLED &&
    isBarcodeDecodePath(item.decode_path) &&
    isValidPin(normalizePin(item.pin_no)) &&
    !item.face_value
  ) {
    return "바코드에서 PIN 추출 완료";
  }

  const errorType = String(item.error_type || "").trim();
  const userMessage = getOcrUserMessage(errorType, item);
  if (userMessage) return userMessage;

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

const getOcrUserMessage = (errorType, item) => {
  switch (errorType) {
    case "openai_error":
      return item.warning ? String(item.warning) : "OCR 서버 오류가 발생했습니다.";
    case "openai_rate_limit":
      return "OpenAI 처리 제한으로 잠시 후 다시 시도해주세요.";
    case "invalid_file":
      return "JPG, PNG, WEBP 형식만 지원합니다.";
    case "pin_not_found":
      return "PIN 번호를 찾지 못했습니다.";
    case "pin_format":
      return "16자리 PIN 번호를 확인해 주세요.";
    case "amount_missing":
      return "PIN 추출 완료. 관리자 검수 후 확정됩니다.";
    default:
      return "";
  }
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
    if (OCR_BARCODE_FAST_PATH_ENABLED) {
      const barcodeCount = ocrReviewItems.filter((item) => isBarcodeDecodePath(item.decode_path)).length;
      const serverCount = ocrReviewItems.length - barcodeCount;
      ocrReviewSummary.textContent =
        barcodeCount > 0
          ? `PIN 추출 결과 ${ocrReviewItems.length.toLocaleString("ko-KR")}건 (바코드 ${barcodeCount.toLocaleString("ko-KR")} · 보조 OCR ${serverCount.toLocaleString("ko-KR")})`
          : `PIN 추출 결과 ${ocrReviewItems.length.toLocaleString("ko-KR")}건`;
    } else {
      ocrReviewSummary.textContent = `OCR 결과 ${ocrReviewItems.length.toLocaleString("ko-KR")}건`;
    }
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
    error_type: item.error_type || "",
    decode_path: item.decode_path || "",
    barcode_elapsed_ms: item.barcode_elapsed_ms ?? null,
    giftcard_code: giftType.code,
    giftcard_type: giftType.label,
    giftcard_logo_url: giftType.logo_url,
    source: "ocr",
  }));

const countOcrReviewOutcome = (items) => {
  const successCount = (items || []).filter((item) => isValidPin(item.pin_no)).length;
  return {
    successCount,
    failureCount: Math.max((items || []).length - successCount, 0),
  };
};

const getOcrResultMessage = (summary) => {
  const failureCount = Number(summary?.failureCount || 0);
  const successCount = Number(summary?.successCount || 0);
  const processedCount = Number(summary?.processedCount || 0);
  const itemCount = Number(summary?.itemCount || 0);
  const elapsedMs = Number(summary?.elapsedMs || 0);
  const elapsedLabel = elapsedMs > 0 ? ` (${(elapsedMs / 1000).toFixed(1)}초)` : "";
  const barcodeCount = Number(summary?.barcodeCount || 0);
  const serverOcrCount = Number(summary?.serverOcrCount || 0);
  const barcodePrefix =
    OCR_BARCODE_FAST_PATH_ENABLED && (barcodeCount > 0 || serverOcrCount > 0)
      ? `바코드 ${barcodeCount.toLocaleString("ko-KR")}건 · 보조 OCR ${serverOcrCount.toLocaleString("ko-KR")}건 · `
      : "";

  if (!itemCount && !processedCount) {
    return failureCount
      ? `실패 ${failureCount.toLocaleString("ko-KR")}건. 실패 이미지는 아래 카드에서 사유를 확인해주세요.${elapsedLabel}`
      : "OCR 결과가 없습니다. 이미지를 다시 확인해주세요.";
  }

  if (failureCount && successCount) {
    return `${barcodePrefix}PIN 추출 성공 ${successCount.toLocaleString("ko-KR")}건 · PIN 추출 실패 ${failureCount.toLocaleString("ko-KR")}건${elapsedLabel}. 실패 이미지는 아래 카드에서 사유를 확인해주세요.`;
  }

  if (failureCount) {
    return `${barcodePrefix}PIN 추출 실패 ${failureCount.toLocaleString("ko-KR")}건${elapsedLabel}. 실패 이미지는 아래 카드에서 사유를 확인해주세요.`;
  }

  if (OCR_BARCODE_FAST_PATH_ENABLED && barcodeCount > 0 && serverOcrCount === 0) {
    return `PIN ${barcodeCount.toLocaleString("ko-KR")}건 추출 완료${elapsedLabel}.`;
  }

  return `${barcodePrefix}PIN ${successCount.toLocaleString("ko-KR")}건 추출 완료${elapsedLabel}. 카드에서 PIN을 확인해주세요.`;
};

const mergeOcrResultsInFileOrder = (files, barcodeItems, serverItems) => {
  const serverMap = new Map((serverItems || []).map((item) => [item.image_name, item]));
  const barcodeMap = new Map((barcodeItems || []).map((item) => [item.image_name, item]));
  const merged = [];

  for (const file of files) {
    const imageName = file.name;
    const serverItem = serverMap.get(imageName);
    const barcodeItem = barcodeMap.get(imageName);
    const serverPinValid = serverItem ? isValidPin(normalizePin(serverItem.pin_no)) : false;
    const barcodePinValid = barcodeItem ? isValidPin(normalizePin(barcodeItem.pin_no)) : false;

    if (serverPinValid) {
      merged.push(serverItem);
    } else if (barcodePinValid) {
      merged.push(barcodeItem);
    } else if (serverItem) {
      merged.push(serverItem);
    } else if (barcodeItem) {
      merged.push(barcodeItem);
    }
  }

  return merged;
};

const runServerOcrBatches = async (files, accessToken, options = {}) => {
  const totalFiles = Number(options.totalFiles || files.length);
  let processedFiles = Number(options.processedOffset || 0);
  const mergedItems = [];
  const mergedFailures = [];
  const statusPrefix = String(options.statusPrefix || "");
  const fileGroups = sliceOcrFileGroups(files);

  for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex += 1) {
    const groupFiles = fileGroups[groupIndex];

    for (let offset = 0; offset < groupFiles.length; offset += OCR_UPLOAD_BATCH_SIZE) {
      const chunk = groupFiles.slice(offset, offset + OCR_UPLOAD_BATCH_SIZE);
      const progressLine = `${processedFiles}/${totalFiles} 처리 완료`;
      setOcrStatus(
        statusPrefix
          ? `${statusPrefix}\n${progressLine}`
          : totalFiles > 1
            ? `OCR 처리 중입니다.\n${progressLine}`
            : "OCR 처리 중입니다.",
      );

      const payload = await requestOcrBatch(chunk, accessToken);
      processedFiles += Number(payload.processedCount || chunk.length);

      if (payload.failures?.length) {
        console.error("SEUMBiz OCR partial failures", payload.failures);
        mergedFailures.push(...payload.failures);
      }

      mergedItems.push(...(payload.items || []));
      const doneLine = `${Math.min(processedFiles, totalFiles)}/${totalFiles} 처리 완료`;
      setOcrStatus(
        statusPrefix ? `${statusPrefix}\n${doneLine}` : `OCR 처리 중입니다.\n${doneLine}`,
      );
    }
  }

  return { mergedItems, mergedFailures, processedFiles };
};

const requestOcrBatch = async (files, accessToken) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const response = await fetch(`${getSeumBizAdminAssetBaseUrl()}/api/seumbiz/ocr-giftcard`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  const hasPartialItems = Array.isArray(payload.items) && payload.items.length > 0;

  if ((!response.ok || payload.ok === false) && !hasPartialItems) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }

  return payload;
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

const finalizeOcrRun = (mergedItems, giftType, startedAt, summaryExtras = {}) => {
  const newReviewItems = normalizeOcrResponseItems(mergedItems, giftType);
  ocrReviewItems = [...ocrReviewItems, ...newReviewItems];
  renderOcrReviewItems();

  const outcome = countOcrReviewOutcome(newReviewItems);
  const summary = {
    processedCount: summaryExtras.processedCount ?? newReviewItems.length,
    successCount: outcome.successCount,
    failureCount: outcome.failureCount,
    itemCount: newReviewItems.length,
    elapsedMs: Date.now() - startedAt,
    barcodeCount: summaryExtras.barcodeCount ?? 0,
    serverOcrCount: summaryExtras.serverOcrCount ?? 0,
  };
  const hasReadyItems = newReviewItems.some((item) => isValidPin(item.pin_no));
  setOcrStatus(
    getOcrResultMessage(summary),
    summary.failureCount && !hasReadyItems ? "error" : summary.failureCount ? "" : "ok",
  );
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

  setOcrRunning(true);
  const totalFiles = files.length;
  const startedAt = Date.now();

  setOcrStatus(totalFiles > 1 ? `${totalFiles}장 분석 중...` : "OCR 처리 중입니다.", "");

  try {
    if (!OCR_BARCODE_FAST_PATH_ENABLED) {
      const { mergedItems } = await runServerOcrBatches(files, session.access_token, { totalFiles });
      finalizeOcrRun(mergedItems, giftType, startedAt, {
        processedCount: totalFiles,
        barcodeCount: 0,
        serverOcrCount: totalFiles,
      });
      return;
    }

    const { scanBarcodeFromFiles, scanResultToOcrItem } = await import("./ocr-barcode-scan.js");
    let barcodeScanned = 0;

    setOcrStatus(`바코드 스캔 중...\n0/${totalFiles}`);
    const barcodeScanMap = await scanBarcodeFromFiles(files, {
      onProgress: ({ completed, total }) => {
        barcodeScanned = completed;
        setOcrStatus(`바코드 스캔 중...\n${completed}/${total}`);
      },
    });

    const barcodeItems = [];
    const serverTargetFiles = [];

    for (const file of files) {
      const scanResult = barcodeScanMap.get(file);
      const ocrItem = scanResult ? scanResultToOcrItem(file, scanResult) : null;
      if (ocrItem) {
        barcodeItems.push(ocrItem);
      } else {
        serverTargetFiles.push(file);
      }
    }

    console.log("[SEUMBiz OCR Barcode Fast-Path]", {
      totalFiles,
      barcodeSuccessCount: barcodeItems.length,
      serverTargetCount: serverTargetFiles.length,
      barcodeScanned,
    });

    let serverItems = [];
    if (serverTargetFiles.length) {
      const statusPrefix = `바코드 ${barcodeItems.length}건 · OCR 처리 중`;
      const { mergedItems } = await runServerOcrBatches(serverTargetFiles, session.access_token, {
        totalFiles: serverTargetFiles.length,
        statusPrefix,
      });
      serverItems = mergedItems;
    }

    const mergedItems = mergeOcrResultsInFileOrder(files, barcodeItems, serverItems);
    finalizeOcrRun(mergedItems, giftType, startedAt, {
      processedCount: totalFiles,
      barcodeCount: barcodeItems.length,
      serverOcrCount: serverTargetFiles.length,
    });
  } catch (batchError) {
    console.error("SEUMBiz OCR failed", batchError);
    setOcrStatus(`OCR 처리에 실패했습니다. ${batchError.message || "기존 등록 예정 목록은 유지됩니다."}`, "error");
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
    const isOcrPinReady = item.source === "ocr" && !item.face_value && item.status === OCR_PIN_READY_STATUS;
    return item.statusClass === "is-error" || (item.statusClass === "is-warning" && !isOcrPinReady);
  });

  if (hasBlockingItem) {
    setStatus("중복, 액면가 선택, 형식 오류 상태를 먼저 정리해주세요. OCR PIN 추출 완료 항목은 접수 후 관리자가 금액을 확정합니다.", "error");
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
  syncOcrInputChange();
});
ocrImagePreviewGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ocr-image-remove]");
  if (!button || button.disabled) return;
  removeOcrImageAt(Number(button.dataset.ocrImageRemove));
});
clearOcrImagesButton?.addEventListener("click", clearOcrImages);
ocrDropzone?.addEventListener("click", () => {
  if (!isOcrTabActive() || isOcrRunning) return;
  ocrInput?.click();
});
ocrDropzone?.addEventListener("keydown", (event) => {
  if (!isOcrTabActive() || isOcrRunning) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    ocrInput?.click();
  }
});
document.addEventListener("paste", handleOcrPaste, true);

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
renderOcrImagePreview();
