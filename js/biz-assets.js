const DEFAULT_ADMIN_ASSET_BASE_URL = "http://localhost:4173";

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const getSeumBizAdminAssetBaseUrl = () => {
  const envBaseUrl = import.meta.env?.VITE_ADMIN_ASSET_BASE_URL;
  const storedBaseUrl = window.localStorage?.getItem("seumbiz_admin_asset_base_url");
  return trimTrailingSlash(storedBaseUrl || envBaseUrl || DEFAULT_ADMIN_ASSET_BASE_URL);
};

export const resolveSeumBizAssetUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/uploads/")) {
    return `${getSeumBizAdminAssetBaseUrl()}${value}`;
  }
  return value;
};
