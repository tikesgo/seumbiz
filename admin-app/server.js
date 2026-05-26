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
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
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
          name: nameMatch?.[1] || "attachment"
        });
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
    "access-control-allow-headers": "content-type"
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
