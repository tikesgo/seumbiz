import { supabase } from "./supabaseClient.js";
import { loadGiftCardLogoMap, resolveProductImageUrl } from "./product-logo.js";

const DEFAULT_LIMIT = 20;

const normalizeItems = (items) => (Array.isArray(items) ? items : []);

const maskName = (name) => {
  const value = String(name || "").trim();
  if (!value) return "-";
  return `${value.slice(0, 1)}**`;
};

const getStatusValue = (status) => {
  const value = String(status || "").trim();
  return value || "접수완료";
};

const getOrderDate = (order) => order.requested_at || order.created_at;

const formatDuration = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일`;
};

const getProductName = (item) => item?.name || item?.productName || item?.product_name || "상품권";

const getAmount = (item, order) => Number(item?.amount ?? order.total_amount ?? 0);

const hasCustomerName = (order) => Boolean(String(order?.customer_name || order?.customerName || "").trim());

const isBulkOrder = (order) => String(order?.order_type || "").toLowerCase() === "bulk" || normalizeItems(order?.bulk_items).length > 0;

const getOrderTotalAmount = (order, items) => {
  const totalAmount = Number(order?.total_amount || 0);
  if (totalAmount > 0) return totalAmount;
  return normalizeItems(items).reduce((sum, item) => sum + Number(item?.amount || 0), 0);
};

const orderToRows = (order, giftCardLogoMap) => {
  const items = normalizeItems(order.items).length ? normalizeItems(order.items) : normalizeItems(order.bulk_items);
  const duration = formatDuration(getOrderDate(order));
  const statusText = getStatusValue(order.status);
  const customerName = order.customer_name || order.customerName;
  const maskedCustomerName = maskName(customerName);

  if (isBulkOrder(order)) {
    const firstItem = items[0] || {};
    return [
      {
        productName: getProductName(firstItem),
        imageUrl: resolveProductImageUrl(firstItem, giftCardLogoMap),
        amount: getOrderTotalAmount(order, items),
        maskedCustomerName,
        duration,
        status: order.status,
        statusText,
      },
    ];
  }

  if (!items.length) {
    return [
      {
        productName: "상품권",
        imageUrl: "",
        amount: order.total_amount,
        maskedCustomerName,
        duration,
        status: order.status,
        statusText,
      },
    ];
  }

  return items.map((item) => ({
    productName: getProductName(item),
    imageUrl: resolveProductImageUrl(item, giftCardLogoMap),
    amount: getAmount(item, order),
    maskedCustomerName,
    duration,
    status: order.status,
    statusText,
  }));
};

export const loadLiveStatusRows = async ({ limit = DEFAULT_LIMIT } = {}) => {
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const giftCardLogoMap = await loadGiftCardLogoMap(supabase);
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, status, total_amount, order_type, items, bulk_items, requested_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .filter(hasCustomerName)
    .flatMap((order) => orderToRows(order, giftCardLogoMap))
    .slice(0, limit);
};
