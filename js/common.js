import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const DEFAULT_SITE_LOGO = "/assets/site-logo.png";
const DEFAULT_CONSULT_PHONE = "010-8310-5150";
const DEFAULT_SITE_SETTINGS = {
  consult_phone: DEFAULT_CONSULT_PHONE,
  kakao_openchat_url: "",
  business_name: "세움비즈",
  business_ceo: "입력필요",
  business_registration_number: "입력필요",
  mail_order_number: "입력필요",
  business_address: "입력필요",
  business_phone: DEFAULT_CONSULT_PHONE,
  business_email: "acro7888@gmail.com",
  business_hours: "24시간 연중무휴",
  footer_copyright: "© 세움비즈. All rights reserved."
};
const SITE_SETTING_KEYS = Object.keys(DEFAULT_SITE_SETTINGS);

const normalizeLogoUrl = (url) => {
  if (!url) return DEFAULT_SITE_LOGO;
  const value = String(url).trim();
  if (!value) return DEFAULT_SITE_LOGO;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

export const loadSiteLogo = async () => {
  const logoUrl = normalizeLogoUrl(window.__SEEUM_SITE_LOGO_URL__);
  document.querySelectorAll("[data-site-logo]").forEach((image) => {
    if (!logoUrl) {
      image.removeAttribute("src");
      image.hidden = true;
      return;
    }

    image.hidden = false;
    image.src = logoUrl;
  });
};

const normalizePhoneDisplay = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return String(value || DEFAULT_CONSULT_PHONE).trim() || DEFAULT_CONSULT_PHONE;
};

const phoneToTelHref = (value) => {
  const digits = String(value || DEFAULT_CONSULT_PHONE).replace(/\D/g, "");
  return `tel:${digits || DEFAULT_CONSULT_PHONE.replace(/\D/g, "")}`;
};

const loadSiteSettings = async () => {
  if (!hasSupabaseConfig || !supabase) {
    return DEFAULT_SITE_SETTINGS;
  }

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key,value")
      .in("key", SITE_SETTING_KEYS);

    if (error) throw error;

    return (data || []).reduce(
      (settings, row) => ({
        ...settings,
        [row.key]: row.value || ""
      }),
      DEFAULT_SITE_SETTINGS
    );
  } catch (error) {
    console.warn("[site-settings] fallback:", error.message);
    return DEFAULT_SITE_SETTINGS;
  }
};

const createContactIcon = (className, text) => {
  const icon = document.createElement("span");
  icon.className = `site-contact-icon ${className}`;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = text;
  return icon;
};

const createContactLabel = (text) => {
  const label = document.createElement("span");
  label.textContent = text;
  return label;
};

export const initConsultFloatingBar = async () => {
  if (document.querySelector("[data-site-contact-float]")) return;

  const settings = await loadSiteSettings();
  const phoneDisplay = normalizePhoneDisplay(settings.consult_phone);
  const kakaoUrl = String(settings.kakao_openchat_url || "").trim();

  const wrapper = document.createElement("div");
  wrapper.className = "site-contact-float";
  wrapper.dataset.siteContactFloat = "true";
  wrapper.setAttribute("aria-label", "상담 바로가기");

  const phoneLink = document.createElement("a");
  phoneLink.href = phoneToTelHref(phoneDisplay);
  phoneLink.setAttribute("aria-label", `${phoneDisplay} 전화 상담`);
  phoneLink.append(
    createContactIcon("site-contact-icon-phone", "☎"),
    createContactLabel("전화로 상담하기")
  );

  const divider = document.createElement("span");
  divider.className = "site-contact-divider";
  divider.setAttribute("aria-hidden", "true");

  const kakaoButton = kakaoUrl ? document.createElement("a") : document.createElement("button");
  kakaoButton.className = kakaoUrl ? "" : "is-disabled";
  if (kakaoUrl) {
    kakaoButton.href = kakaoUrl;
    kakaoButton.target = "_blank";
    kakaoButton.rel = "noopener noreferrer";
    kakaoButton.setAttribute("aria-label", "카카오톡 상담 열기");
  } else {
    kakaoButton.type = "button";
    kakaoButton.setAttribute("aria-disabled", "true");
    kakaoButton.title = "카카오톡 상담 링크가 준비 중입니다.";
    kakaoButton.addEventListener("click", () => {
      window.alert("카카오톡 상담 링크가 준비 중입니다.");
    });
  }
  kakaoButton.append(
    createContactIcon("site-contact-icon-kakao", "●"),
    createContactLabel("카카오톡 상담하기")
  );

  wrapper.append(phoneLink, divider, kakaoButton);
  document.body.append(wrapper);
};

const appendFooterInfo = (parent, label, value, className = "") => {
  const item = document.createElement("span");
  if (className) item.className = className;
  const labelNode = document.createElement("strong");
  labelNode.textContent = label;
  item.append(labelNode, document.createTextNode(` ${value || "입력필요"}`));
  parent.append(item);
};

export const initSiteFooter = async () => {
  if (document.querySelector("[data-site-footer]")) return;

  const settings = await loadSiteSettings();
  const phone = normalizePhoneDisplay(settings.business_phone || settings.consult_phone);

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.dataset.siteFooter = "true";

  const inner = document.createElement("div");
  inner.className = "site-footer-inner";

  const brand = document.createElement("section");
  brand.className = "site-footer-brand";

  const logo = document.createElement("img");
  logo.src = normalizeLogoUrl(window.__SEEUM_SITE_LOGO_URL__);
  logo.alt = `${settings.business_name || "세움비즈"} 로고`;
  logo.addEventListener("error", () => {
    logo.hidden = true;
  });

  brand.append(logo);

  const center = document.createElement("section");
  center.className = "site-footer-center";
  const centerLabel = document.createElement("span");
  centerLabel.textContent = "고객센터";
  const phoneLink = document.createElement("a");
  phoneLink.href = phoneToTelHref(phone);
  phoneLink.textContent = phone;
  const hours = document.createElement("p");
  hours.textContent = settings.business_hours || DEFAULT_SITE_SETTINGS.business_hours;
  center.append(centerLabel, phoneLink, hours);

  const info = document.createElement("section");
  info.className = "site-footer-info";
  appendFooterInfo(info, "대표자", settings.business_ceo, "site-footer-info-compact");
  appendFooterInfo(info, "사업자등록번호", settings.business_registration_number, "site-footer-info-compact");
  appendFooterInfo(info, "통신판매업신고번호", settings.mail_order_number, "site-footer-info-compact");
  appendFooterInfo(info, "주소", settings.business_address, "site-footer-info-wide");
  appendFooterInfo(info, "이메일", settings.business_email, "site-footer-info-wide");

  const copyright = document.createElement("p");
  copyright.className = "site-footer-copy";
  copyright.textContent = settings.footer_copyright || DEFAULT_SITE_SETTINGS.footer_copyright;

  inner.append(brand, info, center, copyright);
  footer.append(inner);
  document.body.append(footer);
};

const initMobileMenu = () => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".mobile-menu-button");
  const nav = document.querySelector(".site-nav");

  if (!header || !menuButton || !nav) return;

  const setOpen = (isOpen) => {
    header.classList.toggle("is-menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  };

  const isOpen = () => header.classList.contains("is-menu-open");

  menuButton.addEventListener("click", () => {
    setOpen(!isOpen());
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!isOpen() || header.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    menuButton.focus();
  });
};

loadSiteLogo();
initMobileMenu();
initSiteFooter();
initConsultFloatingBar();
