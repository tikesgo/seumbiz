import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const publicDir = join(root, "public");
const uploadsDir = join(root, "uploads");

loadEnv(join(root, ".env.local"));
mkdirSync(uploadsDir, { recursive: true });

const port = Number(process.env.PORT || 4173);
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const openAiApiKey = process.env.OPENAI_API_KEY || "";
const openAiOcrModel = process.env.OPENAI_OCR_MODEL || "gpt-4o-mini";
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID || "";
const statusValues = new Set(["\uC2B9\uC778", "\uB300\uAE30", "\uCDE8\uC18C"]);
const vendorStatusValues = new Set(["대기", "접수완료", "상담중", "진행중", "보류", "완료"]);
const siteSettingDefaults = {
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
const siteSettingKeys = Object.keys(siteSettingDefaults);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/") && req.method === "OPTIONS") {
    sendApiJson(res, 204, null);
    return;
  }

  if (pathname === "/api/orders" && req.method === "POST") {
    handlePublicOrderCreate(req, res);
    return;
  }

  if (pathname === "/api/orders" && req.method === "GET") {
    handlePublicOrderLookup(url, res);
    return;
  }

  if (pathname === "/api/seumbiz/ocr-giftcard" && req.method === "POST") {
    handleSeumBizOcrGiftcard(req, res);
    return;
  }

  if (pathname === "/api/seumbiz/telegram/purchase-request" && req.method === "POST") {
    handleSeumBizPurchaseTelegramNotification(req, res);
    return;
  }

  if (pathname === "/api/seumbiz/telegram/withdraw-request" && req.method === "POST") {
    handleSeumBizWithdrawTelegramNotification(req, res);
    return;
  }

  if (pathname === "/api/seumbiz/telegram/debug-updates" && req.method === "GET") {
    handleSeumBizTelegramDebugUpdates(req, res);
    return;
  }

  if (pathname === "/api/seumbiz/company-signup" && req.method === "POST") {
    handleSeumBizCompanySignup(req, res);
    return;
  }

  if (pathname === "/seumbiz-admin") {
    sendFile(res, join(publicDir, "seumbiz-admin.html"));
    return;
  }

  if (pathname === "/seumbiz-admin/config.js") {
    res.writeHead(200, {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(
      `window.SEUMBIZ_ADMIN_CONFIG = ${JSON.stringify({
        supabaseUrl,
        supabaseAnonKey
      })};`
    );
    return;
  }

  if (pathname === "/" || pathname === "/admin" || pathname === "/vendors") {
    sendFile(res, join(publicDir, "admin.html"));
    return;
  }

  if (pathname === "/admin/auth" && req.method === "POST") {
    handleAuth(req, res);
    return;
  }

  if (pathname === "/admin/logout" && req.method === "POST") {
    handleLogout(res);
    return;
  }

  if (pathname === "/admin/session" && req.method === "GET") {
    sendJson(res, 200, { ok: hasValidSession(req) });
    return;
  }

  if (pathname === "/admin/seumbiz/session" && req.method === "GET") {
    handleSeumBizAdminSession(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/dashboard" && req.method === "GET") {
    handleSeumBizDashboard(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/notification-state" && req.method === "GET") {
    handleSeumBizNotificationState(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/telegram-recipients" && req.method === "GET") {
    handleSeumBizTelegramRecipients(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/telegram-recipients" && req.method === "POST") {
    handleSeumBizTelegramRecipientCreate(req, res);
    return;
  }

  const seumBizTelegramRecipientMatch = pathname.match(/^\/admin\/seumbiz\/telegram-recipients\/([^/]+)$/);
  if (seumBizTelegramRecipientMatch && req.method === "PATCH") {
    handleSeumBizTelegramRecipientUpdate(req, res, seumBizTelegramRecipientMatch[1]);
    return;
  }

  if (seumBizTelegramRecipientMatch && req.method === "DELETE") {
    handleSeumBizTelegramRecipientDelete(req, res, seumBizTelegramRecipientMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/settlements" && req.method === "GET") {
    handleSeumBizSettlements(req, res);
    return;
  }

  const seumBizSettlementDetailMatch = pathname.match(/^\/admin\/seumbiz\/settlements\/([^/]+)$/);
  if (seumBizSettlementDetailMatch && req.method === "GET") {
    handleSeumBizSettlementDetail(req, res, seumBizSettlementDetailMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/companies" && req.method === "GET") {
    handleSeumBizCompanies(req, res);
    return;
  }

  const seumBizCompanyDetailMatch = pathname.match(/^\/admin\/seumbiz\/companies\/([^/]+)$/);
  if (seumBizCompanyDetailMatch && req.method === "GET") {
    handleSeumBizCompanyDetail(req, res, seumBizCompanyDetailMatch[1]);
    return;
  }

  if (seumBizCompanyDetailMatch && req.method === "PATCH") {
    handleSeumBizCompanyUpdate(req, res, seumBizCompanyDetailMatch[1]);
    return;
  }

  const seumBizCompanyAdjustmentMatch = pathname.match(/^\/admin\/seumbiz\/companies\/([^/]+)\/manual-adjustment$/);
  if (seumBizCompanyAdjustmentMatch && req.method === "POST") {
    handleSeumBizCompanyManualAdjustment(req, res, seumBizCompanyAdjustmentMatch[1]);
    return;
  }

  const seumBizCompanyGiftcardRatesMatch = pathname.match(/^\/admin\/seumbiz\/companies\/([^/]+)\/giftcard-rates$/);
  if (seumBizCompanyGiftcardRatesMatch && req.method === "GET") {
    handleSeumBizCompanyGiftcardRatesGet(req, res, seumBizCompanyGiftcardRatesMatch[1]);
    return;
  }

  if (seumBizCompanyGiftcardRatesMatch && req.method === "PUT") {
    handleSeumBizCompanyGiftcardRatesPut(req, res, seumBizCompanyGiftcardRatesMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/giftcard-types" && req.method === "GET") {
    handleSeumBizGiftcardTypes(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/giftcard-types" && req.method === "POST") {
    handleSeumBizGiftcardTypeCreate(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/giftcard-types/logo" && req.method === "POST") {
    handleSeumBizGiftcardLogoUpload(req, res);
    return;
  }

  const seumBizGiftcardTypeMatch = pathname.match(/^\/admin\/seumbiz\/giftcard-types\/([^/]+)$/);
  if (seumBizGiftcardTypeMatch && req.method === "PATCH") {
    handleSeumBizGiftcardTypeUpdate(req, res, seumBizGiftcardTypeMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/purchase-requests" && req.method === "GET") {
    handleSeumBizPurchaseRequests(req, res);
    return;
  }

  const seumBizPurchaseDetailMatch = pathname.match(/^\/admin\/seumbiz\/purchase-requests\/([^/]+)$/);
  if (seumBizPurchaseDetailMatch && req.method === "GET") {
    handleSeumBizPurchaseRequestDetail(req, res, seumBizPurchaseDetailMatch[1]);
    return;
  }

  const seumBizPurchaseApproveMatch =
    pathname.match(/^\/admin\/seumbiz\/purchase-requests\/([^/]+)\/approve\/?$/) ||
    pathname.match(/^\/admin\/seumbiz\/purchases\/([^/]+)\/approve\/?$/) ||
    pathname.match(/^\/admin\/seumbiz\/purchase\/([^/]+)\/approve\/?$/);
  if (seumBizPurchaseApproveMatch && req.method === "POST") {
    handleSeumBizPurchaseRequestApprove(req, res, seumBizPurchaseApproveMatch[1]);
    return;
  }

  const seumBizPurchaseRejectMatch =
    pathname.match(/^\/admin\/seumbiz\/purchase-requests\/([^/]+)\/reject\/?$/) ||
    pathname.match(/^\/admin\/seumbiz\/purchases\/([^/]+)\/reject\/?$/) ||
    pathname.match(/^\/admin\/seumbiz\/purchase\/([^/]+)\/reject\/?$/);
  if (seumBizPurchaseRejectMatch && req.method === "POST") {
    handleSeumBizPurchaseRequestReject(req, res, seumBizPurchaseRejectMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/withdraw-requests" && req.method === "GET") {
    handleSeumBizWithdrawRequests(req, res);
    return;
  }

  const seumBizWithdrawCompleteMatch = pathname.match(/^\/admin\/seumbiz\/withdraw-requests\/([^/]+)\/complete$/);
  if (seumBizWithdrawCompleteMatch && req.method === "POST") {
    handleSeumBizWithdrawRequestComplete(req, res, seumBizWithdrawCompleteMatch[1]);
    return;
  }

  if (pathname === "/admin/seumbiz/admin-logs" && req.method === "GET") {
    handleSeumBizAdminLogs(req, res);
    return;
  }

  if (pathname === "/admin/seumbiz/admin-logs/filter-options" && req.method === "GET") {
    handleSeumBizAdminLogFilterOptions(req, res);
    return;
  }

  const seumBizAdminLogDetailMatch = pathname.match(/^\/admin\/seumbiz\/admin-logs\/([^/]+)$/);
  if (seumBizAdminLogDetailMatch && req.method === "GET") {
    handleSeumBizAdminLogDetail(req, res, seumBizAdminLogDetailMatch[1]);
    return;
  }

  if (pathname === "/admin/vendor-inquiries" && req.method === "GET") {
    handleVendorInquiriesList(req, res);
    return;
  }

  const vendorInquiryIdMatch = pathname.match(/^\/admin\/vendor-inquiries\/([^/]+)$/);
  if (vendorInquiryIdMatch && req.method === "PATCH") {
    handleVendorInquiryUpdate(req, res, vendorInquiryIdMatch[1]);
    return;
  }

  if (pathname === "/admin/orders/status" && req.method === "PATCH") {
    handleOrderStatus(req, res);
    return;
  }

  if (pathname === "/admin/orders" && req.method === "DELETE") {
    handleOrderDelete(req, res);
    return;
  }

  if (pathname === "/admin/gift-cards" && req.method === "GET") {
    handleGiftCardsList(req, res);
    return;
  }

  if (pathname === "/admin/gift-cards" && req.method === "POST") {
    handleGiftCardCreate(req, res);
    return;
  }

  if (pathname === "/admin/gift-cards" && req.method === "PATCH") {
    handleGiftCardUpdate(req, res);
    return;
  }

  if (pathname === "/admin/gift-cards/upload" && req.method === "POST") {
    handleGiftCardImageUpload(req, res);
    return;
  }

  if (pathname === "/admin/banks" && req.method === "GET") {
    handleBanksList(req, res);
    return;
  }

  if (pathname === "/admin/banks" && req.method === "POST") {
    handleBankCreate(req, res);
    return;
  }

  if (pathname === "/admin/banks" && req.method === "PATCH") {
    handleBankUpdate(req, res);
    return;
  }

  if (pathname === "/admin/banks/upload" && req.method === "POST") {
    handleBankLogoUpload(req, res);
    return;
  }

  if (pathname === "/admin/banners" && req.method === "GET") {
    handleBannersList(req, res);
    return;
  }

  if (pathname === "/admin/banners" && req.method === "POST") {
    handleBannerCreate(req, res);
    return;
  }

  const bannerIdMatch = pathname.match(/^\/admin\/banners\/([^/]+)$/);
  if (bannerIdMatch && req.method === "PATCH") {
    handleBannerUpdate(req, res, bannerIdMatch[1]);
    return;
  }

  if (bannerIdMatch && req.method === "DELETE") {
    handleBannerDelete(req, res, bannerIdMatch[1]);
    return;
  }

  if (pathname === "/admin/banners/upload" && req.method === "POST") {
    handleBannerImageUpload(req, res);
    return;
  }

  if (pathname === "/admin/notices" && req.method === "GET") {
    handleNoticesList(req, res);
    return;
  }

  if (pathname === "/admin/notices" && req.method === "POST") {
    handleNoticeCreate(req, res);
    return;
  }

  if (pathname === "/admin/notices" && req.method === "PATCH") {
    handleNoticeUpdate(req, res);
    return;
  }

  if (pathname === "/admin/notices" && req.method === "DELETE") {
    handleNoticeDelete(req, res);
    return;
  }

  if (pathname === "/admin/notice-attachment" && req.method === "POST") {
    handleNoticeAttachmentUpload(req, res);
    return;
  }

  if (pathname === "/admin/site-settings" && req.method === "GET") {
    handleSiteSettingsGet(req, res);
    return;
  }

  if (pathname === "/admin/site-settings" && req.method === "PATCH") {
    handleSiteSettingsUpdate(req, res);
    return;
  }

  if (pathname.startsWith("/uploads/") && req.method === "GET") {
    const filePath = join(uploadsDir, pathname.replace(/^\/uploads\//, ""));
    if (!filePath.startsWith(uploadsDir) || !existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    sendFile(res, filePath);
    return;
  }

  if (pathname === "/admin/config.js") {
    res.writeHead(200, {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(
      `window.ADMIN_CONFIG = ${JSON.stringify(
        hasValidSession(req)
          ? {
              supabaseUrl,
              supabaseAnonKey
            }
          : {}
      )};`
    );
    return;
  }

  const filePath = join(publicDir, pathname.replace(/^\/admin\//, ""));
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`SeeumGift admin running at http://localhost:${port}/admin`);
});

function sendFile(res, filePath) {
  res.writeHead(200, {
    "content-type": types[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(res);
}

async function handleOrderStatus(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const { id, status } = await readJson(req);
    if (!id || !statusValues.has(status)) {
      sendJson(res, 400, { ok: false, message: "상태 값이 올바르지 않습니다." });
      return;
    }

    const rows = await supabaseAdminRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=id,status`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ status })
    });

    if (!rows?.length) {
      sendJson(res, 403, {
        ok: false,
        message: supabaseServiceRoleKey
          ? "업데이트된 주문이 없습니다."
          : "Supabase 업데이트 권한이 필요합니다. SUPABASE_SERVICE_ROLE_KEY를 설정해 주세요."
      });
      return;
    }

    sendJson(res, 200, { ok: true, order: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleOrderDelete(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const { id } = await readJson(req);
    if (!id) {
      sendJson(res, 400, { ok: false, message: "주문 ID가 필요합니다." });
      return;
    }

    const rows = await supabaseAdminRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=id`, {
      method: "DELETE",
      headers: { prefer: "return=representation" }
    });

    if (!rows?.length) {
      sendJson(res, 403, {
        ok: false,
        message: supabaseServiceRoleKey
          ? "삭제된 주문이 없습니다."
          : "Supabase 삭제 권한이 필요합니다. SUPABASE_SERVICE_ROLE_KEY를 설정해 주세요."
      });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleGiftCardsList(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest("/rest/v1/gift_cards?select=*&order=sort_order.asc,name.asc");
    sendJson(res, 200, { ok: true, giftCards: rows || [] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleVendorInquiriesList(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest(
      "/rest/v1/vendor_inquiries?select=id,company_name,manager_name,phone,email,giftcard_type,monthly_volume,message,status,memo,created_at&order=created_at.desc"
    );
    sendJson(res, 200, { ok: true, inquiries: rows || [] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleVendorInquiryUpdate(req, res, id) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const inquiryId = String(id || "").trim();
    const payload = await readJson(req);
    const status = String(payload.status || "").trim();

    if (!inquiryId) {
      sendJson(res, 400, { ok: false, message: "업체 문의 ID가 필요합니다." });
      return;
    }

    if (!vendorStatusValues.has(status)) {
      sendJson(res, 400, { ok: false, message: "상태 값이 올바르지 않습니다." });
      return;
    }

    const rows = await supabaseAdminRequest(
      `/rest/v1/vendor_inquiries?id=eq.${encodeURIComponent(inquiryId)}&select=*`,
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          status,
          memo: String(payload.memo || "").trim() || null,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "업체매입 문의를 찾지 못했습니다." });
      return;
    }

    sendJson(res, 200, { ok: true, inquiry: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleGiftCardCreate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const name = String(payload.name || "").trim();
    const slug = normalizeSlug(payload.slug || name);

    if (!name || !slug) {
      sendJson(res, 400, { ok: false, message: "상품명과 상품 코드는 필수입니다." });
      return;
    }

    const rows = await supabaseAdminRequest("/rest/v1/gift_cards?select=*", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        name,
        slug,
        rate: normalizeNumber(payload.rate, 0),
        rate_label: formatRateLabel(payload.rate),
        sort_order: normalizeInteger(payload.sort_order, 0),
        is_active: payload.is_active !== false,
        badge: String(payload.badge || name.slice(0, 1) || "상").trim(),
        color: String(payload.color || "#2478ff").trim(),
        image_url: String(payload.image_url || "").trim(),
        description: String(payload.description || "상품권 정보를 입력해주세요.").trim(),
        amount_options: Array.isArray(payload.amount_options) ? payload.amount_options : [],
        fields: Array.isArray(payload.fields) ? payload.fields : [],
        help_messages: Array.isArray(payload.help_messages) ? payload.help_messages : []
      })
    });

    sendJson(res, 200, { ok: true, giftCard: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleGiftCardUpdate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const id = String(payload.id || "").trim();

    if (!id) {
      sendJson(res, 400, { ok: false, message: "상품 ID가 필요합니다." });
      return;
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = String(payload.name || "").trim();
    if (payload.rate !== undefined) {
      updates.rate = normalizeNumber(payload.rate, 0);
      updates.rate_label = formatRateLabel(payload.rate);
    }
    if (payload.sort_order !== undefined) updates.sort_order = normalizeInteger(payload.sort_order, 0);
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);
    if (payload.image_url !== undefined) updates.image_url = String(payload.image_url || "").trim();
    updates.updated_at = new Date().toISOString();

    if (updates.name === "") {
      sendJson(res, 400, { ok: false, message: "상품명은 비울 수 없습니다." });
      return;
    }

    const previousRows = updates.image_url
      ? await supabaseAdminRequest(`/rest/v1/gift_cards?id=eq.${encodeURIComponent(id)}&select=id,image_url`)
      : [];
    const previousImageUrl = previousRows?.[0]?.image_url || "";

    const rows = await supabaseAdminRequest(`/rest/v1/gift_cards?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(updates)
    });

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "상품을 찾지 못했습니다." });
      return;
    }

    deletePreviousUpload(previousImageUrl, updates.image_url);
    sendJson(res, 200, { ok: true, giftCard: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleGiftCardImageUpload(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const file = await readMultipartPng(req);
    const fileName = `gift-card-${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    const filePath = join(uploadsDir, fileName);

    writeFileSync(filePath, file.data);
    sendJson(res, 200, { ok: true, image_url: `/uploads/${fileName}` });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
  }
}

async function handleBanksList(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest("/rest/v1/banks?select=*&order=sort_order.asc,name.asc");
    sendJson(res, 200, { ok: true, banks: rows || [] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBankCreate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const name = String(payload.name || "").trim();

    if (!name) {
      sendJson(res, 400, { ok: false, message: "은행명은 필수입니다." });
      return;
    }

    const rows = await supabaseAdminRequest("/rest/v1/banks?select=*", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        name,
        logo_url: String(payload.logo_url || "").trim(),
        sort_order: normalizeInteger(payload.sort_order, 0),
        is_active: payload.is_active !== false
      })
    });

    sendJson(res, 200, { ok: true, bank: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBankUpdate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const id = String(payload.id || "").trim();

    if (!id) {
      sendJson(res, 400, { ok: false, message: "은행 ID가 필요합니다." });
      return;
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = String(payload.name || "").trim();
    if (payload.logo_url !== undefined) updates.logo_url = String(payload.logo_url || "").trim();
    if (payload.sort_order !== undefined) updates.sort_order = normalizeInteger(payload.sort_order, 0);
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);

    if (updates.name === "") {
      sendJson(res, 400, { ok: false, message: "은행명은 비울 수 없습니다." });
      return;
    }

    const previousRows = updates.logo_url
      ? await supabaseAdminRequest(`/rest/v1/banks?id=eq.${encodeURIComponent(id)}&select=id,logo_url`)
      : [];
    const previousLogoUrl = previousRows?.[0]?.logo_url || "";

    const rows = await supabaseAdminRequest(`/rest/v1/banks?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(updates)
    });

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "은행을 찾지 못했습니다." });
      return;
    }

    deletePreviousUpload(previousLogoUrl, updates.logo_url);
    sendJson(res, 200, { ok: true, bank: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBankLogoUpload(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const file = await readMultipartPng(req);
    const fileName = `bank-${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    const filePath = join(uploadsDir, fileName);

    writeFileSync(filePath, file.data);
    sendJson(res, 200, { ok: true, image_url: `/uploads/${fileName}` });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
  }
}

async function handleBannersList(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest("/rest/v1/main_banners?select=*&order=sort_order.asc,created_at.desc");
    sendJson(res, 200, { ok: true, banners: rows || [] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBannerCreate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const title = String(payload.title || "").trim();
    const imageUrl = String(payload.image_url || "").trim();

    if (!title) {
      sendJson(res, 400, { ok: false, message: "배너 제목은 필수입니다." });
      return;
    }

    if (!imageUrl) {
      sendJson(res, 400, { ok: false, message: "배너 이미지를 업로드해 주세요." });
      return;
    }

    const rows = await supabaseAdminRequest("/rest/v1/main_banners?select=*", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        title,
        image_url: imageUrl,
        link_url: String(payload.link_url || "").trim() || null,
        sort_order: normalizeInteger(payload.sort_order, 0),
        is_active: payload.is_active !== false,
        updated_at: new Date().toISOString()
      })
    });

    sendJson(res, 200, { ok: true, banner: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBannerUpdate(req, res, id) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const bannerId = String(id || "").trim();
    const payload = await readJson(req);

    if (!bannerId) {
      sendJson(res, 400, { ok: false, message: "배너 ID가 필요합니다." });
      return;
    }

    const updates = {};
    if (payload.title !== undefined) updates.title = String(payload.title || "").trim();
    if (payload.image_url !== undefined) updates.image_url = String(payload.image_url || "").trim();
    if (payload.link_url !== undefined) updates.link_url = String(payload.link_url || "").trim() || null;
    if (payload.sort_order !== undefined) updates.sort_order = normalizeInteger(payload.sort_order, 0);
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);
    updates.updated_at = new Date().toISOString();

    if (updates.title === "") {
      sendJson(res, 400, { ok: false, message: "배너 제목은 비울 수 없습니다." });
      return;
    }

    if (updates.image_url === "") {
      sendJson(res, 400, { ok: false, message: "배너 이미지는 비울 수 없습니다." });
      return;
    }

    const previousRows = updates.image_url
      ? await supabaseAdminRequest(`/rest/v1/main_banners?id=eq.${encodeURIComponent(bannerId)}&select=id,image_url`)
      : [];
    const previousImageUrl = previousRows?.[0]?.image_url || "";

    const rows = await supabaseAdminRequest(`/rest/v1/main_banners?id=eq.${encodeURIComponent(bannerId)}&select=*`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(updates)
    });

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "배너를 찾지 못했습니다." });
      return;
    }

    deletePreviousUpload(previousImageUrl, updates.image_url);
    sendJson(res, 200, { ok: true, banner: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBannerDelete(req, res, id) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const bannerId = String(id || "").trim();
    if (!bannerId) {
      sendJson(res, 400, { ok: false, message: "배너 ID가 필요합니다." });
      return;
    }

    const previousRows = await supabaseAdminRequest(`/rest/v1/main_banners?id=eq.${encodeURIComponent(bannerId)}&select=id,image_url`);
    const previousImageUrl = previousRows?.[0]?.image_url || "";

    await supabaseAdminRequest(`/rest/v1/main_banners?id=eq.${encodeURIComponent(bannerId)}`, {
      method: "DELETE",
      headers: { prefer: "return=minimal" }
    });

    deletePreviousUpload(previousImageUrl, "");
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleBannerImageUpload(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const file = await readMultipartPng(req);
    const fileName = `banner-${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    const filePath = join(uploadsDir, fileName);

    writeFileSync(filePath, file.data);
    sendJson(res, 200, { ok: true, image_url: `/uploads/${fileName}` });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
  }
}

async function handleNoticesList(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest("/rest/v1/notices?select=*&order=is_important.desc,created_at.desc");
    sendJson(res, 200, { ok: true, notices: rows || [] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleNoticeCreate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const title = String(payload.title || "").trim();
    const content = String(payload.content || "").trim();

    if (!title || !content) {
      sendJson(res, 400, { ok: false, message: "제목과 내용은 필수입니다." });
      return;
    }

    const rows = await supabaseAdminRequest("/rest/v1/notices?select=*", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        title,
        content,
        is_important: Boolean(payload.is_important),
        is_visible: payload.is_visible !== false,
        ...(payload.created_at ? { created_at: payload.created_at } : {}),
        ...(payload.scheduled_at ? { scheduled_at: payload.scheduled_at } : {}),
        ...(payload.attachment_url ? { attachment_url: payload.attachment_url } : {}),
        ...(payload.attachment_name ? { attachment_name: payload.attachment_name } : {})
      })
    });

    sendJson(res, 200, { ok: true, notice: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleNoticeUpdate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const payload = await readJson(req);
    const id = String(payload.id || "").trim();

    if (!id) {
      sendJson(res, 400, { ok: false, message: "공지 ID가 필요합니다." });
      return;
    }

    const updates = { updated_at: new Date().toISOString() };
    if (payload.title !== undefined) updates.title = String(payload.title || "").trim();
    if (payload.content !== undefined) updates.content = String(payload.content || "").trim();
    if (payload.created_at !== undefined) updates.created_at = payload.created_at || new Date().toISOString();
    if (payload.scheduled_at !== undefined) updates.scheduled_at = payload.scheduled_at || null;
    if (payload.attachment_url !== undefined) updates.attachment_url = String(payload.attachment_url || "").trim() || null;
    if (payload.attachment_name !== undefined) updates.attachment_name = String(payload.attachment_name || "").trim() || null;
    if (payload.is_important !== undefined) updates.is_important = Boolean(payload.is_important);
    if (payload.is_visible !== undefined) updates.is_visible = Boolean(payload.is_visible);

    if (updates.title === "" || updates.content === "") {
      sendJson(res, 400, { ok: false, message: "제목과 내용은 비울 수 없습니다." });
      return;
    }

    const rows = await supabaseAdminRequest(`/rest/v1/notices?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(updates)
    });

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "공지를 찾지 못했습니다." });
      return;
    }

    sendJson(res, 200, { ok: true, notice: rows[0] });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleNoticeDelete(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const { id } = await readJson(req);
    if (!id) {
      sendJson(res, 400, { ok: false, message: "공지 ID가 필요합니다." });
      return;
    }

    const rows = await supabaseAdminRequest(`/rest/v1/notices?id=eq.${encodeURIComponent(id)}&select=id`, {
      method: "DELETE",
      headers: { prefer: "return=representation" }
    });

    if (!rows?.length) {
      sendJson(res, 404, { ok: false, message: "공지를 찾지 못했습니다." });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleNoticeAttachmentUpload(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const file = await readMultipartFile(req, "attachment");
    const originalName = sanitizeFileName(file.name || "attachment");
    const extension = extname(originalName).toLowerCase();
    const fileName = `notice-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
    const filePath = join(uploadsDir, fileName);

    writeFileSync(filePath, file.data);
    sendJson(res, 200, {
      ok: true,
      attachment: {
        url: `/uploads/${fileName}`,
        name: originalName
      }
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
  }
}

async function handleSiteSettingsGet(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const rows = await supabaseAdminRequest(
      `/rest/v1/site_settings?select=key,value&key=in.(${siteSettingKeys.join(",")})`
    );
    const settings = rowsToSiteSettings(rows || []);
    sendJson(res, 200, { ok: true, settings });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

async function handleSiteSettingsUpdate(req, res) {
  if (!hasValidSession(req)) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  try {
    const body = await readJson(req);
    const settings = siteSettingKeys.reduce((result, key) => {
      result[key] = normalizeSiteSetting(body[key], siteSettingDefaults[key]);
      return result;
    }, {});
    if (!settings.business_phone) {
      settings.business_phone = settings.consult_phone;
    }
    const now = new Date().toISOString();
    const payload = siteSettingKeys.map((key) => ({
      key,
      value: settings[key],
      updated_at: now
    }));

    const rows = await supabaseAdminRequest("/rest/v1/site_settings?on_conflict=key", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });

    sendJson(res, 200, { ok: true, settings: rowsToSiteSettings(rows || []) });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
  }
}

function rowsToSiteSettings(rows) {
  return rows.reduce(
    (settings, row) => ({
      ...settings,
      [row.key]: row.value || ""
    }),
    { ...siteSettingDefaults }
  );
}

function normalizeSiteSetting(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

async function handlePublicOrderCreate(req, res) {
  try {
    const receipt = await readJson(req);
    const phone = normalizePhone(receipt.phone || "");
    const accountHolder = String(receipt.accountHolder || receipt.account_holder || "").trim();
    const bankName = String(receipt.bankName || receipt.bank_name || "").trim();
    const receiptNo = String(receipt.receiptNo || receipt.receipt_no || "").trim();
    const totalAmount = Number(receipt.totalAmount || receipt.total_amount || 0);

    if (!phone || phone.length < 10 || !accountHolder || !bankName || !receiptNo || !totalAmount) {
      sendApiJson(res, 400, {
        ok: false,
        message: "\uC8FC\uBB38 \uC800\uC7A5\uC5D0 \uD544\uC694\uD55C \uAC12\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4."
      });
      return;
    }

    const items = await normalizeOrderItems(receipt.items);

    const rows = await supabaseAdminRequest("/rest/v1/orders?select=id,receipt_no,status,created_at", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        receipt_no: receiptNo,
        phone,
        account_holder: accountHolder,
        bank_name: bankName,
        items,
        total_amount: totalAmount,
        status: receipt.status || "\uC811\uC218\uC644\uB8CC",
        requested_at: receipt.requestedAt || receipt.requested_at || new Date().toISOString()
      })
    });

    sendApiJson(res, 200, { ok: true, order: rows?.[0] || null });
  } catch (error) {
    sendApiJson(res, 500, { ok: false, message: error.message });
  }
}

async function handlePublicOrderLookup(url, res) {
  try {
    const phone = normalizePhone(url.searchParams.get("phone") || "");
    if (!phone || phone.length < 10) {
      sendApiJson(res, 400, {
        ok: false,
        message: "\uD734\uB300\uD3F0\uBC88\uD638\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694."
      });
      return;
    }

    const rows = await supabaseAdminRequest(
      `/rest/v1/orders?select=*&phone=eq.${encodeURIComponent(phone)}&order=created_at.desc`
    );

    sendApiJson(res, 200, { ok: true, orders: rows || [] });
  } catch (error) {
    sendApiJson(res, 500, { ok: false, message: error.message });
  }
}

async function normalizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const giftCardRates = await loadGiftCardRateMap();

  return items.map((item) => {
    const productName = String(item.productName || item.product_name || item.name || "").trim();
    const amount = normalizeNumber(item.amount, 0);
    const fallbackRate = giftCardRates.get(productName) ?? 0;
    const rate = parseRate(item.rate ?? item.purchase_rate ?? item.buy_rate, fallbackRate);
    const payoutAmount = Math.round((amount * rate) / 100);

    return {
      ...item,
      productName,
      amount,
      rate,
      payoutAmount
    };
  });
}

async function loadGiftCardRateMap() {
  const rows = await supabaseAdminRequest("/rest/v1/gift_cards?select=name,slug,rate,rate_label");
  const rateMap = new Map();

  for (const row of rows || []) {
    const rate = parseRate(row.rate ?? row.rate_label, 0);
    if (row.name) {
      rateMap.set(String(row.name).trim(), rate);
    }
    if (row.slug) {
      rateMap.set(String(row.slug).trim(), rate);
    }
  }

  return rateMap;
}

function parseRate(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return normalizeNumber(fallback, 0);
  }

  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : normalizeNumber(fallback, 0);
}

async function supabaseAdminRequest(path, options = {}) {
  const { returnMeta = false, ...fetchOptions } = options;
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(fetchOptions.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  const data = response.status === 204 ? null : await response.json();
  if (returnMeta) {
    return {
      data,
      contentRange: response.headers.get("content-range") || ""
    };
  }
  return data;
}

async function supabaseUserRequest(path, accessToken, options = {}) {
  console.log("[SEUMBiz Supabase Request]", {
    method: options.method || "GET",
    path,
    body: options.body ? safeParseJson(options.body) : null
  });

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getPagination(req) {
  const url = new URL(req.url, "http://localhost");
  const page = clampInteger(url.searchParams.get("page"), 1, 1, 9999);
  const pageSize = clampInteger(url.searchParams.get("pageSize"), 20, 1, 100);
  return { page, pageSize };
}

function getPaginationRange({ page, pageSize }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return `${from}-${to}`;
}

function getTotalFromContentRange(contentRange, fallback = 0) {
  const match = String(contentRange || "").match(/\/(\d+)$/);
  if (!match) return Number(fallback || 0);
  return Number(match[1] || fallback || 0);
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

async function requireSeumBizAdmin(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendJson(res, 500, { ok: false, message: "SEUMBiz Supabase 관리자 설정이 필요합니다." });
    return null;
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    sendJson(res, 401, { ok: false, message: "관리자 로그인이 필요합니다." });
    return null;
  }

  try {
    const authUser = await supabaseUserRequest("/auth/v1/user", accessToken, {
      method: "GET",
      headers: {
        "content-type": "application/json"
      }
    });

    const authUserId = authUser?.id;
    if (!authUserId) {
      sendJson(res, 401, { ok: false, message: "관리자 인증 정보를 확인할 수 없습니다." });
      return null;
    }

    const users = await supabaseAdminRequest(
      `/rest/v1/biz_users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,auth_user_id,login_id,name,role,status&limit=1`
    );
    const admin = users?.[0];

    if (!admin || admin.role !== "admin" || admin.status !== "approved") {
      sendJson(res, 403, { ok: false, message: "SEUMBiz 관리자 권한이 필요합니다." });
      return null;
    }

    return {
      accessToken,
      authUser,
      admin
    };
  } catch (error) {
    sendJson(res, 401, { ok: false, message: "관리자 인증 확인에 실패했습니다.", detail: String(error.message || error) });
    return null;
  }
}

async function requireSeumBizCompanyUser(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendApiJson(res, 500, { ok: false, message: "SEUMBiz Supabase 설정이 필요합니다." });
    return null;
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    sendApiJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return null;
  }

  try {
    const authUser = await supabaseUserRequest("/auth/v1/user", accessToken, {
      method: "GET",
      headers: {
        "content-type": "application/json"
      }
    });
    const authUserId = authUser?.id;
    if (!authUserId) {
      sendApiJson(res, 401, { ok: false, message: "로그인 정보를 확인할 수 없습니다." });
      return null;
    }

    const users = await supabaseAdminRequest(
      `/rest/v1/biz_users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,auth_user_id,company_id,login_id,name,role,status&limit=1`
    );
    const user = users?.[0];
    const allowedRoles = new Set(["company_owner", "company_user", "company_staff"]);

    if (!user || user.status !== "approved" || !allowedRoles.has(user.role) || !user.company_id) {
      sendApiJson(res, 403, { ok: false, message: "승인된 업체 계정만 사용할 수 있습니다." });
      return null;
    }

    return {
      accessToken,
      authUser,
      user
    };
  } catch (error) {
    sendApiJson(res, 401, { ok: false, message: "로그인 확인에 실패했습니다.", detail: String(error.message || error) });
    return null;
  }
}

async function handleSeumBizCompanySignup(req, res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    sendApiJson(res, 500, { ok: false, message: "SEUMBiz Supabase 설정이 필요합니다." });
    return;
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    sendApiJson(res, 401, { ok: false, message: "업체 등록 신청 세션을 확인할 수 없습니다." });
    return;
  }

  try {
    const body = await readJson(req);
    const payload = normalizeSeumBizCompanySignupPayload(body);
    const authUser = await supabaseUserRequest("/auth/v1/user", accessToken, {
      method: "GET",
      headers: {
        "content-type": "application/json"
      }
    });
    const authUserId = authUser?.id;
    const authEmail = String(authUser?.email || "").trim().toLowerCase();

    if (!authUserId || !authEmail) {
      sendApiJson(res, 401, { ok: false, message: "Auth 사용자 정보를 확인할 수 없습니다." });
      return;
    }

    if (payload.login_id && payload.login_id.toLowerCase() !== authEmail) {
      sendApiJson(res, 400, { ok: false, message: "가입 이메일과 Auth 이메일이 일치하지 않습니다." });
      return;
    }

    const [sameAuthUsers, sameLoginUsers] = await Promise.all([
      supabaseAdminRequest(
        `/rest/v1/biz_users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,status&limit=1`
      ),
      supabaseAdminRequest(
        `/rest/v1/biz_users?login_id=eq.${encodeURIComponent(authEmail)}&select=id,status&limit=1`
      )
    ]);

    if (sameAuthUsers?.length || sameLoginUsers?.length) {
      sendApiJson(res, 409, { ok: false, message: "이미 등록된 업체 계정입니다. 승인 상태를 확인해주세요." });
      return;
    }

    const companies = await supabaseAdminRequest(
      "/rest/v1/biz_companies?select=id,company_name,status",
      {
        method: "POST",
        headers: {
          prefer: "return=representation"
        },
        body: JSON.stringify({
          company_name: payload.company_name,
          manager_name: payload.manager_name,
          phone: payload.phone,
          kakao_id: payload.kakao_id,
          status: "pending"
        })
      }
    );
    const company = companies?.[0];
    if (!company?.id) {
      sendApiJson(res, 500, { ok: false, message: "업체 신청 정보를 저장하지 못했습니다." });
      return;
    }

    try {
      const users = await supabaseAdminRequest(
        "/rest/v1/biz_users?select=id,auth_user_id,company_id,login_id,name,role,status",
        {
          method: "POST",
          headers: {
            prefer: "return=representation"
          },
          body: JSON.stringify({
            auth_user_id: authUserId,
            company_id: company.id,
            login_id: authEmail,
            name: payload.manager_name,
            phone: payload.phone,
            role: "company_owner",
            status: "pending"
          })
        }
      );
      const user = users?.[0];
      if (!user?.id) {
        throw new Error("업체 사용자 계정을 저장하지 못했습니다.");
      }

      void notifyCompanySignupTelegram({
        company,
        user,
        signupPayload: {
          company_name: payload.company_name,
          manager_name: payload.manager_name,
          phone: payload.phone,
          kakao_id: payload.kakao_id,
          login_id: authEmail
        }
      });

      sendApiJson(res, 200, {
        ok: true,
        company: {
          id: company.id,
          company_name: company.company_name,
          status: company.status
        },
        user: {
          id: user.id,
          login_id: user.login_id,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      try {
        await supabaseAdminRequest(`/rest/v1/biz_companies?id=eq.${encodeURIComponent(company.id)}`, {
          method: "DELETE"
        });
      } catch (cleanupError) {
        console.warn("[SEUMBiz signup] pending company cleanup failed:", cleanupError);
      }
      throw error;
    }
  } catch (error) {
    sendApiJson(res, 400, {
      ok: false,
      message: error.message || "업체 등록 신청에 실패했습니다.",
      detail: String(error.message || error)
    });
  }
}

function normalizeSeumBizCompanySignupPayload(body) {
  const companyName = String(body.company_name || "").trim();
  const managerName = String(body.manager_name || "").trim();
  const phone = String(body.phone || "").trim();
  const kakaoId = String(body.kakao_id || "").trim();
  const loginId = String(body.login_id || body.email || "").trim().toLowerCase();

  if (!companyName) throw new Error("업체명을 입력해주세요.");
  if (!managerName) throw new Error("담당자명을 입력해주세요.");
  if (!phone) throw new Error("연락처를 입력해주세요.");
  if (!kakaoId) throw new Error("카카오톡 ID를 입력해주세요.");
  if (!loginId) throw new Error("이메일을 입력해주세요.");

  return {
    company_name: companyName,
    manager_name: managerName,
    phone,
    kakao_id: kakaoId,
    login_id: loginId
  };
}

async function handleSeumBizOcrGiftcard(req, res) {
  const context = await requireSeumBizCompanyUser(req, res);
  if (!context) return;

  if (!openAiApiKey) {
    sendApiJson(res, 500, { ok: false, message: "OPENAI_API_KEY가 설정되어 있지 않습니다." });
    return;
  }

  try {
    const files = await readMultipartFiles(req, ["images", "images[]", "giftCardImage"], {
      maxFiles: 10,
      maxFileSize: 5 * 1024 * 1024,
      maxTotalSize: 50 * 1024 * 1024,
      allowInvalidFiles: true
    });

    if (!files.length) {
      sendApiJson(res, 400, { ok: false, message: "OCR을 실행할 이미지를 선택해주세요." });
      return;
    }

    const items = [];
    const failures = [];
    for (const file of files) {
      if (file.validationError) {
        failures.push({
          image_name: file.name,
          message: file.validationError
        });
        items.push(
          normalizeOcrResultItem(
            {
              warning: file.validationError,
              failed: true
            },
            file
          )
        );
        continue;
      }

      try {
        const result = await callOpenAiGiftcardOcr(file);
        const resultItems = Array.isArray(result?.items) ? result.items : [];
        if (!resultItems.length) {
          items.push(normalizeOcrResultItem({ warning: "PIN 번호를 찾지 못했습니다.", raw_text: result?.raw_text || "" }, file));
        } else {
          for (const item of resultItems) {
            items.push(normalizeOcrResultItem(item, file));
          }
        }
      } catch (error) {
        const message = String(error.message || error);
        failures.push({
          image_name: file.name,
          message
        });
        console.error("[SEUMBiz OCR File Error]", {
          imageName: file.name,
          message
        });
        items.push(
          normalizeOcrResultItem(
            {
              warning: `OCR 실패: ${message}`,
              failed: true
            },
            file
          )
        );
      }
    }

    sendApiJson(res, 200, {
      ok: true,
      items,
      failures,
      processedCount: files.length,
      successCount: files.length - failures.length,
      failureCount: failures.length
    });
  } catch (error) {
    console.error("[SEUMBiz OCR Upload Error]", {
      message: error?.message || String(error)
    });
    sendApiJson(res, 400, { ok: false, message: String(error.message || error) });
  }
}

async function handleSeumBizPurchaseTelegramNotification(req, res) {
  const context = await requireSeumBizCompanyUser(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const purchaseRequestId = String(body.purchase_request_id || "").trim();
    const receiptNo = String(body.receipt_no || "").trim();

    if (!purchaseRequestId && !receiptNo) {
      sendApiJson(res, 400, { ok: false, message: "매입신청 식별값이 필요합니다." });
      return;
    }

    const filter = purchaseRequestId
      ? `id=eq.${encodeURIComponent(purchaseRequestId)}`
      : `receipt_no=eq.${encodeURIComponent(receiptNo)}`;
    const requests = await supabaseAdminRequest(
      `/rest/v1/biz_purchase_requests?${filter}&company_id=eq.${encodeURIComponent(
        context.user.company_id
      )}&select=id,company_id,receipt_no,giftcard_type,giftcard_name_snapshot,item_count,total_face_value,expected_settlement_amount&limit=1`
    );
    const request = requests?.[0];
    if (!request) {
      sendApiJson(res, 404, { ok: false, message: "매입신청을 찾을 수 없습니다." });
      return;
    }

    const company = await loadSeumBizCompanyForNotification(request.company_id);
    await sendTelegramMessage(formatPurchaseRequestTelegramMessage(request, company));
    sendApiJson(res, 200, { ok: true });
  } catch (error) {
    console.warn("[SEUMBiz Telegram Purchase Notification Failed]", String(error.message || error));
    sendApiJson(res, 200, { ok: true, skipped: true });
  }
}

async function handleSeumBizWithdrawTelegramNotification(req, res) {
  const context = await requireSeumBizCompanyUser(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const withdrawRequestId = String(body.withdraw_request_id || "").trim();

    if (!withdrawRequestId) {
      sendApiJson(res, 400, { ok: false, message: "출금신청 식별값이 필요합니다." });
      return;
    }

    const requests = await supabaseAdminRequest(
      `/rest/v1/biz_withdraw_requests?id=eq.${encodeURIComponent(
        withdrawRequestId
      )}&company_id=eq.${encodeURIComponent(context.user.company_id)}&select=id,company_id,amount,status&limit=1`
    );
    const request = requests?.[0];
    if (!request) {
      sendApiJson(res, 404, { ok: false, message: "출금신청을 찾을 수 없습니다." });
      return;
    }

    const company = await loadSeumBizCompanyForNotification(request.company_id);
    await sendTelegramMessage(formatWithdrawRequestTelegramMessage(request, company));
    sendApiJson(res, 200, { ok: true });
  } catch (error) {
    console.warn("[SEUMBiz Telegram Withdraw Notification Failed]", String(error.message || error));
    sendApiJson(res, 200, { ok: true, skipped: true });
  }
}

async function handleSeumBizTelegramDebugUpdates(req, res) {
  if (!telegramBotToken) {
    sendApiJson(res, 500, { ok: false, message: "TELEGRAM_BOT_TOKEN이 설정되어 있지 않습니다." });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getUpdates`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      sendApiJson(res, response.status, {
        ok: false,
        message: "Telegram getUpdates 호출에 실패했습니다.",
        result: data
      });
      return;
    }

    sendApiJson(res, 200, {
      ok: true,
      result: data
    });
  } catch (error) {
    sendApiJson(res, 500, {
      ok: false,
      message: "Telegram getUpdates 호출 중 오류가 발생했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function loadSeumBizCompanyForNotification(companyId) {
  if (!companyId) return null;
  const companies = await supabaseAdminRequest(
    `/rest/v1/biz_companies?id=eq.${encodeURIComponent(companyId)}&select=id,company_name&limit=1`
  );
  return companies?.[0] || null;
}

function formatPurchaseRequestTelegramMessage(request, company) {
  const companyName = getSeumBizCompanyName(company);
  const giftcardName = request.giftcard_name_snapshot || request.giftcard_type || "-";
  const totalFaceValue = normalizeNumber(request.total_face_value, 0);
  const expectedSettlementAmount = normalizeNumber(request.expected_settlement_amount, 0);
  const faceValueLabel = totalFaceValue > 0 ? formatKoreanWon(totalFaceValue) : "금액 미확정";
  const settlementLabel = expectedSettlementAmount > 0 ? formatKoreanWon(expectedSettlementAmount) : "검수 필요";

  return [
    "🔔 신규 매입신청",
    "",
    `업체: ${companyName}`,
    `상품권: ${giftcardName}`,
    `접수번호: ${request.receipt_no || "-"}`,
    `건수: ${formatCount(request.item_count)}건`,
    `신청 액면가: ${faceValueLabel}`,
    `예상 정산금: ${settlementLabel}`
  ].join("\n");
}

function formatWithdrawRequestTelegramMessage(request, company) {
  return [
    "💸 신규 출금신청",
    "",
    `업체: ${getSeumBizCompanyName(company)}`,
    `신청금액: ${formatKoreanWon(request.amount)}`,
    "상태: 대기",
    "관리자 확인 필요"
  ].join("\n");
}

function formatCompanySignupTelegramMessage({ company, user, signupPayload }) {
  const payload = signupPayload || {};
  return [
    "[SEUMBiz 신규 업체가입 신청]",
    "",
    `업체명: ${payload.company_name || company?.company_name || "-"}`,
    `담당자: ${payload.manager_name || user?.name || "-"}`,
    `연락처: ${payload.phone || user?.phone || "-"}`,
    `카카오톡 ID: ${payload.kakao_id || "-"}`,
    `로그인 이메일: ${payload.login_id || user?.login_id || "-"}`,
    "상태: 승인대기",
    `신청일시: ${formatSeumBizDateTimeKorean(new Date())}`,
    "",
    "관리자 페이지에서 업체관리 메뉴를 확인해주세요."
  ].join("\n");
}

async function notifyCompanySignupTelegram({ company, user, signupPayload }) {
  try {
    await sendTelegramMessage(formatCompanySignupTelegramMessage({ company, user, signupPayload }));
  } catch (error) {
    console.warn("[SEUMBiz Telegram Company Signup Notification Failed]", String(error.message || error));
  }
}

async function sendTelegramMessageLegacy(text) {
  if (!telegramBotToken || !telegramChatId) {
    console.warn("[SEUMBiz Telegram] TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 없어 알림 전송을 건너뜁니다.");
    return { skipped: true };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Telegram HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.warn("[SEUMBiz Telegram] 알림 전송 실패", String(error.message || error));
    return { skipped: true, error: String(error.message || error) };
  }
}

async function sendTelegramMessage(text) {
  if (!telegramBotToken) {
    console.warn("[SEUMBiz Telegram] TELEGRAM_BOT_TOKEN이 없어 알림 전송을 건너뜁니다.");
    return { skipped: true };
  }

  const recipients = await loadTelegramRecipientsForNotification();
  if (!recipients.length) {
    console.warn("[SEUMBiz Telegram] 활성 수신자가 없어 알림 전송을 건너뜁니다.");
    return { skipped: true };
  }

  const results = [];
  for (const recipient of recipients) {
    results.push(await sendTelegramMessageToChat(recipient, text));
  }

  return {
    ok: results.some((result) => result.ok),
    results
  };
}

async function loadTelegramRecipientsForNotification() {
  try {
    const rows = await supabaseAdminRequest(
      "/rest/v1/biz_telegram_recipients?is_active=eq.true&select=id,name,chat_id,is_active&order=created_at.asc"
    );
    const activeRows = (rows || [])
      .map((row) => ({
        name: String(row.name || "").trim(),
        chat_id: String(row.chat_id || "").trim(),
        source: "db"
      }))
      .filter((row) => row.chat_id);

    if (activeRows.length) {
      return activeRows;
    }
  } catch (error) {
    console.warn("[SEUMBiz Telegram] 수신자 테이블 조회 실패, env fallback을 확인합니다.", String(error.message || error));
  }

  if (telegramChatId) {
    return [
      {
        name: "TELEGRAM_CHAT_ID",
        chat_id: telegramChatId,
        source: "env"
      }
    ];
  }

  return [];
}

async function sendTelegramMessageToChat(recipient, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: recipient.chat_id,
        text
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Telegram HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("[SEUMBiz Telegram] 전송 성공", {
      chat_id: recipient.chat_id,
      name: recipient.name || "",
      source: recipient.source || ""
    });
    return { ok: true, chat_id: recipient.chat_id, result: data };
  } catch (error) {
    console.warn("[SEUMBiz Telegram] 전송 실패", {
      chat_id: recipient.chat_id,
      name: recipient.name || "",
      source: recipient.source || "",
      error: String(error.message || error)
    });
    return { ok: false, chat_id: recipient.chat_id, error: String(error.message || error) };
  }
}

function getSeumBizCompanyName(company) {
  return company?.company_name || "확인 필요";
}

function formatKoreanWon(value) {
  const amount = normalizeNumber(value, 0);
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatCount(value) {
  return normalizeInteger(value, 0).toLocaleString("ko-KR");
}

function formatSeumBizDateTimeKorean(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

async function callOpenAiGiftcardOcr(file) {
  const dataUrl = `data:${file.mimeType};base64,${file.data.toString("base64")}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openAiApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: openAiOcrModel,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "상품권 이미지에서 PIN 번호와 액면가를 추출하세요. PIN은 16자리 숫자 또는 4-4-4-4 패턴만 인정하고 하이픈은 제거하세요. 액면가는 확실할 때만 원 단위 숫자로 반환하고, 불확실하면 null로 두세요. 허용 액면가는 10000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000입니다."
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "seumbiz_giftcard_ocr_result",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              raw_text: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    pin_no: { type: "string" },
                    face_value: { type: ["number", "null"] },
                    confidence: { type: ["number", "null"] },
                    warning: { type: "string" },
                    raw_text: { type: "string" }
                  },
                  required: ["pin_no", "face_value", "confidence", "warning", "raw_text"]
                }
              }
            },
            required: ["raw_text", "items"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `OpenAI HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = extractOpenAiOutputText(data);
  if (!text) {
    throw new Error("OpenAI OCR 응답이 비어 있습니다.");
  }

  return JSON.parse(stripJsonFence(text));
}

function extractOpenAiOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const entry of output) {
    const content = Array.isArray(entry?.content) ? entry.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
    }
  }
  return "";
}

function stripJsonFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeOcrResultItem(item, file) {
  const pin = String(item?.pin_no || "").replace(/\D/g, "").slice(0, 16);
  const faceValue = normalizeOcrFaceValue(item?.face_value);
  const confidence = item?.confidence === null || item?.confidence === undefined ? null : Number(item.confidence);
  return {
    image_name: file.name,
    pin_no: pin,
    face_value: faceValue,
    confidence: Number.isFinite(confidence) ? confidence : null,
    warning: String(item?.warning || "").trim(),
    raw_text: String(item?.raw_text || "").trim(),
    failed: Boolean(item?.failed)
  };
}

function normalizeOcrFaceValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(String(value).replace(/[^\d]/g, ""));
  const allowed = new Set([10000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000]);
  return allowed.has(amount) ? amount : null;
}

async function handleSeumBizAdminSession(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  sendJson(res, 200, {
    ok: true,
    admin: {
      id: context.admin.id,
      login_id: context.admin.login_id,
      name: context.admin.name,
      role: context.admin.role
    }
  });
}

async function loadSeumBizNotificationState() {
  const pendingPurchaseStatuses = new Set(["pending", "reviewing"]);
  const [purchaseRequests, withdrawRequests, companies] = await Promise.all([
    supabaseAdminRequest("/rest/v1/biz_purchase_requests?select=id,status&limit=10000"),
    supabaseAdminRequest("/rest/v1/biz_withdraw_requests?select=id,status&limit=10000"),
    supabaseAdminRequest("/rest/v1/biz_companies?select=id,status&limit=10000")
  ]);

  const purchasePendingCount = (purchaseRequests || []).filter((row) => pendingPurchaseStatuses.has(row.status)).length;
  const withdrawPendingCount = (withdrawRequests || []).filter((row) => row.status === "pending").length;
  const companyPendingCount = (companies || []).filter((row) => row.status === "pending").length;
  const totalPendingCount = purchasePendingCount + withdrawPendingCount + companyPendingCount;

  return {
    purchasePendingCount,
    withdrawPendingCount,
    companyPendingCount,
    totalPendingCount,
    shouldAlert: totalPendingCount > 0
  };
}

async function handleSeumBizDashboard(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [purchaseRequests, withdrawRequests, balances] = await Promise.all([
      supabaseAdminRequest(
        "/rest/v1/biz_purchase_requests?select=id,status,expected_settlement_amount,total_face_value&limit=10000"
      ),
      supabaseAdminRequest("/rest/v1/biz_withdraw_requests?select=id,status,amount&limit=10000"),
      supabaseAdminRequest("/rest/v1/biz_company_balances?select=company_id,balance_amount")
    ]);

    const pendingPurchaseStatuses = new Set(["pending", "reviewing"]);
    const pendingPurchases = (purchaseRequests || []).filter((row) => pendingPurchaseStatuses.has(row.status));
    const pendingWithdraws = (withdrawRequests || []).filter((row) => row.status === "pending");
    const totalBalance = (balances || []).reduce((sum, row) => sum + normalizeNumber(row.balance_amount, 0), 0);
    const pendingPurchaseAmount = pendingPurchases.reduce(
      (sum, row) => sum + normalizeNumber(row.expected_settlement_amount, 0),
      0
    );

    sendJson(res, 200, {
      ok: true,
      summary: {
        newPurchaseCount: pendingPurchases.length,
        pendingPurchaseAmount,
        pendingWithdrawCount: pendingWithdraws.length,
        totalCompanyBalance: totalBalance
      }
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "SEUMBiz 대시보드를 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizNotificationState(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const notification = await loadSeumBizNotificationState();
    sendJson(res, 200, {
      ok: true,
      notification
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "SEUMBiz ?? ??? ???? ?????.", detail: String(error.message || error) });
  }
}

async function handleSeumBizTelegramRecipients(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const rows = await supabaseAdminRequest(
      "/rest/v1/biz_telegram_recipients?select=id,name,chat_id,is_active,created_at&order=created_at.desc"
    );
    sendJson(res, 200, { ok: true, items: rows || [] });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "텔레그램 수신자 목록을 불러오지 못했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizTelegramRecipientCreate(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeTelegramRecipientPayload(body, { partial: false });
    const rows = await supabaseAdminRequest("/rest/v1/biz_telegram_recipients?select=*", {
      method: "POST",
      headers: {
        prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    sendJson(res, 200, { ok: true, item: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || "텔레그램 수신자 추가에 실패했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizTelegramRecipientUpdate(req, res, recipientId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeTelegramRecipientPayload(body, { partial: true });
    const rows = await supabaseAdminRequest(
      `/rest/v1/biz_telegram_recipients?id=eq.${encodeURIComponent(recipientId)}&select=*`,
      {
        method: "PATCH",
        headers: {
          prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!rows?.[0]) {
      sendJson(res, 404, { ok: false, message: "텔레그램 수신자를 찾을 수 없습니다." });
      return;
    }

    sendJson(res, 200, { ok: true, item: rows[0] });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || "텔레그램 수신자 수정에 실패했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizTelegramRecipientDelete(req, res, recipientId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    await supabaseAdminRequest(`/rest/v1/biz_telegram_recipients?id=eq.${encodeURIComponent(recipientId)}`, {
      method: "DELETE"
    });
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: "텔레그램 수신자 삭제에 실패했습니다.",
      detail: String(error.message || error)
    });
  }
}

function normalizeTelegramRecipientPayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = String(body.name || "").trim();
    if (!name) {
      throw new Error("수신자 이름을 입력해주세요.");
    }
    payload.name = name;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "chat_id")) {
    const chatId = String(body.chat_id || "").trim();
    if (!chatId) {
      throw new Error("Chat ID를 입력해주세요.");
    }
    payload.chat_id = chatId;
  }

  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    payload.is_active = Boolean(body.is_active);
  } else if (!partial) {
    payload.is_active = true;
  }

  if (!Object.keys(payload).length) {
    throw new Error("변경할 수신자 정보가 없습니다.");
  }

  return payload;
}

async function handleSeumBizSettlements(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const period = getSettlementPeriod(req);
    const todayPeriod = getTodaySettlementPeriod();
    const [companies, balances, ledgers, withdraws, purchaseRequests] = await Promise.all([
      supabaseAdminRequest("/rest/v1/biz_companies?select=id,company_name,status&order=company_name.asc&limit=10000"),
      supabaseAdminRequest("/rest/v1/biz_company_balances?select=company_id,balance_amount"),
      supabaseAdminRequest("/rest/v1/biz_balance_ledger?select=company_id,ledger_type,amount,created_at&order=created_at.desc&limit=10000"),
      supabaseAdminRequest("/rest/v1/biz_withdraw_requests?select=company_id,amount,status,created_at,processed_at&order=created_at.desc&limit=10000"),
      supabaseAdminRequest("/rest/v1/biz_purchase_requests?select=company_id,total_face_value,expected_settlement_amount,approved_settlement_amount,status,created_at,approved_at,reviewed_at&order=created_at.desc&limit=10000")
    ]);
    const balanceMap = new Map((balances || []).map((row) => [row.company_id, normalizeNumber(row.balance_amount, 0)]));
    const ledgerSummary = buildSettlementLedgerSummary(ledgers || [], period);
    const withdrawSummary = buildSettlementWithdrawSummary(withdraws || [], period);
    const metricPeriod = period || todayPeriod;
    const purchaseMetrics = buildSettlementPurchaseMetrics(purchaseRequests || [], metricPeriod);
    const withdrawCompletedAmount = sumSettlementWithdrawCompletedAmount(ledgers || [], metricPeriod);

    const items = (companies || [])
      .map((company) => {
        const ledger = ledgerSummary.byCompany.get(company.id) || {};
        const withdraw = withdrawSummary.byCompany.get(company.id) || {};
        return {
          company_id: company.id,
          company_name: company.company_name || "-",
          current_balance: balanceMap.get(company.id) || 0,
          total_purchase_approved: ledger.totalApproved || 0,
          total_withdraw_completed: Math.abs(ledger.totalWithdrawCompleted || 0),
          pending_withdraw_amount: withdraw.pendingAmount || 0,
          recent_approved_at: ledger.recentApprovedAt || null,
          recent_withdraw_at: withdraw.recentWithdrawAt || ledger.recentWithdrawAt || null
        };
      })
      .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0));

    const summary = {
      totalCompanyBalance: items.reduce((sum, row) => sum + normalizeNumber(row.current_balance, 0), 0),
      purchaseFaceValueAmount: purchaseMetrics.faceValueAmount,
      actualPurchaseAmount: purchaseMetrics.actualPurchaseAmount,
      purchaseProfitAmount: purchaseMetrics.faceValueAmount - purchaseMetrics.actualPurchaseAmount,
      todayWithdrawCompletedAmount: withdrawCompletedAmount,
      pendingWithdrawAmount: withdrawSummary.pendingAmount,
      settlementRequiredCompanyCount: items.filter((row) => normalizeNumber(row.current_balance, 0) > 0).length,
      hasDateFilter: Boolean(period),
      periodLabel: period ? "기간 기준" : "오늘 접수 기준"
    };

    sendJson(res, 200, { ok: true, summary, items });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "정산 현황을 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizSettlementDetail(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [companies, balances, companyLedgers, companyWithdraws, approved, withdraws, adjustments] = await Promise.all([
      supabaseAdminRequest(`/rest/v1/biz_companies?id=eq.${encodeURIComponent(companyId)}&select=id,company_name&limit=1`),
      supabaseAdminRequest(`/rest/v1/biz_company_balances?company_id=eq.${encodeURIComponent(companyId)}&select=company_id,balance_amount&limit=1`),
      supabaseAdminRequest(`/rest/v1/biz_balance_ledger?company_id=eq.${encodeURIComponent(companyId)}&select=ledger_type,amount,created_at&order=created_at.desc&limit=10000`),
      supabaseAdminRequest(`/rest/v1/biz_withdraw_requests?company_id=eq.${encodeURIComponent(companyId)}&select=amount,status,processed_at,created_at&order=created_at.desc&limit=10000`),
      supabaseAdminRequest(`/rest/v1/biz_balance_ledger?company_id=eq.${encodeURIComponent(companyId)}&ledger_type=eq.purchase_approved&select=id,ledger_type,amount,reason,memo,created_at,purchase_request_id&order=created_at.desc&limit=20`),
      supabaseAdminRequest(`/rest/v1/biz_withdraw_requests?company_id=eq.${encodeURIComponent(companyId)}&select=id,amount,status,memo,admin_memo,processed_at,created_at&order=created_at.desc&limit=20`),
      supabaseAdminRequest(`/rest/v1/biz_balance_ledger?company_id=eq.${encodeURIComponent(companyId)}&ledger_type=in.(manual_credit,manual_debit,admin_deduct,admin_advance,admin_restore,manual_adjust)&select=id,ledger_type,amount,reason,memo,created_at&order=created_at.desc&limit=20`)
    ]);
    const company = companies?.[0];
    if (!company) {
      sendJson(res, 404, { ok: false, message: "업체를 찾을 수 없습니다." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      company: {
        id: company.id,
        company_name: company.company_name || "-",
        current_balance: normalizeNumber(balances?.[0]?.balance_amount, 0),
        ...buildSettlementCompanyDetailSummary(companyLedgers || [], companyWithdraws || [])
      },
      recentApproved: approved || [],
      recentWithdraws: withdraws || [],
      recentAdjustments: adjustments || []
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "정산 상세를 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizCompanies(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [companies, balances, users] = await Promise.all([
      supabaseAdminRequest(
        "/rest/v1/biz_companies?select=id,company_name,manager_name,phone,kakao_id,default_rate,status,created_at,updated_at&order=created_at.desc&limit=10000"
      ),
      supabaseAdminRequest("/rest/v1/biz_company_balances?select=company_id,balance_amount"),
      supabaseAdminRequest("/rest/v1/biz_users?select=id,company_id,login_id,name,role,status,created_at&order=created_at.asc&limit=10000")
    ]);
    const balanceMap = new Map((balances || []).map((row) => [row.company_id, normalizeNumber(row.balance_amount, 0)]));
    const usersByCompany = groupRowsByKey(users || [], "company_id");

    const items = (companies || []).map((company) => {
      const companyUsers = usersByCompany.get(company.id) || [];
      const owner =
        companyUsers.find((user) => user.role === "company_owner") ||
        companyUsers.find((user) => user.role === "company_user") ||
        companyUsers[0] ||
        null;
      return {
        ...company,
        current_balance: balanceMap.get(company.id) || 0,
        user_count: companyUsers.length,
        owner_login_id: owner?.login_id || "",
        owner_name: owner?.name || ""
      };
    });

    sendJson(res, 200, { ok: true, items });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "\uC5C5\uCCB4 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizCompanyDetail(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [companies, balances, users, ledgers] = await Promise.all([
      supabaseAdminRequest(
        `/rest/v1/biz_companies?id=eq.${encodeURIComponent(companyId)}&select=id,company_name,manager_name,phone,kakao_id,default_rate,status,created_at,updated_at&limit=1`
      ),
      supabaseAdminRequest(
        `/rest/v1/biz_company_balances?company_id=eq.${encodeURIComponent(companyId)}&select=company_id,balance_amount&limit=1`
      ),
      supabaseAdminRequest(
        `/rest/v1/biz_users?company_id=eq.${encodeURIComponent(companyId)}&select=id,login_id,name,phone,role,status,created_at&order=created_at.asc&limit=100`
      ),
      supabaseAdminRequest(
        `/rest/v1/biz_balance_ledger?company_id=eq.${encodeURIComponent(companyId)}&select=id,ledger_type,amount,reason,memo,created_at&order=created_at.desc&limit=20`
      )
    ]);
    const company = companies?.[0];
    if (!company) {
      sendJson(res, 404, { ok: false, message: "\uC5C5\uCCB4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      company: {
        ...company,
        current_balance: normalizeNumber(balances?.[0]?.balance_amount, 0)
      },
      users: users || [],
      recentLedger: ledgers || []
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "\uC5C5\uCCB4 \uC0C1\uC138\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizCompanyUpdate(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeSeumBizCompanyPayload(body);
    const rows = await supabaseAdminRequest(
      `/rest/v1/biz_companies?id=eq.${encodeURIComponent(companyId)}&select=id,company_name,manager_name,phone,kakao_id,default_rate,status,created_at,updated_at`,
      {
        method: "PATCH",
        headers: {
          prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!rows?.[0]) {
      sendJson(res, 404, { ok: false, message: "\uC5C5\uCCB4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      return;
    }

    if (payload.status) {
      await supabaseAdminRequest(`/rest/v1/biz_users?company_id=eq.${encodeURIComponent(companyId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: payload.status
        })
      });
    }

    sendJson(res, 200, { ok: true, company: rows[0] });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || "\uC5C5\uCCB4 \uC815\uBCF4 \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizCompanyManualAdjustment(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeSeumBizManualAdjustmentPayload(body);
    const result = await supabaseUserRequest("/rest/v1/rpc/create_manual_ledger_adjustment", context.accessToken, {
      method: "POST",
      body: JSON.stringify({
        p_company_id: companyId,
        p_adjustment_type: payload.adjustment_type,
        p_amount: payload.amount,
        p_reason: payload.reason,
        p_admin_memo: payload.admin_memo
      })
    });

    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || "\uC218\uB3D9 \uC794\uC561 \uC870\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

async function loadSeumBizCompanyForRates(companyId) {
  const companies = await supabaseAdminRequest(
    `/rest/v1/biz_companies?id=eq.${encodeURIComponent(companyId)}&select=id,company_name&limit=1`
  );
  return companies?.[0] || null;
}

async function loadSeumBizGiftcardTypesForRates() {
  return supabaseAdminRequest(
    "/rest/v1/biz_giftcard_types?select=id,code,name,default_rate,is_visible,is_active,sort_order&order=sort_order.asc,created_at.asc"
  );
}

async function loadSeumBizCompanyGiftcardRateOverrides(companyId) {
  return supabaseAdminRequest(
    `/rest/v1/biz_company_giftcard_rates?company_id=eq.${encodeURIComponent(
      companyId
    )}&select=id,giftcard_type_id,rate,updated_at`
  );
}

function buildCompanyGiftcardRateRows(giftcards, overrides) {
  const overrideMap = new Map((overrides || []).map((row) => [row.giftcard_type_id, row]));

  return (giftcards || []).map((giftcard) => {
    const override = overrideMap.get(giftcard.id) || null;
    const globalDefaultRate = normalizeNumber(giftcard.default_rate, 0);
    const companyOverrideRate = override ? normalizeNumber(override.rate, NaN) : null;
    const effectiveRate = companyOverrideRate ?? globalDefaultRate;

    return {
      giftcard_type_id: giftcard.id,
      code: giftcard.code,
      name: giftcard.name,
      global_default_rate: globalDefaultRate,
      company_override_rate: companyOverrideRate,
      effective_rate: effectiveRate,
      is_active: Boolean(giftcard.is_active),
      is_visible: Boolean(giftcard.is_visible),
      sort_order: normalizeInteger(giftcard.sort_order, 0),
      override_id: override?.id || null,
      override_updated_at: override?.updated_at || null
    };
  });
}

function normalizeCompanyGiftcardRateValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const rate = normalizeNumber(value, NaN);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
    throw new Error("\uC5C5\uCCB4 \uC694\uC728\uC740 0 \uCD08\uACFC 100 \uC774\uD558\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
  }

  return rate;
}

function normalizeCompanyGiftcardRateSaveItems(body, giftcardById, giftcardByCode) {
  const rawItems = body?.items;
  if (!Array.isArray(rawItems)) {
    throw new Error("items \uBC30\uC5F4\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  }

  const seen = new Set();
  const parsed = [];

  for (let index = 0; index < rawItems.length; index += 1) {
    const item = rawItems[index] || {};
    const giftcardTypeId = String(item.giftcard_type_id || "").trim();
    const code = String(item.code || "").trim().toUpperCase();
    let giftcard = giftcardTypeId ? giftcardById.get(giftcardTypeId) : null;

    if (!giftcard && code) {
      giftcard = giftcardByCode.get(code);
    }

    if (!giftcard) {
      throw new Error(`items[${index}] \uC0C1\uD488\uAD8C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
    }

    if (seen.has(giftcard.id)) {
      throw new Error(`items[${index}] \uC0C1\uD488\uAD8C\uC774 \uC911\uBCF5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`);
    }

    seen.add(giftcard.id);
    parsed.push({
      giftcard_type_id: giftcard.id,
      rate: normalizeCompanyGiftcardRateValue(item.rate)
    });
  }

  return parsed;
}

async function handleSeumBizCompanyGiftcardRatesGet(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [company, giftcards, overrides] = await Promise.all([
      loadSeumBizCompanyForRates(companyId),
      loadSeumBizGiftcardTypesForRates(),
      loadSeumBizCompanyGiftcardRateOverrides(companyId)
    ]);

    if (!company) {
      sendJson(res, 404, { ok: false, message: "\uC5C5\uCCB4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      company_id: company.id,
      company_name: company.company_name,
      items: buildCompanyGiftcardRateRows(giftcards, overrides)
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "\uC5C5\uCCB4 \uC0C1\uD488\uAD8C \uC694\uC728\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizCompanyGiftcardRatesPut(req, res, companyId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const company = await loadSeumBizCompanyForRates(companyId);
    if (!company) {
      sendJson(res, 404, { ok: false, message: "\uC5C5\uCCB4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      return;
    }

    const [giftcards, body] = await Promise.all([loadSeumBizGiftcardTypesForRates(), readJson(req)]);
    const giftcardById = new Map((giftcards || []).map((row) => [row.id, row]));
    const giftcardByCode = new Map((giftcards || []).map((row) => [row.code, row]));
    const items = normalizeCompanyGiftcardRateSaveItems(body, giftcardById, giftcardByCode);

    for (const item of items) {
      if (item.rate === null) {
        await supabaseAdminRequest(
          `/rest/v1/biz_company_giftcard_rates?company_id=eq.${encodeURIComponent(
            companyId
          )}&giftcard_type_id=eq.${encodeURIComponent(item.giftcard_type_id)}`,
          {
            method: "DELETE"
          }
        );
        continue;
      }

      await supabaseAdminRequest("/rest/v1/biz_company_giftcard_rates?on_conflict=company_id,giftcard_type_id", {
        method: "POST",
        headers: {
          prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
          company_id: companyId,
          giftcard_type_id: item.giftcard_type_id,
          rate: item.rate
        })
      });
    }

    const overrides = await loadSeumBizCompanyGiftcardRateOverrides(companyId);
    sendJson(res, 200, {
      ok: true,
      company_id: company.id,
      company_name: company.company_name,
      items: buildCompanyGiftcardRateRows(giftcards, overrides)
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || "\uC5C5\uCCB4 \uC0C1\uD488\uAD8C \uC694\uC728 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
      detail: String(error.message || error)
    });
  }
}

function normalizeSeumBizCompanyPayload(body) {
  const companyName = String(body.company_name || "").trim();
  const managerName = String(body.manager_name || "").trim();
  const phone = String(body.phone || "").trim();
  const kakaoId = String(body.kakao_id || "").trim();
  const status = String(body.status || "").trim();
  const statusValues = new Set(["pending", "approved", "rejected", "suspended"]);

  if (!companyName) {
    throw new Error("\uC5C5\uCCB4\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
  }
  if (!statusValues.has(status)) {
    throw new Error("\uC5C5\uCCB4 \uC0C1\uD0DC\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
  }
  return {
    company_name: companyName,
    manager_name: managerName || null,
    phone: phone || null,
    kakao_id: kakaoId || null,
    status
  };
}

function normalizeSeumBizManualAdjustmentPayload(body) {
  const adjustmentType = String(body.adjustment_type || "").trim();
  const amount = normalizeNumber(body.amount, NaN);
  const reason = String(body.reason || "").trim();
  const adminMemo = String(body.admin_memo || "").trim();

  if (adjustmentType !== "credit" && adjustmentType !== "debit") {
    throw new Error("\uC870\uC815 \uAD6C\uBD84\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("\uC870\uC815 \uAE08\uC561\uC740 0\uC6D0\uBCF4\uB2E4 \uCEE4\uC57C \uD569\uB2C8\uB2E4.");
  }
  if (!reason) {
    throw new Error("\uC218\uB3D9 \uC870\uC815 \uC0AC\uC720\uB294 \uD544\uC218\uC785\uB2C8\uB2E4.");
  }

  return {
    adjustment_type: adjustmentType,
    amount,
    reason,
    admin_memo: adminMemo || null
  };
}

function groupRowsByKey(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    const value = row?.[key];
    if (!value) continue;
    const list = map.get(value) || [];
    list.push(row);
    map.set(value, list);
  }
  return map;
}

function buildSettlementLedgerSummary(rows = [], period = null) {
  const byCompany = new Map();

  for (const row of rows || []) {
    const companyId = row.company_id;
    if (!companyId) continue;
    const summary = byCompany.get(companyId) || {
      totalApproved: 0,
      totalWithdrawCompleted: 0,
      recentApprovedAt: null,
      recentWithdrawAt: null
    };
    const amount = normalizeNumber(row.amount, 0);
    const createdAt = row.created_at || null;

    const inPeriod = isWithinSettlementPeriod(createdAt, period);

    if (row.ledger_type === "purchase_approved" && inPeriod) {
      summary.totalApproved += amount;
      if (!summary.recentApprovedAt || new Date(createdAt) > new Date(summary.recentApprovedAt)) {
        summary.recentApprovedAt = createdAt;
      }
    }
    if (row.ledger_type === "withdraw_completed" && inPeriod) {
      summary.totalWithdrawCompleted += amount;
      if (!summary.recentWithdrawAt || new Date(createdAt) > new Date(summary.recentWithdrawAt)) {
        summary.recentWithdrawAt = createdAt;
      }
    }

    byCompany.set(companyId, summary);
  }

  return { byCompany };
}

function buildSettlementWithdrawSummary(rows = [], period = null) {
  const byCompany = new Map();
  let pendingAmount = 0;

  for (const row of rows || []) {
    const companyId = row.company_id;
    if (!companyId) continue;
    const summary = byCompany.get(companyId) || {
      pendingAmount: 0,
      recentWithdrawAt: null
    };
    const amount = normalizeNumber(row.amount, 0);

    const requestDate = row.created_at || row.processed_at || null;
    const inPeriod = isWithinSettlementPeriod(requestDate, period);

    if (row.status === "pending" && inPeriod) {
      summary.pendingAmount += amount;
      pendingAmount += amount;
    }
    if (row.status === "completed" && inPeriod) {
      const dateValue = row.processed_at || row.created_at || null;
      if (dateValue && (!summary.recentWithdrawAt || new Date(dateValue) > new Date(summary.recentWithdrawAt))) {
        summary.recentWithdrawAt = dateValue;
      }
    }

    byCompany.set(companyId, summary);
  }

  return { byCompany, pendingAmount };
}

function buildSettlementPurchaseMetrics(rows = [], period = null) {
  return (rows || []).reduce(
    (summary, row) => {
      const approvedAt = row.approved_at || row.reviewed_at || null;
      const createdInPeriod = isWithinSettlementPeriod(row.created_at, period);
      const approvedInPeriod = isWithinSettlementPeriod(approvedAt, period);
      if (createdInPeriod || approvedInPeriod) {
        summary.faceValueAmount += normalizeNumber(row.total_face_value, 0);
      }
      if (row.status === "approved" && approvedInPeriod) {
        summary.actualPurchaseAmount += normalizeNumber(
          row.approved_settlement_amount ?? row.expected_settlement_amount,
          0
        );
      }
      return summary;
    },
    { faceValueAmount: 0, actualPurchaseAmount: 0 }
  );
}

function sumSettlementWithdrawCompletedAmount(rows = [], period = null) {
  return Math.abs(
    (rows || []).reduce((sum, row) => {
      if (row.ledger_type !== "withdraw_completed") return sum;
      if (!isWithinSettlementPeriod(row.created_at, period)) return sum;
      return sum + normalizeNumber(row.amount, 0);
    }, 0)
  );
}

function buildSettlementCompanyDetailSummary(ledgers = [], withdraws = []) {
  const totalApproved = (ledgers || []).reduce(
    (sum, row) => (row.ledger_type === "purchase_approved" ? sum + normalizeNumber(row.amount, 0) : sum),
    0
  );
  const totalWithdrawCompleted = Math.abs(
    (ledgers || []).reduce(
      (sum, row) => (row.ledger_type === "withdraw_completed" ? sum + normalizeNumber(row.amount, 0) : sum),
      0
    )
  );
  const pendingWithdrawAmount = (withdraws || []).reduce(
    (sum, row) => (row.status === "pending" ? sum + normalizeNumber(row.amount, 0) : sum),
    0
  );
  return {
    total_purchase_approved: totalApproved,
    total_withdraw_completed: totalWithdrawCompleted,
    pending_withdraw_amount: pendingWithdrawAmount
  };
}

function getSettlementPeriod(req) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const start = parseSettlementDate(url.searchParams.get("start"));
  const end = parseSettlementDate(url.searchParams.get("end"), true);
  if (!start && !end) return null;
  return { start, end };
}

function getTodaySettlementPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function parseSettlementDate(value, endOfDay = false) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinSettlementPeriod(value, period) {
  if (!period) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (period.start && date < period.start) return false;
  if (period.end && date > period.end) return false;
  return true;
}

async function handleSeumBizGiftcardTypes(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [giftcards, purchaseRows] = await Promise.all([
      supabaseAdminRequest(
        "/rest/v1/biz_giftcard_types?select=id,code,name,logo_url,default_rate,enabled_amounts,is_visible,is_active,sort_order,admin_memo,created_at,updated_at&order=sort_order.asc,created_at.asc"
      ),
      supabaseAdminRequest(
        "/rest/v1/biz_purchase_requests?select=giftcard_code,status&giftcard_code=not.is.null&limit=10000"
      )
    ]);
    const countMap = buildGiftcardPurchaseCountMap(purchaseRows || []);

    sendJson(res, 200, {
      ok: true,
      items: (giftcards || []).map((row) => ({
        ...row,
        pending_purchase_count: countMap.get(row.code)?.pending || 0,
        total_purchase_count: countMap.get(row.code)?.total || 0
      }))
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "상품권 목록을 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizGiftcardTypeCreate(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeGiftcardTypePayload(body);
    const rows = await supabaseAdminRequest("/rest/v1/biz_giftcard_types?select=*", {
      method: "POST",
      headers: {
        prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    sendJson(res, 200, { ok: true, item: rows?.[0] || null });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message || "상품권 등록에 실패했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizGiftcardTypeUpdate(req, res, giftcardTypeId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const payload = normalizeGiftcardTypePayload(body);
    const rows = await supabaseAdminRequest(
      `/rest/v1/biz_giftcard_types?id=eq.${encodeURIComponent(giftcardTypeId)}&select=*`,
      {
        method: "PATCH",
        headers: {
          prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!rows?.[0]) {
      sendJson(res, 404, { ok: false, message: "상품권을 찾을 수 없습니다." });
      return;
    }

    sendJson(res, 200, { ok: true, item: rows[0] });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message || "상품권 수정에 실패했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizGiftcardLogoUpload(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const file = await readMultipartFile(req, "logo");
    const extension = getAllowedImageExtension(file);
    const fileName = `giftcard-logo-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
    const filePath = join(uploadsDir, fileName);

    writeFileSync(filePath, file.data);
    sendJson(res, 200, { ok: true, logo_url: `/uploads/${fileName}` });
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message || "로고 업로드에 실패했습니다.", detail: String(error.message || error) });
  }
}

function buildGiftcardPurchaseCountMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const code = row.giftcard_code;
    if (!code) continue;
    const current = map.get(code) || { pending: 0, total: 0 };
    current.total += 1;
    if (row.status === "pending" || row.status === "reviewing") {
      current.pending += 1;
    }
    map.set(code, current);
  }
  return map;
}

function normalizeGiftcardTypePayload(body) {
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const logoUrl = String(body.logo_url || "").trim();
  const defaultRate = normalizeNumber(body.default_rate, NaN);
  const sortOrder = Number.parseInt(String(body.sort_order ?? "0"), 10);
  const enabledAmounts = normalizeEnabledAmounts(body.enabled_amounts);

  if (!/^[A-Z0-9_]+$/.test(code)) {
    throw new Error("상품권 코드는 대문자, 숫자, 언더스코어만 사용할 수 있습니다.");
  }
  if (!name) {
    throw new Error("상품권명을 입력해주세요.");
  }
  if (!logoUrl) {
    throw new Error("로고 URL을 입력해주세요.");
  }
  if (!Number.isFinite(defaultRate) || defaultRate <= 0 || defaultRate > 100) {
    throw new Error("기본 요율은 0 초과 100 이하로 입력해주세요.");
  }

  return {
    code,
    name,
    logo_url: logoUrl,
    default_rate: defaultRate,
    enabled_amounts: enabledAmounts,
    is_visible: Boolean(body.is_visible),
    is_active: Boolean(body.is_active),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    admin_memo: body.admin_memo ? String(body.admin_memo) : null
  };
}

function normalizeEnabledAmounts(value) {
  let list = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      list = JSON.parse(trimmed);
    } catch {
      list = trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(list)) {
    throw new Error("?? ?? ???? JSON ?? ?? ?? ????? ???.");
  }
  const amounts = list.map((amount) => normalizeNumber(amount, NaN));
  if (!amounts.length || amounts.some((amount) => !Number.isFinite(amount) || amount <= 0)) {
    throw new Error("?? ?? ???? 0?? ? ?? ????? ???.");
  }
  return amounts;
}

async function handleSeumBizPurchaseRequests(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const pagination = getPagination(req);
    const range = getPaginationRange(pagination);
    const response = await supabaseAdminRequest(
      "/rest/v1/biz_purchase_requests?select=id,company_id,receipt_no,giftcard_type,giftcard_code,giftcard_name_snapshot,giftcard_logo_url_snapshot,giftcard_rate_snapshot,item_count,total_face_value,applied_rate,expected_settlement_amount,approved_settlement_amount,status,created_at,admin_memo&order=created_at.desc",
      {
        returnMeta: true,
        headers: {
          range,
          prefer: "count=exact"
        }
      }
    );
    const rows = response.data || [];
    const total = getTotalFromContentRange(response.contentRange, rows.length);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const requestIds = rows.map((row) => row.id).filter(Boolean);
    const [companyMap, giftcardMap, purchaseItems] = await Promise.all([
      loadSeumBizCompanyMap(rows?.map((row) => row.company_id)),
      loadSeumBizGiftcardTypeLookup(rows),
      requestIds.length
        ? supabaseAdminRequest(
            `/rest/v1/biz_purchase_items?purchase_request_id=in.(${requestIds.map((id) => encodeURIComponent(id)).join(",")})&select=purchase_request_id,face_value&limit=10000`
          )
        : Promise.resolve([])
    ]);
    const amountPendingMap = (purchaseItems || []).reduce((map, item) => {
      if (item.face_value === null || item.face_value === undefined || Number(item.face_value) <= 0) {
        map.set(item.purchase_request_id, true);
      }
      return map;
    }, new Map());
    const items = (rows || []).map((row) => ({
      ...row,
      ...getCurrentGiftcardSnapshotFallback(row, giftcardMap),
      company_name: companyMap.get(row.company_id)?.company_name || "-",
      has_unconfirmed_amount: Boolean(amountPendingMap.get(row.id))
    }));

    sendJson(res, 200, {
      ok: true,
      items,
      requests: items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "매입신청 목록을 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizPurchaseRequestDetail(req, res, purchaseRequestId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [requests, items] = await Promise.all([
      supabaseAdminRequest(
        `/rest/v1/biz_purchase_requests?id=eq.${encodeURIComponent(purchaseRequestId)}&select=id,company_id,receipt_no,giftcard_type,giftcard_code,giftcard_name_snapshot,giftcard_logo_url_snapshot,giftcard_rate_snapshot,item_count,total_face_value,applied_rate,expected_settlement_amount,approved_settlement_amount,status,created_at,admin_memo&limit=1`
      ),
      supabaseAdminRequest(
        `/rest/v1/biz_purchase_items?purchase_request_id=eq.${encodeURIComponent(purchaseRequestId)}&select=id,pin_no,face_value,status,admin_memo,created_at&order=created_at.asc&limit=1000`
      )
    ]);
    const request = requests?.[0];

    if (!request) {
      sendJson(res, 404, { ok: false, message: "매입신청을 찾을 수 없습니다." });
      return;
    }

    const [companyMap, giftcardMap] = await Promise.all([
      loadSeumBizCompanyMap([request.company_id]),
      loadSeumBizGiftcardTypeLookup([request])
    ]);
    sendJson(res, 200, {
      ok: true,
      request: {
        ...request,
        ...getCurrentGiftcardSnapshotFallback(request, giftcardMap),
        company_name: companyMap.get(request.company_id)?.company_name || "-"
      },
      items: items || []
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "매입신청 상세를 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizPurchaseRequestApprove(req, res, purchaseRequestId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const approvedAmount =
      body.approved_settlement_amount === "" ||
      body.approved_settlement_amount === undefined ||
      body.approved_settlement_amount === null
        ? null
        : normalizeNumber(body.approved_settlement_amount, NaN);

    if (approvedAmount !== null && (!Number.isFinite(approvedAmount) || approvedAmount <= 0)) {
      sendJson(res, 400, { ok: false, message: "확정 정산금은 0보다 커야 합니다." });
      return;
    }

    const itemFaceValues = Array.isArray(body.item_face_values) ? body.item_face_values : null;
    const adminMemo = body.admin_memo || null;

    console.log("[SEUMBiz Approval Payload]", {
      purchaseRequestId,
      approvedSettlementAmount: approvedAmount,
      itemFaceValues,
      adminMemo
    });

    const result = await supabaseUserRequest("/rest/v1/rpc/approve_purchase_request", context.accessToken, {
      method: "POST",
      body: JSON.stringify({
        p_purchase_request_id: purchaseRequestId,
        p_approved_settlement_amount: approvedAmount,
        p_admin_memo: adminMemo,
        p_item_face_values: itemFaceValues
      })
    });

    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    console.error("[SEUMBiz Approval Error]", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    sendJson(res, 500, { ok: false, message: "매입신청 승인 처리에 실패했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizPurchaseRequestReject(req, res, purchaseRequestId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const adminMemo = String(body.admin_memo || "").trim();

    if (!adminMemo) {
      sendJson(res, 400, { ok: false, message: "반려 사유를 입력해주세요." });
      return;
    }

    const result = await supabaseUserRequest("/rest/v1/rpc/reject_purchase_request", context.accessToken, {
      method: "POST",
      body: JSON.stringify({
        p_purchase_request_id: purchaseRequestId,
        p_admin_memo: adminMemo
      })
    });

    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    console.error("[SEUMBiz Purchase Reject Error]", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    sendJson(res, 500, {
      ok: false,
      message: "매입신청 반려 처리에 실패했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizWithdrawRequests(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const pagination = getPagination(req);
    const range = getPaginationRange(pagination);
    const response = await supabaseAdminRequest(
      "/rest/v1/biz_withdraw_requests?select=id,company_id,amount,status,memo,admin_memo,processed_at,created_at&order=created_at.desc",
      {
        returnMeta: true,
        headers: {
          range,
          prefer: "count=exact"
        }
      }
    );
    const rows = response.data || [];
    const total = getTotalFromContentRange(response.contentRange, rows.length);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const companyMap = await loadSeumBizCompanyMap(rows?.map((row) => row.company_id));
    const items = (rows || []).map((row) => ({
      ...row,
      company_name: companyMap.get(row.company_id)?.company_name || "-"
    }));

    sendJson(res, 200, {
      ok: true,
      items,
      requests: items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "출금신청 목록을 불러오지 못했습니다.", detail: String(error.message || error) });
  }
}

async function handleSeumBizWithdrawRequestComplete(req, res, withdrawRequestId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const body = await readJson(req);
    const result = await supabaseUserRequest("/rest/v1/rpc/complete_withdraw_request", context.accessToken, {
      method: "POST",
      body: JSON.stringify({
        p_withdraw_request_id: withdrawRequestId,
        p_admin_memo: body.admin_memo || null
      })
    });

    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "출금 완료 처리에 실패했습니다.", detail: String(error.message || error) });
  }
}

const ADMIN_LOG_ACTIONS = new Set([
  "purchase_approved",
  "purchase_rejected",
  "withdraw_completed",
  "withdraw_rejected",
  "manual_credit",
  "manual_debit"
]);

const ADMIN_LOG_ACTION_LABELS = {
  purchase_approved: "매입 승인",
  purchase_rejected: "매입 반려",
  withdraw_completed: "출금 완료",
  withdraw_rejected: "출금 반려",
  manual_credit: "머니 지급",
  manual_debit: "머니 회수"
};

const ADMIN_LOG_ACTION_FILTER =
  "action=in.(purchase_approved,purchase_rejected,withdraw_completed,withdraw_rejected,manual_credit,manual_debit)";

const ADMIN_LOG_SELECT =
  "id,company_id,admin_user_id,target_table,target_id,action,before_data,after_data,memo,created_at,biz_users!biz_admin_logs_admin_user_id_fkey(name,login_id),biz_companies(company_name)";

const ADMIN_LOG_STATUS_LABELS = {
  pending: "접수대기",
  reviewing: "검수중",
  approved: "승인완료",
  rejected: "반려",
  canceled: "취소",
  completed: "완료"
};

function parseAdminLogFilters(req) {
  const url = new URL(req.url, "http://localhost");
  const action = String(url.searchParams.get("action") || "").trim();
  return {
    from: String(url.searchParams.get("from") || "").trim(),
    to: String(url.searchParams.get("to") || "").trim(),
    action: ADMIN_LOG_ACTIONS.has(action) ? action : "",
    company: String(url.searchParams.get("company") || url.searchParams.get("companyId") || "").trim(),
    admin: String(url.searchParams.get("admin") || url.searchParams.get("adminUserId") || "").trim(),
    q: String(url.searchParams.get("q") || "").trim()
  };
}

function isValidAdminLogDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function toAdminLogRangeStart(dateValue) {
  return `${dateValue}T00:00:00+09:00`;
}

function toAdminLogRangeEnd(dateValue) {
  return `${dateValue}T23:59:59.999+09:00`;
}

function escapePostgrestIlikePattern(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/[%_*]/g, (match) => `\\${match}`);
}

function formatAdminLogStatus(value) {
  return ADMIN_LOG_STATUS_LABELS[value] || value || "-";
}

function extractAdminLogAmount(row) {
  const after = row.after_data && typeof row.after_data === "object" ? row.after_data : {};
  const before = row.before_data && typeof row.before_data === "object" ? row.before_data : {};

  if (row.action === "purchase_approved") {
    const amount = after.approved_settlement_amount;
    return amount === null || amount === undefined ? null : Number(amount);
  }

  if (row.action === "purchase_rejected") {
    const amount = after.expected_settlement_amount ?? before.expected_settlement_amount;
    return amount === null || amount === undefined ? null : Number(amount);
  }

  if (row.action === "withdraw_completed" || row.action === "withdraw_rejected") {
    const amount = after.amount ?? before.amount;
    return amount === null || amount === undefined ? null : Number(amount);
  }

  if (row.action === "manual_credit" || row.action === "manual_debit") {
    const signedAmount = Number(after.amount || 0);
    return signedAmount ? Math.abs(signedAmount) : null;
  }

  return null;
}

function buildAdminLogDisplayFields(row, enrich = {}) {
  const after = row.after_data && typeof row.after_data === "object" ? row.after_data : {};
  const receiptNo = enrich.receipt_no || "";
  const amount = extractAdminLogAmount(row);

  return {
    receipt_no: receiptNo,
    amount,
    amount_display: amount === null || amount === undefined || Number.isNaN(amount) ? "-" : formatKoreanWon(amount)
  };
}

function buildAdminLogSummary(row, enrich = {}) {
  const label = ADMIN_LOG_ACTION_LABELS[row.action] || row.action || "-";
  const display = buildAdminLogDisplayFields(row, enrich);
  const lines = [label];
  if (display.receipt_no) lines.push(display.receipt_no);
  if (display.amount_display !== "-") lines.push(display.amount_display);
  if (row.action === "manual_credit" || row.action === "manual_debit") {
    const reason = row.after_data?.reason;
    if (reason) lines.push(String(reason));
  }

  return {
    label,
    lines,
    text: lines.join("\n")
  };
}

function buildAdminLogChangeView(row, enrich = {}) {
  const before = row.before_data && typeof row.before_data === "object" ? row.before_data : {};
  const after = row.after_data && typeof row.after_data === "object" ? row.after_data : {};
  const beforeLines = [];
  const afterLines = [];

  if (row.action === "purchase_approved") {
    if (before.status) beforeLines.push({ label: "상태", value: formatAdminLogStatus(before.status) });
    if (after.expected_settlement_amount !== null && after.expected_settlement_amount !== undefined) {
      beforeLines.push({ label: "예상 정산금", value: formatKoreanWon(after.expected_settlement_amount) });
    }
    if (enrich.receipt_no) beforeLines.unshift({ label: "접수번호", value: enrich.receipt_no });

    if (after.status) afterLines.push({ label: "상태", value: formatAdminLogStatus(after.status) });
    if (after.expected_settlement_amount !== null && after.expected_settlement_amount !== undefined) {
      afterLines.push({ label: "예상 정산금", value: formatKoreanWon(after.expected_settlement_amount) });
    }
    if (after.approved_settlement_amount !== null && after.approved_settlement_amount !== undefined) {
      afterLines.push({ label: "승인 정산금", value: formatKoreanWon(after.approved_settlement_amount) });
    }
    if (after.ledger_id) afterLines.push({ label: "Ledger", value: "생성" });
  } else if (row.action === "purchase_rejected") {
    if (before.status) beforeLines.push({ label: "상태", value: formatAdminLogStatus(before.status) });
    if (before.expected_settlement_amount !== null && before.expected_settlement_amount !== undefined) {
      beforeLines.push({ label: "예상 정산금", value: formatKoreanWon(before.expected_settlement_amount) });
    }
    if (enrich.receipt_no) beforeLines.unshift({ label: "접수번호", value: enrich.receipt_no });

    if (after.status) afterLines.push({ label: "상태", value: formatAdminLogStatus(after.status) });
    if (after.expected_settlement_amount !== null && after.expected_settlement_amount !== undefined) {
      afterLines.push({ label: "예상 정산금", value: formatKoreanWon(after.expected_settlement_amount) });
    }
    afterLines.push({ label: "Ledger", value: "없음" });
  } else if (row.action === "withdraw_completed" || row.action === "withdraw_rejected") {
    if (before.status) beforeLines.push({ label: "상태", value: formatAdminLogStatus(before.status) });
    if (before.amount !== null && before.amount !== undefined) {
      beforeLines.push({ label: "출금 금액", value: formatKoreanWon(before.amount) });
    }
    if (before.balance_before !== null && before.balance_before !== undefined) {
      beforeLines.push({ label: "처리 전 잔액", value: formatKoreanWon(before.balance_before) });
    }

    if (after.status) afterLines.push({ label: "상태", value: formatAdminLogStatus(after.status) });
    if (after.amount !== null && after.amount !== undefined) {
      afterLines.push({ label: "출금 금액", value: formatKoreanWon(after.amount) });
    }
    if (after.balance_after !== null && after.balance_after !== undefined) {
      afterLines.push({ label: "처리 후 잔액", value: formatKoreanWon(after.balance_after) });
    }
    if (after.ledger_id) afterLines.push({ label: "Ledger", value: "생성" });
  } else if (row.action === "manual_credit" || row.action === "manual_debit") {
    if (before.current_balance_before !== null && before.current_balance_before !== undefined) {
      beforeLines.push({ label: "조정 전 잔액", value: formatKoreanWon(before.current_balance_before) });
    }

    const signedAmount = Number(after.amount || 0);
    const absoluteAmount = Math.abs(signedAmount);
    if (absoluteAmount > 0) {
      afterLines.push({
        label: row.action === "manual_credit" ? "지급 금액" : "회수 금액",
        value: formatKoreanWon(absoluteAmount)
      });
    }
    if (after.current_balance_after !== null && after.current_balance_after !== undefined) {
      afterLines.push({ label: "조정 후 잔액", value: formatKoreanWon(after.current_balance_after) });
    }
    if (after.reason) afterLines.push({ label: "사유", value: String(after.reason) });
    if (after.ledger_id) afterLines.push({ label: "Ledger", value: "생성" });
  }

  return {
    before_title: "이전 상태",
    after_title: "변경 후 상태",
    before_lines: beforeLines,
    after_lines: afterLines
  };
}

async function buildAdminLogSearchFilter(query) {
  const pattern = escapePostgrestIlikePattern(query);
  const purchases = await supabaseAdminRequest(
    `/rest/v1/biz_purchase_requests?receipt_no=ilike.*${encodeURIComponent(pattern)}*&select=id&limit=200`
  );
  const purchaseIds = [...new Set((purchases || []).map((row) => row.id).filter(Boolean))];

  if (purchaseIds.length) {
    const purchaseClause = `and(target_table.eq.biz_purchase_requests,target_id.in.(${purchaseIds
      .map((id) => encodeURIComponent(id))
      .join(",")}))`;
    return `or=(memo.ilike.*${encodeURIComponent(pattern)}*,${purchaseClause})`;
  }

  return `memo=ilike.*${encodeURIComponent(pattern)}*`;
}

async function buildAdminLogListQuery(filters) {
  const parts = [ADMIN_LOG_ACTION_FILTER, "order=created_at.desc"];

  if (isValidAdminLogDate(filters.from)) {
    parts.push(`created_at=gte.${encodeURIComponent(toAdminLogRangeStart(filters.from))}`);
  }
  if (isValidAdminLogDate(filters.to)) {
    parts.push(`created_at=lte.${encodeURIComponent(toAdminLogRangeEnd(filters.to))}`);
  }
  if (filters.action) {
    parts.push(`action=eq.${encodeURIComponent(filters.action)}`);
  }
  if (filters.company) {
    parts.push(`company_id=eq.${encodeURIComponent(filters.company)}`);
  }
  if (filters.admin) {
    parts.push(`admin_user_id=eq.${encodeURIComponent(filters.admin)}`);
  }
  if (filters.q) {
    parts.push(await buildAdminLogSearchFilter(filters.q));
  }

  return parts.join("&");
}

async function loadAdminLogPurchaseReceiptMap(rows = []) {
  const purchaseIds = [
    ...new Set(
      (rows || [])
        .filter((row) => row?.target_table === "biz_purchase_requests" && row?.target_id)
        .map((row) => row.target_id)
    )
  ];
  const map = new Map();
  if (!purchaseIds.length) return map;

  const purchases = await supabaseAdminRequest(
    `/rest/v1/biz_purchase_requests?id=in.(${purchaseIds.map((id) => encodeURIComponent(id)).join(",")})&select=id,receipt_no`
  );

  for (const purchase of purchases || []) {
    map.set(purchase.id, purchase.receipt_no || "");
  }

  return map;
}

async function enrichAdminLogRows(rows = [], options = {}) {
  const receiptMap = await loadAdminLogPurchaseReceiptMap(rows);
  const includeChangeView = Boolean(options.includeChangeView);

  return (rows || []).map((row) => {
    const adminUser = row.biz_users || {};
    const company = row.biz_companies || {};
    const enrich = {
      receipt_no: receiptMap.get(row.target_id) || ""
    };
    const summary = buildAdminLogSummary(row, enrich);
    const display = buildAdminLogDisplayFields(row, enrich);

    return {
      id: row.id,
      created_at: row.created_at,
      action: row.action,
      action_label: summary.label,
      admin_user_id: row.admin_user_id,
      admin_name: adminUser.name || "-",
      admin_login_id: adminUser.login_id || "",
      company_id: row.company_id,
      company_name: company.company_name || "-",
      target_table: row.target_table,
      target_id: row.target_id,
      memo: row.memo || "",
      receipt_no: display.receipt_no || "",
      amount: display.amount,
      amount_display: display.amount_display,
      summary: summary.text,
      summary_lines: summary.lines,
      change_view: includeChangeView ? buildAdminLogChangeView(row, enrich) : undefined,
      before_data: row.before_data ?? null,
      after_data: row.after_data ?? null
    };
  });
}

async function handleSeumBizAdminLogFilterOptions(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const [companies, admins] = await Promise.all([
      supabaseAdminRequest("/rest/v1/biz_companies?select=id,company_name&order=company_name.asc&limit=10000"),
      supabaseAdminRequest(
        "/rest/v1/biz_users?role=eq.admin&status=eq.approved&select=id,name,login_id&order=name.asc&limit=1000"
      )
    ]);

    sendJson(res, 200, {
      ok: true,
      companies: (companies || []).map((row) => ({
        id: row.id,
        company_name: row.company_name || "-"
      })),
      admins: (admins || []).map((row) => ({
        id: row.id,
        name: row.name || "-",
        login_id: row.login_id || ""
      }))
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "관리자 로그 필터 옵션을 불러오지 못했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizAdminLogs(req, res) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const pagination = getPagination(req);
    const filters = parseAdminLogFilters(req);
    const range = getPaginationRange(pagination);
    const query = await buildAdminLogListQuery(filters);
    const response = await supabaseAdminRequest(`/rest/v1/biz_admin_logs?select=${ADMIN_LOG_SELECT}&${query}`, {
      returnMeta: true,
      headers: {
        range,
        prefer: "count=exact"
      }
    });
    const rows = response.data || [];
    const total = getTotalFromContentRange(response.contentRange, rows.length);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const enriched = await enrichAdminLogRows(rows);
    const items = enriched.map(({ before_data, after_data, change_view, summary, summary_lines, ...item }) => item);

    sendJson(res, 200, {
      ok: true,
      items,
      logs: items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      filters
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "관리자 로그 목록을 불러오지 못했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function handleSeumBizAdminLogDetail(req, res, logId) {
  const context = await requireSeumBizAdmin(req, res);
  if (!context) return;

  try {
    const rows = await supabaseAdminRequest(
      `/rest/v1/biz_admin_logs?id=eq.${encodeURIComponent(logId)}&select=${ADMIN_LOG_SELECT}&limit=1`
    );
    const row = rows?.[0];

    if (!row || !ADMIN_LOG_ACTIONS.has(row.action)) {
      sendJson(res, 404, { ok: false, message: "관리자 로그를 찾을 수 없습니다." });
      return;
    }

    const [log] = await enrichAdminLogRows([row], { includeChangeView: true });
    sendJson(res, 200, { ok: true, log });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: "관리자 로그 상세를 불러오지 못했습니다.",
      detail: String(error.message || error)
    });
  }
}

async function loadSeumBizCompanyMap(companyIds = []) {
  const ids = [...new Set((companyIds || []).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const rows = await supabaseAdminRequest(
    `/rest/v1/biz_companies?id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})&select=id,company_name,manager_name,phone,kakao_id,default_rate,status`
  );

  for (const row of rows || []) {
    map.set(row.id, row);
  }

  return map;
}

async function loadSeumBizGiftcardTypeLookup(rows = []) {
  const codes = [...new Set((rows || []).map((row) => row?.giftcard_code).filter(Boolean).map((code) => String(code).trim()))];
  const needsLegacyNameLookup = (rows || []).some((row) => {
    const snapshotLogo = String(row?.giftcard_logo_url_snapshot || "").trim();
    return !row?.giftcard_code || !snapshotLogo || snapshotLogo.startsWith("/assets/giftcards/");
  });
  const lookup = {
    byCode: new Map(),
    byName: new Map()
  };

  if (!codes.length && !needsLegacyNameLookup) return lookup;

  const endpoint =
    needsLegacyNameLookup || !codes.length
      ? "/rest/v1/biz_giftcard_types?select=code,name,logo_url"
      : `/rest/v1/biz_giftcard_types?code=in.(${codes.map((code) => encodeURIComponent(code)).join(",")})&select=code,name,logo_url`;
  const giftcards = await supabaseAdminRequest(endpoint);

  for (const giftcard of giftcards || []) {
    lookup.byCode.set(giftcard.code, giftcard);
    lookup.byName.set(normalizeSeumBizGiftcardName(giftcard.name), giftcard);
  }

  return lookup;
}

function getCurrentGiftcardSnapshotFallback(row, giftcardLookup) {
  const nameCandidates = [
    row?.giftcard_name_snapshot,
    row?.giftcard_type
  ];
  const giftcard =
    giftcardLookup.byCode.get(row?.giftcard_code) ||
    nameCandidates
      .map((name) => giftcardLookup.byName.get(normalizeSeumBizGiftcardName(name)))
      .find(Boolean);
  return {
    current_giftcard_name: giftcard?.name || "",
    current_giftcard_logo_url: giftcard?.logo_url || ""
  };
}

function normalizeSeumBizGiftcardName(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        reject(new Error("요청 본문이 너무 큽니다."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("JSON 형식이 올바르지 않습니다."));
      }
    });
    req.on("error", reject);
  });
}

function readMultipartPng(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);

    if (!boundaryMatch) {
      reject(new Error("업로드 형식이 올바르지 않습니다."));
      return;
    }

    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error("PNG 파일은 5MB 이하만 업로드할 수 있습니다."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = splitMultipartBody(body, boundary);
        const filePart = parts.find((part) => {
          const header = part.header.toString("utf8");
          return /name="image"/.test(header) && /filename="/.test(header);
        });

        if (!filePart || !filePart.data.length) {
          reject(new Error("PNG 파일을 선택해 주세요."));
          return;
        }

        if (!isPng(filePart.data)) {
          reject(new Error("PNG 파일만 업로드할 수 있습니다."));
          return;
        }

        resolve({ data: filePart.data });
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function readMultipartFile(req, fieldName) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);

    if (!boundaryMatch) {
      reject(new Error("업로드 형식이 올바르지 않습니다."));
      return;
    }

    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 10 * 1024 * 1024) {
        reject(new Error("첨부파일은 10MB 이하만 업로드할 수 있습니다."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = splitMultipartBody(body, boundary);
        const filePart = parts.find((part) => {
          const header = part.header.toString("utf8");
          return new RegExp(`name="${fieldName}"`).test(header) && /filename="/.test(header);
        });

        if (!filePart || !filePart.data.length) {
          reject(new Error("첨부파일을 선택해 주세요."));
          return;
        }

        const header = filePart.header.toString("utf8");
        const nameMatch = header.match(/filename="([^"]*)"/);
        resolve({
          data: filePart.data,
          name: nameMatch?.[1] || "attachment",
          mimeType: getImageMimeType(filePart.data)
        });
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function readMultipartFiles(req, fieldNames, options = {}) {
  const names = new Set(Array.isArray(fieldNames) ? fieldNames : [fieldNames]);
  const maxFiles = options.maxFiles || 10;
  const maxFileSize = options.maxFileSize || 5 * 1024 * 1024;
  const maxTotalSize = options.maxTotalSize || 50 * 1024 * 1024;
  const allowInvalidFiles = Boolean(options.allowInvalidFiles);

  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);

    if (!boundaryMatch) {
      reject(new Error("업로드 형식이 올바르지 않습니다."));
      return;
    }

    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > maxTotalSize) {
        reject(new Error("전체 이미지 용량은 50MB 이하만 업로드할 수 있습니다."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = splitMultipartBody(body, boundary);
        const files = [];

        for (const part of parts) {
          const header = part.header.toString("utf8");
          const nameMatch = header.match(/name="([^"]+)"/);
          const fileNameMatch = header.match(/filename="([^"]*)"/);
          if (!fileNameMatch || !names.has(nameMatch?.[1] || "")) continue;
          if (!part.data.length) continue;

          if (files.length >= maxFiles) {
            throw new Error("이미지는 최대 10장까지 업로드할 수 있습니다.");
          }

          const file = {
            data: part.data,
            name: fileNameMatch?.[1] || "giftcard-image",
            mimeType: getImageMimeType(part.data)
          };

          if (part.data.length > maxFileSize) {
            if (!allowInvalidFiles) {
              throw new Error("이미지 1장당 최대 5MB까지 업로드할 수 있습니다.");
            }
            file.validationError = "이미지 1장당 최대 5MB까지 업로드할 수 있습니다.";
            files.push(file);
            continue;
          }

          try {
            getAllowedImageExtension(file);
          } catch (error) {
            if (!allowInvalidFiles) throw error;
            file.validationError = String(error.message || error);
          }
          files.push(file);
        }

        resolve(files);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function splitMultipartBody(body, boundary) {
  const parts = [];
  let start = body.indexOf(boundary);

  while (start !== -1) {
    start += boundary.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;

    const next = body.indexOf(boundary, start);
    if (next === -1) break;

    const part = body.subarray(start, next - 2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      parts.push({
        header: part.subarray(0, headerEnd),
        data: part.subarray(headerEnd + 4)
      });
    }

    start = next;
  }

  return parts;
}

function sanitizeFileName(value) {
  const fileName = String(value || "attachment")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return fileName || "attachment";
}

function getAllowedImageExtension(file) {
  const extension = extname(sanitizeFileName(file.name || "")).toLowerCase();
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

  if (extension === ".heic" || extension === ".heif") {
    throw new Error("HEIC 이미지는 지원하지 않습니다. JPG 또는 PNG로 변환 후 업로드해주세요.");
  }

  if (!allowedExtensions.has(extension)) {
    throw new Error("지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP 이미지만 업로드해주세요.");
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimeType)) {
    throw new Error("지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP 이미지만 업로드해주세요.");
  }

  return extension;
}

function isPng(buffer) {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer) {
  return (
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  );
}

function isWebp(buffer) {
  return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

function getImageMimeType(buffer) {
  if (isPng(buffer)) return "image/png";
  if (isJpeg(buffer)) return "image/jpeg";
  if (isWebp(buffer)) return "image/webp";
  return "application/octet-stream";
}

function handleAuth(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 10_000) req.destroy();
  });
  req.on("end", () => {
    try {
      const { password = "" } = JSON.parse(body || "{}");
      const ok = Boolean(adminPassword) && secureCompare(password, adminPassword);

      const headers = {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      };
      if (ok) {
        headers["set-cookie"] = `admin_session=${createSessionToken()}; HttpOnly; SameSite=Lax; Path=/admin; Max-Age=86400`;
      }

      res.writeHead(ok ? 200 : 401, headers);
      res.end(JSON.stringify({ ok }));
    } catch {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false }));
    }
  });
}

function handleLogout(res) {
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "set-cookie": "admin_session=; HttpOnly; SameSite=Lax; Path=/admin; Max-Age=0"
  });
  res.end(JSON.stringify({ ok: true }));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendApiJson(res, status, payload) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  };

  res.writeHead(status, headers);
  res.end(payload === null ? "" : JSON.stringify(payload));
}

function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

function deletePreviousUpload(previousUrl, nextUrl) {
  if (!previousUrl || previousUrl === nextUrl || !previousUrl.startsWith("/uploads/")) {
    return;
  }

  const fileName = previousUrl.replace(/^\/uploads\//, "");
  const filePath = resolve(uploadsDir, fileName);

  if (!filePath.startsWith(uploadsDir) || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch {
    // Old logo cleanup should not block saving the new logo.
  }
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeInteger(value, fallback) {
  const number = parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function formatRateLabel(value) {
  const number = normalizeNumber(value, 0);
  return `${number}%`;
}

function createSessionToken() {
  return createHmac("sha256", adminPassword).update("seeumgift-admin").digest("hex");
}

function hasValidSession(req) {
  if (!adminPassword) return false;

  const cookie = req.headers.cookie || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("admin_session="))
    ?.split("=")[1];

  return Boolean(token) && secureCompare(token, createSessionToken());
}

function secureCompare(input, expected) {
  const inputBuffer = Buffer.from(String(input));
  const expectedBuffer = Buffer.from(String(expected));

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] ??= value;
  }
}
