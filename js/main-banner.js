import { hasSupabaseConfig, supabase } from "./supabaseClient.js";

const SLIDE_INTERVAL_MS = 2800;
const ADMIN_ASSET_BASE_URL = String(import.meta.env.VITE_ADMIN_ASSET_BASE_URL || "").trim().replace(/\/$/, "");
const DEFAULT_BANNER_IMAGE_URL = "/assets/hero-main.png";
const isUsableAdminAssetBaseUrl = (url) => /^https?:\/\//i.test(url) && !/^https?:\/\/(?:www\.)?example\.com(?:\/|$)/i.test(url);

const slider = document.querySelector("[data-main-banner-slider]");
const track = document.querySelector("[data-main-banner-track]");
const dots = document.querySelector("[data-main-banner-dots]");
const sliderShell = slider?.closest(".premium-hero-board") || null;

let activeIndex = 0;
let slideTimer = null;

const normalizeBannerImageUrl = (url) => {
  if (!url) return "";
  const value = String(url).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) {
    return isUsableAdminAssetBaseUrl(ADMIN_ASSET_BASE_URL) ? `${ADMIN_ASSET_BASE_URL}${value}` : value;
  }
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

const setActiveSlide = (nextIndex) => {
  const slides = [...track.querySelectorAll(".main-banner-slide")];
  const dotItems = [...dots.querySelectorAll(".main-banner-dot")];
  if (!slides.length) return;

  activeIndex = (nextIndex + slides.length) % slides.length;
  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === activeIndex);
  });
  dotItems.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
  });
};

const startAutoSlide = (count) => {
  if (slideTimer) {
    window.clearInterval(slideTimer);
    slideTimer = null;
  }

  if (count <= 1) return;

  slideTimer = window.setInterval(() => {
    setActiveSlide(activeIndex + 1);
  }, SLIDE_INTERVAL_MS);
};

const createSlide = (banner, index) => {
  const imageUrl = normalizeBannerImageUrl(banner.image_url);
  if (!imageUrl) return null;

  const slide = document.createElement(banner.link_url ? "a" : "div");
  const image = document.createElement("img");

  slide.className = "main-banner-slide";
  slide.classList.toggle("is-active", index === 0);
  if (banner.link_url) {
    slide.href = banner.link_url;
    slide.target = "_blank";
    slide.rel = "noopener noreferrer";
  }

  image.src = imageUrl;
  image.alt = banner.title || "메인 배너";
  slide.append(image);
  return slide;
};

const renderBanners = (banners) => {
  const slides = banners.map(createSlide).filter(Boolean);
  if (!slider || !track || !dots || !slides.length) {
    return;
  }

  track.replaceChildren(...slides);
  dots.replaceChildren(
    ...slides.map((_, index) => {
      const dot = document.createElement("span");
      dot.className = "main-banner-dot";
      dot.classList.toggle("is-active", index === 0);
      return dot;
    })
  );

  activeIndex = 0;
  if (sliderShell) {
    sliderShell.hidden = false;
  }
  slider.hidden = false;
  startAutoSlide(slides.length);
};

const renderFallbackBanner = () => {
  renderBanners([
    {
      id: "default-main-banner",
      title: "세움비즈 메인 배너",
      image_url: DEFAULT_BANNER_IMAGE_URL,
      link_url: "",
      is_active: true,
      sort_order: 0,
    },
  ]);
};

const loadMainBanners = async () => {
  if (!slider || !track || !dots) return;

  if (!hasSupabaseConfig || !supabase) {
    renderFallbackBanner();
    return;
  }

  const { data, error } = await supabase
    .from("main_banners")
    .select("id, title, image_url, link_url, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[main_banners] load failed:", error);
    renderFallbackBanner();
    return;
  }

  const banners = Array.isArray(data) ? data : [];
  if (!banners.length) {
    renderFallbackBanner();
    return;
  }

  renderBanners(banners);
};

loadMainBanners();
