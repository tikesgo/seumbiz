const ACTION_STATUSES = ["승인", "대기", "취소"];
const config = window.ADMIN_CONFIG || {};

const loginPanel = document.querySelector("#loginPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const adminContent = document.querySelector("#adminContent");
const ordersBody = document.querySelector("#ordersBody");
const stateMessage = document.querySelector("#stateMessage");
const bulkDetailModal = document.querySelector("#bulkDetailModal");
const bulkDetailBackdrop = document.querySelector("#bulkDetailBackdrop");
const bulkDetailClose = document.querySelector("#bulkDetailClose");
const bulkDetailTitle = document.querySelector("#bulkDetailTitle");
const bulkDetailSummary = document.querySelector("#bulkDetailSummary");
const bulkDetailHeadRow = document.querySelector("#bulkDetailHeadRow");
const bulkDetailBody = document.querySelector("#bulkDetailBody");
const bulkCopyButton = document.querySelector("#bulkCopyButton");
const adminLogoButton = document.querySelector("#adminLogoButton");
const alertToggleButton = document.querySelector("#alertToggleButton");
const vendorAlertToggleButton = document.querySelector("#vendorAlertToggleButton");
const refreshButton = document.querySelector("#refreshButton");
const logoutButton = document.querySelector("#logoutButton");
const vendorToast = document.querySelector("#vendorToast");
const headerTime = document.querySelector("#headerTime");
const lastLoaded = document.querySelector("#lastLoaded");
const searchForm = document.querySelector("#searchForm");
const nameSearch = document.querySelector("#nameSearch");
const phoneSearch = document.querySelector("#phoneSearch");
const resetSearchButton = document.querySelector("#resetSearchButton");
const periodFilter = document.querySelector("#periodFilter");
const dateRangeFields = document.querySelector("#dateRangeFields");
const startDateFilter = document.querySelector("#startDateFilter");
const endDateFilter = document.querySelector("#endDateFilter");
const soundPanel = document.querySelector("#soundPanel");
const ordersTab = document.querySelector("#ordersTab");
const vendorsTab = document.querySelector("#vendorsTab");
const vendorReadyBadge = document.querySelector("#vendorReadyBadge");
const giftCardsTab = document.querySelector("#giftCardsTab");
const banksTab = document.querySelector("#banksTab");
const bannersTab = document.querySelector("#bannersTab");
const giftSalesTab = document.querySelector("#giftSalesTab");
const noticesTab = document.querySelector("#noticesTab");
const settingsTab = document.querySelector("#settingsTab");
const ordersView = document.querySelector("#ordersView");
const vendorsView = document.querySelector("#vendorsView");
const giftCardsView = document.querySelector("#giftCardsView");
const banksView = document.querySelector("#banksView");
const bannersView = document.querySelector("#bannersView");
const giftSalesView = document.querySelector("#giftSalesView");
const noticesView = document.querySelector("#noticesView");
const settingsView = document.querySelector("#settingsView");
const vendorInquiriesBody = document.querySelector("#vendorInquiriesBody");
const vendorInquiriesMessage = document.querySelector("#vendorInquiriesMessage");
const vendorInquiriesLoaded = document.querySelector("#vendorInquiriesLoaded");
const vendorInquiryDetailPanel = document.querySelector("#vendorInquiryDetailPanel");
const vendorInquiryDetailInfo = document.querySelector("#vendorInquiryDetailInfo");
const vendorInquiryForm = document.querySelector("#vendorInquiryForm");
const vendorInquiryStatus = document.querySelector("#vendorInquiryStatus");
const vendorInquiryMemo = document.querySelector("#vendorInquiryMemo");
const vendorInquirySaveButton = document.querySelector("#vendorInquirySaveButton");
const giftCardsBody = document.querySelector("#giftCardsBody");
const giftCardForm = document.querySelector("#giftCardForm");
const giftCardMessage = document.querySelector("#giftCardMessage");
const giftCardsLoaded = document.querySelector("#giftCardsLoaded");
const banksBody = document.querySelector("#banksBody");
const bankForm = document.querySelector("#bankForm");
const bankMessage = document.querySelector("#bankMessage");
const banksLoaded = document.querySelector("#banksLoaded");
const bannersBody = document.querySelector("#bannersBody");
const bannerForm = document.querySelector("#bannerForm");
const bannerMessage = document.querySelector("#bannerMessage");
const bannersLoaded = document.querySelector("#bannersLoaded");
const giftSalesFilterForm = document.querySelector("#giftSalesFilterForm");
const giftSalesStartDate = document.querySelector("#giftSalesStartDate");
const giftSalesEndDate = document.querySelector("#giftSalesEndDate");
const giftSalesTodayButton = document.querySelector("#giftSalesTodayButton");
const giftSalesYesterdayButton = document.querySelector("#giftSalesYesterdayButton");
const giftSalesThisMonthButton = document.querySelector("#giftSalesThisMonthButton");
const giftSalesLoaded = document.querySelector("#giftSalesLoaded");
const giftSalesProductBody = document.querySelector("#giftSalesProductBody");
const giftSalesAmountBody = document.querySelector("#giftSalesAmountBody");
const giftSalesStatusBody = document.querySelector("#giftSalesStatusBody");
const noticesBody = document.querySelector("#noticesBody");
const noticeForm = document.querySelector("#noticeForm");
const noticeId = document.querySelector("#noticeId");
const noticeTitle = document.querySelector("#noticeTitle");
const noticeContent = document.querySelector("#noticeContent");
const noticeCreatedAt = document.querySelector("#noticeCreatedAt");
const noticeScheduledAt = document.querySelector("#noticeScheduledAt");
const noticeAttachment = document.querySelector("#noticeAttachment");
const noticeAttachmentName = document.querySelector("#noticeAttachmentName");
const noticeImportant = document.querySelector("#noticeImportant");
const noticeVisible = document.querySelector("#noticeVisible");
const openNoticeFormButton = document.querySelector("#openNoticeFormButton");
const noticeSubmitButton = document.querySelector("#noticeSubmitButton");
const noticeCancelButton = document.querySelector("#noticeCancelButton");
const noticeMessage = document.querySelector("#noticeMessage");
const noticesLoaded = document.querySelector("#noticesLoaded");
const siteSettingsForm = document.querySelector("#siteSettingsForm");
const consultPhoneInput = document.querySelector("#consultPhoneInput");
const kakaoOpenchatUrlInput = document.querySelector("#kakaoOpenchatUrlInput");
const siteSettingsSubmitButton = document.querySelector("#siteSettingsSubmitButton");
const siteSettingsMessage = document.querySelector("#siteSettingsMessage");
const siteSettingsLoaded = document.querySelector("#siteSettingsLoaded");
const SITE_SETTING_DEFAULTS = {
  consult_phone: "010-8310-5150",
  kakao_openchat_url: "",
  business_name: "세움기프트",
  business_ceo: "입력필요",
  business_registration_number: "입력필요",
  mail_order_number: "입력필요",
  business_address: "입력필요",
  business_phone: "010-8310-5150",
  business_email: "acro7888@gmail.com",
  business_hours: "24시간 연중무휴",
  footer_copyright: "© 세움기프트. All rights reserved."
};
const LOGGED_OUT_KEY = "seeumgift-admin-logged-out";
const ALERT_ENABLED_KEY = "seeumgift-admin-alert-enabled";
const VENDOR_ALERT_ENABLED_KEY = "seeumgift-admin-vendor-alert-enabled";
const AUTO_REFRESH_MS = 3000;
const ALERT_REPEAT_MS = 3000;
const VENDOR_REFRESH_MS = 30000;
const VENDOR_ALERT_REPEAT_MS = 1000;
let allOrders = [];
let alertAudio = null;
let vendorAlertAudio = null;
let alertsEnabled = false;
let vendorAlertsEnabled = localStorage.getItem(VENDOR_ALERT_ENABLED_KEY) !== "false";
localStorage.setItem(ALERT_ENABLED_KEY, "false");
let refreshTimer = null;
let vendorRefreshTimer = null;
let alertInterval = null;
let vendorAlertInterval = null;
let clockTimer = null;
let isLoadingOrders = false;
let hasLoadedOrdersOnce = false;
let knownOrderIds = new Set();
let activeNameKeyword = "";
let activePhoneKeyword = "";
let activeDateRange = null;
let activeGiftSalesDateRange = null;
let allVendorInquiries = [];
let hasLoadedVendorInquiries = false;
let knownVendorPendingIds = new Set();
let selectedVendorInquiryId = "";
let vendorToastTimer = null;
let allGiftCards = [];
let hasLoadedGiftCards = false;
let allBanks = [];
let hasLoadedBanks = false;
let allBanners = [];
let hasLoadedBanners = false;
let allNotices = [];
let hasLoadedNotices = false;
let hasLoadedSiteSettings = false;
let activeBulkDetailItems = [];
let activeDetailPinGetter = getBulkItemPin;

const counters = {
  total: document.querySelector("#totalCount"),
  ready: document.querySelector("#readyCount"),
  working: document.querySelector("#workingCount"),
  done: document.querySelector("#doneCount")
};
const salesCounters = {
  amount: document.querySelector("#salesTotalAmount"),
  payout: document.querySelector("#salesTotalPayout"),
  count: document.querySelector("#salesTotalCount")
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await login(new FormData(loginForm).get("password"));
});

refreshButton.addEventListener("click", () => {
  loadOrders({ silent: false });
});

adminLogoButton.addEventListener("click", () => {
  showAdminView("orders");
});

alertToggleButton.addEventListener("pointerdown", () => {
  unlockAlertSound();
});

document.addEventListener(
  "pointerdown",
  () => {
    unlockAlertSound();
  },
  { once: true }
);

alertToggleButton.addEventListener("click", async () => {
  alertsEnabled = !alertsEnabled;
  localStorage.setItem(ALERT_ENABLED_KEY, String(alertsEnabled));
  if (alertsEnabled) {
    await unlockAlertSound();
  }
  updateAlertToggle();
  applyFilters();
  syncAlertPanel();
});

vendorAlertToggleButton.addEventListener("pointerdown", () => {
  if (vendorAlertsEnabled) {
    unlockVendorAlertSound();
  }
});

vendorAlertToggleButton.addEventListener("click", async () => {
  vendorAlertsEnabled = !vendorAlertsEnabled;
  localStorage.setItem(VENDOR_ALERT_ENABLED_KEY, String(vendorAlertsEnabled));
  if (vendorAlertsEnabled) {
    await unlockVendorAlertSound();
  }
  updateVendorAlertToggle();
  syncVendorInquiryAlerts(allVendorInquiries);
});

logoutButton.addEventListener("click", (event) => {
  event.preventDefault();
  logout();
});

bulkDetailBackdrop?.addEventListener("click", closeBulkDetailModal);
bulkDetailClose?.addEventListener("click", closeBulkDetailModal);
bulkCopyButton?.addEventListener("click", copyBulkPins);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && bulkDetailModal && !bulkDetailModal.hidden) {
    closeBulkDetailModal();
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  activeNameKeyword = normalizeSearch(nameSearch.value);
  activePhoneKeyword = normalizePhoneSearch(phoneSearch.value);
  activeDateRange = getSelectedDateRange();
  applyFilters();
});

resetSearchButton.addEventListener("click", () => {
  searchForm.reset();
  activeNameKeyword = "";
  activePhoneKeyword = "";
  activeDateRange = null;
  updateDateRangeVisibility();
  renderOrders(allOrders);
  showState(allOrders.length ? "" : "아직 접수된 신청이 없습니다.", "muted");
});

periodFilter.addEventListener("change", updateDateRangeVisibility);

ordersTab.addEventListener("click", () => {
  showAdminView("orders");
});

vendorsTab.addEventListener("click", () => {
  showAdminView("vendors");
  if (!hasLoadedVendorInquiries) {
    loadVendorInquiries();
  } else {
    renderVendorInquiries(allVendorInquiries);
    syncSelectedVendorInquiryDetail();
    showVendorInquiryMessage(allVendorInquiries.length ? "" : "업체매입 문의가 없습니다.", "muted");
  }
});

vendorInquiryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSelectedVendorInquiry();
});

giftCardsTab.addEventListener("click", () => {
  showAdminView("giftCards");
  if (!hasLoadedGiftCards) {
    loadGiftCards();
  }
});

banksTab.addEventListener("click", () => {
  showAdminView("banks");
  if (!hasLoadedBanks) {
    loadBanks();
  }
});

bannersTab.addEventListener("click", () => {
  showAdminView("banners");
  if (!hasLoadedBanners) {
    loadBanners();
  }
});

giftSalesTab.addEventListener("click", () => {
  showAdminView("giftSales");
  renderGiftSales();
});

noticesTab.addEventListener("click", () => {
  showAdminView("notices");
  if (!hasLoadedNotices) {
    loadNotices();
  }
});

settingsTab.addEventListener("click", () => {
  showAdminView("settings");
  if (!hasLoadedSiteSettings) {
    loadSiteSettings();
  }
});

siteSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSiteSettings();
});

giftCardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createGiftCard(new FormData(giftCardForm));
});

bankForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createBank(new FormData(bankForm));
});

bannerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createBanner(new FormData(bannerForm));
});

giftSalesFilterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  activeGiftSalesDateRange = getGiftSalesDateRange();
  renderGiftSales();
});

giftSalesTodayButton.addEventListener("click", () => setGiftSalesQuickRange("today"));
giftSalesYesterdayButton.addEventListener("click", () => setGiftSalesQuickRange("yesterday"));
giftSalesThisMonthButton.addEventListener("click", () => setGiftSalesQuickRange("thisMonth"));

noticeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveNotice();
});

openNoticeFormButton.addEventListener("click", () => {
  openNoticeForm();
});

noticeCancelButton.addEventListener("click", () => {
  resetNoticeForm();
});

noticeAttachment.addEventListener("change", () => {
  noticeAttachmentName.textContent = noticeAttachment.files?.[0]?.name || "선택된 파일 없음";
});

updateAlertToggle();
setGiftSalesQuickRange("today", { render: false });
activeGiftSalesDateRange = getGiftSalesDateRange();

if (localStorage.getItem(LOGGED_OUT_KEY) === "true" || sessionStorage.getItem(LOGGED_OUT_KEY) === "true") {
  showLogin();
} else {
  checkSession();
}

async function login(password) {
  setLoginMessage("확인하는 중입니다.", "muted");

  try {
    const response = await fetch("/admin/auth", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setLoginMessage("비밀번호가 맞지 않습니다.", "error");
      return;
    }

    localStorage.removeItem(LOGGED_OUT_KEY);
    sessionStorage.removeItem(LOGGED_OUT_KEY);
    window.location.reload();
  } catch (error) {
    setLoginMessage(`로그인 확인에 실패했습니다. ${error.message}`, "error");
  }
}

async function checkSession() {
  try {
    const response = await fetch("/admin/session", {
      cache: "no-store"
    });
    const result = await response.json();
    if (result.ok) {
      enterAdmin();
      return;
    }
    showLogin();
  } catch {
    showLogin();
  }
}

function enterAdmin() {
  loginPanel.hidden = true;
  adminContent.hidden = false;
  const initialView = window.location.pathname === "/vendors" ? "vendors" : "orders";
  updateVendorAlertToggle();
  showAdminView(initialView);
  if (initialView === "vendors" && !hasLoadedVendorInquiries) {
    loadVendorInquiries({ silent: false });
  } else {
    loadVendorInquiries({ silent: true });
  }
  startHeaderClock();
  loadOrders({ silent: false });
  startAutoRefresh();
  startVendorAutoRefresh();
}

function showLogin() {
  stopAutoRefresh();
  stopVendorAutoRefresh();
  stopHeaderClock();
  stopAlertSound();
  allOrders = [];
  hasLoadedOrdersOnce = false;
  knownOrderIds = new Set();
  allGiftCards = [];
  hasLoadedGiftCards = false;
  allBanks = [];
  hasLoadedBanks = false;
  allBanners = [];
  hasLoadedBanners = false;
  allNotices = [];
  hasLoadedNotices = false;
  hasLoadedSiteSettings = false;
  allVendorInquiries = [];
  hasLoadedVendorInquiries = false;
  knownVendorPendingIds = new Set();
  stopVendorAlertSound();
  selectedVendorInquiryId = "";
  ordersBody.replaceChildren();
  vendorInquiriesBody.replaceChildren();
  vendorInquiryDetailPanel.hidden = true;
  giftCardsBody.replaceChildren();
  banksBody.replaceChildren();
  bannersBody.replaceChildren();
  giftSalesProductBody.replaceChildren();
  giftSalesAmountBody.replaceChildren();
  giftSalesStatusBody.replaceChildren();
  noticesBody.replaceChildren();
  loginPanel.hidden = false;
  adminContent.hidden = true;
}

function showAdminView(view) {
  const views = {
    orders: ordersView,
    vendors: vendorsView,
    giftCards: giftCardsView,
    banks: banksView,
    banners: bannersView,
    giftSales: giftSalesView,
    notices: noticesView,
    settings: settingsView
  };
  const tabs = {
    orders: ordersTab,
    vendors: vendorsTab,
    giftCards: giftCardsTab,
    banks: banksTab,
    banners: bannersTab,
    giftSales: giftSalesTab,
    notices: noticesTab,
    settings: settingsTab
  };

  for (const [key, element] of Object.entries(views)) {
    element.hidden = key !== view;
  }

  for (const [key, element] of Object.entries(tabs)) {
    element.classList.toggle("is-active", key === view);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = window.setInterval(() => {
    loadOrders({ silent: true });
  }, AUTO_REFRESH_MS);
}

function startVendorAutoRefresh() {
  stopVendorAutoRefresh();
  vendorRefreshTimer = window.setInterval(() => {
    loadVendorInquiries({ silent: true });
  }, VENDOR_REFRESH_MS);
}

function stopAutoRefresh() {
  if (!refreshTimer) {
    return;
  }

  window.clearInterval(refreshTimer);
  refreshTimer = null;
}

function stopVendorAutoRefresh() {
  if (!vendorRefreshTimer) {
    return;
  }

  window.clearInterval(vendorRefreshTimer);
  vendorRefreshTimer = null;
}

function startHeaderClock() {
  stopHeaderClock();
  updateHeaderClock();
  clockTimer = window.setInterval(updateHeaderClock, 30_000);
}

function stopHeaderClock() {
  if (!clockTimer) {
    return;
  }

  window.clearInterval(clockTimer);
  clockTimer = null;
}

function updateHeaderClock() {
  headerTime.textContent = `${formatLoadedAt(new Date())} 기준`;
}

async function logout() {
  try {
    await fetch("/admin/logout", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin"
    });
  } finally {
    localStorage.setItem(LOGGED_OUT_KEY, "true");
    sessionStorage.setItem(LOGGED_OUT_KEY, "true");
    localStorage.removeItem("seeumgift-admin-authenticated");
    localStorage.removeItem("admin_session");
    sessionStorage.removeItem("seeumgift-admin-authenticated");
    sessionStorage.removeItem("admin_session");
    showLogin();
    window.location.replace("/admin");
  }
}

async function loadOrders({ silent = true } = {}) {
  if (adminContent.hidden || isLoadingOrders) {
    return;
  }

  if (!hasSupabaseConfig()) {
    showState(".env.local에 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정해 주세요.", "error");
    lastLoaded.textContent = "환경변수 필요";
    return;
  }

  isLoadingOrders = true;
  if (!silent) {
    setLoading(true);
    showState("접수 목록을 불러오는 중입니다.", "muted");
  }

  try {
    const data = await supabaseRequest("/rest/v1/orders?select=*&order=created_at.desc");
    const orders = data || [];

    allOrders = orders;
    knownOrderIds = new Set(allOrders.map(getOrderId).filter(Boolean));
    hasLoadedOrdersOnce = true;
    applyFilters();
    showState(allOrders.length ? "" : "아직 접수된 신청이 없습니다.", "muted");
    lastLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
    renderGiftSales();
    syncAlertPanel();
  } catch (error) {
    showState(`목록을 불러오지 못했습니다. ${error.message}`, "error");
  } finally {
    isLoadingOrders = false;
    if (!silent) {
      setLoading(false);
    }
  }
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${config.supabaseAnonKey}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function hasSupabaseConfig() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function getOrderId(order) {
  const id = order.id || order.order_id || order.uuid;
  if (id === undefined || id === null || id === "") {
    return "";
  }

  return String(id);
}

function encodeFilterValue(value) {
  return encodeURIComponent(value.replace(/"/g, '\\"'));
}

async function updateOrderStatus(orderId, status) {
  const response = await fetch("/admin/orders/status", {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ id: orderId, status })
  });

  const result = await readJsonResponse(response);
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "상태를 저장하지 못했습니다.");
  }

  return result.order;
}

async function deleteOrder(orderId) {
  const response = await fetch("/admin/orders", {
    method: "DELETE",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ id: orderId })
  });

  const result = await readJsonResponse(response);
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "주문을 삭제하지 못했습니다.");
  }

  return result;
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, message: text || `HTTP ${response.status}` };
  }
}

async function loadVendorInquiries({ silent = false } = {}) {
  if (!silent) {
    showVendorInquiryMessage("업체매입 문의 목록을 불러오는 중입니다.", "muted");
    vendorInquiriesLoaded.textContent = "불러오는 중";
  }

  try {
    const response = await fetch("/admin/vendor-inquiries", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "업체매입 문의 목록을 불러오지 못했습니다.");
    }

    allVendorInquiries = result.inquiries || [];
    console.log("[vendor-inquiries] count:", allVendorInquiries.length);
    hasLoadedVendorInquiries = true;
    syncVendorInquiryAlerts(allVendorInquiries);
    if (!vendorsView.hidden) {
      renderVendorInquiries(allVendorInquiries);
      syncSelectedVendorInquiryDetail();
    }
    if (!silent) {
      showVendorInquiryMessage(allVendorInquiries.length ? "" : "업체매입 문의가 없습니다.", "muted");
    }
    vendorInquiriesLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
  } catch (error) {
    if (!silent) {
      showVendorInquiryMessage(`업체매입 문의 목록을 불러오지 못했습니다. ${error.message}`, "error");
    }
  }
}

function renderVendorInquiries(inquiries) {
  vendorInquiriesBody.replaceChildren(
    ...(inquiries.length ? inquiries.map(createVendorInquiryRow) : [emptyRow(8, "업체매입 문의가 없습니다.")])
  );
}

function createVendorInquiryRow(inquiry) {
  const tr = tableRow([
    formatDate(inquiry.created_at),
    inquiry.company_name || "-",
    inquiry.manager_name || "-",
    inquiry.phone || "-",
    inquiry.giftcard_type || "-",
    inquiry.monthly_volume || "-",
    inquiry.status || "대기"
  ]);
  tr.append(createVendorInquiryActionCell(inquiry));
  tr.className = "vendor-inquiry-row";
  tr.tabIndex = 0;
  tr.addEventListener("click", () => showVendorInquiryDetail(inquiry.id));
  tr.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showVendorInquiryDetail(inquiry.id);
    }
  });
  return tr;
}

function createVendorInquiryActionCell(inquiry) {
  const td = document.createElement("td");

  if (isPendingVendorInquiry(inquiry)) {
    const button = document.createElement("button");
    button.className = "search-button compact-button";
    button.type = "button";
    button.textContent = "접수확인";
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      button.disabled = true;
      await confirmVendorInquiry(inquiry.id);
    });
    td.append(button);
  } else {
    td.textContent = "-";
  }

  return td;
}

function showVendorInquiryMessage(message, type) {
  vendorInquiriesMessage.textContent = message;
  vendorInquiriesMessage.dataset.type = type || "";
  vendorInquiriesMessage.hidden = !message;
}

function syncVendorInquiryAlerts(inquiries) {
  const pendingItems = inquiries.filter(isPendingVendorInquiry);
  knownVendorPendingIds = new Set(pendingItems.map(getVendorInquiryId).filter(Boolean));
  updateVendorReadyBadge(pendingItems.length);

  if (pendingItems.length > 0) {
    showVendorToast();
    if (vendorAlertsEnabled) {
      startVendorAlertSound();
    } else {
      stopVendorAlertSound();
    }
    return;
  }

  hideVendorToast();
  stopVendorAlertSound();
}

function isPendingVendorInquiry(inquiry) {
  return String(inquiry.status || "").trim() === "\uB300\uAE30";
}

function getVendorInquiryId(inquiry) {
  return inquiry?.id ? String(inquiry.id) : "";
}

function updateVendorReadyBadge(count) {
  vendorReadyBadge.textContent = String(count);
  vendorReadyBadge.hidden = count <= 0;
}

function updateVendorAlertToggle() {
  vendorAlertToggleButton.textContent = vendorAlertsEnabled ? "\uC5C5\uCCB4\uC54C\uB9BC ON" : "\uC5C5\uCCB4\uC54C\uB9BC OFF";
  vendorAlertToggleButton.dataset.enabled = String(vendorAlertsEnabled);
}

function showVendorToast() {
  vendorToast.hidden = false;
  vendorToast.textContent = "\uB300\uAE30 \uC911\uC778 \uC5C5\uCCB4\uB9E4\uC785 \uBB38\uC758\uAC00 \uC788\uC2B5\uB2C8\uB2E4.";
}

function hideVendorToast() {
  vendorToast.hidden = true;
  if (vendorToastTimer) {
    window.clearTimeout(vendorToastTimer);
    vendorToastTimer = null;
  }
}

function startVendorAlertSound() {
  if (vendorAlertInterval) {
    return;
  }

  playVendorAlertSound();
  vendorAlertInterval = window.setInterval(() => {
    if (!vendorAlertsEnabled || !allVendorInquiries.some(isPendingVendorInquiry)) {
      stopVendorAlertSound();
      return;
    }
    playVendorAlertSound();
  }, VENDOR_ALERT_REPEAT_MS);
}

function stopVendorAlertSound() {
  if (vendorAlertInterval) {
    window.clearInterval(vendorAlertInterval);
    vendorAlertInterval = null;
  }

  if (vendorAlertAudio) {
    vendorAlertAudio.pause();
    vendorAlertAudio.currentTime = 0;
  }
}

function playVendorAlertSound() {
  const audio = getVendorAlertAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

async function unlockVendorAlertSound() {
  try {
    const audio = getVendorAlertAudio();
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch {
    if (vendorAlertAudio) {
      vendorAlertAudio.muted = false;
    }
  }
}

function getVendorAlertAudio() {
  if (!vendorAlertAudio) {
    vendorAlertAudio = new Audio(createAlertSoundDataUrl());
    vendorAlertAudio.preload = "auto";
  }

  return vendorAlertAudio;
}

function syncSelectedVendorInquiryDetail() {
  if (!selectedVendorInquiryId || vendorInquiryDetailPanel.hidden) {
    return;
  }

  const inquiry = allVendorInquiries.find((item) => String(item.id) === selectedVendorInquiryId);
  if (inquiry) {
    vendorInquiryStatus.value = inquiry.status || "\uB300\uAE30";
    vendorInquiryMemo.value = inquiry.memo || "";
    renderVendorInquiryDetailInfo(inquiry);
  }
}

function showVendorInquiryDetail(id) {
  const inquiry = allVendorInquiries.find((item) => String(item.id) === String(id));
  if (!inquiry) {
    return;
  }

  selectedVendorInquiryId = String(inquiry.id);
  vendorInquiryDetailPanel.hidden = false;
  vendorInquiryStatus.value = inquiry.status || "\uB300\uAE30";
  vendorInquiryMemo.value = inquiry.memo || "";
  renderVendorInquiryDetailInfo(inquiry);
  showVendorInquiryMessage("상세 정보를 확인한 뒤 상태와 메모를 저장할 수 있습니다.", "muted");
}

function renderVendorInquiryDetailInfo(inquiry) {
  vendorInquiryDetailInfo.replaceChildren(
    detailItem("업체명", inquiry.company_name),
    detailItem("담당자명", inquiry.manager_name),
    detailItem("연락처", inquiry.phone),
    detailItem("이메일", inquiry.email),
    detailItem("상품권 종류", inquiry.giftcard_type),
    detailItem("월 규모", inquiry.monthly_volume),
    detailItem("접수일", formatDate(inquiry.created_at)),
    detailItem("요청사항", inquiry.message, true)
  );
}

function detailItem(label, value, wide = false) {
  const item = document.createElement("div");
  const title = document.createElement("span");
  const content = document.createElement("p");

  item.className = wide ? "vendor-detail-item is-wide" : "vendor-detail-item";
  title.textContent = label;
  content.textContent = value || "-";
  item.append(title, content);
  return item;
}

async function saveSelectedVendorInquiry() {
  if (!selectedVendorInquiryId) {
    showVendorInquiryMessage("저장할 업체매입 문의를 먼저 선택해주세요.", "error");
    return;
  }

  vendorInquirySaveButton.disabled = true;
  showVendorInquiryMessage("업체매입 문의 상태를 저장하는 중입니다.", "muted");

  try {
    const response = await fetch(`/admin/vendor-inquiries/${encodeURIComponent(selectedVendorInquiryId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        status: vendorInquiryStatus.value,
        memo: vendorInquiryMemo.value
      })
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "업체매입 문의를 저장하지 못했습니다.");
    }

    const index = allVendorInquiries.findIndex((item) => String(item.id) === String(selectedVendorInquiryId));
    if (index >= 0) {
      allVendorInquiries[index] = result.inquiry;
    }
    syncVendorInquiryAlerts(allVendorInquiries);
    renderVendorInquiries(allVendorInquiries);
    showVendorInquiryDetail(result.inquiry.id);
    showVendorInquiryMessage("업체매입 문의가 저장되었습니다.", "success");
  } catch (error) {
    showVendorInquiryMessage(`업체매입 문의를 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    vendorInquirySaveButton.disabled = false;
  }
}

async function confirmVendorInquiry(inquiryId) {
  const inquiry = allVendorInquiries.find((item) => String(item.id) === String(inquiryId));

  try {
    const response = await fetch(`/admin/vendor-inquiries/${encodeURIComponent(inquiryId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        status: "\uC811\uC218\uC644\uB8CC",
        memo: inquiry?.memo || ""
      })
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "업체매입 문의를 접수확인하지 못했습니다.");
    }

    const index = allVendorInquiries.findIndex((item) => String(item.id) === String(inquiryId));
    if (index >= 0) {
      allVendorInquiries[index] = result.inquiry;
    }
    syncVendorInquiryAlerts(allVendorInquiries);
    renderVendorInquiries(allVendorInquiries);
    if (selectedVendorInquiryId === String(inquiryId)) {
      showVendorInquiryDetail(result.inquiry.id);
    }
    showVendorInquiryMessage("업체매입 문의가 접수완료로 변경되었습니다.", "success");
  } catch (error) {
    showVendorInquiryMessage(`업체매입 문의를 접수확인하지 못했습니다. ${error.message}`, "error");
  }
}

async function loadGiftCards() {
  showGiftCardMessage("상품권 목록을 불러오는 중입니다.", "muted");
  giftCardsLoaded.textContent = "불러오는 중";

  try {
    const response = await fetch("/admin/gift-cards", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "상품권 목록을 불러오지 못했습니다.");
    }

    allGiftCards = result.giftCards || [];
    hasLoadedGiftCards = true;
    renderGiftCards(allGiftCards);
    showGiftCardMessage(allGiftCards.length ? "" : "등록된 상품권이 없습니다.", "muted");
    giftCardsLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
  } catch (error) {
    showGiftCardMessage(`상품권 목록을 불러오지 못했습니다. ${error.message}`, "error");
  }
}

async function createGiftCard(formData) {
  showGiftCardMessage("상품권을 추가하는 중입니다.", "muted");

  try {
    const imageUrl = await uploadGiftCardImage(formData.get("image"));
    const payload = {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      rate: Number(formData.get("rate")),
      sort_order: parseInt(formData.get("sort_order"), 10),
      image_url: imageUrl,
      is_active: true
    };

    const response = await fetch("/admin/gift-cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "상품권을 추가하지 못했습니다.");
    }

    giftCardForm.reset();
    showGiftCardMessage(imageUrl ? "상품권과 로고가 저장되었습니다." : "상품권이 추가되었습니다.", "success");
    await loadGiftCards();
  } catch (error) {
    showGiftCardMessage(`상품권을 추가하지 못했습니다. ${error.message}`, "error");
  }
}

async function uploadGiftCardImage(file) {
  if (!file || !file.size) {
    return "";
  }

  if (file.type !== "image/png") {
    throw new Error("PNG 파일만 업로드할 수 있습니다.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/admin/gift-cards/upload", {
    method: "POST",
    credentials: "same-origin",
    body: formData
  });
  const result = await readJsonResponse(response);

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "이미지를 업로드하지 못했습니다.");
  }

  return result.image_url || "";
}

async function saveGiftCard(button, giftCardId) {
  const row = button.closest("tr");
  button.disabled = true;
  showGiftCardMessage("상품권 정보를 저장하는 중입니다.", "muted");

  try {
    const imageInput = row.querySelector("[data-field='image_file']");
    const uploadedImageUrl = await uploadGiftCardImage(imageInput?.files?.[0]);
    const currentImageUrl = row.querySelector("[data-field='image_url']").value;
    const payload = {
      id: giftCardId,
      sort_order: parseInt(row.querySelector("[data-field='sort_order']").value, 10),
      name: row.querySelector("[data-field='name']").value.trim(),
      rate: Number(row.querySelector("[data-field='rate']").value),
      image_url: uploadedImageUrl || currentImageUrl,
      is_active: row.querySelector("[data-field='is_active']").checked
    };

    const response = await fetch("/admin/gift-cards", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "상품권 정보를 저장하지 못했습니다.");
    }

    showGiftCardMessage(uploadedImageUrl ? "상품권 정보와 로고가 저장되었습니다." : "상품권 정보가 저장되었습니다.", "success");
    await loadGiftCards();
  } catch (error) {
    showGiftCardMessage(`상품권 정보를 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    button.disabled = false;
  }
}

function renderGiftCards(giftCards) {
  giftCardsBody.replaceChildren(...giftCards.map((giftCard) => createGiftCardRow(giftCard)));
}

function createGiftCardRow(giftCard) {
  const tr = document.createElement("tr");
  const id = String(giftCard.id || "");

  tr.append(
    editableCell("sort_order", giftCard.sort_order ?? 0, "number"),
    editableCell("name", giftCard.name || "", "text"),
    cell(giftCard.slug || "-"),
    editableCell("rate", giftCard.rate ?? 0, "number", "0.1"),
    imageUploadCell(giftCard.image_url || ""),
    activeCell(giftCard.is_active, id),
    giftCardActionCell(id)
  );

  return tr;
}

function editableCell(field, value, type, step = "1") {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.className = "table-input";
  input.dataset.field = field;
  input.type = type;
  input.value = value;
  if (type === "number") {
    input.step = step;
  }
  td.append(input);
  return td;
}

function imageUploadCell(imageUrl) {
  const td = document.createElement("td");
  const wrap = document.createElement("div");
  const fileInput = document.createElement("input");
  const hiddenInput = document.createElement("input");
  const preview = document.createElement("img");

  wrap.className = "image-upload-cell";
  hiddenInput.type = "hidden";
  hiddenInput.dataset.field = "image_url";
  hiddenInput.value = imageUrl;
  fileInput.type = "file";
  fileInput.accept = "image/png";
  fileInput.dataset.field = "image_file";
  preview.alt = "상품권 로고";
  preview.hidden = !imageUrl;
  if (imageUrl) {
    preview.src = imageUrl;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  wrap.append(preview, fileInput, hiddenInput);
  td.append(wrap);
  return td;
}

function activeCell(isActive, giftCardId) {
  const td = document.createElement("td");
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  const text = document.createElement("span");

  label.className = "toggle-cell";
  checkbox.type = "checkbox";
  checkbox.dataset.field = "is_active";
  checkbox.checked = Boolean(isActive);
  text.textContent = checkbox.checked ? "노출" : "숨김";
  checkbox.addEventListener("change", async () => {
    text.textContent = checkbox.checked ? "노출" : "숨김";
    await saveGiftCard(checkbox, giftCardId);
  });

  label.append(checkbox, text);
  td.append(label);
  return td;
}

function giftCardActionCell(giftCardId) {
  const td = document.createElement("td");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "search-button";
  button.textContent = "저장";
  button.disabled = !giftCardId;
  button.addEventListener("click", () => saveGiftCard(button, giftCardId));
  td.append(button);
  return td;
}

function showGiftCardMessage(message, type) {
  giftCardMessage.textContent = message;
  giftCardMessage.dataset.type = type || "";
  giftCardMessage.hidden = !message;
}

async function loadBanks() {
  showBankMessage("은행 목록을 불러오는 중입니다.", "muted");
  banksLoaded.textContent = "불러오는 중";

  try {
    const response = await fetch("/admin/banks", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "은행 목록을 불러오지 못했습니다.");
    }

    allBanks = result.banks || [];
    hasLoadedBanks = true;
    renderBanks(allBanks);
    showBankMessage(allBanks.length ? "" : "등록된 은행이 없습니다.", "muted");
    banksLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
  } catch (error) {
    showBankMessage(`은행 목록을 불러오지 못했습니다. ${error.message}`, "error");
  }
}

async function createBank(formData) {
  showBankMessage("은행을 추가하는 중입니다.", "muted");

  try {
    const logoUrl = await uploadBankLogo(formData.get("image"));
    const payload = {
      name: String(formData.get("name") || "").trim(),
      logo_url: logoUrl,
      sort_order: parseInt(formData.get("sort_order"), 10) || 0,
      is_active: true
    };

    const response = await fetch("/admin/banks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "은행을 추가하지 못했습니다.");
    }

    bankForm.reset();
    showBankMessage(logoUrl ? "은행과 로고가 저장되었습니다." : "은행이 추가되었습니다.", "success");
    await loadBanks();
  } catch (error) {
    showBankMessage(`은행을 추가하지 못했습니다. ${error.message}`, "error");
  }
}

async function uploadBankLogo(file) {
  if (!file || !file.size) {
    return "";
  }

  if (file.type !== "image/png") {
    throw new Error("PNG 파일만 업로드할 수 있습니다.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/admin/banks/upload", {
    method: "POST",
    credentials: "same-origin",
    body: formData
  });
  const result = await readJsonResponse(response);

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "은행 로고를 업로드하지 못했습니다.");
  }

  return result.image_url || "";
}

async function saveBank(button, bankId) {
  const row = button.closest("tr");
  button.disabled = true;
  showBankMessage("은행 정보를 저장하는 중입니다.", "muted");

  try {
    const logoInput = row.querySelector("[data-field='logo_file']");
    const uploadedLogoUrl = await uploadBankLogo(logoInput?.files?.[0]);
    const currentLogoUrl = row.querySelector("[data-field='logo_url']").value;
    const payload = {
      id: bankId,
      name: row.querySelector("[data-field='name']").value.trim(),
      logo_url: uploadedLogoUrl || currentLogoUrl,
      sort_order: parseInt(row.querySelector("[data-field='sort_order']").value, 10) || 0,
      is_active: row.querySelector("[data-field='is_active']").checked
    };

    const response = await fetch("/admin/banks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "은행 정보를 저장하지 못했습니다.");
    }

    showBankMessage(uploadedLogoUrl ? "은행 정보와 로고가 저장되었습니다." : "은행 정보가 저장되었습니다.", "success");
    await loadBanks();
  } catch (error) {
    showBankMessage(`은행 정보를 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    button.disabled = false;
  }
}

function renderBanks(banks) {
  if (!banks.length) {
    banksBody.replaceChildren(emptyRow(5, "등록된 은행이 없습니다."));
    return;
  }

  banksBody.replaceChildren(...banks.map((bank) => createBankRow(bank)));
}

function createBankRow(bank) {
  const tr = document.createElement("tr");
  const id = String(bank.id || "");

  tr.append(
    bankLogoUploadCell(bank.logo_url || ""),
    editableCell("name", bank.name || "", "text"),
    editableCell("sort_order", bank.sort_order ?? 0, "number"),
    bankActiveCell(bank.is_active, id),
    bankActionCell(id)
  );

  return tr;
}

function bankLogoUploadCell(logoUrl) {
  const td = document.createElement("td");
  const wrap = document.createElement("div");
  const fileInput = document.createElement("input");
  const hiddenInput = document.createElement("input");
  const preview = document.createElement("img");

  wrap.className = "image-upload-cell";
  hiddenInput.type = "hidden";
  hiddenInput.dataset.field = "logo_url";
  hiddenInput.value = logoUrl;
  fileInput.type = "file";
  fileInput.accept = "image/png";
  fileInput.dataset.field = "logo_file";
  preview.alt = "은행 로고";
  preview.hidden = !logoUrl;
  if (logoUrl) {
    preview.src = logoUrl;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  wrap.append(preview, fileInput, hiddenInput);
  td.append(wrap);
  return td;
}

function bankActiveCell(isActive, bankId) {
  const td = document.createElement("td");
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  const text = document.createElement("span");

  label.className = "toggle-cell";
  checkbox.type = "checkbox";
  checkbox.dataset.field = "is_active";
  checkbox.checked = Boolean(isActive);
  text.textContent = checkbox.checked ? "활성" : "비활성";
  checkbox.addEventListener("change", async () => {
    text.textContent = checkbox.checked ? "활성" : "비활성";
    await saveBank(checkbox, bankId);
  });

  label.append(checkbox, text);
  td.append(label);
  return td;
}

function bankActionCell(bankId) {
  const td = document.createElement("td");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "search-button";
  button.textContent = "저장";
  button.disabled = !bankId;
  button.addEventListener("click", () => saveBank(button, bankId));
  td.append(button);
  return td;
}

function showBankMessage(message, type) {
  bankMessage.textContent = message;
  bankMessage.dataset.type = type || "";
  bankMessage.hidden = !message;
}

async function loadBanners() {
  showBannerMessage("메인 배너 목록을 불러오는 중입니다.", "muted");
  bannersLoaded.textContent = "불러오는 중";

  try {
    const response = await fetch("/admin/banners", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "메인 배너 목록을 불러오지 못했습니다.");
    }

    allBanners = result.banners || [];
    hasLoadedBanners = true;
    renderBanners(allBanners);
    showBannerMessage(allBanners.length ? "" : "등록된 메인 배너가 없습니다.", "muted");
    bannersLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
  } catch (error) {
    showBannerMessage(`메인 배너 목록을 불러오지 못했습니다. ${error.message}`, "error");
  }
}

async function createBanner(formData) {
  showBannerMessage("메인 배너를 추가하는 중입니다.", "muted");

  try {
    const imageUrl = await uploadBannerImage(formData.get("image"));
    const payload = {
      title: String(formData.get("title") || "").trim(),
      image_url: imageUrl,
      link_url: String(formData.get("link_url") || "").trim(),
      sort_order: parseInt(formData.get("sort_order"), 10) || 0,
      is_active: formData.get("is_active") === "on"
    };

    const response = await fetch("/admin/banners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "메인 배너를 추가하지 못했습니다.");
    }

    bannerForm.reset();
    bannerForm.querySelector("[name='is_active']").checked = true;
    showBannerMessage("메인 배너가 저장되었습니다.", "success");
    await loadBanners();
  } catch (error) {
    showBannerMessage(`메인 배너를 추가하지 못했습니다. ${error.message}`, "error");
  }
}

async function uploadBannerImage(file) {
  if (!file || !file.size) {
    return "";
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/admin/banners/upload", {
    method: "POST",
    credentials: "same-origin",
    body: formData
  });
  const result = await readJsonResponse(response);

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "배너 이미지를 업로드하지 못했습니다.");
  }

  return result.image_url || "";
}

async function saveBanner(button, bannerId) {
  const row = button.closest("tr");
  if (!row || !bannerId) return;

  button.disabled = true;
  showBannerMessage("메인 배너 정보를 저장하는 중입니다.", "muted");

  try {
    const imageInput = row.querySelector("[data-field='image_file']");
    const uploadedImageUrl = await uploadBannerImage(imageInput?.files?.[0]);
    const currentImageUrl = row.querySelector("[data-field='image_url']").value;
    const payload = {
      title: row.querySelector("[data-field='title']").value.trim(),
      image_url: uploadedImageUrl || currentImageUrl,
      link_url: row.querySelector("[data-field='link_url']").value.trim(),
      sort_order: parseInt(row.querySelector("[data-field='sort_order']").value, 10) || 0,
      is_active: row.querySelector("[data-field='is_active']").checked
    };

    const response = await fetch(`/admin/banners/${encodeURIComponent(bannerId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "메인 배너 정보를 저장하지 못했습니다.");
    }

    showBannerMessage(uploadedImageUrl ? "메인 배너 정보와 이미지가 저장되었습니다." : "메인 배너 정보가 저장되었습니다.", "success");
    await loadBanners();
  } catch (error) {
    showBannerMessage(`메인 배너 정보를 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    button.disabled = false;
  }
}

async function deleteBanner(button, bannerId) {
  if (!bannerId || !confirm("메인 배너를 삭제할까요?")) return;

  button.disabled = true;
  showBannerMessage("메인 배너를 삭제하는 중입니다.", "muted");

  try {
    const response = await fetch(`/admin/banners/${encodeURIComponent(bannerId)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "메인 배너를 삭제하지 못했습니다.");
    }

    showBannerMessage("메인 배너가 삭제되었습니다.", "success");
    await loadBanners();
  } catch (error) {
    showBannerMessage(`메인 배너를 삭제하지 못했습니다. ${error.message}`, "error");
    button.disabled = false;
  }
}

function renderBanners(banners) {
  if (!banners.length) {
    bannersBody.replaceChildren(emptyRow(7, "등록된 메인 배너가 없습니다."));
    return;
  }

  bannersBody.replaceChildren(...banners.map((banner) => createBannerRow(banner)));
}

function createBannerRow(banner) {
  const tr = document.createElement("tr");
  const id = banner.id;

  tr.append(
    bannerImageUploadCell(banner.image_url || ""),
    editableCell("title", banner.title || "", "text"),
    editableCell("link_url", banner.link_url || "", "url"),
    editableCell("sort_order", banner.sort_order ?? 0, "number"),
    bannerActiveCell(banner.is_active, id),
    bannerActionCell(id),
    bannerDeleteCell(id)
  );

  return tr;
}

function bannerImageUploadCell(imageUrl) {
  const td = document.createElement("td");
  const wrap = document.createElement("div");
  const fileInput = document.createElement("input");
  const hiddenInput = document.createElement("input");
  const preview = document.createElement("img");

  wrap.className = "image-upload-cell banner-image-upload-cell";
  hiddenInput.type = "hidden";
  hiddenInput.dataset.field = "image_url";
  hiddenInput.value = imageUrl;
  fileInput.type = "file";
  fileInput.accept = "image/png";
  fileInput.dataset.field = "image_file";
  preview.alt = "메인 배너";
  preview.hidden = !imageUrl;
  if (imageUrl) {
    preview.src = imageUrl;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  wrap.append(preview, fileInput, hiddenInput);
  td.append(wrap);
  return td;
}

function bannerActiveCell(isActive, bannerId) {
  const td = document.createElement("td");
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  const text = document.createElement("span");

  label.className = "toggle-cell";
  checkbox.type = "checkbox";
  checkbox.dataset.field = "is_active";
  checkbox.checked = Boolean(isActive);
  text.textContent = checkbox.checked ? "노출" : "숨김";
  checkbox.addEventListener("change", async () => {
    text.textContent = checkbox.checked ? "노출" : "숨김";
    await saveBanner(checkbox, bannerId);
  });

  label.append(checkbox, text);
  td.append(label);
  return td;
}

function bannerActionCell(bannerId) {
  const td = document.createElement("td");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "search-button";
  button.textContent = "저장";
  button.disabled = !bannerId;
  button.addEventListener("click", () => saveBanner(button, bannerId));
  td.append(button);
  return td;
}

function bannerDeleteCell(bannerId) {
  const td = document.createElement("td");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "delete-button";
  button.textContent = "삭제";
  button.disabled = !bannerId;
  button.addEventListener("click", () => deleteBanner(button, bannerId));
  td.append(button);
  return td;
}

function showBannerMessage(message, type) {
  bannerMessage.textContent = message;
  bannerMessage.dataset.type = type || "";
  bannerMessage.hidden = !message;
}

async function loadNotices() {
  showNoticeMessage("공지사항을 불러오는 중입니다.", "muted");
  noticesLoaded.textContent = "불러오는 중";

  try {
    const response = await fetch("/admin/notices", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "공지사항을 불러오지 못했습니다.");
    }

    allNotices = result.notices || [];
    hasLoadedNotices = true;
    renderNotices(allNotices);
    showNoticeMessage(allNotices.length ? "" : "등록된 공지사항이 없습니다.", "muted");
    noticesLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
  } catch (error) {
    showNoticeMessage(`공지사항을 불러오지 못했습니다. ${error.message}`, "error");
  }
}

async function saveNotice() {
  const id = noticeId.value;
  const payload = {
    title: noticeTitle.value.trim(),
    content: noticeContent.value.trim(),
    created_at: noticeCreatedAt.value ? new Date(noticeCreatedAt.value).toISOString() : new Date().toISOString(),
    scheduled_at: noticeScheduledAt.value ? new Date(noticeScheduledAt.value).toISOString() : null,
    is_important: noticeImportant.checked,
    is_visible: noticeVisible.checked
  };

  noticeSubmitButton.disabled = true;
  showNoticeMessage(id ? "공지사항을 수정하는 중입니다." : "공지사항을 저장하는 중입니다.", "muted");

  try {
    if (noticeAttachment.files?.[0]) {
      const attachment = await uploadNoticeAttachment(noticeAttachment.files[0]);
      payload.attachment_url = attachment.url;
      payload.attachment_name = attachment.name;
    }

    const response = await fetch("/admin/notices", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(id ? { id, ...payload } : payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "공지사항을 저장하지 못했습니다.");
    }

    resetNoticeForm();
    showNoticeMessage(id ? "공지사항이 수정되었습니다." : "공지사항이 저장되었습니다.", "success");
    await loadNotices();
  } catch (error) {
    showNoticeMessage(`공지사항을 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    noticeSubmitButton.disabled = false;
  }
}

async function uploadNoticeAttachment(file) {
  const formData = new FormData();
  formData.append("attachment", file);

  const response = await fetch("/admin/notice-attachment", {
    method: "POST",
    credentials: "same-origin",
    body: formData
  });
  const result = await readJsonResponse(response);

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "첨부파일을 업로드하지 못했습니다.");
  }

  return result.attachment;
}

async function deleteNotice(notice) {
  if (!window.confirm("이 공지사항을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) {
    return;
  }

  showNoticeMessage("공지사항을 삭제하는 중입니다.", "muted");

  try {
    const response = await fetch("/admin/notices", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: notice.id })
    });
    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "공지사항을 삭제하지 못했습니다.");
    }

    showNoticeMessage("공지사항이 삭제되었습니다.", "success");
    await loadNotices();
  } catch (error) {
    showNoticeMessage(`공지사항을 삭제하지 못했습니다. ${error.message}`, "error");
  }
}

function renderNotices(notices) {
  noticesBody.replaceChildren(...(notices.length ? notices.map(createNoticeRow) : [emptyRow(8, "등록된 공지사항이 없습니다.")]));
}

function createNoticeRow(notice) {
  const tr = document.createElement("tr");
  tr.append(
    cell(notice.title),
    cell(formatDate(notice.created_at)),
    cell(notice.scheduled_at ? formatDate(notice.scheduled_at) : "-"),
    cell(notice.is_important ? "중요" : "일반"),
    cell(notice.is_visible ? "노출" : "숨김"),
    cell(notice.attachment_url ? notice.attachment_name || "첨부파일" : "-"),
    noticeActionCell("수정", "reset-button", () => editNotice(notice)),
    noticeActionCell("삭제", "delete-button", () => deleteNotice(notice))
  );
  return tr;
}

function noticeActionCell(label, className, onClick) {
  const td = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  td.append(button);
  return td;
}

function editNotice(notice) {
  openNoticeForm();
  noticeId.value = notice.id || "";
  noticeTitle.value = notice.title || "";
  noticeContent.value = notice.content || "";
  noticeCreatedAt.value = formatDateTimeInput(notice.created_at);
  noticeScheduledAt.value = notice.scheduled_at ? formatDateTimeInput(notice.scheduled_at) : "";
  noticeAttachment.value = "";
  noticeAttachmentName.textContent = notice.attachment_name || (notice.attachment_url ? "기존 첨부파일 유지" : "선택된 파일 없음");
  noticeImportant.checked = Boolean(notice.is_important);
  noticeVisible.checked = notice.is_visible !== false;
  noticeSubmitButton.textContent = "공지 수정";
  showNoticeMessage("수정할 내용을 입력한 뒤 공지 수정을 눌러주세요.", "muted");
  noticeTitle.focus();
}

function resetNoticeForm() {
  noticeForm.reset();
  noticeId.value = "";
  noticeCreatedAt.value = formatDateTimeInput(new Date());
  noticeScheduledAt.value = "";
  noticeAttachmentName.textContent = "선택된 파일 없음";
  noticeVisible.checked = true;
  noticeSubmitButton.textContent = "공지 저장";
  noticeForm.hidden = true;
  openNoticeFormButton.hidden = false;
}

function openNoticeForm() {
  noticeForm.hidden = false;
  openNoticeFormButton.hidden = true;
  if (!noticeCreatedAt.value) {
    noticeCreatedAt.value = formatDateTimeInput(new Date());
  }
  noticeTitle.focus();
}

function showNoticeMessage(message, type) {
  noticeMessage.textContent = message;
  noticeMessage.dataset.type = type || "";
  noticeMessage.hidden = !message;
}

async function loadSiteSettings() {
  showSiteSettingsMessage("사이트 기본설정을 불러오는 중입니다.", "muted");
  siteSettingsLoaded.textContent = "불러오는 중";

  try {
    const response = await fetch("/admin/site-settings", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "사이트 기본설정을 불러오지 못했습니다.");
    }

    fillSiteSettingsForm(result.settings || {});
    hasLoadedSiteSettings = true;
    siteSettingsLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
    showSiteSettingsMessage("", "muted");
  } catch (error) {
    showSiteSettingsMessage(`사이트 기본설정을 불러오지 못했습니다. ${error.message}`, "error");
    siteSettingsLoaded.textContent = "불러오기 실패";
  }
}

async function saveSiteSettings() {
  siteSettingsSubmitButton.disabled = true;
  showSiteSettingsMessage("사이트 기본설정을 저장하는 중입니다.", "muted");

  try {
    const response = await fetch("/admin/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(readSiteSettingsForm())
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "사이트 기본설정을 저장하지 못했습니다.");
    }

    fillSiteSettingsForm(result.settings || {});
    hasLoadedSiteSettings = true;
    siteSettingsLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;
    showSiteSettingsMessage("사이트 기본설정이 저장되었습니다.", "success");
  } catch (error) {
    showSiteSettingsMessage(`사이트 기본설정을 저장하지 못했습니다. ${error.message}`, "error");
  } finally {
    siteSettingsSubmitButton.disabled = false;
  }
}

function showSiteSettingsMessage(message, type) {
  siteSettingsMessage.textContent = message;
  siteSettingsMessage.dataset.type = type || "";
  siteSettingsMessage.hidden = !message;
}

function fillSiteSettingsForm(settings) {
  Object.entries(SITE_SETTING_DEFAULTS).forEach(([key, fallback]) => {
    const field = siteSettingsForm.elements[key];
    if (!field) return;
    field.value = settings[key] || fallback;
  });
  if (!siteSettingsForm.elements.business_phone.value) {
    siteSettingsForm.elements.business_phone.value = siteSettingsForm.elements.consult_phone.value;
  }
}

function readSiteSettingsForm() {
  return Object.keys(SITE_SETTING_DEFAULTS).reduce((payload, key) => {
    const field = siteSettingsForm.elements[key];
    payload[key] = field ? field.value.trim() : "";
    return payload;
  }, {});
}

function renderOrders(orders) {
  const dailyOrderNumbers = getDailyOrderNumbers(allOrders.length ? allOrders : orders);
  ordersBody.replaceChildren(...orders.map((order) => createOrderRow(order, dailyOrderNumbers.get(getOrderKey(order)))));
  updateCounters(orders);
  syncAlertPanel();
}

function applyFilters() {
  const nameKeyword = activeNameKeyword;
  const phoneKeyword = activePhoneKeyword;
  const dateRange = activeDateRange;
  const filteredOrders = allOrders.filter((order) => {
    const customerName = normalizeSearch(pick(order, ["name", "customer_name", "account_holder", "applicant_name", "username"]));
    const phone = normalizePhoneSearch(pick(order, ["phone", "phone_number", "mobile", "tel"]));
    const orderDateKey = getKoreanDateKey(order.created_at);
    const nameMatches = !nameKeyword || customerName.includes(nameKeyword);
    const phoneMatches = !phoneKeyword || phone.includes(phoneKeyword);
    const dateMatches = !dateRange || (orderDateKey && orderDateKey >= dateRange.start && orderDateKey <= dateRange.end);

    return nameMatches && phoneMatches && dateMatches;
  });

  renderOrders(filteredOrders);

  if (allOrders.length && !filteredOrders.length) {
    showState("검색 조건에 맞는 주문이 없습니다.", "muted");
  } else if (filteredOrders.length) {
    showState("", "");
  }
}

function updateDateRangeVisibility() {
  const isCustom = periodFilter.value === "custom";
  dateRangeFields.hidden = !isCustom;
  if (!isCustom) {
    startDateFilter.value = "";
    endDateFilter.value = "";
  }
}

function renderGiftSales() {
  const dateRange = activeGiftSalesDateRange || getGiftSalesDateRange();
  const orders = allOrders.filter((order) => {
    const orderDateKey = getKoreanDateKey(order.created_at);
    return !dateRange || (orderDateKey && orderDateKey >= dateRange.start && orderDateKey <= dateRange.end);
  });
  const items = flattenSalesItems(orders);
  const productRows = aggregateByProduct(items);
  const amountRows = aggregateByAmount(items);
  const statusRows = aggregateByStatus(orders);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalPayout = items.reduce((sum, item) => sum + item.payoutAmount, 0);

  salesCounters.amount.textContent = formatWon(totalAmount);
  salesCounters.payout.textContent = formatWon(totalPayout);
  salesCounters.count.textContent = formatCount(items.length);
  giftSalesLoaded.textContent = `${formatLoadedAt(new Date())} 기준`;

  giftSalesProductBody.replaceChildren(
    ...(productRows.length ? productRows.map(createProductSalesRow) : [emptyRow(5, "기간 내 상품권 접수가 없습니다.")])
  );
  giftSalesAmountBody.replaceChildren(
    ...(amountRows.length ? amountRows.map(createAmountSalesRow) : [emptyRow(5, "기간 내 권종 접수가 없습니다.")])
  );
  giftSalesStatusBody.replaceChildren(...statusRows.map(createStatusSalesRow));
}

function flattenSalesItems(orders) {
  return orders.flatMap((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return items.map((item) => {
      const amount = parseMoney(item.amount);
      const rate = parseRateValue(item.rate ?? item.purchase_rate ?? item.buy_rate);
      const payoutAmount = parseMoney(item.payoutAmount ?? item.payout_amount) || Math.round((amount * rate) / 100);

      return {
        order,
        status: order.status || "접수완료",
        productName: String(item.productName || item.product_name || item.name || "상품권").trim(),
        amount,
        rate,
        payoutAmount
      };
    });
  });
}

function aggregateByProduct(items) {
  const groups = new Map();

  for (const item of items) {
    const key = item.productName || "상품권";
    if (!groups.has(key)) {
      groups.set(key, { productName: key, count: 0, amount: 0, payoutAmount: 0, rates: new Set() });
    }

    const group = groups.get(key);
    group.count += 1;
    group.amount += item.amount;
    group.payoutAmount += item.payoutAmount;
    if (item.rate) {
      group.rates.add(item.rate);
    }
  }

  return [...groups.values()].sort((left, right) => right.amount - left.amount || left.productName.localeCompare(right.productName));
}

function aggregateByAmount(items) {
  const groups = new Map();

  for (const item of items) {
    const key = `${item.productName}::${item.amount}`;
    if (!groups.has(key)) {
      groups.set(key, { productName: item.productName, amountValue: item.amount, count: 0, amount: 0, payoutAmount: 0 });
    }

    const group = groups.get(key);
    group.count += 1;
    group.amount += item.amount;
    group.payoutAmount += item.payoutAmount;
  }

  return [...groups.values()].sort((left, right) => left.productName.localeCompare(right.productName) || left.amountValue - right.amountValue);
}

function aggregateByStatus(orders) {
  const base = new Map(ACTION_STATUSES.concat("접수완료").map((status) => [status, { status, count: 0, amount: 0, payoutAmount: 0 }]));

  for (const order of orders) {
    const status = order.status || "접수완료";
    if (!base.has(status)) {
      base.set(status, { status, count: 0, amount: 0, payoutAmount: 0 });
    }

    const items = flattenSalesItems([order]);
    const group = base.get(status);
    group.count += 1;
    group.amount += items.reduce((sum, item) => sum + item.amount, 0);
    group.payoutAmount += items.reduce((sum, item) => sum + item.payoutAmount, 0);
  }

  return ["접수완료", "대기", "승인", "취소"]
    .map((status) => base.get(status) || { status, count: 0, amount: 0, payoutAmount: 0 });
}

function createProductSalesRow(row) {
  const rates = [...row.rates].sort((left, right) => left - right).map((rate) => `${rate}%`).join(", ") || "-";
  return tableRow([row.productName, formatCount(row.count), formatWon(row.amount), rates, formatWon(row.payoutAmount)]);
}

function createAmountSalesRow(row) {
  return tableRow([row.productName, formatWon(row.amountValue), formatCount(row.count), formatWon(row.amount), formatWon(row.payoutAmount)]);
}

function createStatusSalesRow(row) {
  return tableRow([row.status, formatCount(row.count), formatWon(row.amount), formatWon(row.payoutAmount)]);
}

function tableRow(values) {
  const tr = document.createElement("tr");
  tr.append(...values.map(textCell));
  return tr;
}

function textCell(value) {
  const td = document.createElement("td");
  td.textContent = value ?? "-";
  return td;
}

function emptyRow(colSpan, message) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colSpan;
  td.className = "empty-table-cell";
  td.textContent = message;
  tr.append(td);
  return tr;
}

function createOrderRow(order, dailyOrderNumber) {
  const tr = document.createElement("tr");
  const orderId = getOrderId(order);
  const customerName = pick(order, ["name", "customer_name", "account_holder", "applicant_name", "username"]);
  const phone = pick(order, ["phone", "phone_number", "mobile", "tel"]);
  const currentStatus = order.status || "접수완료";
  const bulkItems = getBulkItems(order);

  if (alertsEnabled && currentStatus === "접수완료") {
    tr.classList.add("is-new-order");
  }

  tr.append(
    cell(dailyOrderNumber),
    cell(formatDate(order.created_at)),
    cell(customerName),
    cell(phone),
    cell(pick(order, ["carrier", "telecom", "provider", "bank_name"])),
    orderTypeCell(order),
    pinSummaryCell(order, bulkItems),
    cell(formatMoney(pick(order, ["amount", "total_amount", "request_amount", "applied_amount", "price"]))),
    statusCell(orderId, currentStatus),
    deleteCell(orderId)
  );

  return tr;
}

function isBulkOrder(order) {
  return String(order.order_type || "").toLowerCase() === "bulk" || getBulkItems(order).length > 0;
}

function getBulkItems(order) {
  return Array.isArray(order.bulk_items) ? order.bulk_items : [];
}

function getOrderItemPins(order) {
  return getOrderItems(order)
    .map(getSingleItemPin)
    .filter(Boolean)
    .map(String);
}

function getOrderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function getSingleItemPin(item) {
  return String(item?.pinCode || item?.pin_code || item?.pincode || item?.pin || item?.code || "");
}

function getSingleItemProductName(item) {
  return String(item?.productName || item?.product_name || item?.name || "상품권");
}

function getSingleItemAmount(item) {
  return item?.amount ?? item?.price ?? item?.value ?? "";
}

function getSingleItemStatus(item, order) {
  return String(item?.status || order?.status || "정상");
}

function getBulkItemPin(item) {
  return String(item.pinCode || item.pin_code || item.pincode || item.pin || item.code || "");
}

function getBulkItemAmount(item) {
  return item?.amount ?? item?.price ?? item?.value ?? "";
}

function getBulkItemStatus(item) {
  if (item.isDuplicate || item.is_duplicate || item.status === "duplicate") return "중복";
  if (item.status === "normal") return "정상";
  return String(item.status || "정상");
}

function orderTypeCell(order) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `order-type-badge ${isBulkOrder(order) ? "is-bulk" : "is-single"}`;
  badge.textContent = isBulkOrder(order) ? "대량" : "일반";
  td.append(badge);
  return td;
}

function pinSummaryCell(order, bulkItems) {
  const td = document.createElement("td");
  td.className = "pin-summary-cell";

  if (bulkItems.length) {
    const count = document.createElement("strong");
    count.textContent = `대량 ${bulkItems.length}장`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bulk-detail-button";
    button.textContent = "상세보기";
    button.addEventListener("click", () => openBulkDetailModal(order));
    td.append(count, button);
    return td;
  }

  const items = getOrderItems(order).filter((item) => getSingleItemPin(item));
  if (!items.length) {
    td.textContent = "-";
    return td;
  }

  const preview = document.createElement("strong");
  preview.textContent = items.length > 1 ? `일반 ${items.length}건` : formatPinCode(getSingleItemPin(items[0]));
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bulk-detail-button";
  button.textContent = "상세보기";
  button.addEventListener("click", () => openSingleDetailModal(order));
  td.append(preview, button);
  return td;
}

function getDailyOrderNumbers(orders) {
  const groupedOrders = new Map();
  const result = new Map();

  for (const order of orders) {
    const dateKey = getKoreanDateKey(order.created_at);
    if (!dateKey) {
      continue;
    }

    if (!groupedOrders.has(dateKey)) {
      groupedOrders.set(dateKey, []);
    }
    groupedOrders.get(dateKey).push(order);
  }

  for (const ordersInDay of groupedOrders.values()) {
    ordersInDay
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .forEach((order, index) => {
        result.set(getOrderKey(order), index + 1);
      });
  }

  return result;
}

function getOrderKey(order) {
  return getOrderId(order) || `${order.created_at || ""}-${pick(order, ["phone", "phone_number", "mobile", "tel"])}`;
}

function getKoreanDateKey(value) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function getSelectedDateRange() {
  const today = getKoreanDateKey(new Date());

  switch (periodFilter.value) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const yesterday = shiftDateKey(today, -1);
      return { start: yesterday, end: yesterday };
    }
    case "last7":
      return { start: shiftDateKey(today, -6), end: today };
    case "thisMonth":
      return { start: `${today.slice(0, 8)}01`, end: today };
    case "custom":
      return getCustomDateRange();
    default:
      return null;
  }
}

function getCustomDateRange() {
  const start = startDateFilter.value;
  const end = endDateFilter.value;

  return normalizeDateRange(start, end);
}

function getGiftSalesDateRange() {
  const today = getKoreanDateKey(new Date());
  const range = normalizeDateRange(giftSalesStartDate.value, giftSalesEndDate.value);

  return range || { start: today, end: today };
}

function setGiftSalesQuickRange(type, options = {}) {
  const today = getKoreanDateKey(new Date());
  let range;

  if (type === "yesterday") {
    const yesterday = shiftDateKey(today, -1);
    range = { start: yesterday, end: yesterday };
  } else if (type === "thisMonth") {
    range = { start: `${today.slice(0, 8)}01`, end: today };
  } else {
    range = { start: today, end: today };
  }

  giftSalesStartDate.value = range.start;
  giftSalesEndDate.value = range.end;
  activeGiftSalesDateRange = range;

  if (options.render !== false) {
    renderGiftSales();
  }
}

function normalizeDateRange(start, end) {
  if (!start && !end) {
    return null;
  }

  if (start && end && start > end) {
    return { start: end, end: start };
  }

  return {
    start: start || end,
    end: end || start
  };
}

function shiftDateKey(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function deleteCell(orderId) {
  const td = document.createElement("td");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "delete-button";
  button.textContent = "삭제";
  button.title = "주문 삭제";
  button.addEventListener("click", () => confirmDelete(button, orderId));
  td.append(button);
  return td;
}

function openBulkDetailModal(order) {
  if (!bulkDetailModal || !bulkDetailBody) return;

  activeBulkDetailItems = getBulkItems(order);
  activeDetailPinGetter = getBulkItemPin;
  const customerName = pick(order, ["name", "customer_name", "account_holder", "applicant_name", "username"]);

  if (bulkDetailTitle) {
    bulkDetailTitle.textContent = "대량매입 상세보기";
  }
  if (bulkDetailSummary) {
    bulkDetailSummary.textContent = `${customerName || "고객"} / 대량 ${activeBulkDetailItems.length}장`;
  }
  renderBulkDetailHeader();

  const rows = activeBulkDetailItems.length
    ? activeBulkDetailItems.map((item, index) => createBulkDetailRow(item, index))
    : [emptyRow(4, "대량매입 핀번호가 없습니다.")];

  bulkDetailBody.replaceChildren(...rows);
  if (bulkCopyButton) {
    bulkCopyButton.textContent = "핀번호 복사하기";
    bulkCopyButton.disabled = !activeBulkDetailItems.length;
  }
  bulkDetailModal.hidden = false;
}

function openSingleDetailModal(order) {
  if (!bulkDetailModal || !bulkDetailBody) return;

  const customerName = pick(order, ["name", "customer_name", "account_holder", "applicant_name", "username"]);
  activeBulkDetailItems = getOrderItems(order)
    .filter((item) => getSingleItemPin(item))
    .map((item) => ({
      productName: getSingleItemProductName(item),
      pinCode: getSingleItemPin(item),
      amount: getSingleItemAmount(item),
      status: getSingleItemStatus(item, order)
    }));
  activeDetailPinGetter = getSingleItemPin;

  if (bulkDetailTitle) {
    bulkDetailTitle.textContent = "일반 매입 상세보기";
  }
  if (bulkDetailSummary) {
    bulkDetailSummary.textContent = `${customerName || "고객"} / 일반 ${activeBulkDetailItems.length}건`;
  }
  renderSingleDetailHeader();

  const rows = activeBulkDetailItems.length
    ? activeBulkDetailItems.map((item, index) => createSingleDetailRow(item, index))
    : [emptyRow(5, "일반 매입 핀번호가 없습니다.")];

  bulkDetailBody.replaceChildren(...rows);
  if (bulkCopyButton) {
    bulkCopyButton.textContent = "핀번호 복사하기";
    bulkCopyButton.disabled = !activeBulkDetailItems.length;
  }
  bulkDetailModal.hidden = false;
}

function closeBulkDetailModal() {
  if (!bulkDetailModal) return;
  bulkDetailModal.hidden = true;
  activeBulkDetailItems = [];
  activeDetailPinGetter = getBulkItemPin;
}

function renderBulkDetailHeader() {
  if (!bulkDetailHeadRow) return;
  bulkDetailHeadRow.replaceChildren(
    headerCell("번호"),
    headerCell("핀번호"),
    headerCell("금액"),
    headerCell("상태")
  );
}

function renderSingleDetailHeader() {
  if (!bulkDetailHeadRow) return;
  bulkDetailHeadRow.replaceChildren(
    headerCell("번호"),
    headerCell("상품권명"),
    headerCell("핀번호"),
    headerCell("금액"),
    headerCell("상태")
  );
}

function headerCell(label) {
  const th = document.createElement("th");
  th.scope = "col";
  th.textContent = label;
  return th;
}

function createBulkDetailRow(item, index) {
  const tr = document.createElement("tr");
  const status = getBulkItemStatus(item);
  if (status === "중복") {
    tr.classList.add("is-duplicate-bulk-item");
  }

  tr.append(
    cell(index + 1),
    cell(formatPinCode(getBulkItemPin(item))),
    cell(getBulkItemAmount(item) ? formatMoney(getBulkItemAmount(item)) : "-"),
    bulkStatusCell(status)
  );
  return tr;
}

function createSingleDetailRow(item, index) {
  const tr = document.createElement("tr");
  tr.append(
    cell(index + 1),
    cell(item.productName),
    cell(formatPinCode(item.pinCode)),
    cell(item.amount ? formatMoney(item.amount) : "-"),
    bulkStatusCell(item.status || "정상")
  );
  return tr;
}

function bulkStatusCell(status) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `bulk-status-badge ${status === "중복" ? "is-duplicate" : "is-normal"}`;
  badge.textContent = status || "정상";
  td.append(badge);
  return td;
}

async function copyBulkPins() {
  const pins = activeBulkDetailItems.map(activeDetailPinGetter).filter(Boolean);
  if (!pins.length || !bulkCopyButton) return;

  const text = pins.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    bulkCopyButton.textContent = "복사 완료";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    bulkCopyButton.textContent = "복사 완료";
  }
}

async function confirmDelete(button, orderId) {
  if (!window.confirm("이 테스트 주문을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) {
    return;
  }

  button.disabled = true;
  showState("주문을 삭제하는 중입니다.", "muted");

  try {
    await deleteOrder(orderId);
    showState("테스트 주문이 삭제되었습니다.", "success");
    await loadOrders();
  } catch (error) {
    showState(`주문을 삭제하지 못했습니다. ${error.message}`, "error");
    button.disabled = false;
  }
}

function statusCell(orderId, currentStatus) {
  const td = document.createElement("td");
  const group = document.createElement("div");
  group.className = "status-actions";

  for (const status of ACTION_STATUSES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-button";
    button.textContent = status;
    button.disabled = !orderId || currentStatus === status;
    button.dataset.status = status;
    button.addEventListener("click", () => updateStatus(button, orderId, status));
    group.append(button);
  }

  td.append(group);
  return td;
}

async function updateStatus(button, orderId, nextStatus) {
  const group = button.closest(".status-actions");
  const buttons = group ? [...group.querySelectorAll("button")] : [button];
  buttons.forEach((item) => {
    item.disabled = true;
  });
  showState("상태를 저장하는 중입니다.", "muted");

  try {
    await updateOrderStatus(orderId, nextStatus);
    allOrders = allOrders.map((order) => (getOrderId(order) === orderId ? { ...order, status: nextStatus } : order));
  } catch (error) {
    showState(`상태를 저장하지 못했습니다. ${error.message}`, "error");
    buttons.forEach((item) => {
      item.disabled = false;
    });
    return;
  }

  showState("상태가 저장되었습니다.", "success");
  applyFilters();
  syncAlertPanel();
  await loadOrders({ silent: true });
}

function updateCounters(orders) {
  counters.total.textContent = orders.length;
  counters.ready.textContent = orders.filter((order) => order.status === "접수완료").length;
  counters.working.textContent = orders.filter((order) => order.status === "대기").length;
  counters.done.textContent = orders.filter((order) => order.status === "승인").length;
}

function getPendingOrderCount() {
  return allOrders.filter((order) => (order.status || "접수완료") === "접수완료").length;
}

function hasPendingOrders() {
  return getPendingOrderCount() > 0;
}

function syncAlertPanel() {
  const pendingCount = getPendingOrderCount();
  const shouldAlert = alertsEnabled && pendingCount > 0;
  soundPanel.hidden = !shouldAlert;

  if (shouldAlert) {
    startAlertSound();
  } else {
    stopAlertSound();
  }
}

function updateAlertToggle() {
  alertToggleButton.textContent = alertsEnabled ? "알림 켜짐" : "알림 꺼짐";
  alertToggleButton.dataset.enabled = String(alertsEnabled);
}

function startAlertSound() {
  if (alertInterval) {
    return;
  }

  playAlertSound();
  alertInterval = window.setInterval(playAlertSound, ALERT_REPEAT_MS);
}

function stopAlertSound() {
  if (alertInterval) {
    window.clearInterval(alertInterval);
    alertInterval = null;
  }

  if (alertAudio) {
    alertAudio.pause();
    alertAudio.currentTime = 0;
  }
}

async function unlockAlertSound() {
  if (!alertsEnabled) {
    return;
  }

  try {
    const audio = getAlertAudio();
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch {
    if (alertAudio) {
      alertAudio.muted = false;
    }
  }
}

function playAlertSound() {
  if (!alertsEnabled || !hasPendingOrders()) {
    stopAlertSound();
    return;
  }

  const audio = getAlertAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(() => {
    stopAlertSound();
  });
}

function getAlertAudio() {
  if (!alertAudio) {
    alertAudio = new Audio(createAlertSoundDataUrl());
    alertAudio.preload = "auto";
  }

  return alertAudio;
}

function createAlertSoundDataUrl() {
  const sampleRate = 8000;
  const duration = 0.46;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const frequency = time < 0.23 ? 880 : 660;
    const envelope = Math.sin(Math.PI * Math.min(1, time / duration));
    const sample = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.35;
    view.setInt16(44 + index * 2, sample * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function cell(value) {
  const td = document.createElement("td");
  td.textContent = value || "-";
  return td;
}

function pick(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return "";
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhoneSearch(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function formatLoadedAt(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = value.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const hour = hours % 12 || 12;
  const minute = String(value.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${period} ${hour}:${minute}`;
}

function formatDateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatMoney(value) {
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(number)) return value || "-";
  return new Intl.NumberFormat("ko-KR").format(number);
}

function formatPinCode(value) {
  const text = String(value || "").replace(/\D/g, "");
  if (text.length === 16) {
    return text.replace(/(\d{4})(?=\d)/g, "$1-");
  }
  return value || "-";
}

function formatWon(value) {
  return `${formatMoney(value)}원`;
}

function formatCount(value) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}건`;
}

function parseMoney(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function parseRateValue(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function showState(message, type) {
  stateMessage.textContent = message;
  stateMessage.dataset.type = type || "";
  stateMessage.hidden = !message;
}

function setLoginMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.dataset.type = type || "";
}

function setLoading(isLoading) {
  refreshButton.disabled = isLoading;
  refreshButton.textContent = isLoading ? "불러오는 중" : "새로고침";
}
