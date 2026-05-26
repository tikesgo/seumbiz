import { supabase } from "./supabaseClient.js";

const bankNameInput = document.querySelector("#bankName");
const bankSelector = document.querySelector("[data-bank-selector]");

// Mock data intentionally has empty logo_url values.
// When banks.logo_url is managed later, this renderer will show the image automatically.
const mockBanks = [
  { name: "국민은행", logo_url: "" },
  { name: "신한은행", logo_url: "" },
  { name: "우리은행", logo_url: "" },
  { name: "하나은행", logo_url: "" },
  { name: "농협은행", logo_url: "" },
  { name: "기업은행", logo_url: "" },
  { name: "카카오뱅크", logo_url: "" },
  { name: "토스뱅크", logo_url: "" },
  { name: "우체국", logo_url: "" },
  { name: "새마을금고", logo_url: "" },
];

let toggleButton = null;
let optionPanel = null;
let isOpen = false;
let banks = mockBanks;

const isUsableAdminAssetBaseUrl = (url) => /^https?:\/\//i.test(url) && !/^https?:\/\/(?:www\.)?example\.com(?:\/|$)/i.test(url);

const normalizeLogoUrl = (url) => {
  if (!url) return "";
  const value = String(url).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) {
    const assetBaseUrl = String(import.meta.env.VITE_ADMIN_ASSET_BASE_URL || "").trim().replace(/\/$/, "");
    return isUsableAdminAssetBaseUrl(assetBaseUrl) ? `${assetBaseUrl}${value}` : value;
  }
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

const createBankLogo = (bank) => {
  const logo = document.createElement("span");
  logo.className = "bank-option-logo";
  logo.setAttribute("aria-hidden", "true");

  const renderPlaceholder = () => {
    logo.replaceChildren(bank.name.slice(0, 1));
  };

  const logoUrl = normalizeLogoUrl(bank.logo_url);
  if (!logoUrl) {
    renderPlaceholder();
    return logo;
  }

  const image = document.createElement("img");
  image.src = logoUrl;
  image.alt = `${bank.name} 로고`;
  image.addEventListener("error", renderPlaceholder, { once: true });
  logo.append(image);
  return logo;
};

const getCurrentBankValue = () => String(bankNameInput?.value || "").trim();

const getToggleText = () => {
  const value = getCurrentBankValue();
  if (!value) return "은행을 선택해주세요";
  return `${value} 선택됨`;
};

const loadBanks = async () => {
  if (!supabase) return mockBanks;

  try {
    const { data, error } = await supabase
      .from("banks")
      .select("id, name, logo_url, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    if (!Array.isArray(data) || !data.length) return mockBanks;
    return data;
  } catch (error) {
    console.warn("[bank-selector] banks load failed, using mock fallback:", error);
    return mockBanks;
  }
};

const setOpen = (nextOpen) => {
  isOpen = nextOpen;
  if (bankSelector) bankSelector.classList.toggle("is-open", isOpen);
  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.querySelector(".bank-selector-toggle-text").textContent = getToggleText();
  }
  if (optionPanel) optionPanel.hidden = !isOpen;
};

const closeIfOutside = (event) => {
  if (!isOpen || !bankSelector) return;
  if (bankSelector.contains(event.target)) return;
  setOpen(false);
};

const closeOnEscape = (event) => {
  if (!isOpen || event.key !== "Escape") return;
  setOpen(false);
  toggleButton?.focus();
};

const syncSelectedBank = () => {
  if (!bankSelector || !bankNameInput) return;
  const value = getCurrentBankValue();

  bankSelector.querySelectorAll(".bank-option").forEach((button) => {
    const isSelected = button.dataset.bankName === value;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (toggleButton) {
    toggleButton.querySelector(".bank-selector-toggle-text").textContent = getToggleText();
  }
};

const selectBank = (bank) => {
  if (!bankNameInput) return;
  bankNameInput.value = bank.name;
  bankNameInput.dispatchEvent(new Event("input", { bubbles: true }));
  syncSelectedBank();
  setOpen(false);
};

const createBankButton = (bank) => {
  const button = document.createElement("button");
  button.className = "bank-option";
  button.type = "button";
  button.dataset.bankName = bank.name;
  button.setAttribute("aria-pressed", "false");

  const name = document.createElement("span");
  name.className = "bank-option-name";
  name.textContent = bank.name;

  button.append(createBankLogo(bank), name);
  button.addEventListener("click", () => selectBank(bank));
  return button;
};

const createToggleButton = () => {
  const button = document.createElement("button");
  button.className = "bank-selector-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");

  const text = document.createElement("span");
  text.className = "bank-selector-toggle-text";
  text.textContent = getToggleText();

  const icon = document.createElement("span");
  icon.className = "bank-selector-toggle-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⌄";

  button.append(text, icon);
  button.addEventListener("click", () => setOpen(!isOpen));
  return button;
};

const renderBankSelector = async () => {
  if (!bankSelector) return;
  banks = await loadBanks();

  const title = document.createElement("p");
  title.className = "bank-selector-title";
  title.textContent = "입금받을 은행을 선택해주세요.";

  toggleButton = createToggleButton();

  optionPanel = document.createElement("div");
  optionPanel.className = "bank-selector-panel";
  optionPanel.hidden = true;

  const grid = document.createElement("div");
  grid.className = "bank-selector-grid";
  grid.append(...banks.map(createBankButton));
  optionPanel.append(grid);

  bankSelector.replaceChildren(title, toggleButton, optionPanel);
  syncSelectedBank();
};

if (bankNameInput) {
  bankNameInput.addEventListener("input", syncSelectedBank);
}

document.addEventListener("click", closeIfOutside);
document.addEventListener("keydown", closeOnEscape);

renderBankSelector();
