const config = window.SEUMBIZ_ADMIN_CONFIG || {};
const supabaseUrl = config.supabaseUrl || "";
const supabaseAnonKey = config.supabaseAnonKey || "";
const SESSION_KEY = "seumbiz_admin_session";
const SOUND_PREF_KEY = "seumbiz_admin_sound_enabled";
const ALERT_REPEAT_MS = 2000;
const ALERT_POLL_MS = 7000;
const LIST_PAGE_SIZE = 20;
const DASHBOARD_PURCHASE_PAGE_SIZE = 8;
const DASHBOARD_ADMIN_LOG_PAGE_SIZE = 10;

const state = {
  accessToken: "",
  admin: null,
  activeView: "dashboardView",
  selectedPurchaseRequestId: "",
  selectedPurchaseStatus: "",
  selectedPurchaseRequest: null,
  selectedWithdrawRequestId: "",
  selectedWithdrawStatus: "",
  selectedPurchaseReceiptNo: "",
  selectedPurchaseRate: 0,
  selectedPurchasePinRows: [],
  purchases: [],
  withdraws: [],
  soundEnabled: localStorage.getItem(SOUND_PREF_KEY) !== "off",
  audioUnlocked: false,
  audioContext: null,
  alertTimer: 0,
  alertPollTimer: 0,
  monitorRunning: false,
  pendingPurchaseAlertCount: 0,
  pendingWithdrawAlertCount: 0,
  pendingCompanyAlertCount: 0,
  pendingAlertCount: 0,
  lastNotificationSnapshot: null,
  purchasePage: 1,
  purchaseTotalPages: 1,
  purchaseTotal: 0,
  withdrawPage: 1,
  withdrawTotalPages: 1,
  withdrawTotal: 0,
  settlements: [],
  selectedSettlementCompanyId: "",
  companies: [],
  selectedCompanyId: "",
  selectedCompanyBalance: 0,
  companyAdjustmentType: "credit",
  giftcards: [],
  companyGiftcardRateItems: [],
  telegramRecipients: [],
  adminLogs: [],
  adminLogPage: 1,
  adminLogTotalPages: 1,
  adminLogTotal: 0,
  adminLogFilters: {
    period: "all",
    from: "",
    to: "",
    action: "",
    companyId: "",
    adminUserId: "",
    q: ""
  },
  adminLogFilterOptionsLoaded: false
};

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  adminApp: document.querySelector("#adminApp"),
  loginForm: document.querySelector("#loginForm"),
  loginButton: document.querySelector("#loginButton"),
  loginMessage: document.querySelector("#loginMessage"),
  adminEmail: document.querySelector("#adminEmail"),
  adminPassword: document.querySelector("#adminPassword"),
  adminName: document.querySelector("#adminName"),
  changePasswordButton: document.querySelector("#changePasswordButton"),
  logoutButton: document.querySelector("#logoutButton"),
  passwordChangeModal: document.querySelector("#passwordChangeModal"),
  passwordChangeForm: document.querySelector("#passwordChangeForm"),
  passwordChangeCurrent: document.querySelector("#passwordChangeCurrent"),
  passwordChangeNew: document.querySelector("#passwordChangeNew"),
  passwordChangeConfirm: document.querySelector("#passwordChangeConfirm"),
  passwordChangeMessage: document.querySelector("#passwordChangeMessage"),
  passwordChangeSubmitButton: document.querySelector("#passwordChangeSubmitButton"),
  refreshButton: document.querySelector("#refreshButton"),
  soundToggleButton: document.querySelector("#soundToggleButton"),
  soundTestButton: document.querySelector("#soundTestButton"),
  lastRefreshTime: document.querySelector("#lastRefreshTime"),
  appMessage: document.querySelector("#appMessage"),
  pageTitle: document.querySelector("#pageTitle"),
  navButtons: [...document.querySelectorAll(".sb-nav button")],
  purchaseNavBadge: document.querySelector("#purchaseNavBadge"),
  withdrawNavBadge: document.querySelector("#withdrawNavBadge"),
  companyNavBadge: document.querySelector("#companyNavBadge"),
  views: [...document.querySelectorAll(".sb-view")],
  dashboardPurchaseKpi: document.querySelector("#dashboardPurchaseKpi"),
  dashboardWithdrawKpi: document.querySelector("#dashboardWithdrawKpi"),
  dashboardCompanyKpi: document.querySelector("#dashboardCompanyKpi"),
  dashboardPurchasePendingCount: document.querySelector("#dashboardPurchasePendingCount"),
  dashboardWithdrawPendingCount: document.querySelector("#dashboardWithdrawPendingCount"),
  dashboardCompanyPendingCount: document.querySelector("#dashboardCompanyPendingCount"),
  dashboardTodayApprovedAmount: document.querySelector("#dashboardTodayApprovedAmount"),
  dashboardTodayApprovedCount: document.querySelector("#dashboardTodayApprovedCount"),
  dashboardPurchaseBody: document.querySelector("#dashboardPurchaseBody"),
  dashboardPurchaseAllButton: document.querySelector("#dashboardPurchaseAllButton"),
  dashboardAdminLogBody: document.querySelector("#dashboardAdminLogBody"),
  dashboardAdminLogAllButton: document.querySelector("#dashboardAdminLogAllButton"),
  purchaseBody: document.querySelector("#purchaseBody"),
  purchaseReloadButton: document.querySelector("#purchaseReloadButton"),
  purchasePagination: document.querySelector("#purchasePagination"),
  withdrawBody: document.querySelector("#withdrawBody"),
  withdrawReloadButton: document.querySelector("#withdrawReloadButton"),
  withdrawPagination: document.querySelector("#withdrawPagination"),
  settlementTotalBalance: document.querySelector("#settlementTotalBalance"),
  settlementTodayApproved: document.querySelector("#settlementTodayApproved"),
  settlementActualPurchase: document.querySelector("#settlementActualPurchase"),
  settlementProfit: document.querySelector("#settlementProfit"),
  settlementTodayWithdraw: document.querySelector("#settlementTodayWithdraw"),
  settlementFaceValueHelp: document.querySelector("#settlementFaceValueHelp"),
  settlementPendingWithdraw: document.querySelector("#settlementPendingWithdraw"),
  settlementRequiredCompanies: document.querySelector("#settlementRequiredCompanies"),
  settlementBody: document.querySelector("#settlementBody"),
  settlementReloadButton: document.querySelector("#settlementReloadButton"),
  settlementStartDate: document.querySelector("#settlementStartDate"),
  settlementEndDate: document.querySelector("#settlementEndDate"),
  settlementSearchButton: document.querySelector("#settlementSearchButton"),
  settlementResetButton: document.querySelector("#settlementResetButton"),
  settlementCsvButton: document.querySelector("#settlementCsvButton"),
  settlementTxtButton: document.querySelector("#settlementTxtButton"),
  settlementLastRefresh: document.querySelector("#settlementLastRefresh"),
  settlementModal: document.querySelector("#settlementModal"),
  settlementDetailGrid: document.querySelector("#settlementDetailGrid"),
  settlementApprovedBody: document.querySelector("#settlementApprovedBody"),
  settlementWithdrawBody: document.querySelector("#settlementWithdrawBody"),
  settlementAdjustmentBody: document.querySelector("#settlementAdjustmentBody"),
  settlementTabButtons: [...document.querySelectorAll("[data-settlement-tab]")],
  settlementTabPanels: [...document.querySelectorAll("[data-settlement-panel]")],
  companyBody: document.querySelector("#companyBody"),
  companyReloadButton: document.querySelector("#companyReloadButton"),
  companyModal: document.querySelector("#companyModal"),
  companyDetailGrid: document.querySelector("#companyDetailGrid"),
  companyForm: document.querySelector("#companyForm"),
  companyId: document.querySelector("#companyId"),
  companyName: document.querySelector("#companyName"),
  companyManagerName: document.querySelector("#companyManagerName"),
  companyPhone: document.querySelector("#companyPhone"),
  companyKakaoId: document.querySelector("#companyKakaoId"),
  companyStatus: document.querySelector("#companyStatus"),
  companySaveButton: document.querySelector("#companySaveButton"),
  companyApproveButton: document.querySelector("#companyApproveButton"),
  companyRejectButton: document.querySelector("#companyRejectButton"),
  companyMessage: document.querySelector("#companyMessage"),
  companyAdjustmentForm: document.querySelector("#companyAdjustmentForm"),
  companyAdjustmentType: document.querySelector("#companyAdjustmentType"),
  companyAdjustmentAmount: document.querySelector("#companyAdjustmentAmount"),
  companyAdjustmentReason: document.querySelector("#companyAdjustmentReason"),
  companyAdjustmentMemo: document.querySelector("#companyAdjustmentMemo"),
  companyAdjustmentButton: document.querySelector("#companyAdjustmentButton"),
  companyAdjustmentMessage: document.querySelector("#companyAdjustmentMessage"),
  companyBalanceBefore: document.querySelector("#companyBalanceBefore"),
  companyBalanceAfter: document.querySelector("#companyBalanceAfter"),
  companyBalanceAfterNote: document.querySelector("#companyBalanceAfterNote"),
  companyLedgerBody: document.querySelector("#companyLedgerBody"),
  companyGiftcardRatesBody: document.querySelector("#companyGiftcardRatesBody"),
  companyGiftcardRatesMessage: document.querySelector("#companyGiftcardRatesMessage"),
  companyGiftcardRatesSaveButton: document.querySelector("#companyGiftcardRatesSaveButton"),
  purchaseModal: document.querySelector("#purchaseModal"),
  purchaseDetailGrid: document.querySelector("#purchaseDetailGrid"),
  purchaseItemsBody: document.querySelector("#purchaseItemsBody"),
  copyPinsButton: document.querySelector("#copyPinsButton"),
  downloadPinsButton: document.querySelector("#downloadPinsButton"),
  approveForm: document.querySelector("#approveForm"),
  approveButton: document.querySelector("#approveButton"),
  approvedSettlementAmount: document.querySelector("#approvedSettlementAmount"),
  purchaseAdminMemo: document.querySelector("#purchaseAdminMemo"),
  purchaseActionPanel: document.querySelector("#purchaseActionPanel"),
  rejectForm: document.querySelector("#rejectForm"),
  rejectButton: document.querySelector("#rejectButton"),
  purchaseRejectMemo: document.querySelector("#purchaseRejectMemo"),
  purchaseClosedNotice: document.querySelector("#purchaseClosedNotice"),
  withdrawModal: document.querySelector("#withdrawModal"),
  withdrawModalTitle: document.querySelector("#withdrawModalTitle"),
  withdrawModalDesc: document.querySelector("#withdrawModalDesc"),
  withdrawReviewSummary: document.querySelector("#withdrawReviewSummary"),
  withdrawReviewPurchaseBody: document.querySelector("#withdrawReviewPurchaseBody"),
  withdrawReviewLedgerBody: document.querySelector("#withdrawReviewLedgerBody"),
  withdrawCompleteSection: document.querySelector("#withdrawCompleteSection"),
  withdrawCompleteForm: document.querySelector("#withdrawCompleteForm"),
  withdrawCompleteButton: document.querySelector("#withdrawCompleteButton"),
  withdrawAdminMemo: document.querySelector("#withdrawAdminMemo"),
  withdrawReadonlyNote: document.querySelector("#withdrawReadonlyNote"),
  withdrawNegativeBalanceNote: document.querySelector("#withdrawNegativeBalanceNote"),
  giftcardBody: document.querySelector("#giftcardBody"),
  giftcardOpenCreateButton: document.querySelector("#giftcardOpenCreateButton"),
  giftcardModal: document.querySelector("#giftcardModal"),
  giftcardReloadButton: document.querySelector("#giftcardReloadButton"),
  giftcardForm: document.querySelector("#giftcardForm"),
  giftcardFormTitle: document.querySelector("#giftcardFormTitle"),
  giftcardId: document.querySelector("#giftcardId"),
  giftcardCode: document.querySelector("#giftcardCode"),
  giftcardName: document.querySelector("#giftcardName"),
  giftcardLogoFile: document.querySelector("#giftcardLogoFile"),
  giftcardLogoUploadButton: document.querySelector("#giftcardLogoUploadButton"),
  giftcardLogoPreview: document.querySelector("#giftcardLogoPreview"),
  giftcardLogoUrl: document.querySelector("#giftcardLogoUrl"),
  giftcardDefaultRate: document.querySelector("#giftcardDefaultRate"),
  giftcardSortOrder: document.querySelector("#giftcardSortOrder"),
  giftcardEnabledAmounts: document.querySelector("#giftcardEnabledAmounts"),
  giftcardIsVisible: document.querySelector("#giftcardIsVisible"),
  giftcardIsActive: document.querySelector("#giftcardIsActive"),
  giftcardAdminMemo: document.querySelector("#giftcardAdminMemo"),
  giftcardMessage: document.querySelector("#giftcardMessage"),
  giftcardSaveButton: document.querySelector("#giftcardSaveButton"),
  giftcardResetButton: document.querySelector("#giftcardResetButton"),
  telegramRecipientBody: document.querySelector("#telegramRecipientBody"),
  telegramReloadButton: document.querySelector("#telegramReloadButton"),
  telegramRecipientForm: document.querySelector("#telegramRecipientForm"),
  telegramRecipientName: document.querySelector("#telegramRecipientName"),
  telegramRecipientChatId: document.querySelector("#telegramRecipientChatId"),
  telegramRecipientSaveButton: document.querySelector("#telegramRecipientSaveButton"),
  telegramRecipientMessage: document.querySelector("#telegramRecipientMessage"),
  adminLogBody: document.querySelector("#adminLogBody"),
  adminLogReloadButton: document.querySelector("#adminLogReloadButton"),
  adminLogPagination: document.querySelector("#adminLogPagination"),
  adminLogStartDate: document.querySelector("#adminLogStartDate"),
  adminLogEndDate: document.querySelector("#adminLogEndDate"),
  adminLogAction: document.querySelector("#adminLogAction"),
  adminLogCompany: document.querySelector("#adminLogCompany"),
  adminLogAdmin: document.querySelector("#adminLogAdmin"),
  adminLogSearch: document.querySelector("#adminLogSearch"),
  adminLogSearchButton: document.querySelector("#adminLogSearchButton"),
  adminLogResetButton: document.querySelector("#adminLogResetButton"),
  adminLogPeriodButtons: [...document.querySelectorAll("[data-admin-log-period]")],
  adminLogCustomDates: document.querySelector("#adminLogCustomDates"),
  adminLogModal: document.querySelector("#adminLogModal"),
  adminLogDetailGrid: document.querySelector("#adminLogDetailGrid"),
  adminLogBeforeTitle: document.querySelector("#adminLogBeforeTitle"),
  adminLogAfterTitle: document.querySelector("#adminLogAfterTitle"),
  adminLogBeforeView: document.querySelector("#adminLogBeforeView"),
  adminLogAfterView: document.querySelector("#adminLogAfterView"),
  adminLogJsonDetails: document.querySelector("#adminLogJsonDetails"),
  adminLogBeforeData: document.querySelector("#adminLogBeforeData"),
  adminLogAfterData: document.querySelector("#adminLogAfterData")
};

init();

function init() {
  preventNumericInputWheel();
  els.loginForm.addEventListener("submit", handleLogin);
  els.changePasswordButton?.addEventListener("click", openPasswordChangeModal);
  els.passwordChangeForm?.addEventListener("submit", handlePasswordChangeSubmit);
  els.passwordChangeModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-password-modal]")) {
      closePasswordChangeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.passwordChangeModal && !els.passwordChangeModal.hidden) {
      closePasswordChangeModal();
    }
  });
  els.logoutButton.addEventListener("click", logout);
  els.refreshButton.addEventListener("click", refreshActiveView);
  els.soundToggleButton?.addEventListener("click", toggleSound);
  els.soundTestButton?.addEventListener("click", testAlertSound);
  document.addEventListener("pointerdown", unlockAlertAudio, { once: true });
  els.purchaseReloadButton.addEventListener("click", loadPurchases);
  els.withdrawReloadButton.addEventListener("click", loadWithdraws);
  els.settlementReloadButton?.addEventListener("click", loadSettlements);
  els.settlementSearchButton?.addEventListener("click", () => loadSettlements());
  els.settlementResetButton?.addEventListener("click", resetSettlementFilters);
  els.settlementCsvButton?.addEventListener("click", () => downloadSettlements("csv"));
  els.settlementTxtButton?.addEventListener("click", () => downloadSettlements("txt"));
  els.companyReloadButton?.addEventListener("click", loadCompanies);
  els.companyForm?.addEventListener("submit", handleSaveCompany);
  els.companyApproveButton?.addEventListener("click", () => handleCompanyStatusAction("approved"));
  els.companyRejectButton?.addEventListener("click", () => handleCompanyStatusAction("rejected"));
  els.companyAdjustmentForm?.addEventListener("submit", handleCompanyAdjustment);
  els.companyAdjustmentType?.addEventListener("change", () => {
    setCompanyAdjustmentType(els.companyAdjustmentType.value);
    updateCompanyBalancePreview();
  });
  els.companyAdjustmentAmount?.addEventListener("input", handleCompanyAdjustmentAmountInput);
  els.companyGiftcardRatesSaveButton?.addEventListener("click", handleSaveCompanyGiftcardRates);
  els.companyGiftcardRatesBody?.addEventListener("input", handleCompanyGiftcardRateInput);
  for (const button of els.settlementTabButtons) {
    button.addEventListener("click", () => showSettlementTab(button.dataset.settlementTab));
  }
  els.giftcardReloadButton?.addEventListener("click", loadGiftcards);
  els.giftcardOpenCreateButton?.addEventListener("click", openGiftcardCreateModal);
  els.giftcardForm?.addEventListener("submit", handleSaveGiftcard);
  els.giftcardLogoUploadButton?.addEventListener("click", handleGiftcardLogoUpload);
  els.giftcardLogoUrl?.addEventListener("input", updateGiftcardLogoPreview);
  els.giftcardModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-giftcard-modal]")) {
      closeGiftcardModal();
    }
  });
  els.giftcardResetButton?.addEventListener("click", openGiftcardCreateModal);
  els.telegramReloadButton?.addEventListener("click", loadTelegramRecipients);
  els.telegramRecipientForm?.addEventListener("submit", handleAddTelegramRecipient);
  els.adminLogReloadButton?.addEventListener("click", () => loadAdminLogs());
  els.adminLogSearchButton?.addEventListener("click", () => {
    syncAdminLogFiltersFromForm();
    state.adminLogPage = 1;
    loadAdminLogs();
  });
  els.adminLogResetButton?.addEventListener("click", resetAdminLogFilters);
  els.adminLogSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      syncAdminLogFiltersFromForm();
      state.adminLogPage = 1;
      loadAdminLogs();
    }
  });
  for (const button of els.adminLogPeriodButtons) {
    button.addEventListener("click", () => applyAdminLogPeriod(button.dataset.adminLogPeriod));
  }
  els.approveForm.addEventListener("submit", handleApprovePurchase);
  els.rejectForm?.addEventListener("submit", handleRejectPurchase);
  els.withdrawCompleteForm.addEventListener("submit", handleCompleteWithdraw);
  els.copyPinsButton.addEventListener("click", copySelectedPurchasePins);
  els.downloadPinsButton.addEventListener("click", downloadSelectedPurchasePins);
  els.purchaseItemsBody?.addEventListener("input", handlePurchaseItemAmountInput);

  for (const button of els.navButtons) {
    button.addEventListener("click", () => showView(button.dataset.view));
  }

  els.dashboardPurchaseKpi?.addEventListener("click", () => showView("purchaseView"));
  els.dashboardWithdrawKpi?.addEventListener("click", () => showView("withdrawView"));
  els.dashboardCompanyKpi?.addEventListener("click", () => showView("companyView"));
  els.dashboardPurchaseAllButton?.addEventListener("click", () => showView("purchaseView"));
  els.dashboardAdminLogAllButton?.addEventListener("click", () => showView("adminLogView"));

  document.addEventListener("click", (event) => {
    const quickApproveButton = event.target.closest("[data-quick-approve-id]");
    if (quickApproveButton) {
      handleQuickApprove(quickApproveButton.dataset.quickApproveId);
      return;
    }

    const purchaseButton = event.target.closest("[data-purchase-id]");
    if (purchaseButton) {
      openPurchaseModal(purchaseButton.dataset.purchaseId);
      return;
    }

    const withdrawReviewButton = event.target.closest("[data-withdraw-review-id]");
    if (withdrawReviewButton) {
      openWithdrawReviewModal(withdrawReviewButton.dataset.withdrawReviewId);
      return;
    }

    const withdrawCompleteOpenButton = event.target.closest("[data-withdraw-complete-id]");
    if (withdrawCompleteOpenButton) {
      openWithdrawReviewModal(withdrawCompleteOpenButton.dataset.withdrawCompleteId, { scrollToComplete: true });
      return;
    }

    const settlementButton = event.target.closest("[data-settlement-company-id]");
    if (settlementButton) {
      openSettlementModal(settlementButton.dataset.settlementCompanyId);
      return;
    }

    const companyButton = event.target.closest("[data-company-id]");
    if (companyButton) {
      event.preventDefault();
      event.stopPropagation();
      openCompanyModal(companyButton.dataset.companyId);
      return;
    }

    const giftcardEditButton = event.target.closest("[data-giftcard-edit-id]");
    if (giftcardEditButton) {
      editGiftcard(giftcardEditButton.dataset.giftcardEditId);
      return;
    }

    const telegramToggleButton = event.target.closest("[data-telegram-toggle-id]");
    if (telegramToggleButton) {
      toggleTelegramRecipient(telegramToggleButton.dataset.telegramToggleId);
      return;
    }

    const telegramDeleteButton = event.target.closest("[data-telegram-delete-id]");
    if (telegramDeleteButton) {
      deleteTelegramRecipient(telegramDeleteButton.dataset.telegramDeleteId);
      return;
    }

    const adminLogRow = event.target.closest("[data-admin-log-id]");
    if (adminLogRow) {
      openAdminLogModal(adminLogRow.dataset.adminLogId);
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      closePurchaseModal();
      return;
    }

    if (event.target.closest("[data-close-withdraw-modal]")) {
      closeWithdrawModal();
      return;
    }

    if (event.target.closest("[data-close-settlement-modal]")) {
      closeSettlementModal();
      return;
    }

    if (event.target.closest("[data-close-company-modal]")) {
      closeCompanyModal();
      return;
    }

    if (event.target.closest("[data-close-admin-log-modal]")) {
      closeAdminLogModal();
      return;
    }

    const pageButton = event.target.closest("[data-pagination-target]");
    if (pageButton) {
      handlePaginationClick(pageButton);
    }
  });

  updateSoundButton();
  restoreSession();
}

async function restoreSession() {
  const saved = readSession();
  if (!saved?.access_token) {
    showLogin();
    return;
  }

  state.accessToken = saved.access_token;
  await verifySession();
}

async function handleLogin(event) {
  event.preventDefault();
  clearMessage(els.loginMessage);

  if (!supabaseUrl || !supabaseAnonKey) {
    setMessage(els.loginMessage, "Supabase 관리자 설정이 필요합니다.", "error");
    return;
  }

  const email = els.adminEmail.value.trim();
  const password = els.adminPassword.value;

  if (!email || !password) {
    setMessage(els.loginMessage, "이메일과 비밀번호를 입력해주세요.", "error");
    return;
  }

  els.loginButton.disabled = true;
  els.loginButton.textContent = "로그인 중";

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || data.message || "로그인에 실패했습니다.");
    }

    if (!data.access_token) {
      throw new Error("로그인 세션을 확인할 수 없습니다.");
    }

    state.accessToken = data.access_token;
    writeSession(data);
    unlockAlertAudio();
    await verifySession();
  } catch (error) {
    clearSession();
    state.accessToken = "";
    setMessage(els.loginMessage, error.message || "로그인에 실패했습니다.", "error");
  } finally {
    els.loginButton.disabled = false;
    els.loginButton.textContent = "로그인";
  }
}

async function verifySession() {
  try {
    const data = await apiGet("/admin/seumbiz/session");
    state.admin = data.admin;
    showApp();
    await Promise.all([loadDashboard(), loadPurchases(), loadWithdraws()]);
    await loadNotificationState({ silent: true });
    updateLastRefreshTime();
    startAlertPolling();
  } catch (error) {
    clearSession();
    state.accessToken = "";
    showLogin();
    setMessage(els.loginMessage, error.message || "관리자 세션 확인에 실패했습니다.", "error");
  }
}

function showLogin() {
  stopAlertPolling();
  stopPendingAlertLoop();
  clearNavPendingBadges();
  els.loginPanel.hidden = false;
  els.loginPanel.style.display = "grid";
  els.loginPanel.setAttribute("aria-hidden", "false");
  els.adminApp.hidden = true;
  els.adminApp.style.display = "none";
  els.adminApp.setAttribute("aria-hidden", "true");
}

function showApp() {
  els.loginPanel.hidden = true;
  els.loginPanel.style.display = "none";
  els.loginPanel.setAttribute("aria-hidden", "true");
  els.adminApp.hidden = false;
  els.adminApp.style.display = "grid";
  els.adminApp.setAttribute("aria-hidden", "false");
  els.adminName.textContent = state.admin?.name ? `${state.admin.name} 님` : "관리자";
  showView(state.activeView);
}

function showView(viewId) {
  state.activeView = viewId;
  const titleMap = {
    dashboardView: "SEUMBiz \uB300\uC2DC\uBCF4\uB4DC",
    purchaseView: "\uB9E4\uC785\uC2E0\uCCAD \uAD00\uB9AC",
    withdrawView: "\uCD9C\uAE08\uC2E0\uCCAD \uAD00\uB9AC",
    settlementView: "\uC815\uC0B0 \uAD00\uB9AC",
    companyView: "\uC5C5\uCCB4 \uAD00\uB9AC",
    giftcardView: "\uC0C1\uD488\uAD8C \uAD00\uB9AC",
    telegramView: "\uD154\uB808\uADF8\uB7A8 \uC54C\uB9BC \uAD00\uB9AC",
    adminLogView: "\uAD00\uB9AC\uC790 \uB85C\uADF8"
  };

  for (const view of els.views) {
    view.hidden = view.id !== viewId;
  }

  for (const button of els.navButtons) {
    button.classList.toggle("is-active", button.dataset.view === viewId);
  }

  els.pageTitle.textContent = titleMap[viewId] || "SEUMBiz \uAD00\uB9AC\uC790";
  clearMessage(els.appMessage);
  if (viewId === "giftcardView" && !state.giftcards.length) {
    loadGiftcards({ silent: true });
  }
  if (viewId === "settlementView" && !state.settlements.length) {
    loadSettlements({ silent: true });
  }
  if (viewId === "telegramView" && !state.telegramRecipients.length) {
    loadTelegramRecipients({ silent: true });
  }
  if (viewId === "purchaseView") {
    loadPurchases({ silent: true, page: state.purchasePage });
  }
  if (viewId === "withdrawView") {
    loadWithdraws({ silent: true, page: state.withdrawPage });
  }
  if (viewId === "companyView") {
    loadCompanies({ silent: true });
  }
  if (viewId === "adminLogView") {
    syncAdminLogFilterForm();
    updateAdminLogPeriodButtons();
    updateAdminLogCustomDatesVisibility();
    void loadAdminLogFilterOptions();
    loadAdminLogs({ silent: true, page: state.adminLogPage });
  }
}

function startAlertPolling() {
  stopAlertPolling();
  void runAdminMonitor();
  state.alertPollTimer = window.setInterval(runAdminMonitor, ALERT_POLL_MS);
}

function stopAlertPolling() {
  if (!state.alertPollTimer) return;
  window.clearInterval(state.alertPollTimer);
  state.alertPollTimer = 0;
}

async function runAdminMonitor() {
  if (!state.accessToken || els.adminApp.hidden || state.monitorRunning) return;
  state.monitorRunning = true;
  console.log("[SEUMBiz Admin Monitor] polling tick", { activeView: state.activeView });
  try {
    await loadNotificationState({ silent: true });

    const tasks = [loadDashboard({ silent: true })];
    if (state.activeView === "purchaseView") {
      tasks.push(loadPurchases({ silent: true, page: state.purchasePage }));
    }
    if (state.activeView === "withdrawView") {
      tasks.push(loadWithdraws({ silent: true, page: state.withdrawPage }));
    }
    if (state.activeView === "companyView") {
      tasks.push(loadCompanies({ silent: true }));
    }

    const results = await Promise.allSettled(tasks);
    for (const result of results) {
      if (result.status === "rejected") {
        console.log("[SEUMBiz Admin Monitor] polling request failed", result.reason);
      }
    }
    updateLastRefreshTime();
  } catch (error) {
    console.log("[SEUMBiz Admin Monitor] polling failed", error);
  } finally {
    state.monitorRunning = false;
  }
}

function updateLastRefreshTime() {
  if (!els.lastRefreshTime) return;
  const text = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
  els.lastRefreshTime.textContent = "\uB9C8\uC9C0\uB9C9 \uAC31\uC2E0 " + text;
}
async function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SOUND_PREF_KEY, state.soundEnabled ? "on" : "off");
  console.log("[SEUMBiz Admin Sound] toggle", { soundEnabled: state.soundEnabled, pendingAlertCount: state.pendingAlertCount });
  if (!state.soundEnabled) {
    stopPendingAlertLoop();
  } else {
    syncPendingAlertLoop();
  }
  updateSoundButton();
}

async function testAlertSound() {
  console.log("[SEUMBiz Admin Sound] manual test");
  await playAdminAlertSound({ force: true });
}

function updateSoundButton() {
  if (!els.soundToggleButton) return;
  els.soundToggleButton.textContent = state.soundEnabled ? "\uD83D\uDD14 \uC18C\uB9AC \uCF2C" : "\uD83D\uDD15 \uC18C\uB9AC \uB054";
  els.soundToggleButton.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggleButton.classList.toggle("is-muted", !state.soundEnabled);
}

async function loadNotificationState(options = {}) {
  try {
    const data = await apiGet("/admin/seumbiz/notification-state");
    const notification = data.notification || {};
    updateAlertStateFromNotification(notification);
    return notification;
  } catch (error) {
    console.log("[SEUMBiz Admin Sound] notification-state failed", error);
    if (!options.silent) throw error;
    return null;
  }
}

function updateAlertStateFromNotification(notification) {
  const purchaseCount = Number(notification.purchasePendingCount || 0);
  const withdrawCount = Number(notification.withdrawPendingCount || 0);
  const companyCount = Number(notification.companyPendingCount || 0);
  const totalCount = Number(notification.totalPendingCount ?? purchaseCount + withdrawCount + companyCount);
  const previousSnapshot = state.lastNotificationSnapshot;

  console.log("[SEUMBiz Admin Sound] notification state", {
    purchaseCount,
    withdrawCount,
    companyCount,
    totalCount,
    previousSnapshot,
    soundEnabled: state.soundEnabled,
    alertLoopRunning: Boolean(state.alertTimer),
    notification
  });

  state.pendingPurchaseAlertCount = purchaseCount;
  state.pendingWithdrawAlertCount = withdrawCount;
  state.pendingCompanyAlertCount = companyCount;
  state.lastNotificationSnapshot = {
    purchasePendingCount: purchaseCount,
    withdrawPendingCount: withdrawCount,
    companyPendingCount: companyCount,
    totalPendingCount: totalCount
  };
  setPendingAlertCountFromParts();
  updateNavPendingBadges(purchaseCount, withdrawCount, companyCount);
}

function updateNavPendingBadges(purchaseCount, withdrawCount, companyCount = 0) {
  updateNavPendingBadge(els.purchaseNavBadge, purchaseCount);
  updateNavPendingBadge(els.withdrawNavBadge, withdrawCount);
  updateNavPendingBadge(els.companyNavBadge, companyCount);
}

function updateNavPendingBadge(badgeElement, count) {
  if (!badgeElement) return;

  const value = Math.max(0, Number(count || 0));
  if (value <= 0) {
    badgeElement.hidden = true;
    badgeElement.textContent = "";
    return;
  }

  badgeElement.hidden = false;
  badgeElement.textContent = value > 99 ? "99+" : String(value);
}

function clearNavPendingBadges() {
  updateNavPendingBadges(0, 0, 0);
}

function updateAlertStateFromDashboard(summary) {
  console.log("[SEUMBiz Admin Sound] dashboard summary", summary);
}

function updateAlertStateFromLists() {
  console.log("[SEUMBiz Admin Sound] list refresh complete");
}

function updatePurchaseAlertStateFromList() {
  console.log("[SEUMBiz Admin Sound] purchase list refresh complete");
}

function updateWithdrawAlertStateFromList() {
  console.log("[SEUMBiz Admin Sound] withdraw list refresh complete");
}

async function refreshAfterAdminAction(...loaders) {
  const tasks = [
    loadDashboard(),
    loadNotificationState({ silent: true }),
    ...loaders.map((loader) => loader())
  ];
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.log("[SEUMBiz Admin Monitor] post-action refresh failed", result.reason);
    }
  }
  updateLastRefreshTime();
}

function setPendingAlertCountFromParts() {
  setPendingAlertCount(
    state.pendingPurchaseAlertCount + state.pendingWithdrawAlertCount + state.pendingCompanyAlertCount
  );
}
function setPendingAlertCount(count) {
  state.pendingAlertCount = Math.max(0, Number(count || 0));
  console.log("[SEUMBiz Admin Sound] pending alert count", state.pendingAlertCount);
  syncPendingAlertLoop();
}

function syncPendingAlertLoop() {
  console.log("[SEUMBiz Admin Sound] sync loop", {
    soundEnabled: state.soundEnabled,
    pendingAlertCount: state.pendingAlertCount,
    adminHidden: els.adminApp.hidden,
    alertLoopRunning: Boolean(state.alertTimer)
  });

  if (!state.soundEnabled || state.pendingAlertCount <= 0 || els.adminApp.hidden) {
    stopPendingAlertLoop();
    return;
  }

  startPendingAlertLoop();
}

function startPendingAlertLoop() {
  if (state.alertTimer) return;

  state.alertTimer = window.setInterval(playPendingAlertTick, ALERT_REPEAT_MS);
  void playPendingAlertTick();
  console.log("[SEUMBiz Admin Sound] alert loop started", { intervalMs: ALERT_REPEAT_MS });
}

function stopPendingAlertLoop() {
  if (!state.alertTimer) return;
  window.clearInterval(state.alertTimer);
  state.alertTimer = 0;
  console.log("[SEUMBiz Admin Sound] alert loop stopped");
}

function playPendingAlertTick() {
  if (!state.soundEnabled || state.pendingAlertCount <= 0 || els.adminApp.hidden) {
    stopPendingAlertLoop();
    return;
  }

  void playAdminAlertSound({ force: true, automatic: true });
}

async function unlockAlertAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.log("[SEUMBiz Admin Sound] AudioContext not available");
    return null;
  }

  try {
    state.audioContext = state.audioContext || new AudioContext();
    if (state.audioContext.state === "suspended") {
      console.log("[SEUMBiz Admin Sound] resume AudioContext");
      await state.audioContext.resume();
    }
    state.audioUnlocked = state.audioContext.state === "running";
    console.log("[SEUMBiz Admin Sound] unlock", { state: state.audioContext.state, audioUnlocked: state.audioUnlocked });
    return state.audioContext;
  } catch (error) {
    state.audioUnlocked = false;
    console.log("[SEUMBiz Admin Sound] unlock failed", error);
    return null;
  }
}

async function playAdminAlertSound(options = {}) {
  if (!options.force && (!state.soundEnabled || state.pendingAlertCount <= 0)) return;
  const context = await unlockAlertAudio();
  if (!context || context.state === "suspended") {
    console.log("[SEUMBiz Admin Sound] beep skipped", { hasContext: Boolean(context), state: context?.state });
    return;
  }

  const start = context.currentTime + 0.01;
  playTone(context, 660, start, 0.16, 0.16);
  playTone(context, 980, start + 0.18, 0.18, 0.15);
  playTone(context, 1320, start + 0.39, 0.16, 0.13);
}

function playTone(context, frequency, start, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

async function refreshActiveView() {
  if (state.activeView === "purchaseView") {
    await refreshAfterAdminAction(loadPurchases);
    updateLastRefreshTime();
    return;
  }
  if (state.activeView === "withdrawView") {
    await refreshAfterAdminAction(loadWithdraws);
    updateLastRefreshTime();
    return;
  }
  if (state.activeView === "settlementView") {
    await loadSettlements();
    updateLastRefreshTime();
    return;
  }
  if (state.activeView === "companyView") {
    await loadCompanies();
    updateLastRefreshTime();
    return;
  }
  if (state.activeView === "giftcardView") {
    await loadGiftcards();
    updateLastRefreshTime();
    return;
  }
  if (state.activeView === "adminLogView") {
    await loadAdminLogs({ page: state.adminLogPage });
    updateLastRefreshTime();
    return;
  }
  await loadDashboard();
  updateLastRefreshTime();
}

async function loadDashboard(options = {}) {
  if (!options.silent) {
    setTableLoading(els.dashboardPurchaseBody, 7);
    setTableLoading(els.dashboardAdminLogBody, 6);
  }

  const today = getKstDateString();

  try {
    const [notificationData, settlementData, todayApprovedLogData, purchaseData, adminLogData] = await Promise.all([
      apiGet("/admin/seumbiz/notification-state"),
      apiGet("/admin/seumbiz/settlements"),
      apiGet(
        `/admin/seumbiz/admin-logs?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}&action=purchase_approved&page=1&pageSize=1`
      ),
      apiGet(`/admin/seumbiz/purchase-requests?page=1&pageSize=${DASHBOARD_PURCHASE_PAGE_SIZE}`),
      apiGet(`/admin/seumbiz/admin-logs?page=1&pageSize=${DASHBOARD_ADMIN_LOG_PAGE_SIZE}`)
    ]);

    const notification = notificationData.notification || {};
    const settlementSummary = settlementData.summary || {};
    const todayApprovedCount = Number(todayApprovedLogData.total || 0);

    renderDashboardKpis(notification, settlementSummary, todayApprovedCount);
    renderDashboardRecentPurchases(purchaseData.items || purchaseData.requests || []);
    renderDashboardRecentAdminLogs(adminLogData.items || adminLogData.logs || []);
    updateAlertStateFromNotification(notification);
  } catch (error) {
    if (!options.silent) {
      setMessage(els.appMessage, error.message || "\uB300\uC2DC\uBCF4\uB4DC\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.", "error");
      setTableMessage(els.dashboardPurchaseBody, 7, "\uB300\uC2DC\uBCF4\uB4DC\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      setTableMessage(els.dashboardAdminLogBody, 6, "\uB300\uC2DC\uBCF4\uB4DC\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } else {
      console.log("[SEUMBiz Admin Monitor] dashboard failed", error);
    }
    throw error;
  }
}

function renderDashboardKpis(notification, settlementSummary, todayApprovedCount) {
  const purchaseCount = Number(notification.purchasePendingCount || 0);
  const withdrawCount = Number(notification.withdrawPendingCount || 0);
  const companyCount = Number(notification.companyPendingCount || 0);
  const todayAmount = Number(settlementSummary.actualPurchaseAmount || 0);

  if (els.dashboardPurchasePendingCount) {
    els.dashboardPurchasePendingCount.textContent = `${purchaseCount}\uAC74`;
  }
  if (els.dashboardWithdrawPendingCount) {
    els.dashboardWithdrawPendingCount.textContent = `${withdrawCount}\uAC74`;
  }
  if (els.dashboardCompanyPendingCount) {
    els.dashboardCompanyPendingCount.textContent = `${companyCount}\uAC74`;
  }
  if (els.dashboardTodayApprovedAmount) {
    els.dashboardTodayApprovedAmount.textContent = formatWon(todayAmount);
  }
  if (els.dashboardTodayApprovedCount) {
    els.dashboardTodayApprovedCount.textContent = `\uC2B9\uC778 ${todayApprovedCount}\uAC74 \u00B7 \uC815\uC0B0\uAE08 \uAE30\uC900`;
  }
}

function renderDashboardRecentPurchases(rows) {
  if (!els.dashboardPurchaseBody) return;

  if (!rows.length) {
    setTableMessage(els.dashboardPurchaseBody, 7, "\uCD5C\uADFC \uB9E4\uC785 \uC2E0\uCCAD \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.dashboardPurchaseBody.replaceChildren(
    ...rows.map((row) => {
      const isAwaiting = row.status === "pending" || row.status === "reviewing";
      const tr = document.createElement("tr");
      if (isAwaiting) tr.className = "sb-dashboard-row is-awaiting";
      tr.innerHTML = `
        <td class="sb-company-cell">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td><button class="sb-link-button" type="button" data-purchase-id="${escapeHtml(row.id)}">${escapeHtml(row.receipt_no || "-")}</button></td>
        <td>${renderPurchaseGiftcard(row)}</td>
        <td class="is-amount">${row.has_unconfirmed_amount ? `<span class="sb-soft-warning">&#44160;&#49688; &#54596;&#50836;</span>` : formatWon(row.expected_settlement_amount)}</td>
        <td>${renderStatus(row.status)}</td>
        <td>${formatDateTime(row.created_at)}</td>
        <td>
          <div class="sb-row-actions">
            <button class="sb-table-action" type="button" data-purchase-id="${escapeHtml(row.id)}">&#49345;&#49464;</button>
          </div>
        </td>
      `;
      return tr;
    })
  );
}

function renderDashboardRecentAdminLogs(rows) {
  if (!els.dashboardAdminLogBody) return;

  if (!rows.length) {
    setTableMessage(els.dashboardAdminLogBody, 6, "\uCD5C\uADFC \uAD00\uB9AC\uC790 \uC791\uC5C5 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.dashboardAdminLogBody.replaceChildren(
    ...rows.map((row) => {
      const processing = buildAdminLogProcessingContent(row);
      const memo = row.memo || "-";
      const tr = document.createElement("tr");
      tr.className = "sb-admin-log-row";
      tr.dataset.adminLogId = row.id;
      tr.innerHTML = `
        <td class="is-center sb-admin-log-time">${escapeHtml(formatAdminLogListTimeShort(row.created_at))}</td>
        <td class="is-center"><span class="sb-admin-log-badge">${escapeHtml(row.action_label || row.action || "-")}</span></td>
        <td class="sb-admin-log-processing">${processing.html}</td>
        <td class="sb-admin-log-company">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td class="is-amount"><span class="sb-admin-log-amount">${escapeHtml(row.amount_display || "-")}</span></td>
        <td class="sb-admin-log-memo" title="${escapeHtml(memo)}">${escapeHtml(memo)}</td>
      `;
      return tr;
    })
  );
}

async function loadPurchases(options = {}) {
  if (!options.silent) setTableLoading(els.purchaseBody, 8);
  try {
    const page = Number(options.page || state.purchasePage || 1);
    const data = await apiGet(`/admin/seumbiz/purchase-requests?page=${page}&pageSize=${LIST_PAGE_SIZE}`);
    state.purchases = data.items || data.requests || [];
    state.purchasePage = Number(data.page || page);
    state.purchaseTotalPages = Number(data.totalPages || 1);
    state.purchaseTotal = Number(data.total || state.purchases.length);
    renderPurchases();
    renderPagination("purchase");
    updatePurchaseAlertStateFromList();
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.purchaseBody, 8, error.message || "\uB9E4\uC785\uC2E0\uCCAD \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } else {
      console.log("[SEUMBiz Admin Monitor] purchase list failed", error);
    }
    throw error;
  }
}

function renderPurchases() {
  if (!state.purchases.length) {
    setTableMessage(els.purchaseBody, 8, "\uB9E4\uC785\uC2E0\uCCAD \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    renderPagination("purchase");
    return;
  }

  els.purchaseBody.replaceChildren(
    ...state.purchases.map((row) => {
      const canQuickApprove = (row.status === "pending" || row.status === "reviewing") && !row.has_unconfirmed_amount;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sb-company-cell">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td><button class="sb-link-button" type="button" data-purchase-id="${escapeHtml(row.id)}">${escapeHtml(row.receipt_no || "-")}</button></td>
        <td>${renderPurchaseGiftcard(row)}</td>
        <td>${row.has_unconfirmed_amount ? `<span class="sb-soft-warning">&#44552;&#50529; &#48120;&#54869;&#51221;</span>` : formatWon(row.total_face_value)}</td>
        <td>${row.has_unconfirmed_amount ? `<span class="sb-soft-warning">&#44160;&#49688; &#54596;&#50836;</span>` : formatWon(row.expected_settlement_amount)}</td>
        <td>${renderStatus(row.status)}</td>
        <td>${formatDateTime(row.created_at)}</td>
        <td>
          <div class="sb-row-actions">
            <button class="sb-table-action" type="button" data-purchase-id="${escapeHtml(row.id)}">&#49345;&#49464;</button>
            ${canQuickApprove ? `<button class="sb-table-action sb-table-action-primary" type="button" data-quick-approve-id="${escapeHtml(row.id)}">&#48736;&#47480; &#49849;&#51064;</button>` : ""}
          </div>
        </td>
      `;
      return tr;
    })
  );
}
async function handleQuickApprove(purchaseRequestId) {
  const request = state.purchases.find((row) => row.id === purchaseRequestId);
  if (!request) return;

  if (request.status !== "pending" && request.status !== "reviewing") {
    setMessage(els.appMessage, "\uB300\uAE30 \uB610\uB294 \uAC80\uC218\uC911 \uC0C1\uD0DC\uB9CC \uBE60\uB978 \uC2B9\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "error");
    return;
  }

  const expectedAmount = Number(request.expected_settlement_amount || 0);
  const confirmed = await confirmQuickApprove(request, expectedAmount);
  if (!confirmed) return;

  const button = document.querySelector(`[data-quick-approve-id="${CSS.escape(purchaseRequestId)}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "\uC2B9\uC778 \uC911";
  }

  try {
    await apiPost(`/admin/seumbiz/purchase-requests/${encodeURIComponent(purchaseRequestId)}/approve`, {
      approved_settlement_amount: expectedAmount,
      admin_memo: "\uBE60\uB978 \uC2B9\uC778"
    });

    setMessage(els.appMessage, "\uBE60\uB978 \uC2B9\uC778\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
    await refreshAfterAdminAction(loadPurchases);
  } catch (error) {
    setMessage(els.appMessage, error.message || "\uBE60\uB978 \uC2B9\uC778 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
    if (button) {
      button.disabled = false;
      button.textContent = "\uBE60\uB978 \uC2B9\uC778";
    }
  }
}

async function openPurchaseModal(purchaseRequestId) {
  state.selectedPurchaseRequestId = purchaseRequestId;
  state.selectedPurchaseStatus = "";
  state.selectedPurchaseRequest = null;
  state.selectedPurchaseReceiptNo = "";
  state.selectedPurchaseRate = 0;
  state.selectedPurchasePinRows = [];
  els.purchaseModal.hidden = false;
  els.approvedSettlementAmount.value = "";
  els.purchaseAdminMemo.value = "";
  if (els.purchaseRejectMemo) els.purchaseRejectMemo.value = "";
  updatePurchaseActionPanel(null);
  updatePinActionButtons();
  els.purchaseDetailGrid.replaceChildren(createDetailItem("상태", "불러오는 중"));
  setTableLoading(els.purchaseItemsBody, 4);

  try {
    const data = await apiGet(`/admin/seumbiz/purchase-requests/${encodeURIComponent(purchaseRequestId)}`);
    const request = data.request;
    const items = data.items || [];
    state.selectedPurchaseStatus = request.status || "";
    state.selectedPurchaseRequest = request;
    state.selectedPurchaseReceiptNo = request.receipt_no || "purchase-request";
    state.selectedPurchaseRate = normalizePlainAmount(request.giftcard_rate_snapshot ?? request.applied_rate);
    state.selectedPurchasePinRows = items
      .map((item) => ({
        id: item.id,
        pinNo: String(item.pin_no || "").trim(),
        faceValue: normalizePlainAmount(item.face_value)
      }))
      .filter((item) => item.pinNo);
    updatePinActionButtons();
    updatePurchaseActionPanel(request);
    updateApproveButtonState();

    const recalculatedExpectedAmount = calculateSelectedPurchaseSettlementAmount();
    els.approvedSettlementAmount.placeholder = `비우면 ${formatWon(recalculatedExpectedAmount || request.expected_settlement_amount)} 자동 계산`;

    const detailItems = [
      createDetailItem("접수번호", request.receipt_no),
      createCompanyDetailItem("업체명", request.company_id, request.company_name),
      createDetailHtmlItem("상품권 종류", renderPurchaseGiftcard(request)),
      createDetailItem("상태", getStatusLabel(request.status)),
      createDetailItem("총 건수", `${request.item_count || items.length || 0}건`),
      createDetailItem(
        "신청 액면가",
        state.selectedPurchasePinRows.some((item) => !item.faceValue) ? "금액 미확정" : formatWon(request.total_face_value)
      ),
      createDetailItem("요율", `${formatNumber(state.selectedPurchaseRate || request.applied_rate)}%`),
      createDetailItem(
        "예상 정산금",
        state.selectedPurchasePinRows.some((item) => !item.faceValue) ? "검수 필요" : formatWon(request.expected_settlement_amount)
      )
    ];

    if (request.status === "rejected" && request.admin_memo) {
      detailItems.push(createDetailItem("반려 사유", request.admin_memo));
    }

    els.purchaseDetailGrid.replaceChildren(...detailItems);

    if (!items.length) {
      setTableMessage(els.purchaseItemsBody, 4, "등록된 핀번호 상세가 없습니다.");
      return;
    }

    renderPurchaseItemsBody(items, isPurchaseActionableStatus(request.status));
  } catch (error) {
    els.purchaseDetailGrid.replaceChildren(createDetailItem("오류", error.message || "상세를 불러오지 못했습니다."));
    setTableMessage(els.purchaseItemsBody, 4, "핀번호 목록을 불러오지 못했습니다.");
    updatePurchaseActionPanel(null);
  }
}

function isPurchaseActionableStatus(status) {
  return status === "pending" || status === "reviewing";
}

function updatePurchaseActionPanel(request) {
  const actionable = isPurchaseActionableStatus(request?.status);

  if (els.purchaseActionPanel) {
    els.purchaseActionPanel.hidden = !actionable;
  }

  if (els.purchaseClosedNotice) {
    if (actionable || !request) {
      els.purchaseClosedNotice.hidden = true;
      els.purchaseClosedNotice.className = "sb-purchase-closed-note";
      els.purchaseClosedNotice.innerHTML = "";
    } else {
      els.purchaseClosedNotice.hidden = false;
      els.purchaseClosedNotice.className = `sb-purchase-closed-note${request.status === "rejected" ? " is-rejected" : ""}`;

      if (request.status === "approved") {
        els.purchaseClosedNotice.innerHTML =
          "<strong>승인 완료된 접수입니다.</strong>추가 승인/반려 처리는 할 수 없습니다.";
      } else if (request.status === "rejected") {
        els.purchaseClosedNotice.innerHTML = `<strong>반려된 접수입니다.</strong>${escapeHtml(
          request.admin_memo || "반려 사유가 없습니다."
        )}`;
      } else if (request.status === "canceled") {
        els.purchaseClosedNotice.innerHTML =
          "<strong>취소된 접수입니다.</strong>추가 승인/반려 처리는 할 수 없습니다.";
      } else {
        els.purchaseClosedNotice.innerHTML = `<strong>${escapeHtml(
          getStatusLabel(request.status)
        )}</strong>현재 상태에서는 승인/반려 처리를 할 수 없습니다.`;
      }
    }
  }
}

function renderPurchaseItemsBody(items, actionable) {
  if (!els.purchaseItemsBody) return;

  els.purchaseItemsBody.replaceChildren(
    ...items.map((item, index) => {
      const tr = document.createElement("tr");
      const faceValue = normalizePlainAmount(item.face_value);
      const amountCell = actionable
        ? `<input class="sb-item-face-input" type="text" inputmode="numeric" value="${faceValue || ""}" placeholder="금액 입력" data-purchase-item-amount="${escapeHtml(item.id)}" />`
        : escapeHtml(faceValue ? formatWon(faceValue) : "-");
      const statusCell = faceValue ? renderStatus(item.status) : `<span class="sb-soft-warning">금액 미확정</span>`;

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="sb-pin-cell">${escapeHtml(item.pin_no || "-")}</td>
        <td>${amountCell}</td>
        <td>${statusCell}</td>
      `;
      return tr;
    })
  );
}

function closePurchaseModal() {
  els.purchaseModal.hidden = true;
  state.selectedPurchaseRequestId = "";
  state.selectedPurchaseStatus = "";
  state.selectedPurchaseRequest = null;
  state.selectedPurchaseReceiptNo = "";
  state.selectedPurchaseRate = 0;
  state.selectedPurchasePinRows = [];
  if (els.purchaseRejectMemo) els.purchaseRejectMemo.value = "";
  updatePurchaseActionPanel(null);
  updatePinActionButtons();
  updateApproveButtonState();
}

function updatePinActionButtons() {
  const disabled = !state.selectedPurchasePinRows.length;
  els.copyPinsButton.disabled = disabled;
  els.downloadPinsButton.disabled = disabled;
}

function hasUnconfirmedPurchaseItemAmount() {
  return state.selectedPurchasePinRows.some((item) => !Number(item.faceValue || 0));
}

function updateApproveButtonState() {
  if (!els.approveButton) return;
  if (!isPurchaseActionableStatus(state.selectedPurchaseStatus)) {
    els.approveButton.disabled = true;
    els.approveButton.title = "";
    if (els.rejectButton) {
      els.rejectButton.disabled = true;
      els.rejectButton.title = "";
    }
    return;
  }

  const hasRows = Boolean(state.selectedPurchasePinRows.length);
  const blocked = hasRows && hasUnconfirmedPurchaseItemAmount();
  els.approveButton.disabled = blocked;
  els.approveButton.title = blocked ? "모든 PIN의 액면가를 입력해야 승인할 수 있습니다." : "";

  if (els.rejectButton) {
    els.rejectButton.disabled = false;
    els.rejectButton.title = "";
  }
}

function handlePurchaseItemAmountInput(event) {
  const input = event.target.closest("[data-purchase-item-amount]");
  if (!input) return;
  const item = state.selectedPurchasePinRows.find((row) => row.id === input.dataset.purchaseItemAmount);
  if (!item) return;
  item.faceValue = normalizePlainAmount(input.value);
  input.closest("tr")?.classList.toggle("is-amount-pending", !item.faceValue);
  const recalculatedExpectedAmount = calculateSelectedPurchaseSettlementAmount();
  if (els.approvedSettlementAmount && !els.approvedSettlementAmount.value.trim()) {
    els.approvedSettlementAmount.placeholder = `비우면 ${formatWon(recalculatedExpectedAmount)} 자동 계산`;
  }
  updateApproveButtonState();
}

function calculateSelectedPurchaseFaceValueTotal() {
  return state.selectedPurchasePinRows.reduce((sum, item) => sum + normalizePlainAmount(item.faceValue), 0);
}

function calculateSelectedPurchaseSettlementAmount() {
  const totalFaceValue = calculateSelectedPurchaseFaceValueTotal();
  const rate = Number(state.selectedPurchaseRate || 0);
  if (!totalFaceValue || !rate) return 0;
  return Math.floor(totalFaceValue * rate / 100);
}

async function copySelectedPurchasePins() {
  if (!state.selectedPurchasePinRows.length) return;

  const text = createPinExportText();
  try {
    await navigator.clipboard.writeText(text);
    setMessage(els.appMessage, "핀번호를 클립보드에 복사했습니다.", "success");
  } catch {
    setMessage(els.appMessage, "클립보드 복사에 실패했습니다.", "error");
  }
}

function downloadSelectedPurchasePins() {
  if (!state.selectedPurchasePinRows.length) return;

  const text = `${createPinExportText()}\n`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${sanitizeFileName(state.selectedPurchaseReceiptNo || "purchase-request")}-pins.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function createPinExportText() {
  return state.selectedPurchasePinRows.map((item) => `${item.pinNo} ${item.faceValue}`).join("\n");
}

async function handleApprovePurchase(event) {
  event.preventDefault();
  if (!state.selectedPurchaseRequestId) return;
  if (!isPurchaseActionableStatus(state.selectedPurchaseStatus)) {
    setMessage(els.appMessage, "대기 또는 검수중 상태만 승인할 수 있습니다.", "error");
    return;
  }

  els.approveButton.disabled = true;
  els.approveButton.textContent = "처리 중";

  try {
    if (hasUnconfirmedPurchaseItemAmount()) {
      setMessage(els.appMessage, "모든 PIN의 액면가를 입력해야 승인할 수 있습니다.", "error");
      return;
    }

    const amountValue = els.approvedSettlementAmount.value.trim();
    const calculatedSettlementAmount = calculateSelectedPurchaseSettlementAmount();
    const approvedSettlementAmount = amountValue
      ? normalizePlainAmount(amountValue)
      : calculatedSettlementAmount;

    if (!approvedSettlementAmount || approvedSettlementAmount <= 0) {
      setMessage(els.appMessage, "PIN별 액면가 기준 확정 정산금을 계산할 수 없습니다.", "error");
      return;
    }

    const itemFaceValues = state.selectedPurchasePinRows.map((item) => ({
      id: item.id,
      face_value: normalizePlainAmount(item.faceValue)
    }));
    await apiPost(`/admin/seumbiz/purchase-requests/${encodeURIComponent(state.selectedPurchaseRequestId)}/approve`, {
      approved_settlement_amount: approvedSettlementAmount,
      admin_memo: els.purchaseAdminMemo.value.trim() || null,
      item_face_values: itemFaceValues
    });

    closePurchaseModal();
    setMessage(els.appMessage, "매입신청을 승인했습니다.", "success");
    await refreshAfterAdminAction(loadPurchases);
  } catch (error) {
    setMessage(els.appMessage, error.message || "승인 처리에 실패했습니다.", "error");
  } finally {
    els.approveButton.disabled = false;
    els.approveButton.textContent = "승인 처리";
    updateApproveButtonState();
  }
}

async function handleRejectPurchase(event) {
  event.preventDefault();
  if (!state.selectedPurchaseRequestId || !state.selectedPurchaseRequest) return;
  if (!isPurchaseActionableStatus(state.selectedPurchaseStatus)) {
    setMessage(els.appMessage, "대기 또는 검수중 상태만 반려할 수 있습니다.", "error");
    return;
  }

  const rejectMemo = els.purchaseRejectMemo?.value.trim() || "";
  if (!rejectMemo) {
    setMessage(els.appMessage, "반려 사유를 입력해주세요.", "error");
    els.purchaseRejectMemo?.focus();
    return;
  }

  const confirmed = await confirmPurchaseReject(state.selectedPurchaseRequest, rejectMemo);
  if (!confirmed) return;

  els.rejectButton.disabled = true;
  els.rejectButton.textContent = "처리 중";

  try {
    await apiPost(`/admin/seumbiz/purchase-requests/${encodeURIComponent(state.selectedPurchaseRequestId)}/reject`, {
      admin_memo: rejectMemo
    });

    closePurchaseModal();
    setMessage(els.appMessage, "매입신청을 반려했습니다. 관리자 로그에서 purchase_rejected를 확인할 수 있습니다.", "success");
    await refreshAfterAdminAction(loadPurchases);
  } catch (error) {
    setMessage(els.appMessage, error.message || "반려 처리에 실패했습니다.", "error");
  } finally {
    if (els.rejectButton) {
      els.rejectButton.disabled = false;
      els.rejectButton.textContent = "반려 처리";
      updateApproveButtonState();
    }
  }
}

function confirmPurchaseReject(request, rejectMemo) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "sb-quick-approve-modal";
    modal.innerHTML = `
      <div class="sb-quick-approve-backdrop" data-close></div>
      <section class="sb-quick-approve-card sb-purchase-reject-card" role="dialog" aria-modal="true" aria-labelledby="purchaseRejectConfirmTitle">
        <div class="sb-quick-approve-head">
          <p>PURCHASE REJECT</p>
          <h2 id="purchaseRejectConfirmTitle">매입 반려 확인</h2>
        </div>
        <div class="sb-quick-approve-giftcard">${renderPurchaseGiftcard(request)}</div>
        <dl class="sb-quick-approve-info">
          <div><dt>접수번호</dt><dd>${escapeHtml(request.receipt_no || "-")}</dd></div>
          <div><dt>업체명</dt><dd>${renderCompanyNameLink(request.company_id, request.company_name)}</dd></div>
          <div><dt>상태</dt><dd>${escapeHtml(getStatusLabel(request.status))}</dd></div>
          <div><dt>반려 사유</dt><dd>${escapeHtml(rejectMemo)}</dd></div>
        </dl>
        <p class="sb-quick-approve-note">반려 시 Ledger는 생성되지 않으며, 업체 화면에 반려 사유가 표시됩니다.</p>
        <div class="sb-quick-approve-actions">
          <button class="sb-outline-button" type="button" data-close>취소</button>
          <button class="sb-outline-button sb-reject-button" type="button" data-confirm>반려 처리</button>
        </div>
      </section>
    `;

    const close = (result) => {
      modal.remove();
      resolve(result);
    };

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-confirm]")) close(true);
      if (event.target.closest("[data-close]")) close(false);
    });

    document.body.append(modal);
    modal.querySelector("[data-confirm]")?.focus();
  });
}

async function loadWithdraws(options = {}) {
  if (!options.silent) setTableLoading(els.withdrawBody, 5);
  try {
    const page = Number(options.page || state.withdrawPage || 1);
    const data = await apiGet(`/admin/seumbiz/withdraw-requests?page=${page}&pageSize=${LIST_PAGE_SIZE}`);
    state.withdraws = data.items || data.requests || [];
    state.withdrawPage = Number(data.page || page);
    state.withdrawTotalPages = Number(data.totalPages || 1);
    state.withdrawTotal = Number(data.total || state.withdraws.length);
    renderWithdraws();
    renderPagination("withdraw");
    updateWithdrawAlertStateFromList();
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.withdrawBody, 5, error.message || "\uCD9C\uAE08\uC2E0\uCCAD \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } else {
      console.log("[SEUMBiz Admin Monitor] withdraw list failed", error);
    }
    throw error;
  }
}

function renderWithdraws() {
  if (!state.withdraws.length) {
    setTableMessage(els.withdrawBody, 5, "출금신청 내역이 없습니다.");
    renderPagination("withdraw");
    return;
  }

  els.withdrawBody.replaceChildren(
    ...state.withdraws.map((row) => {
      const isPending = row.status === "pending";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sb-company-cell">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td>${formatWon(row.amount)}</td>
        <td>${renderStatus(row.status)}</td>
        <td>${formatDateTime(row.created_at)}</td>
        <td class="is-action">
          <div class="sb-withdraw-actions">
            <button class="sb-table-action" type="button" data-withdraw-review-id="${escapeHtml(row.id)}">상세보기</button>
            ${
              isPending
                ? `<button class="sb-table-action sb-table-action-primary" type="button" data-withdraw-complete-id="${escapeHtml(row.id)}">완료처리</button>`
                : ""
            }
          </div>
        </td>
      `;
      return tr;
    })
  );
}

async function loadSettlements(options = {}) {
  if (!els.settlementBody) return;
  if (!options.silent) setTableLoading(els.settlementBody, 8);
  try {
    const query = getSettlementQueryString();
    const data = await apiGet(`/admin/seumbiz/settlements${query}`);
    const summary = data.summary || {};
    state.settlements = data.items || [];
    els.settlementTotalBalance.textContent = formatWon(summary.totalCompanyBalance);
    els.settlementTodayApproved.textContent = formatWon(summary.purchaseFaceValueAmount);
    if (els.settlementActualPurchase) els.settlementActualPurchase.textContent = formatWon(summary.actualPurchaseAmount);
    if (els.settlementProfit) els.settlementProfit.textContent = formatWon(summary.purchaseProfitAmount);
    if (els.settlementTodayWithdraw) els.settlementTodayWithdraw.textContent = formatWon(summary.todayWithdrawCompletedAmount);
    els.settlementPendingWithdraw.textContent = formatWon(summary.pendingWithdrawAmount);
    els.settlementRequiredCompanies.textContent = `${formatNumber(summary.settlementRequiredCompanyCount || 0)}\uAC1C`;
    if (els.settlementFaceValueHelp) {
      els.settlementFaceValueHelp.textContent = summary.hasDateFilter ? "\uC120\uD0DD \uAE30\uAC04 \uC811\uC218/\uC2B9\uC778 \uAE30\uC900" : "\uC624\uB298 \uC811\uC218/\uC2B9\uC778 \uAE30\uC900";
    }
    renderSettlements();
    updateSettlementLastRefreshTime();
    if (!options.skipDetailRefresh && state.selectedSettlementCompanyId && !els.settlementModal?.hidden) {
      await openSettlementModal(state.selectedSettlementCompanyId, { silent: true });
    }
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.settlementBody, 8, error.message || "\uC815\uC0B0 \uD604\uD669\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } else {
      console.log("[SEUMBiz Admin] settlement list failed", error);
    }
  }
}

function renderSettlements() {
  if (!state.settlements.length) {
    setTableMessage(els.settlementBody, 8, "\uC815\uC0B0 \uD604\uD669\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.settlementBody.replaceChildren(
    ...state.settlements.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sb-company-cell">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td class="is-amount sb-amount-strong">${formatWon(row.current_balance)}</td>
        <td class="is-amount">${formatWon(row.total_purchase_approved)}</td>
        <td class="is-amount">${formatWon(row.total_withdraw_completed)}</td>
        <td class="is-amount">${formatWon(row.pending_withdraw_amount)}</td>
        <td class="is-date">${formatDateTime(row.recent_approved_at)}</td>
        <td class="is-date">${formatDateTime(row.recent_withdraw_at)}</td>
        <td class="is-action"><button class="sb-table-action" type="button" data-settlement-company-id="${escapeHtml(row.company_id)}">\uC0C1\uC138</button></td>
      `;
      return tr;
    })
  );
}

async function openSettlementModal(companyId, options = {}) {
  if (!companyId || !els.settlementModal) return;
  state.selectedSettlementCompanyId = companyId;
  els.settlementModal.hidden = false;
  showSettlementTab("approved");
  if (!options.silent) {
    els.settlementDetailGrid.replaceChildren(createDetailItem("\uC0C1\uD0DC", "\uBD88\uB7EC\uC624\uB294 \uC911"));
    setTableLoading(els.settlementApprovedBody, 4);
    setTableLoading(els.settlementWithdrawBody, 4);
    setTableLoading(els.settlementAdjustmentBody, 4);
  }

  try {
    const data = await apiGet(`/admin/seumbiz/settlements/${encodeURIComponent(companyId)}`);
    const company = data.company || {};
    els.settlementDetailGrid.replaceChildren(
      createCompanyDetailItem("\uC5C5\uCCB4\uBA85", company.id || companyId, company.company_name),
      createDetailItem("\uD604\uC7AC \uC794\uC561", formatWon(company.current_balance)),
      createDetailItem("\uCD1D \uC2B9\uC778 \uAE08\uC561", formatWon(company.total_purchase_approved)),
      createDetailItem("\uCD1D \uCD9C\uAE08 \uC644\uB8CC", formatWon(company.total_withdraw_completed)),
      createDetailItem("\uCD9C\uAE08 \uB300\uAE30", formatWon(company.pending_withdraw_amount))
    );
    renderSettlementLedgerRows(els.settlementApprovedBody, data.recentApproved || [], "\uC2B9\uC778 \uBC18\uC601");
    renderSettlementWithdrawRows(els.settlementWithdrawBody, data.recentWithdraws || []);
    renderSettlementLedgerRows(els.settlementAdjustmentBody, data.recentAdjustments || []);
  } catch (error) {
    els.settlementDetailGrid.replaceChildren(createDetailItem("\uC624\uB958", error.message || "\uC815\uC0B0 \uC0C1\uC138\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
    setTableMessage(els.settlementApprovedBody, 4, "\uC2B9\uC778 \uB0B4\uC5ED\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    setTableMessage(els.settlementWithdrawBody, 4, "\uCD9C\uAE08 \uB0B4\uC5ED\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    setTableMessage(els.settlementAdjustmentBody, 4, "\uC218\uB3D9\uC870\uC815 \uB0B4\uC5ED\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }
}

function closeSettlementModal() {
  if (els.settlementModal) els.settlementModal.hidden = true;
  state.selectedSettlementCompanyId = "";
}

function renderSettlementLedgerRows(tbody, rows, fixedType = "") {
  if (!rows.length) {
    setTableMessage(tbody, 4, "\uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  tbody.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="is-date">${formatDateTime(row.created_at)}</td>
        <td class="is-type">${escapeHtml(fixedType || formatLedgerType(row.ledger_type))}</td>
        <td class="is-amount">${formatWon(row.amount)}</td>
        <td>${escapeHtml(row.memo || row.reason || "-")}</td>
      `;
      return tr;
    })
  );
}

function renderSettlementWithdrawRows(tbody, rows) {
  if (!rows.length) {
    setTableMessage(tbody, 4, "\uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  tbody.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="is-date">${formatDateTime(row.processed_at || row.created_at)}</td>
        <td class="is-type">\uCD9C\uAE08 \uC2E0\uCCAD</td>
        <td class="is-amount">${formatWon(row.amount)}</td>
        <td>${renderStatus(row.status)} ${escapeHtml(row.admin_memo || row.memo || "")}</td>
      `;
      return tr;
    })
  );
}

function showSettlementTab(tabName) {
  const nextTab = tabName || "approved";
  for (const button of els.settlementTabButtons) {
    button.classList.toggle("is-active", button.dataset.settlementTab === nextTab);
  }
  for (const panel of els.settlementTabPanels) {
    panel.hidden = panel.dataset.settlementPanel !== nextTab;
  }
}

function getSettlementQueryString() {
  const params = new URLSearchParams();
  const start = els.settlementStartDate?.value || "";
  const end = els.settlementEndDate?.value || "";
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function resetSettlementFilters() {
  if (els.settlementStartDate) els.settlementStartDate.value = "";
  if (els.settlementEndDate) els.settlementEndDate.value = "";
  loadSettlements();
}

function updateSettlementLastRefreshTime() {
  if (!els.settlementLastRefresh) return;
  const text = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
  els.settlementLastRefresh.textContent = `\uB9C8\uC9C0\uB9C9 \uAC31\uC2E0: ${text}`;
}

function downloadSettlements(type) {
  if (!state.settlements.length) {
    setMessage(els.appMessage, "\uB2E4\uC6B4\uB85C\uB4DC\uD560 \uC815\uC0B0 \uD604\uD669\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.", "error");
    return;
  }
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (type === "txt") {
    const lines = state.settlements.map((row) => [
      row.company_name || "-",
      formatPlainNumber(row.current_balance),
      formatPlainNumber(row.total_purchase_approved),
      formatPlainNumber(row.total_withdraw_completed),
      formatPlainNumber(row.pending_withdraw_amount),
      formatDateTime(row.recent_approved_at),
      formatDateTime(row.recent_withdraw_at)
    ].join(" / "));
    downloadTextFile(`seumbiz-settlements-${today}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
    return;
  }

  const headers = ["\uC5C5\uCCB4\uBA85", "\uD604\uC7AC \uC794\uC561", "\uCD1D \uC2B9\uC778 \uAE08\uC561", "\uCD1D \uCD9C\uAE08 \uC644\uB8CC", "\uCD9C\uAE08 \uB300\uAE30", "\uCD5C\uADFC \uC2B9\uC778\uC77C", "\uCD5C\uADFC \uCD9C\uAE08\uC77C"];
  const rows = state.settlements.map((row) => [
    row.company_name || "-",
    formatPlainNumber(row.current_balance),
    formatPlainNumber(row.total_purchase_approved),
    formatPlainNumber(row.total_withdraw_completed),
    formatPlainNumber(row.pending_withdraw_amount),
    formatDateTime(row.recent_approved_at),
    formatDateTime(row.recent_withdraw_at)
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  downloadTextFile(`seumbiz-settlements-${today}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatPlainNumber(value) {
  return String(Math.trunc(Number(value || 0)));
}

function formatLedgerType(type) {
  const labels = {
    purchase_approved: "\uC2B9\uC778 \uBC18\uC601",
    withdraw_completed: "\uCD9C\uAE08 \uC644\uB8CC",
    manual_credit: "\uC218\uB3D9 \uC801\uB9BD",
    manual_debit: "\uC218\uB3D9 \uCC28\uAC10",
    admin_deduct: "\uAD00\uB9AC\uC790 \uCC28\uAC10",
    admin_advance: "\uAD00\uB9AC\uC790 \uC120\uC9C0\uAE09",
    admin_restore: "\uBCF5\uAD6C",
    manual_adjust: "\uC218\uB3D9 \uC870\uC815"
  };
  return labels[type] || type || "-";
}

async function loadCompanies(options = {}) {
  if (!els.companyBody) return;
  if (!options.silent) setTableLoading(els.companyBody, 8);
  try {
    const data = await apiGet("/admin/seumbiz/companies");
    state.companies = data.items || [];
    renderCompanies();
    if (!options.skipDetailRefresh && state.selectedCompanyId && !els.companyModal?.hidden) {
      await openCompanyModal(state.selectedCompanyId, {
        silent: true,
        preserveAdjustmentForm: true
      });
    }
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.companyBody, 8, error.message || "\uC5C5\uCCB4 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } else {
      console.log("[SEUMBiz Admin] company list failed", error);
    }
  }
}

function renderCompanies() {
  if (!state.companies.length) {
    setTableMessage(els.companyBody, 8, "\uB4F1\uB85D\uB41C \uC5C5\uCCB4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.companyBody.replaceChildren(
    ...state.companies.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sb-company-cell">${renderCompanyNameLink(row.id, row.company_name)}</td>
        <td>${escapeHtml(row.manager_name || row.owner_name || "-")}</td>
        <td>${escapeHtml(row.phone || "-")}</td>
        <td>${escapeHtml(row.kakao_id || "-")}</td>
        <td>${renderStatus(row.status)}</td>
        <td class="is-amount sb-amount-strong">${formatWon(row.current_balance)}</td>
        <td>${formatDateTime(row.created_at)}</td>
        <td><button class="sb-table-action" type="button" data-company-id="${escapeHtml(row.id)}">\uC0C1\uC138</button></td>
      `;
      return tr;
    })
  );
}

async function openCompanyModal(companyId, options = {}) {
  if (!companyId || !els.companyModal) return;
  state.selectedCompanyId = companyId;
  els.companyModal.hidden = false;
  clearMessage(els.companyMessage);
  clearMessage(els.companyAdjustmentMessage);
  if (!options.silent) {
    els.companyDetailGrid.replaceChildren(createDetailItem("\uC0C1\uD0DC", "\uBD88\uB7EC\uC624\uB294 \uC911"));
    setTableLoading(els.companyLedgerBody, 4);
    setTableLoading(els.companyGiftcardRatesBody, 5);
  }
  clearMessage(els.companyGiftcardRatesMessage);

  try {
    const data = await apiGet(`/admin/seumbiz/companies/${encodeURIComponent(companyId)}`);
    const company = data.company || {};
    state.selectedCompanyBalance = normalizePlainAmount(company.current_balance);
    fillCompanyForm(company);
    renderCompanyDetail(company, data.users || []);
    renderCompanyLedger(data.recentLedger || []);
    if (!options.preserveAdjustmentForm) {
      resetCompanyAdjustmentForm();
    } else {
      syncCompanyAdjustmentTypeSelect();
    }
    updateCompanyBalancePreview();
    await loadCompanyGiftcardRates(companyId, { silent: options.silent });
  } catch (error) {
    els.companyDetailGrid.replaceChildren(createDetailItem("\uC624\uB958", error.message || "\uC5C5\uCCB4 \uC0C1\uC138\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
    setTableMessage(els.companyLedgerBody, 4, "\uC794\uC561 \uD65C\uB3D9\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    setTableMessage(els.companyGiftcardRatesBody, 5, "\uC0C1\uD488\uAD8C \uC694\uC728\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }
}

function closeCompanyModal() {
  if (els.companyModal) els.companyModal.hidden = true;
  state.selectedCompanyId = "";
  state.selectedCompanyBalance = 0;
  state.companyAdjustmentType = "credit";
  state.companyGiftcardRateItems = [];
}

async function loadCompanyGiftcardRates(companyId, options = {}) {
  if (!els.companyGiftcardRatesBody || !companyId) return;

  if (!options.silent) {
    setTableLoading(els.companyGiftcardRatesBody, 5);
  }

  try {
    const data = await apiGet(`/admin/seumbiz/companies/${encodeURIComponent(companyId)}/giftcard-rates`);
    state.companyGiftcardRateItems = data.items || [];
    renderCompanyGiftcardRates(state.companyGiftcardRateItems);
  } catch (error) {
    state.companyGiftcardRateItems = [];
    setTableMessage(
      els.companyGiftcardRatesBody,
      5,
      error.message || "\uC0C1\uD488\uAD8C \uC694\uC728\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
    );
    if (!options.silent) {
      setMessage(els.companyGiftcardRatesMessage, error.message || "\uC0C1\uD488\uAD8C \uC694\uC728\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.", "error");
    }
  }
}

function renderCompanyGiftcardRates(items) {
  if (!els.companyGiftcardRatesBody) return;

  if (!items.length) {
    setTableMessage(els.companyGiftcardRatesBody, 5, "\uB4F1\uB85D\uB41C \uC0C1\uD488\uAD8C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.companyGiftcardRatesBody.replaceChildren(
    ...items.map((row) => {
      const hasOverride = row.company_override_rate != null && row.company_override_rate !== "";
      const tr = document.createElement("tr");
      tr.dataset.giftcardTypeId = row.giftcard_type_id;
      tr.dataset.globalRate = String(row.global_default_rate ?? 0);
      tr.className = hasOverride ? "is-rate-override" : "";
      tr.innerHTML = `
        <td class="sb-company-rate-name">
          <strong>${escapeHtml(row.name || "-")}</strong>
          <small>${escapeHtml(row.code || "-")}</small>
        </td>
        <td class="sb-company-rate-global">${escapeHtml(formatRateNumber(row.global_default_rate))}</td>
        <td>
          <input
            class="sb-company-rate-input"
            type="text"
            inputmode="decimal"
            placeholder="\uAE30\uBCF8\uAC12"
            value="${hasOverride ? normalizePlainAmount(row.company_override_rate) : ""}"
            aria-label="${escapeHtml(row.name || row.code || "\uC0C1\uD488\uAD8C")} \uC5C5\uCCB4 \uC694\uC728"
          />
        </td>
        <td class="sb-company-rate-effective">${escapeHtml(formatRateNumber(row.effective_rate))}</td>
        <td><span class="sb-rate-status ${hasOverride ? "is-override" : "is-default"}">${hasOverride ? "\uC624\uBC84\uB77C\uC774\uB4DC" : "\uAE30\uBCF8\uAC12"}</span></td>
      `;
      return tr;
    })
  );
}

function handleCompanyGiftcardRateInput(event) {
  if (!event.target.matches(".sb-company-rate-input")) return;
  updateCompanyGiftcardRateRowPreview(event.target);
}

function updateCompanyGiftcardRateRowPreview(input) {
  const row = input.closest("tr");
  if (!row) return;

  const globalRate = Number(row.dataset.globalRate || 0);
  const raw = input.value.trim();
  const parsed = raw === "" ? NaN : Number(raw);
  const hasOverride = raw !== "" && Number.isFinite(parsed) && parsed > 0;
  const effective = hasOverride ? parsed : globalRate;
  const effectiveCell = row.querySelector(".sb-company-rate-effective");
  const status = row.querySelector(".sb-rate-status");

  if (effectiveCell) {
    effectiveCell.textContent = formatRateNumber(effective);
  }
  if (status) {
    status.textContent = hasOverride ? "\uC624\uBC84\uB77C\uC774\uB4DC" : "\uAE30\uBCF8\uAC12";
    status.className = `sb-rate-status ${hasOverride ? "is-override" : "is-default"}`;
  }
  row.classList.toggle("is-rate-override", hasOverride);
}

function collectCompanyGiftcardRateSaveItems() {
  const rows = [...(els.companyGiftcardRatesBody?.querySelectorAll("tr[data-giftcard-type-id]") || [])];
  const items = [];

  for (const row of rows) {
    const giftcardTypeId = row.dataset.giftcardTypeId;
    const input = row.querySelector(".sb-company-rate-input");
    const label = row.querySelector(".sb-company-rate-name strong")?.textContent || "\uC0C1\uD488\uAD8C";
    const raw = String(input?.value || "").trim();

    if (!giftcardTypeId) continue;

    if (raw === "") {
      items.push({ giftcard_type_id: giftcardTypeId, rate: null });
      continue;
    }

    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
      throw new Error(`"${label}" \uC694\uC728\uC740 0 \uCD08\uACFC 100 \uC774\uD558\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.`);
    }

    items.push({ giftcard_type_id: giftcardTypeId, rate });
  }

  return items;
}

async function handleSaveCompanyGiftcardRates() {
  if (!state.selectedCompanyId || !els.companyGiftcardRatesSaveButton) return;
  clearMessage(els.companyGiftcardRatesMessage);

  let items = [];
  try {
    items = collectCompanyGiftcardRateSaveItems();
  } catch (error) {
    setMessage(els.companyGiftcardRatesMessage, error.message, "error");
    return;
  }

  els.companyGiftcardRatesSaveButton.disabled = true;
  els.companyGiftcardRatesSaveButton.textContent = "\uC800\uC7A5 \uC911";

  try {
    const data = await apiPut(`/admin/seumbiz/companies/${encodeURIComponent(state.selectedCompanyId)}/giftcard-rates`, {
      items
    });
    state.companyGiftcardRateItems = data.items || [];
    renderCompanyGiftcardRates(state.companyGiftcardRateItems);
    setMessage(els.companyGiftcardRatesMessage, "\uC0C1\uD488\uAD8C \uC694\uC728\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.", "success");
  } catch (error) {
    setMessage(
      els.companyGiftcardRatesMessage,
      error.message || "\uC0C1\uD488\uAD8C \uC694\uC728 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
      "error"
    );
  } finally {
    els.companyGiftcardRatesSaveButton.disabled = false;
    els.companyGiftcardRatesSaveButton.textContent = "\uC694\uC728 \uC800\uC7A5";
  }
}

function fillCompanyForm(company) {
  els.companyId.value = company.id || "";
  els.companyName.value = company.company_name || "";
  els.companyManagerName.value = company.manager_name || "";
  els.companyPhone.value = company.phone || "";
  els.companyKakaoId.value = company.kakao_id || "";
  els.companyStatus.value = company.status || "pending";
}

function renderCompanyDetail(company, users) {
  const owner =
    (users || []).find((user) => user.role === "company_owner") ||
    (users || []).find((user) => user.role === "company_user") ||
    users?.[0] ||
    {};
  els.companyDetailGrid.replaceChildren(
    createDetailItem("\uC5C5\uCCB4\uBA85", company.company_name || "-"),
    createDetailItem("\uD604\uC7AC \uC794\uC561", formatWon(company.current_balance)),
    createDetailItem("\uC0C1\uD0DC", getStatusLabel(company.status)),
    createDetailItem("\uB300\uD45C \uACC4\uC815", owner.login_id || "-"),
    createDetailItem("\uB2F4\uB2F9\uC790", company.manager_name || owner.name || "-"),
    createDetailItem("\uC5F0\uB77D\uCC98", company.phone || owner.phone || "-"),
    createDetailItem("\uCE74\uCE74\uC624\uD1A1 ID", company.kakao_id || "-")
  );
}

function renderCompanyLedger(rows) {
  if (!rows.length) {
    setTableMessage(els.companyLedgerBody, 4, "\uC794\uC561 \uD65C\uB3D9 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  els.companyLedgerBody.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDateTime(row.created_at)}</td>
        <td>${escapeHtml(formatLedgerType(row.ledger_type))}</td>
        <td class="is-amount">${formatWon(row.amount)}</td>
        <td>${escapeHtml(row.reason || row.memo || "-")}</td>
      `;
      return tr;
    })
  );
}

function handleCompanyStatusAction(status) {
  if (!state.selectedCompanyId || !els.companyForm || !els.companyStatus) return;
  els.companyStatus.value = status;
  els.companyForm.requestSubmit();
}

async function handleSaveCompany(event) {
  event.preventDefault();
  if (!state.selectedCompanyId) return;
  clearMessage(els.companyMessage);
  const payload = {
    company_name: els.companyName.value.trim(),
    manager_name: els.companyManagerName.value.trim(),
    phone: els.companyPhone.value.trim(),
    kakao_id: els.companyKakaoId.value.trim(),
    status: els.companyStatus.value
  };

  els.companySaveButton.disabled = true;
  els.companySaveButton.textContent = "\uC800\uC7A5 \uC911";
  try {
    await apiPatch(`/admin/seumbiz/companies/${encodeURIComponent(state.selectedCompanyId)}`, payload);
    setMessage(els.companyMessage, "\uC5C5\uCCB4 \uC815\uBCF4\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.", "success");
    await refreshAfterAdminAction(async () => loadCompanies({ silent: true, skipDetailRefresh: true }));
    await openCompanyModal(state.selectedCompanyId, { silent: true });
  } catch (error) {
    setMessage(els.companyMessage, error.message || "\uC5C5\uCCB4 \uC815\uBCF4 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
  } finally {
    els.companySaveButton.disabled = false;
    els.companySaveButton.textContent = "\uC5C5\uCCB4 \uC815\uBCF4 \uC800\uC7A5";
  }
}

function syncCompanyAdjustmentTypeSelect() {
  if (els.companyAdjustmentType) {
    els.companyAdjustmentType.value = state.companyAdjustmentType;
  }
}

function setCompanyAdjustmentType(type) {
  state.companyAdjustmentType = type === "debit" ? "debit" : "credit";
  syncCompanyAdjustmentTypeSelect();
}

function getCompanyAdjustmentType() {
  return state.companyAdjustmentType === "debit" ? "debit" : "credit";
}

function resetCompanyAdjustmentForm() {
  if (!els.companyAdjustmentType) return;
  setCompanyAdjustmentType("credit");
  els.companyAdjustmentAmount.value = "";
  els.companyAdjustmentReason.value = "";
  els.companyAdjustmentMemo.value = "";
  clearMessage(els.companyAdjustmentMessage);
  if (els.companyBalanceAfterNote) els.companyBalanceAfterNote.hidden = true;
}

function handleCompanyAdjustmentAmountInput(event) {
  const input = event.target;
  if (!input || input !== els.companyAdjustmentAmount) return;

  const sanitized = String(input.value ?? "").replace(/\D/g, "");
  if (input.value !== sanitized) {
    input.value = sanitized;
  }
  updateCompanyBalancePreview();
}

function updateCompanyBalancePreview() {
  if (!els.companyBalanceBefore || !els.companyBalanceAfter) return;
  const current = parseMoneyNumber(state.selectedCompanyBalance);
  const rawAmount = els.companyAdjustmentAmount?.value;
  const amount =
    rawAmount === "" || rawAmount === null || rawAmount === undefined ? NaN : parsePositiveMoneyNumber(rawAmount);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const previewAmount = validAmount ? amount : 0;
  const signedAmount = getCompanyAdjustmentType() === "debit" ? -previewAmount : previewAmount;
  const projectedBalance = current + signedAmount;
  els.companyBalanceBefore.textContent = formatWon(current);
  els.companyBalanceAfter.textContent = validAmount ? formatWon(projectedBalance) : formatWon(current);
  els.companyBalanceAfter.classList.toggle("is-negative", validAmount && projectedBalance < 0);
  if (els.companyBalanceAfterNote) {
    const showNegativeNote = validAmount && getCompanyAdjustmentType() === "debit" && projectedBalance < 0;
    els.companyBalanceAfterNote.hidden = !showNegativeNote;
    els.companyBalanceAfterNote.textContent = showNegativeNote
      ? "예상 잔액이 음수입니다. 관리자 회수는 계속 진행할 수 있습니다."
      : "";
  }
}

async function handleCompanyAdjustment(event) {
  event.preventDefault();
  if (!state.selectedCompanyId) return;
  clearMessage(els.companyAdjustmentMessage);
  const payload = {
    adjustment_type: getCompanyAdjustmentType(),
    amount: parsePositiveMoneyNumber(els.companyAdjustmentAmount.value),
    reason: els.companyAdjustmentReason.value.trim(),
    admin_memo: els.companyAdjustmentMemo.value.trim() || null
  };

  if (!payload.reason) {
    setMessage(els.companyAdjustmentMessage, "\uC218\uB3D9 \uC870\uC815 \uC0AC\uC720\uB294 \uD544\uC218\uC785\uB2C8\uB2E4.", "error");
    els.companyAdjustmentReason.focus();
    return;
  }
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    setMessage(els.companyAdjustmentMessage, "\uAE08\uC561\uC744 0\uC6D0\uBCF4\uB2E4 \uD06C\uAC8C \uC785\uB825\uD574\uC8FC\uC138\uC694.", "error");
    els.companyAdjustmentAmount.focus();
    return;
  }

  const confirmed = await confirmCompanyAdjustment(payload);
  if (!confirmed) return;

  els.companyAdjustmentButton.disabled = true;
  els.companyAdjustmentButton.textContent = "\uCC98\uB9AC \uC911";
  try {
    await apiPost(`/admin/seumbiz/companies/${encodeURIComponent(state.selectedCompanyId)}/manual-adjustment`, payload);
    setMessage(els.companyAdjustmentMessage, "\uC218\uB3D9 \uC794\uC561 \uC870\uC815\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
    await loadCompanies({ silent: true, skipDetailRefresh: true });
    await openCompanyModal(state.selectedCompanyId, { silent: true });
    await loadDashboard({ silent: true });
  } catch (error) {
    setMessage(els.companyAdjustmentMessage, error.message || "\uC218\uB3D9 \uC794\uC561 \uC870\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
  } finally {
    els.companyAdjustmentButton.disabled = false;
    els.companyAdjustmentButton.textContent = "\uCC98\uB9AC";
  }
}

function confirmCompanyAdjustment(payload) {
  return new Promise((resolve) => {
    const current = parseMoneyNumber(state.selectedCompanyBalance);
    const signedAmount = payload.adjustment_type === "debit" ? -payload.amount : payload.amount;
    const nextBalance = current + signedAmount;
    const actionLabel = payload.adjustment_type === "debit" ? "\uBA38\uB2C8 \uD68C\uC218" : "\uBA38\uB2C8 \uC9C0\uAE09";
    const modal = document.createElement("div");
    modal.className = "sb-quick-approve-modal";
    modal.innerHTML = `
      <div class="sb-quick-approve-backdrop" data-close></div>
      <section class="sb-quick-approve-card sb-company-confirm-card" role="dialog" aria-modal="true" aria-labelledby="companyAdjustmentConfirmTitle">
        <div class="sb-quick-approve-head">
          <p>MANUAL BALANCE</p>
          <h2 id="companyAdjustmentConfirmTitle">${actionLabel} \uD655\uC778</h2>
        </div>
        <dl class="sb-quick-approve-info">
          <div><dt>\uCC98\uB9AC \uAD6C\uBD84</dt><dd>${actionLabel}</dd></div>
          <div><dt>\uAE08\uC561</dt><dd>${formatWon(payload.amount)}</dd></div>
          <div><dt>\uCC98\uB9AC \uC804 \uC794\uC561</dt><dd>${formatWon(current)}</dd></div>
          <div><dt>\uCC98\uB9AC \uD6C4 \uC608\uC0C1 \uC794\uC561</dt><dd class="${nextBalance < 0 ? "is-negative-balance" : ""}">${formatWon(nextBalance)}</dd></div>
          <div><dt>\uC0AC\uC720</dt><dd>${escapeHtml(payload.reason)}</dd></div>
        </dl>
        ${nextBalance < 0 ? '<p class="sb-company-negative-warning">예상 잔액이 음수입니다. 관리자 회수는 허용됩니다.</p>' : ""}
        <p class="sb-quick-approve-note">\uC794\uC561\uC740 \uC9C1\uC811 \uC218\uC815\uD558\uC9C0 \uC54A\uACE0 create_manual_ledger_adjustment RPC\uB85C \uC6D0\uC7A5\uC5D0 \uAE30\uB85D\uB429\uB2C8\uB2E4.</p>
        <div class="sb-quick-approve-actions">
          <button class="sb-outline-button" type="button" data-close>\uCDE8\uC18C</button>
          <button class="sb-primary-button" type="button" data-confirm>\uD655\uC778 \uD6C4 \uCC98\uB9AC</button>
        </div>
      </section>
    `;

    const close = (result) => {
      modal.remove();
      resolve(result);
    };

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-confirm]")) close(true);
      if (event.target.closest("[data-close]")) close(false);
    });

    document.body.append(modal);
    modal.querySelector("[data-confirm]")?.focus();
  });
}

async function loadGiftcards(options = {}) {
  if (!els.giftcardBody) return;
  if (!options.silent) setTableLoading(els.giftcardBody, 10);
  try {
    const data = await apiGet("/admin/seumbiz/giftcard-types");
    state.giftcards = data.items || [];
    renderGiftcards();
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.giftcardBody, 10, error.message || "상품권 목록을 불러오지 못했습니다.");
    } else {
      console.log("[SEUMBiz Admin] giftcard list failed", error);
    }
  }
}

function renderGiftcards() {
  if (!state.giftcards.length) {
    setTableMessage(els.giftcardBody, 10, "등록된 상품권이 없습니다.");
    return;
  }

  els.giftcardBody.replaceChildren(
    ...state.giftcards.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${renderGiftcardName(row)}</td>
        <td><span class="sb-code">${escapeHtml(row.code || "-")}</span></td>
        <td>${formatRate(row.default_rate)}</td>
        <td>${escapeHtml(formatAmounts(row.enabled_amounts))}</td>
        <td>${renderBooleanBadge(row.is_visible)}</td>
        <td>${renderBooleanBadge(row.is_active)}</td>
        <td>${formatNumber(row.pending_purchase_count || 0)}</td>
        <td>${formatNumber(row.total_purchase_count || 0)}</td>
        <td>${formatNumber(row.sort_order || 0)}</td>
        <td><button class="sb-table-action" type="button" data-giftcard-edit-id="${escapeHtml(row.id)}">수정</button></td>
      `;
      return tr;
    })
  );
}

function renderGiftcardName(row) {
  const logoUrl = escapeHtml(resolveSeumBizAssetUrl(row.logo_url || ""));
  const name = escapeHtml(row.name || "-");
  return `
    <span class="sb-giftcard-cell">
      <img src="${logoUrl}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-logo-missing'); this.remove();" />
      <span>${name}</span>
    </span>
  `;
}

function getPurchaseGiftcardDisplay(row) {
  const snapshotLogoUrl = row?.giftcard_logo_url_snapshot || "";
  const currentLogoUrl = row?.current_giftcard_logo_url || "";
  const logoUrl = isUsableGiftcardLogoUrl(snapshotLogoUrl) ? snapshotLogoUrl : currentLogoUrl;
  console.log("[SEUMBiz Admin] purchase giftcard logo", {
    receipt_no: row?.receipt_no || "",
    giftcard_code: row?.giftcard_code || "",
    snapshotLogoUrl,
    currentLogoUrl,
    resolvedLogoUrl: logoUrl
  });

  return {
    name: row?.giftcard_name_snapshot || row?.current_giftcard_name || row?.giftcard_type || "-",
    logoUrl
  };
}

function renderPurchaseGiftcard(row) {
  const giftcard = getPurchaseGiftcardDisplay(row);
  const logoHtml = giftcard.logoUrl
    ? `<img src="${escapeHtml(resolveSeumBizAssetUrl(giftcard.logoUrl))}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-logo-missing'); this.remove();" />`
    : `<span class="sb-purchase-giftcard-logo-empty" aria-hidden="true"></span>`;

  return `
    <span class="sb-purchase-giftcard-cell">
      <span class="sb-purchase-giftcard-logo">${logoHtml}</span>
      <span>${escapeHtml(giftcard.name)}</span>
    </span>
  `;
}

function confirmQuickApprove(request, expectedAmount) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "sb-quick-approve-modal";
    modal.innerHTML = `
      <div class="sb-quick-approve-backdrop" data-close></div>
      <section class="sb-quick-approve-card" role="dialog" aria-modal="true" aria-labelledby="quickApproveTitle">
        <div class="sb-quick-approve-head">
          <p>QUICK APPROVE</p>
          <h2 id="quickApproveTitle">빠른 승인 확인</h2>
        </div>
        <div class="sb-quick-approve-giftcard">${renderPurchaseGiftcard(request)}</div>
        <dl class="sb-quick-approve-info">
          <div><dt>접수번호</dt><dd>${escapeHtml(request.receipt_no || "-")}</dd></div>
          <div><dt>업체명</dt><dd>${renderCompanyNameLink(request.company_id, request.company_name)}</dd></div>
          <div><dt>건수</dt><dd>${formatNumber(request.item_count || 0)}건</dd></div>
          <div><dt>신청 액면가 합계</dt><dd>${formatWon(request.total_face_value)}</dd></div>
          <div><dt>승인 예정 금액</dt><dd>${formatWon(expectedAmount)}</dd></div>
        </dl>
        <p class="sb-quick-approve-note">금액 수정이 필요하면 상세 화면에서 승인해주세요.</p>
        <div class="sb-quick-approve-actions">
          <button class="sb-outline-button" type="button" data-close>취소</button>
          <button class="sb-primary-button" type="button" data-confirm>빠른 승인</button>
        </div>
      </section>
    `;

    const close = (result) => {
      modal.remove();
      resolve(result);
    };

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-confirm]")) close(true);
      if (event.target.closest("[data-close]")) close(false);
    });

    document.body.append(modal);
    modal.querySelector("[data-confirm]")?.focus();
  });
}

function renderBooleanBadge(value) {
  return `<span class="sb-status ${value ? "is-approved" : "is-rejected"}">${value ? "ON" : "OFF"}</span>`;
}

function formatAmounts(value) {
  const list = Array.isArray(value) ? value : [];
  return list.map((amount) => formatNumber(amount)).join(", ");
}

function formatRate(value) {
  const number = Number(value || 0);
  return `${number.toFixed(2)}%`;
}

function formatRateNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(1);
}

function editGiftcard(id) {
  const row = state.giftcards.find((item) => item.id === id);
  if (!row) return;

  openGiftcardModal("edit");
  els.giftcardId.value = row.id || "";
  els.giftcardCode.value = row.code || "";
  els.giftcardName.value = row.name || "";
  els.giftcardLogoUrl.value = row.logo_url || "";
  els.giftcardDefaultRate.value = row.default_rate ?? "";
  els.giftcardSortOrder.value = row.sort_order ?? 0;
  els.giftcardEnabledAmounts.value = JSON.stringify(row.enabled_amounts || []);
  els.giftcardIsVisible.checked = Boolean(row.is_visible);
  els.giftcardIsActive.checked = Boolean(row.is_active);
  els.giftcardAdminMemo.value = row.admin_memo || "";
  updateGiftcardLogoPreview();
}

function openGiftcardCreateModal() {
  resetGiftcardForm();
  openGiftcardModal("create");
}

function openGiftcardModal(mode = "create") {
  clearMessage(els.giftcardMessage);
  els.giftcardFormTitle.textContent = mode === "edit" ? "상품권 수정" : "상품권 등록";
  els.giftcardModal.hidden = false;
  els.giftcardCode.focus();
}

function closeGiftcardModal() {
  els.giftcardModal.hidden = true;
}

function resetGiftcardForm() {
  clearMessage(els.giftcardMessage);
  els.giftcardForm.reset();
  els.giftcardId.value = "";
  els.giftcardEnabledAmounts.value = "[100000,300000,500000]";
  els.giftcardIsVisible.checked = true;
  els.giftcardIsActive.checked = true;
  updateGiftcardLogoPreview();
}

function updateGiftcardLogoPreview() {
  if (!els.giftcardLogoPreview) return;
  const logoUrl = els.giftcardLogoUrl.value.trim();
  els.giftcardLogoPreview.innerHTML = logoUrl
    ? `<img src="${escapeHtml(resolveSeumBizAssetUrl(logoUrl))}" alt="" />`
    : `<span>로고 없음</span>`;
}

async function handleGiftcardLogoUpload() {
  clearMessage(els.giftcardMessage);
  const file = els.giftcardLogoFile?.files?.[0];
  if (!file) {
    setMessage(els.giftcardMessage, "업로드할 로고 이미지를 선택해주세요.", "error");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessage(els.giftcardMessage, "이미지 파일만 업로드할 수 있습니다.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("logo", file);
  els.giftcardLogoUploadButton.disabled = true;
  els.giftcardLogoUploadButton.textContent = "업로드 중";

  try {
    const data = await apiPostForm("/admin/seumbiz/giftcard-types/logo", formData);
    els.giftcardLogoUrl.value = data.logo_url || data.url || "";
    updateGiftcardLogoPreview();
    setMessage(els.giftcardMessage, "로고를 업로드했습니다.", "success");
  } catch (error) {
    setMessage(els.giftcardMessage, error.message || "로고 업로드에 실패했습니다.", "error");
  } finally {
    els.giftcardLogoUploadButton.disabled = false;
    els.giftcardLogoUploadButton.textContent = "로고 업로드";
  }
}

async function handleSaveGiftcard(event) {
  event.preventDefault();
  clearMessage(els.giftcardMessage);

  let payload;
  try {
    payload = getGiftcardPayload();
  } catch (error) {
    setMessage(els.giftcardMessage, error.message, "error");
    return;
  }

  const id = els.giftcardId.value.trim();
  els.giftcardSaveButton.disabled = true;
  els.giftcardSaveButton.textContent = "저장 중";

  try {
    if (id) {
      await apiPatch(`/admin/seumbiz/giftcard-types/${encodeURIComponent(id)}`, payload);
      setMessage(els.giftcardMessage, "상품권을 수정했습니다.", "success");
    } else {
      await apiPost("/admin/seumbiz/giftcard-types", payload);
      setMessage(els.giftcardMessage, "상품권을 등록했습니다.", "success");
    }
    await loadGiftcards({ silent: true });
    closeGiftcardModal();
  } catch (error) {
    setMessage(els.giftcardMessage, error.message || "상품권 저장에 실패했습니다.", "error");
  } finally {
    els.giftcardSaveButton.disabled = false;
    els.giftcardSaveButton.textContent = "저장";
  }
}

function getGiftcardPayload() {
  const code = els.giftcardCode.value.trim().toUpperCase();
  const name = els.giftcardName.value.trim();
  const logoUrl = els.giftcardLogoUrl.value.trim();
  const defaultRate = Number(els.giftcardDefaultRate.value);
  const sortOrder = Number.parseInt(els.giftcardSortOrder.value || "0", 10);
  const enabledAmounts = parseEnabledAmounts(els.giftcardEnabledAmounts.value);

  if (!/^[A-Z0-9_]+$/.test(code)) {
    throw new Error("코드는 대문자, 숫자, 언더스코어만 사용할 수 있습니다.");
  }
  if (!name) throw new Error("상품권명을 입력해주세요.");
  if (!logoUrl) throw new Error("로고 URL을 입력해주세요.");
  if (!Number.isFinite(defaultRate) || defaultRate <= 0 || defaultRate > 100) {
    throw new Error("기본 요율은 0 초과 100 이하로 입력해주세요.");
  }

  return {
    code,
    name,
    logo_url: logoUrl,
    default_rate: defaultRate,
    enabled_amounts: enabledAmounts,
    is_visible: Boolean(els.giftcardIsVisible.checked),
    is_active: Boolean(els.giftcardIsActive.checked),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    admin_memo: els.giftcardAdminMemo.value.trim() || null
  };
}

function parseEnabledAmounts(value) {
  const trimmed = String(value || "").trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("사용 가능 액면가는 JSON 배열 또는 쉼표 형식으로 입력해주세요.");
  }
  const amounts = parsed.map((amount) => Number(amount));
  if (!amounts.length || amounts.some((amount) => !Number.isFinite(amount) || amount <= 0)) {
    throw new Error("액면가는 0보다 큰 숫자 배열이어야 합니다.");
  }
  return amounts;
}

async function loadTelegramRecipients(options = {}) {
  if (!els.telegramRecipientBody) return;
  if (!options.silent) setTableLoading(els.telegramRecipientBody, 5);
  try {
    const data = await apiGet("/admin/seumbiz/telegram-recipients");
    state.telegramRecipients = data.items || [];
    renderTelegramRecipients();
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.telegramRecipientBody, 5, error.message || "텔레그램 수신자 목록을 불러오지 못했습니다.");
    } else {
      console.log("[SEUMBiz Admin] telegram recipient list failed", error);
    }
  }
}

function renderTelegramRecipients() {
  if (!els.telegramRecipientBody) return;
  if (!state.telegramRecipients.length) {
    setTableMessage(els.telegramRecipientBody, 5, "등록된 텔레그램 수신자가 없습니다. 수신자가 없으면 TELEGRAM_CHAT_ID 환경변수로만 전송됩니다.");
    return;
  }

  els.telegramRecipientBody.replaceChildren(
    ...state.telegramRecipients.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${renderBooleanBadge(row.is_active)}</td>
        <td>${escapeHtml(row.name || "-")}</td>
        <td><span class="sb-code">${escapeHtml(row.chat_id || "-")}</span></td>
        <td>${formatDateTime(row.created_at)}</td>
        <td>
          <div class="sb-row-actions">
            <button class="sb-table-action" type="button" data-telegram-toggle-id="${escapeHtml(row.id)}">
              ${row.is_active ? "비활성" : "활성"}
            </button>
            <button class="sb-table-action sb-table-action-danger" type="button" data-telegram-delete-id="${escapeHtml(row.id)}">
              삭제
            </button>
          </div>
        </td>
      `;
      return tr;
    })
  );
}

async function handleAddTelegramRecipient(event) {
  event.preventDefault();
  clearMessage(els.telegramRecipientMessage);
  const payload = {
    name: els.telegramRecipientName.value.trim(),
    chat_id: els.telegramRecipientChatId.value.trim(),
    is_active: true
  };

  if (!payload.name || !payload.chat_id) {
    setMessage(els.telegramRecipientMessage, "이름과 Chat ID를 입력해주세요.", "error");
    return;
  }

  els.telegramRecipientSaveButton.disabled = true;
  try {
    await apiPost("/admin/seumbiz/telegram-recipients", payload);
    els.telegramRecipientForm.reset();
    setMessage(els.telegramRecipientMessage, "텔레그램 수신자를 추가했습니다.", "success");
    await loadTelegramRecipients({ silent: true });
  } catch (error) {
    setMessage(els.telegramRecipientMessage, error.message || "텔레그램 수신자 추가에 실패했습니다.", "error");
  } finally {
    els.telegramRecipientSaveButton.disabled = false;
  }
}

async function toggleTelegramRecipient(id) {
  const row = state.telegramRecipients.find((item) => item.id === id);
  if (!row) return;

  try {
    await apiPatch(`/admin/seumbiz/telegram-recipients/${encodeURIComponent(id)}`, {
      is_active: !row.is_active
    });
    await loadTelegramRecipients({ silent: true });
  } catch (error) {
    setMessage(els.telegramRecipientMessage, error.message || "텔레그램 수신자 상태 변경에 실패했습니다.", "error");
  }
}

async function deleteTelegramRecipient(id) {
  const row = state.telegramRecipients.find((item) => item.id === id);
  const label = row?.name || row?.chat_id || "수신자";
  if (!window.confirm(`${label} 수신자를 삭제할까요?`)) return;

  try {
    await apiDelete(`/admin/seumbiz/telegram-recipients/${encodeURIComponent(id)}`);
    setMessage(els.telegramRecipientMessage, "텔레그램 수신자를 삭제했습니다.", "success");
    await loadTelegramRecipients({ silent: true });
  } catch (error) {
    setMessage(els.telegramRecipientMessage, error.message || "텔레그램 수신자 삭제에 실패했습니다.", "error");
  }
}

async function loadAdminLogs(options = {}) {
  if (!options.silent) setTableLoading(els.adminLogBody, 7);
  try {
    const page = Number(options.page || state.adminLogPage || 1);
    const data = await apiGet(`/admin/seumbiz/admin-logs?${buildAdminLogQueryString(page)}`);
    state.adminLogs = data.items || data.logs || [];
    state.adminLogPage = Number(data.page || page);
    state.adminLogTotalPages = Number(data.totalPages || 1);
    state.adminLogTotal = Number(data.total || state.adminLogs.length);
    renderAdminLogs();
    renderPagination("adminLog");
  } catch (error) {
    if (!options.silent) {
      setTableMessage(els.adminLogBody, 7, error.message || "관리자 로그 목록을 불러오지 못했습니다.");
    }
  }
}

function buildAdminLogQueryString(page) {
  const params = new URLSearchParams();
  params.set("page", String(page || 1));
  params.set("pageSize", String(LIST_PAGE_SIZE));
  const filters = state.adminLogFilters;
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.action) params.set("action", filters.action);
  if (filters.companyId) params.set("company", filters.companyId);
  if (filters.adminUserId) params.set("admin", filters.adminUserId);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return params.toString();
}

async function loadAdminLogFilterOptions() {
  if (state.adminLogFilterOptionsLoaded) return;
  try {
    const data = await apiGet("/admin/seumbiz/admin-logs/filter-options");
    renderAdminLogFilterOptions(data.companies || [], data.admins || []);
    state.adminLogFilterOptionsLoaded = true;
  } catch (error) {
    console.log("[SEUMBiz Admin Log] filter options failed", error);
  }
}

function renderAdminLogFilterOptions(companies, admins) {
  if (els.adminLogCompany) {
    const current = els.adminLogCompany.value;
    els.adminLogCompany.replaceChildren(
      createSelectOption("", "전체"),
      ...companies.map((row) => createSelectOption(row.id, row.company_name || "-"))
    );
    els.adminLogCompany.value = current;
  }

  if (els.adminLogAdmin) {
    const current = els.adminLogAdmin.value;
    els.adminLogAdmin.replaceChildren(
      createSelectOption("", "전체"),
      ...admins.map((row) => createSelectOption(row.id, row.login_id ? `${row.name} (${row.login_id})` : row.name || "-"))
    );
    els.adminLogAdmin.value = current;
  }
}

function createSelectOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function shiftKstDateString(dateString, days) {
  const base = new Date(`${dateString}T00:00:00+09:00`);
  base.setDate(base.getDate() + days);
  return getKstDateString(base);
}

function applyAdminLogPeriod(period) {
  state.adminLogFilters.period = period || "all";
  const today = getKstDateString();

  if (period === "all") {
    state.adminLogFilters.from = "";
    state.adminLogFilters.to = "";
  } else if (period === "today") {
    state.adminLogFilters.from = today;
    state.adminLogFilters.to = today;
  } else if (period === "yesterday") {
    const yesterday = shiftKstDateString(today, -1);
    state.adminLogFilters.from = yesterday;
    state.adminLogFilters.to = yesterday;
  } else if (period === "last7") {
    state.adminLogFilters.from = shiftKstDateString(today, -6);
    state.adminLogFilters.to = today;
  } else if (period === "last30") {
    state.adminLogFilters.from = shiftKstDateString(today, -29);
    state.adminLogFilters.to = today;
  }

  syncAdminLogFilterForm();
  updateAdminLogPeriodButtons();
  updateAdminLogCustomDatesVisibility();
  if (period !== "custom") {
    state.adminLogPage = 1;
    loadAdminLogs();
  }
}

function syncAdminLogFiltersFromForm() {
  state.adminLogFilters.from = els.adminLogStartDate?.value || "";
  state.adminLogFilters.to = els.adminLogEndDate?.value || "";
  state.adminLogFilters.action = els.adminLogAction?.value || "";
  state.adminLogFilters.companyId = els.adminLogCompany?.value || "";
  state.adminLogFilters.adminUserId = els.adminLogAdmin?.value || "";
  state.adminLogFilters.q = els.adminLogSearch?.value || "";
  if (state.adminLogFilters.from || state.adminLogFilters.to) {
    state.adminLogFilters.period = "custom";
    updateAdminLogPeriodButtons();
    updateAdminLogCustomDatesVisibility();
  }
}

function syncAdminLogFilterForm() {
  if (els.adminLogStartDate) els.adminLogStartDate.value = state.adminLogFilters.from || "";
  if (els.adminLogEndDate) els.adminLogEndDate.value = state.adminLogFilters.to || "";
  if (els.adminLogAction) els.adminLogAction.value = state.adminLogFilters.action || "";
  if (els.adminLogCompany) els.adminLogCompany.value = state.adminLogFilters.companyId || "";
  if (els.adminLogAdmin) els.adminLogAdmin.value = state.adminLogFilters.adminUserId || "";
  if (els.adminLogSearch) els.adminLogSearch.value = state.adminLogFilters.q || "";
}

function updateAdminLogPeriodButtons() {
  for (const button of els.adminLogPeriodButtons) {
    button.classList.toggle("is-active", button.dataset.adminLogPeriod === state.adminLogFilters.period);
  }
}

function updateAdminLogCustomDatesVisibility() {
  if (!els.adminLogCustomDates) return;
  els.adminLogCustomDates.hidden = state.adminLogFilters.period !== "custom";
}

function resetAdminLogFilters() {
  state.adminLogFilters = {
    period: "all",
    from: "",
    to: "",
    action: "",
    companyId: "",
    adminUserId: "",
    q: ""
  };
  state.adminLogPage = 1;
  syncAdminLogFilterForm();
  updateAdminLogPeriodButtons();
  updateAdminLogCustomDatesVisibility();
  loadAdminLogs();
}

function renderAdminLogs() {
  if (!els.adminLogBody) return;

  if (!state.adminLogs.length) {
    setTableMessage(els.adminLogBody, 7, "조건에 맞는 관리자 로그가 없습니다.");
    renderPagination("adminLog");
    return;
  }

  els.adminLogBody.replaceChildren(
    ...state.adminLogs.map((row) => {
      const processing = buildAdminLogProcessingContent(row);
      const memo = row.memo || "-";
      const tr = document.createElement("tr");
      tr.className = "sb-admin-log-row";
      tr.dataset.adminLogId = row.id;
      tr.innerHTML = `
        <td class="sb-admin-log-company">${renderCompanyNameLink(row.company_id, row.company_name)}</td>
        <td class="sb-admin-log-processing">${processing.html}</td>
        <td>${escapeHtml(row.admin_name || "-")}</td>
        <td class="is-center sb-admin-log-time">${escapeHtml(formatAdminLogListTimeShort(row.created_at))}</td>
        <td class="is-center"><span class="sb-admin-log-badge">${escapeHtml(row.action_label || row.action || "-")}</span></td>
        <td class="is-amount"><span class="sb-admin-log-amount">${escapeHtml(row.amount_display || "-")}</span></td>
        <td class="sb-admin-log-memo" title="${escapeHtml(memo)}">${escapeHtml(memo)}</td>
      `;
      return tr;
    })
  );
}

function buildAdminLogProcessingContent(row) {
  const action = row.action || "";
  const title = row.action_label || action || "-";
  const detailLines = [];

  if (action === "purchase_approved") {
    if (row.receipt_no) detailLines.push(row.receipt_no);
  } else if (action === "purchase_rejected") {
    if (row.receipt_no) detailLines.push(row.receipt_no);
  } else if (action === "withdraw_completed") {
    detailLines.push("출금 처리");
  } else if (action === "withdraw_rejected") {
    detailLines.push("출금 반려");
  } else if (action === "manual_credit") {
    detailLines.push("수동 지급");
  } else if (action === "manual_debit") {
    detailLines.push("수동 회수");
  } else if (Array.isArray(row.summary_lines) && row.summary_lines.length > 1) {
    detailLines.push(...row.summary_lines.slice(1));
  }

  const lines = detailLines.length ? [title, ...detailLines] : [title];
  const html = lines
    .map((line, index) => {
      const lineClass = index === 0 ? "sb-admin-log-processing-line is-title" : "sb-admin-log-processing-line";
      return `<span class="${lineClass}">${escapeHtml(line)}</span>`;
    })
    .join("");

  return { text: lines.join("\n"), html };
}

function renderAdminLogChangeList(container, lines) {
  if (!container) return;
  if (!Array.isArray(lines) || !lines.length) {
    container.replaceChildren(createAdminLogChangeItem("정보", "-"));
    return;
  }
  container.replaceChildren(...lines.map((line) => createAdminLogChangeItem(line.label, line.value)));
}

function createAdminLogChangeItem(label, value) {
  const item = document.createElement("div");
  item.className = "sb-admin-log-change-item";
  item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong>`;
  return item;
}

async function openAdminLogModal(logId) {
  if (!els.adminLogModal || !logId) return;

  els.adminLogModal.hidden = false;
  if (els.adminLogJsonDetails) els.adminLogJsonDetails.open = false;
  els.adminLogDetailGrid.replaceChildren(createDetailItem("상태", "불러오는 중"));
  if (els.adminLogBeforeView) els.adminLogBeforeView.replaceChildren();
  if (els.adminLogAfterView) els.adminLogAfterView.replaceChildren();
  els.adminLogBeforeData.textContent = "-";
  els.adminLogAfterData.textContent = "-";

  try {
    const data = await apiGet(`/admin/seumbiz/admin-logs/${encodeURIComponent(logId)}`);
    const log = data.log;
    if (!log) throw new Error("관리자 로그를 찾을 수 없습니다.");

    const adminLabel = log.admin_login_id ? `${log.admin_name} (${log.admin_login_id})` : log.admin_name || "-";
    els.adminLogDetailGrid.replaceChildren(
      createDetailItem("시간", formatDateTime(log.created_at)),
      createDetailItem("관리자", adminLabel),
      createCompanyDetailItem("업체", log.company_id, log.company_name),
      createDetailItem("구분", log.action_label || log.action || "-"),
      createDetailItem("메모", log.memo || "-")
    );

    const changeView = log.change_view || {};
    if (els.adminLogBeforeTitle) {
      els.adminLogBeforeTitle.textContent = changeView.before_title || "이전 상태";
    }
    if (els.adminLogAfterTitle) {
      els.adminLogAfterTitle.textContent = changeView.after_title || "변경 후 상태";
    }
    renderAdminLogChangeList(els.adminLogBeforeView, changeView.before_lines);
    renderAdminLogChangeList(els.adminLogAfterView, changeView.after_lines);

    els.adminLogBeforeData.textContent = formatJsonPretty(log.before_data);
    els.adminLogAfterData.textContent = formatJsonPretty(log.after_data);
  } catch (error) {
    els.adminLogDetailGrid.replaceChildren(createDetailItem("오류", error.message || "상세를 불러오지 못했습니다."));
    renderAdminLogChangeList(els.adminLogBeforeView, []);
    renderAdminLogChangeList(els.adminLogAfterView, []);
    els.adminLogBeforeData.textContent = "-";
    els.adminLogAfterData.textContent = "-";
  }
}

function closeAdminLogModal() {
  if (!els.adminLogModal) return;
  els.adminLogModal.hidden = true;
}

function formatAdminLogListTimeShort(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function formatAdminLogListTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatJsonPretty(value) {
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderPagination(type) {
  const config = getPaginationConfig(type);
  if (!config.container) return;

  const page = Math.max(1, Number(config.page || 1));
  const totalPages = Math.max(1, Number(config.totalPages || 1));
  const total = Math.max(0, Number(config.total || 0));

  if (totalPages <= 1) {
    config.container.hidden = true;
    config.container.replaceChildren();
    return;
  }

  config.container.hidden = false;
  const pages = createPageList(page, totalPages);
  config.container.replaceChildren(
    createPaginationButton(type, page - 1, "\uC774\uC804", page <= 1),
    ...pages.map((item) =>
      item === "ellipsis"
        ? createPaginationEllipsis()
        : createPaginationButton(type, item, String(item), false, item === page)
    ),
    createPaginationButton(type, page + 1, "\uB2E4\uC74C", page >= totalPages),
    createPaginationMeta(page, totalPages, total)
  );
}

function getPaginationConfig(type) {
  if (type === "purchase") {
    return {
      container: els.purchasePagination,
      page: state.purchasePage,
      totalPages: state.purchaseTotalPages,
      total: state.purchaseTotal
    };
  }
  if (type === "adminLog") {
    return {
      container: els.adminLogPagination,
      page: state.adminLogPage,
      totalPages: state.adminLogTotalPages,
      total: state.adminLogTotal
    };
  }
  return {
    container: els.withdrawPagination,
    page: state.withdrawPage,
    totalPages: state.withdrawTotalPages,
    total: state.withdrawTotal
  };
}

function createPageList(current, totalPages) {
  const pageSet = new Set([1, totalPages, current - 1, current, current + 1]);
  const pages = [...pageSet]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const result = [];
  for (const page of pages) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  }
  return result;
}

function createPaginationButton(type, page, label, disabled = false, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sb-page-button";
  button.dataset.paginationTarget = type;
  button.dataset.page = String(page);
  button.textContent = label;
  button.disabled = disabled;
  button.classList.toggle("is-active", active);
  return button;
}

function createPaginationEllipsis() {
  const span = document.createElement("span");
  span.className = "sb-page-ellipsis";
  span.textContent = "...";
  return span;
}

function createPaginationMeta(page, totalPages, total) {
  const span = document.createElement("span");
  span.className = "sb-page-meta";
  span.textContent = formatNumber(total) + "\uAC74 - " + formatNumber(page) + " / " + formatNumber(totalPages);
  return span;
}

function handlePaginationClick(button) {
  const type = button.dataset.paginationTarget;
  const page = Number(button.dataset.page || 1);
  if (!Number.isFinite(page) || page < 1 || button.disabled) return;
  if (type === "purchase") {
    state.purchasePage = page;
    loadPurchases({ page });
    return;
  }
  if (type === "withdraw") {
    state.withdrawPage = page;
    loadWithdraws({ page });
    return;
  }
  if (type === "adminLog") {
    state.adminLogPage = page;
    loadAdminLogs({ page });
  }
}

function preventNumericInputWheel() {
  document.addEventListener(
    "wheel",
    (event) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === "number") {
        event.preventDefault();
      }
    },
    { passive: false, capture: true }
  );
}

function setWithdrawReviewLoading() {
  if (els.withdrawReviewSummary) {
    els.withdrawReviewSummary.replaceChildren(createDetailItem("상태", "불러오는 중입니다."));
  }
  setTableLoading(els.withdrawReviewPurchaseBody, 5);
  setTableLoading(els.withdrawReviewLedgerBody, 4);
}

function renderWithdrawReviewPurchases(rows) {
  if (!els.withdrawReviewPurchaseBody) return;
  if (!rows.length) {
    setTableMessage(els.withdrawReviewPurchaseBody, 5, "최근 승인 매입 내역이 없습니다.");
    return;
  }

  els.withdrawReviewPurchaseBody.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      const giftcardName = row.giftcard_name_snapshot || row.giftcard_type || "-";
      const approvedAt = row.approved_at || row.reviewed_at;
      tr.innerHTML = `
        <td>${escapeHtml(row.receipt_no || "-")}</td>
        <td>${escapeHtml(giftcardName)}</td>
        <td class="is-count">${formatNumber(row.item_count || 0)}건</td>
        <td class="is-amount">${formatWon(row.approved_settlement_amount ?? row.expected_settlement_amount)}</td>
        <td class="is-date">${formatDateTime(approvedAt)}</td>
      `;
      return tr;
    })
  );
}

function renderWithdrawReviewLedger(rows) {
  if (!els.withdrawReviewLedgerBody) return;
  if (!rows.length) {
    setTableMessage(els.withdrawReviewLedgerBody, 4, "최근 잔액 변동 내역이 없습니다.");
    return;
  }

  els.withdrawReviewLedgerBody.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="is-date">${formatDateTime(row.created_at)}</td>
        <td class="is-type">${escapeHtml(formatLedgerType(row.ledger_type))}</td>
        <td class="is-amount">${formatSignedLedgerAmount(row.amount)}</td>
        <td>${escapeHtml(row.memo || row.reason || "-")}</td>
      `;
      return tr;
    })
  );
}

function renderWithdrawReviewSummary(data) {
  if (!els.withdrawReviewSummary) return;

  const withdraw = data.withdraw || {};
  const company = data.company || {};
  const summary = data.summary || {};
  const projectedBalance = Number(summary.projected_balance_after || 0);
  const isNegativeProjected = Number.isFinite(projectedBalance) && projectedBalance < 0;

  els.withdrawReviewSummary.replaceChildren(
    createCompanyDetailItem("업체명", company.id, company.company_name),
    createDetailItem("현재 잔액", formatWon(company.current_balance)),
    createDetailItem("출금 신청액", formatWon(withdraw.amount)),
    createDetailHtmlItem(
      "출금 후 예상 잔액",
      `<span class="${isNegativeProjected ? "is-negative-balance" : ""}">${formatWon(projectedBalance)}</span>`
    ),
    createDetailItem("기타 대기 출금 합계", formatWon(summary.other_pending_withdraw_total)),
    createDetailItem("신청 상태", getStatusLabel(withdraw.status)),
    createDetailItem("신청시간", formatDateTime(withdraw.created_at))
  );

  if (els.withdrawNegativeBalanceNote) {
    els.withdrawNegativeBalanceNote.hidden = !isNegativeProjected;
  }
}

function updateWithdrawCompleteFormState() {
  const isPending = state.selectedWithdrawStatus === "pending";
  if (els.withdrawModalTitle) {
    els.withdrawModalTitle.textContent = isPending ? "출금 검토 및 완료 처리" : "출금 신청 상세";
  }
  if (els.withdrawModalDesc) {
    els.withdrawModalDesc.textContent = isPending
      ? "잔액 형성 이력을 확인한 뒤 하단에서 출금 완료 처리하세요."
      : "처리가 완료되었거나 반려된 출금신청입니다.";
  }
  if (els.withdrawAdminMemo) {
    els.withdrawAdminMemo.disabled = !isPending;
  }
  if (els.withdrawCompleteButton) {
    els.withdrawCompleteButton.disabled = !isPending;
    els.withdrawCompleteButton.hidden = !isPending;
  }
  if (els.withdrawReadonlyNote) {
    els.withdrawReadonlyNote.hidden = isPending;
  }
}

async function openWithdrawReviewModal(withdrawRequestId, options = {}) {
  if (!withdrawRequestId || !els.withdrawModal) return;

  state.selectedWithdrawRequestId = withdrawRequestId;
  state.selectedWithdrawStatus = "";
  els.withdrawModal.hidden = false;
  if (els.withdrawAdminMemo) els.withdrawAdminMemo.value = "";
  setWithdrawReviewLoading();
  updateWithdrawCompleteFormState();

  try {
    const data = await apiGet(`/admin/seumbiz/withdraw-requests/${encodeURIComponent(withdrawRequestId)}/review`);
    state.selectedWithdrawStatus = data.withdraw?.status || "";
    if (els.withdrawAdminMemo) {
      els.withdrawAdminMemo.value =
        state.selectedWithdrawStatus === "pending" ? "" : data.withdraw?.admin_memo || "";
    }
    renderWithdrawReviewSummary(data);
    renderWithdrawReviewPurchases(data.recentApprovedPurchases || []);
    renderWithdrawReviewLedger(data.recentLedger || []);
    updateWithdrawCompleteFormState();

    if (options.scrollToComplete && els.withdrawCompleteSection) {
      window.requestAnimationFrame(() => {
        els.withdrawCompleteSection.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  } catch (error) {
    if (els.withdrawReviewSummary) {
      els.withdrawReviewSummary.replaceChildren(
        createDetailItem("오류", error.message || "출금 검토 정보를 불러오지 못했습니다.")
      );
    }
    setTableMessage(els.withdrawReviewPurchaseBody, 5, "승인 매입 내역을 불러오지 못했습니다.");
    setTableMessage(els.withdrawReviewLedgerBody, 4, "잔액 변동 내역을 불러오지 못했습니다.");
    if (els.withdrawCompleteButton) els.withdrawCompleteButton.disabled = true;
  }
}

function closeWithdrawModal() {
  els.withdrawModal.hidden = true;
  state.selectedWithdrawRequestId = "";
  state.selectedWithdrawStatus = "";
}

async function handleCompleteWithdraw(event) {
  event.preventDefault();
  if (!state.selectedWithdrawRequestId || state.selectedWithdrawStatus !== "pending") return;

  els.withdrawCompleteButton.disabled = true;
  els.withdrawCompleteButton.textContent = "처리 중";

  try {
    await apiPost(`/admin/seumbiz/withdraw-requests/${encodeURIComponent(state.selectedWithdrawRequestId)}/complete`, {
      admin_memo: els.withdrawAdminMemo.value.trim() || null
    });

    closeWithdrawModal();
    setMessage(els.appMessage, "출금 완료 처리했습니다.", "success");
    await refreshAfterAdminAction(loadWithdraws);
  } catch (error) {
    setMessage(els.appMessage, error.message || "출금 완료 처리에 실패했습니다.", "error");
  } finally {
    els.withdrawCompleteButton.disabled = false;
    els.withdrawCompleteButton.textContent = "출금 완료 처리";
  }
}

async function apiGet(path) {
  return apiRequest(path, { method: "GET" });
}

async function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body || {})
  });
}

async function apiPostForm(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${state.accessToken}`
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.detail || `HTTP ${response.status}`);
  }

  return data;
}

async function apiPatch(path, body) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(body || {})
  });
}

async function apiPut(path, body) {
  return apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(body || {})
  });
}

async function apiDelete(path) {
  return apiRequest(path, { method: "DELETE" });
}

async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const response = await fetch(path, {
    ...options,
    headers: {
      authorization: `Bearer ${state.accessToken}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    if (path.startsWith("/admin/seumbiz/")) {
      console.log("[SEUMBiz Admin API] request failed", {
        method,
        path,
        status: response.status,
        message: data.message || data.detail || ""
      });
    }
    throw new Error(data.message || data.detail || `HTTP ${response.status}`);
  }

  return data;
}

function logout() {
  stopAlertPolling();
  stopPendingAlertLoop();
  clearSession();
  state.accessToken = "";
  state.admin = null;
  state.lastNotificationSnapshot = null;
  clearNavPendingBadges();
  showLogin();
}

function getAdminLoginEmail() {
  return String(state.admin?.login_id || "").trim().toLowerCase();
}

function validateAdminPasswordChangeInput() {
  const currentPassword = els.passwordChangeCurrent?.value || "";
  const newPassword = els.passwordChangeNew?.value || "";
  const confirmPassword = els.passwordChangeConfirm?.value || "";

  if (!currentPassword) {
    return "현재 비밀번호를 입력해주세요.";
  }

  if (!newPassword || !confirmPassword) {
    return "새 비밀번호와 비밀번호 확인을 모두 입력해주세요.";
  }

  if (newPassword.length < 8) {
    return "새 비밀번호는 8자 이상 입력해주세요.";
  }

  if (newPassword !== confirmPassword) {
    return "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.";
  }

  if (currentPassword === newPassword) {
    return "현재 비밀번호와 다른 새 비밀번호를 입력해주세요.";
  }

  return "";
}

function mapAdminAuthErrorMessage(error, fallback) {
  const message = String(error?.message || error || "").trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid_grant")
  ) {
    return "현재 비밀번호가 올바르지 않습니다.";
  }

  if (normalized.includes("same password") || normalized.includes("should be different")) {
    return "현재 비밀번호와 다른 새 비밀번호를 입력해주세요.";
  }

  if (normalized.includes("weak password") || normalized.includes("at least")) {
    return "새 비밀번호는 8자 이상 입력해주세요.";
  }

  return message || fallback;
}

async function reauthenticateAdmin(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      mapAdminAuthErrorMessage(
        { message: data.error_description || data.msg || data.message },
        "현재 비밀번호 확인에 실패했습니다."
      )
    );
  }

  return data.access_token;
}

async function updateAdminPassword(accessToken, newPassword) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ password: newPassword })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      mapAdminAuthErrorMessage(
        { message: data.error_description || data.msg || data.message },
        "비밀번호 변경에 실패했습니다."
      )
    );
  }

  return data;
}

function openPasswordChangeModal() {
  if (!state.admin || !state.accessToken) {
    setMessage(els.appMessage, "관리자 로그인 후 이용할 수 있습니다.", "error");
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    setMessage(els.appMessage, "Supabase 관리자 설정이 필요합니다.", "error");
    return;
  }

  els.passwordChangeForm?.reset();
  clearMessage(els.passwordChangeMessage);
  els.passwordChangeModal.hidden = false;
  els.passwordChangeCurrent?.focus();
}

function closePasswordChangeModal() {
  if (!els.passwordChangeModal) return;
  els.passwordChangeModal.hidden = true;
  els.passwordChangeForm?.reset();
  clearMessage(els.passwordChangeMessage);
}

function setPasswordChangeSaving(isSaving) {
  if (!els.passwordChangeSubmitButton) return;
  els.passwordChangeSubmitButton.disabled = isSaving;
  els.passwordChangeSubmitButton.textContent = isSaving ? "변경 중" : "비밀번호 변경";
}

async function handlePasswordChangeSubmit(event) {
  event.preventDefault();
  clearMessage(els.passwordChangeMessage);

  const email = getAdminLoginEmail();
  if (!email) {
    setMessage(els.passwordChangeMessage, "관리자 이메일 정보를 확인할 수 없습니다.", "error");
    return;
  }

  const validationError = validateAdminPasswordChangeInput();
  if (validationError) {
    setMessage(els.passwordChangeMessage, validationError, "error");
    return;
  }

  const currentPassword = els.passwordChangeCurrent.value;
  const newPassword = els.passwordChangeNew.value;

  setPasswordChangeSaving(true);

  try {
    const reauthToken = await reauthenticateAdmin(email, currentPassword);
    await updateAdminPassword(reauthToken, newPassword);
    closePasswordChangeModal();
    logout();
    setMessage(els.loginMessage, "비밀번호가 변경되었습니다. 다시 로그인해 주세요.", "success");
  } catch (error) {
    setMessage(
      els.passwordChangeMessage,
      mapAdminAuthErrorMessage(error, "비밀번호 변경에 실패했습니다."),
      "error"
    );
  } finally {
    setPasswordChangeSaving(false);
  }
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSession(data) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token: data.access_token,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
    })
  );
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function setTableLoading(tbody, colspan) {
  setTableMessage(tbody, colspan, "불러오는 중입니다.");
}

function setTableMessage(tbody, colspan, message) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colspan;
  td.textContent = message;
  tr.append(td);
  tbody.replaceChildren(tr);
}

function createDetailItem(label, value) {
  const item = document.createElement("div");
  item.className = "sb-detail-item";
  item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong>`;
  return item;
}

function createDetailHtmlItem(label, html) {
  const item = document.createElement("div");
  item.className = "sb-detail-item";
  item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${html || "-"}</strong>`;
  return item;
}

function renderCompanyNameLink(companyId, companyName) {
  const name = companyName || "-";
  const id = String(companyId || "").trim();
  if (!id) {
    return escapeHtml(name);
  }
  return `<button class="sb-company-link" type="button" data-company-id="${escapeHtml(id)}">${escapeHtml(name)}</button>`;
}

function createCompanyDetailItem(label, companyId, companyName) {
  return createDetailHtmlItem(label, renderCompanyNameLink(companyId, companyName));
}

function setMessage(element, message, type = "") {
  element.textContent = message || "";
  element.dataset.type = type;
}

function clearMessage(element) {
  setMessage(element, "", "");
}

function renderStatus(status) {
  const className = `sb-status is-${escapeHtml(status || "")}`;
  return `<span class="${className}">${escapeHtml(getStatusLabel(status))}</span>`;
}

function getStatusLabel(status) {
  return (
    {
      pending: "대기",
      reviewing: "검수중",
      approved: "승인완료",
      rejected: "반려",
      canceled: "취소",
      completed: "완료"
    }[status] || status || "-"
  );
}

function formatWon(value) {
  return `${formatNumber(value)}원`;
}

function formatSignedLedgerAmount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${formatNumber(Math.abs(number))}원`;
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("ko-KR") : "0";
}

function normalizePlainAmount(value) {
  return parseMoneyNumber(value);
}

function parsePositiveMoneyNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  }
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const number = Number(digits);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}

function parseMoneyNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }
  const normalized = String(value ?? "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return 0;
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function sanitizeFileName(value) {
  return String(value || "purchase-request")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveSeumBizAssetUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/uploads/")) return `${window.location.origin}${value}`;
  return value;
}

function isUsableGiftcardLogoUrl(url) {
  const value = String(url || "").trim();
  return Boolean(value) && !value.startsWith("/assets/giftcards/");
}
