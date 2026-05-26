const PRODUCT_IMAGE_BASE_URL = "";
const ADMIN_ASSET_BASE_URL = String(import.meta.env.VITE_ADMIN_ASSET_BASE_URL || "").trim().replace(/\/$/, "");
const isUsableAdminAssetBaseUrl = (url) => /^https?:\/\//i.test(url) && !/^https?:\/\/(?:www\.)?example\.com(?:\/|$)/i.test(url);

export const normalizeProductImageUrl = (url) => {
  if (!url) return "";
  const value = String(url).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) {
    return isUsableAdminAssetBaseUrl(ADMIN_ASSET_BASE_URL) ? `${ADMIN_ASSET_BASE_URL}${value}` : value;
  }
  if (value.startsWith("/")) return `${PRODUCT_IMAGE_BASE_URL}${value}`;
  return `${PRODUCT_IMAGE_BASE_URL}/${value}`;
};

export const createProductLogo = ({ imageUrl, name = "상품권", className = "product-logo" } = {}) => {
  const logo = document.createElement("span");
  logo.className = className;
  logo.setAttribute("aria-hidden", "true");

  const renderPlaceholder = () => {
    logo.classList.add(`${className}--placeholder`);
    logo.replaceChildren("권");
  };

  const normalizedImageUrl = normalizeProductImageUrl(imageUrl);
  if (!normalizedImageUrl) {
    renderPlaceholder();
    return logo;
  }

  const image = document.createElement("img");
  image.src = normalizedImageUrl;
  image.alt = `${name} 로고`;
  image.addEventListener("error", renderPlaceholder, { once: true });
  logo.append(image);
  return logo;
};

export const loadGiftCardLogoMap = async (supabase) => {
  if (!supabase) return new Map();

  const { data, error } = await supabase.from("gift_cards").select("id, name, image_url");
  if (error) {
    console.warn("[product-logo] gift_cards logo map load failed:", error);
    return new Map();
  }

  return new Map((Array.isArray(data) ? data : []).map((card) => [String(card.id), card.image_url || ""]));
};

export const getGiftCardIdFromItem = (item) => {
  const giftCardId = item?.giftCardId || item?.gift_card_id;
  return giftCardId ? String(giftCardId) : "";
};

export const resolveProductImageUrl = (item, giftCardLogoMap = new Map()) => {
  const giftCardId = getGiftCardIdFromItem(item);
  const latestImageUrl = giftCardId ? giftCardLogoMap.get(giftCardId) || "" : "";
  return latestImageUrl || item?.image_url || item?.imageUrl || "";
};
