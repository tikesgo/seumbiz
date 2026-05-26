import { supabase } from "./supabaseClient.js";

let giftProducts = [
  {
    id: "cultureland",
    name: "문화상품권",
    badge: "문",
    color: "#f04e68",
    rate: "91%",
    description: "핀번호와 권종을 입력해주세요.",
    amounts: ["5천원", "1만원", "3만원", "5만원"],
    fields: [
      { key: "pin", label: "상품권 번호", type: "text", placeholder: "핀번호 16자리 입력" },
      { key: "amount", label: "권종", type: "select", options: ["5,000원", "10,000원", "30,000원", "50,000원"] },
      { key: "name", label: "입금자명", type: "text", placeholder: "예금주명을 입력해주세요" },
      { key: "phone", label: "연락처", type: "tel", placeholder: "010-0000-0000" },
    ],
    help: ["컬쳐랜드/문화상품권 핀번호를 정확히 입력해주세요.", "사용 완료 또는 잔액 부족 상품권은 접수되지 않습니다."],
  },
  {
    id: "book",
    name: "도서문화상품권",
    badge: "도",
    color: "#ef5f73",
    rate: "90%",
    description: "도서문화상품권 인증번호를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "10만원"],
    fields: [
      { key: "pin", label: "인증번호", type: "text", placeholder: "상품권 인증번호 입력" },
      { key: "password", label: "비밀번호", type: "password", placeholder: "비밀번호 입력" },
      { key: "name", label: "입금자명", type: "text", placeholder: "예금주명을 입력해주세요" },
    ],
    help: ["인증번호와 비밀번호가 모두 필요합니다.", "접수 전 상품권 사용 가능 여부를 확인해주세요."],
  },
  {
    id: "happy",
    name: "해피머니",
    badge: "해",
    color: "#ff8a3d",
    rate: "89%",
    description: "해피머니 핀번호와 발행일을 입력해주세요.",
    amounts: ["5천원", "1만원", "3만원", "5만원"],
    fields: [
      { key: "pin", label: "핀번호", type: "text", placeholder: "해피머니 핀번호 입력" },
      { key: "issueDate", label: "발행일", type: "text", placeholder: "예: 2026.05.16" },
      { key: "phone", label: "연락처", type: "tel", placeholder: "010-0000-0000" },
    ],
    help: ["발행일 형식을 확인해주세요.", "여러 장 접수 시 메모란에 추가 번호를 입력할 수 있습니다."],
  },
  {
    id: "lotte",
    name: "롯데모바일",
    badge: "L",
    color: "#e8354d",
    rate: "91%",
    description: "롯데 모바일 교환권 번호를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "10만원"],
    fields: [
      { key: "coupon", label: "교환권 번호", type: "text", placeholder: "롯데모바일 교환권 번호" },
      { key: "amount", label: "권종", type: "select", options: ["10,000원", "30,000원", "50,000원", "100,000원"] },
      { key: "name", label: "입금자명", type: "text", placeholder: "예금주명을 입력해주세요" },
    ],
    help: ["이미 등록된 교환권은 처리할 수 없습니다.", "캡처 이미지가 필요한 경우 상담원이 별도 안내드립니다."],
  },
  {
    id: "google",
    name: "구글기프트카드",
    badge: "G",
    color: "#4285f4",
    rate: "87%",
    description: "구글 기프트카드 코드를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "10만원"],
    fields: [
      { key: "code", label: "카드 코드", type: "text", placeholder: "XXXX-XXXX-XXXX 형식" },
      { key: "amount", label: "권종", type: "select", options: ["10,000원", "30,000원", "50,000원", "100,000원"] },
      { key: "memo", label: "메모", type: "textarea", placeholder: "추가 요청사항이 있다면 입력해주세요" },
    ],
    help: ["국내 발행 구글 기프트카드만 접수 가능합니다.", "코드 사이의 하이픈은 생략해도 됩니다."],
  },
  {
    id: "ssg",
    name: "신세계상품권",
    badge: "S",
    color: "#18a36e",
    rate: "90%",
    description: "SSG 전환 가능 여부와 상품권 번호를 입력해주세요.",
    amounts: ["1만원", "5만원", "10만원", "30만원"],
    fields: [
      { key: "serial", label: "상품권 번호", type: "text", placeholder: "상품권 번호 입력" },
      { key: "convertible", label: "전환여부", type: "select", options: ["SSG 전환 가능", "매장 지류 상품권"] },
      { key: "name", label: "입금자명", type: "text", placeholder: "예금주명을 입력해주세요" },
    ],
    help: ["SSG 전환 가능 상품권인지 먼저 확인해주세요.", "지류 상품권은 별도 확인 절차가 있을 수 있습니다."],
  },
  {
    id: "tmon",
    name: "티몬캐시",
    badge: "T",
    color: "#ff544f",
    rate: "88%",
    description: "티몬캐시 계정 정보를 입력해주세요.",
    amounts: ["3만원", "5만원", "10만원", "직접입력"],
    fields: [
      { key: "account", label: "아이디", type: "text", placeholder: "티몬 계정 아이디" },
      { key: "balance", label: "보유금액", type: "number", placeholder: "보유 캐시 금액" },
      { key: "phone", label: "연락처", type: "tel", placeholder: "010-0000-0000" },
    ],
    help: ["계정 확인 후 실제 보유 캐시 기준으로 정산됩니다.", "비밀번호는 상담원이 안전 채널로 별도 요청합니다."],
  },
  {
    id: "payco",
    name: "페이코 포인트",
    badge: "P",
    color: "#fa2828",
    rate: "86%",
    description: "페이코 포인트 보유 정보를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "직접입력"],
    fields: [
      { key: "account", label: "계정 정보", type: "text", placeholder: "페이코 가입 이메일 또는 휴대폰" },
      { key: "balance", label: "보유포인트", type: "number", placeholder: "보유 포인트 입력" },
      { key: "memo", label: "메모", type: "textarea", placeholder: "전환 가능 포인트 여부를 적어주세요" },
    ],
    help: ["전환 제한 포인트는 매입이 어려울 수 있습니다.", "정산 가능 금액은 확인 후 안내됩니다."],
  },
  {
    id: "naver",
    name: "네이버페이",
    badge: "N",
    color: "#03c75a",
    rate: "86%",
    description: "네이버페이 포인트 정보를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "직접입력"],
    fields: [
      { key: "account", label: "네이버 ID", type: "text", placeholder: "네이버 아이디" },
      { key: "balance", label: "포인트", type: "number", placeholder: "보유 포인트 입력" },
      { key: "phone", label: "연락처", type: "tel", placeholder: "010-0000-0000" },
    ],
    help: ["출금 가능 포인트 기준으로 접수됩니다.", "이벤트성 포인트는 정산 대상에서 제외될 수 있습니다."],
  },
  {
    id: "baemin",
    name: "배민상품권",
    badge: "B",
    color: "#2ac1bc",
    rate: "88%",
    description: "배민 상품권 쿠폰번호를 입력해주세요.",
    amounts: ["1만원", "2만원", "3만원", "5만원"],
    fields: [
      { key: "coupon", label: "쿠폰번호", type: "text", placeholder: "배민 상품권 쿠폰번호" },
      { key: "amount", label: "권종", type: "select", options: ["10,000원", "20,000원", "30,000원", "50,000원"] },
      { key: "name", label: "입금자명", type: "text", placeholder: "예금주명을 입력해주세요" },
    ],
    help: ["등록 전 쿠폰번호만 접수 가능합니다.", "유효기간이 지난 상품권은 처리할 수 없습니다."],
  },
  {
    id: "cashbee",
    name: "캐시비",
    badge: "C",
    color: "#2f79e7",
    rate: "85%",
    description: "캐시비 카드 정보를 입력해주세요.",
    amounts: ["1만원", "3만원", "5만원", "직접입력"],
    fields: [
      { key: "cardNo", label: "카드번호", type: "text", placeholder: "캐시비 카드번호 입력" },
      { key: "balance", label: "잔액", type: "number", placeholder: "잔액 입력" },
      { key: "phone", label: "연락처", type: "tel", placeholder: "010-0000-0000" },
    ],
    help: ["교통카드 잔액 조회 후 정산됩니다.", "카드 상태에 따라 처리 시간이 달라질 수 있습니다."],
  },
  {
    id: "etc",
    name: "기타상품권",
    badge: "기",
    color: "#718096",
    rate: "상담",
    description: "보유하신 상품권 정보를 남겨주세요.",
    amounts: ["상담요청", "직접입력", "대량문의", "기타"],
    fields: [
      { key: "brand", label: "상품권명", type: "text", placeholder: "상품권 브랜드명" },
      { key: "value", label: "금액", type: "number", placeholder: "총 금액 입력" },
      { key: "memo", label: "상세내용", type: "textarea", placeholder: "핀번호, 유효기간 등 확인 가능한 정보를 입력해주세요" },
    ],
    help: ["등록되지 않은 상품권도 상담 후 매입 가능 여부를 안내드립니다.", "대량 접수는 담당자가 개별 연락드립니다."],
  },
];

const fallbackGiftProducts = [...giftProducts];
const giftList = document.querySelector("#giftList");
const detailHost = document.querySelector("#detailHost");
const emptyState = document.querySelector("#emptyState");
const quickSubmit = document.querySelector("#quickSubmit");
const depositDescription = document.querySelector("#depositDescription");
const bankSelectButton = document.querySelector("#bankSelectButton");
const bankChangeButton = document.querySelector("#bankChangeButton");
const selectedBankCard = document.querySelector("#selectedBankCard");
const selectedBankLogo = document.querySelector("#selectedBankLogo");
const selectedBankName = document.querySelector("#selectedBankName");
const depositFields = document.querySelector("#depositFields");
const accountNumber = document.querySelector("#accountNumber");
const accountHolder = document.querySelector("#accountHolder");
const contactPhone = document.querySelector("#contactPhone");
const bankModal = document.querySelector("#bankModal");
const bankModalClose = document.querySelector("#bankModalClose");
const bankGrid = document.querySelector("#bankGrid");
const mainLiveList = document.querySelector("#mainLiveList");
const noticeSummaryList = document.querySelector(".notice-summary-list");
const completeModal = document.querySelector("#completeModal");
let selectedProductId = null;
let selectedAmount = 10000;
let selectedBank = null;
const registeredGifts = [];

const banks = [
  { name: "카카오뱅크", badge: "카", color: "#ffe812" },
  { name: "국민은행", badge: "KB", color: "#6f5a2f", logo: "./images/bank/국민은행.png" },
  { name: "기업은행", badge: "IBK", color: "#1f75bb" },
  { name: "농협은행", badge: "NH", color: "#1fa85b" },
  { name: "신한은행", badge: "신", color: "#256bd9" },
  { name: "산업은행", badge: "KDB", color: "#2254a4" },
  { name: "우리은행", badge: "우", color: "#1594d2" },
  { name: "한국씨티은행", badge: "C", color: "#1b69b6" },
  { name: "하나은행", badge: "하", color: "#008b8b" },
  { name: "SC제일은행", badge: "SC", color: "#1fb25a" },
  { name: "경남은행", badge: "경", color: "#d6293e" },
  { name: "광주은행", badge: "광", color: "#cf2f36" },
  { name: "부산은행", badge: "부", color: "#d71920" },
  { name: "iM뱅크(대구)", badge: "iM", color: "#1f62c8" },
  { name: "산림조합중앙회", badge: "산", color: "#2c9b57" },
  { name: "저축은행", badge: "저", color: "#39a9dc" },
  { name: "새마을금고", badge: "MG", color: "#49a942" },
  { name: "수협은행", badge: "수", color: "#2570c9" },
  { name: "신협중앙회", badge: "신", color: "#2464b4" },
  { name: "우체국", badge: "우", color: "#e63946" },
  { name: "전북은행", badge: "전", color: "#2b67b1" },
];

const amountOptions = [
  { label: "1만", value: 10000 },
  { label: "3만", value: 30000 },
  { label: "5만", value: 50000 },
  { label: "10만", value: 100000 },
  { label: "30만", value: 300000 },
  { label: "50만", value: 500000 },
];

const liveProgressSamples = [
  { giftType: "문화상품권", badge: "문", count: "2건", customer: "김**", status: "입금완료" },
  { giftType: "구글기프트카드", badge: "G", count: "1건", customer: "박**", status: "입금대기" },
  { giftType: "신세계상품권", badge: "S", count: "3건", customer: "이**", status: "검수중" },
  { giftType: "롯데모바일", badge: "L", count: "1건", customer: "최**", status: "접수완료" },
  { giftType: "해피머니", badge: "해", count: "2건", customer: "정**", status: "입금완료" },
  { giftType: "도서문화상품권", badge: "도", count: "1건", customer: "윤**", status: "검수중" },
  { giftType: "네이버페이", badge: "N", count: "1건", customer: "한**", status: "입금대기" },
  { giftType: "배민상품권", badge: "B", count: "2건", customer: "오**", status: "접수완료" },
];

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

const renderGiftPills = () => {
  const fragment = document.createDocumentFragment();
  giftList.replaceChildren();

  giftProducts.forEach((product) => {
    const button = createElement("button", "gift-pill", "");
    button.type = "button";
    button.dataset.productId = product.id;
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--icon-color", product.color);

    const icon = createElement("span", `gift-icon${product.imageUrl ? " has-image" : ""}`, product.imageUrl ? "" : product.badge);
    if (product.imageUrl) {
      const image = document.createElement("img");
      image.src = product.imageUrl;
      image.alt = `${product.name} 로고`;
      image.addEventListener(
        "error",
        () => {
          icon.classList.remove("has-image");
          icon.textContent = product.badge;
        },
        { once: true },
      );
      icon.append(image);
    }
    const label = createElement("span", "", product.name);

    button.append(icon, label);
    fragment.append(button);
  });

  giftList.append(fragment);
};

const formatWon = (value) => `${value.toLocaleString("ko-KR")}원`;
const normalizePhone = (value) => value.replace(/\D/g, "");

const formatRate = (rate) => {
  if (rate === null || rate === undefined || rate === "") return "상담";
  if (typeof rate === "number") return `${rate}%`;
  return String(rate).includes("%") ? String(rate) : `${rate}%`;
};

const normalizeAmountOptions = (options) => {
  if (!Array.isArray(options)) return amountOptions;

  const normalized = options
    .map((option) => {
      const value = Number(option?.value);
      if (!Number.isFinite(value) || value <= 0) return null;
      return {
        label: option.label || formatWon(value),
        value,
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : amountOptions;
};

const normalizeGiftcardType = (row) => ({
  id: String(row.slug || row.code || row.id),
  name: row.name || row.title || row.giftcard_name || row.type_name || row.display_name || "상품권",
  badge: row.badge || row.name?.slice(0, 1) || row.giftcard_name?.slice(0, 1) || row.type_name?.slice(0, 1) || "상",
  imageUrl: row.image_url || row.imageUrl || "",
  color: row.color || row.theme_color || "#2478ff",
  rate: row.rate_label || formatRate(row.rate || row.buy_rate || row.purchase_rate),
  description: row.description || "핀번호 4칸과 상품권 금액을 입력한 뒤 등록해주세요.",
  amountOptions: normalizeAmountOptions(row.amount_options),
  fields: Array.isArray(row.fields) ? row.fields : [],
  help: Array.isArray(row.help_messages)
    ? row.help_messages
    : Array.isArray(row.help)
    ? row.help
    : ["상품권 정보를 정확히 입력해주세요.", "사용 완료 또는 잔액 부족 상품권은 접수되지 않습니다."],
});

const loadGiftcardTypes = async () => {
  const { data, error } = await supabase
    .from("gift_cards")
    .select("id, name, slug, badge, image_url, rate, rate_label, description, color, amount_options, fields, help_messages, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  console.log("gift_cards data:", data);
  console.log("gift_cards error:", error);

  if (error) {
    console.error("gift_cards 조회 오류:", error);
    giftProducts = fallbackGiftProducts;
    return;
  }

  if (!data?.length) {
    console.warn("활성화된 gift_cards 데이터가 없습니다.");
    giftProducts = fallbackGiftProducts;
    return;
  }

  giftProducts = data.map(normalizeGiftcardType);
};

const renderNotices = (notices) => {
  if (!noticeSummaryList || !notices?.length) return;

  noticeSummaryList.innerHTML = notices
    .map(
      (notice) => `
        <article>
          <strong>${notice.title || notice.category || "공지사항"}</strong>
          <span>${notice.description || notice.content || notice.summary || ""}</span>
        </article>
      `,
    )
    .join("");
};

const loadNotices = async () => {
  const { data, error } = await supabase.from("notices").select("*");

  if (error || !data?.length) return;
  const sortedNotices = data
    .sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0))
    .slice(0, 3);
  renderNotices(sortedNotices);
};

const createReceiptNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `SG${date}${random}`;
};

const saveReceipt = async (receipt) => {
  const { error } = await supabase.from("orders").insert({
    receipt_no: receipt.receiptNo,
    phone: receipt.phone,
    account_holder: receipt.accountHolder,
    bank_name: receipt.bankName,
    items: receipt.items,
    total_amount: receipt.totalAmount,
    status: receipt.status,
    requested_at: receipt.requestedAt,
  });

  if (error) throw error;
};

const openCompleteModal = () => {
  completeModal.style.display = "grid";
  completeModal.hidden = false;
  completeModal.classList.add("is-open", "open", "active");
  document.body.classList.add("modal-open");
};

const closeCompleteModal = () => {
  completeModal.classList.remove("is-open", "open", "active");
  completeModal.hidden = true;
  completeModal.style.display = "none";
  document.body.classList.remove("modal-open");
};

const normalizePin = (pins) => pins.join("").replace(/\s|-/g, "");

const maskPin = (pin) => {
  if (pin.length <= 8) return `${pin.slice(0, 2)}****${pin.slice(-2)}`;
  return `${pin.slice(0, 4)}-****-****-${pin.slice(-4)}`;
};

const onlyDigits = (value) => value.replace(/\D/g, "");

const distributePinDigits = (inputs, digits) => {
  const normalized = onlyDigits(digits).slice(0, 16);
  inputs.forEach((input, index) => {
    input.value = normalized.slice(index * 4, index * 4 + 4);
  });

  const nextEmpty = inputs.find((input) => input.value.length < 4);
  if (nextEmpty) {
    nextEmpty.focus();
    return;
  }

  inputs[inputs.length - 1].focus();
};

const bindPinInputEvents = (pinGrid) => {
  const inputs = [...pinGrid.querySelectorAll("input")];

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = onlyDigits(input.value).slice(0, 4);
      if (input.value.length === 4 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && input.value.length === 0 && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", (event) => {
      const pasted = event.clipboardData.getData("text");
      const digits = onlyDigits(pasted);
      if (digits.length < 4) return;

      event.preventDefault();
      distributePinDigits(inputs, digits);
    });
  });
};

const renderBankLogo = (container, bank) => {
  container.textContent = bank.badge;
  container.classList.remove("has-image");
  container.style.setProperty("--bank-color", bank.color);

  if (!bank.logo) return;

  const image = document.createElement("img");
  image.src = bank.logo;
  image.alt = `${bank.name} 로고`;
  image.addEventListener(
    "error",
    () => {
      container.textContent = bank.badge;
      container.classList.remove("has-image");
    },
    { once: true },
  );
  image.addEventListener(
    "load",
    () => {
      container.textContent = "";
      container.classList.add("has-image");
      container.append(image);
    },
    { once: true },
  );
};

const openBankModal = () => {
  bankModal.style.display = "grid";
  bankModal.hidden = false;
  bankModal.classList.add("is-open", "open", "active");
  document.body.classList.add("modal-open");
};

const closeBankModal = () => {
  bankModal.classList.remove("is-open", "open", "active");
  bankModal.hidden = true;
  bankModal.style.display = "none";
  document.body.classList.remove("modal-open");
};

const applySelectedBank = (bank) => {
  selectedBank = bank;
  depositDescription.textContent = "계좌 정보와 휴대폰 번호를 입력해주세요.";
  bankSelectButton.hidden = true;
  bankSelectButton.style.display = "none";
  selectedBankCard.hidden = false;
  selectedBankCard.style.display = "flex";
  depositFields.hidden = false;
  renderBankLogo(selectedBankLogo, bank);
  selectedBankName.textContent = bank.name;
  closeBankModal();
};

const renderBankOptions = () => {
  const fragment = document.createDocumentFragment();

  banks.forEach((bank) => {
    const button = createElement("button", "bank-option", "");
    button.type = "button";
    button.style.setProperty("--bank-color", bank.color);

    const logo = createElement("span", "bank-logo", "");
    renderBankLogo(logo, bank);
    const name = createElement("strong", "", bank.name);
    button.append(logo, name);
    button.addEventListener("click", () => applySelectedBank(bank));
    fragment.append(button);
  });

  bankGrid.replaceChildren(fragment);
};

const createLiveProgressItem = (item) => {
  const article = createElement("article", "main-live-item", "");
  const left = createElement("div", "main-live-left", "");
  const icon = createElement("span", "main-live-icon", item.badge);
  const info = createElement("div", "main-live-info", "");
  info.append(createElement("strong", "", item.giftType));
  info.append(createElement("span", "", item.count));
  left.append(icon, info);
  article.append(left, createElement("span", "main-live-customer", item.customer), createElement("span", `status-badge status-${item.status}`, item.status));
  return article;
};

const renderLiveProgressTrack = (items) => {
  const track = createElement("div", "main-live-track", "");
  items.forEach((item) => track.append(createLiveProgressItem(item)));
  mainLiveList.replaceChildren(track);
  return track;
};

const initMainLiveRolling = () => {
  if (!mainLiveList) return;

  let isRolling = false;
  const track = renderLiveProgressTrack(liveProgressSamples);

  setInterval(() => {
    if (isRolling || track.children.length < 2) return;
    isRolling = true;

    const firstRow = track.firstElementChild;
    const rowHeight = firstRow.getBoundingClientRect().height;

    requestAnimationFrame(() => {
      track.classList.add("is-rolling");
      track.style.transform = `translateY(-${rowHeight}px)`;
    });

    const finishRolling = (event) => {
      if (event.propertyName !== "transform") return;
      track.removeEventListener("transitionend", finishRolling);
      track.classList.remove("is-rolling");
      track.style.transition = "none";
      track.append(firstRow);
      track.style.transform = "translateY(0)";
      track.offsetHeight;
      track.style.transition = "";
      isRolling = false;
    };

    track.addEventListener("transitionend", finishRolling, { once: true });
  }, 2800);
};

const createPinField = (index) => {
  const input = document.createElement("input");
  input.type = "text";
  input.id = `pin${index}`;
  input.name = `pin${index}`;
  input.placeholder = "4자리";
  input.inputMode = "numeric";
  input.maxLength = 4;
  input.setAttribute("aria-label", `핀번호 ${index}번째 입력칸`);
  return input;
};

const renderRegisteredList = () => {
  const totalCount = registeredGifts.length;
  const totalAmount = registeredGifts.reduce((sum, item) => sum + item.amount, 0);
  const list = createElement("div", "registered-list", "");

  const summary = createElement("div", "registered-summary", "");
  summary.append(createElement("strong", "", `등록된 상품권 ${totalCount}건`));
  summary.append(createElement("span", "", `총 금액 ${formatWon(totalAmount)}`));
  list.append(summary);

  const items = createElement("div", "registered-items", "");
  if (registeredGifts.length === 0) {
    items.append(createElement("p", "registered-empty", "아직 등록된 상품권이 없습니다."));
  } else {
    registeredGifts.forEach((item, index) => {
      const row = createElement("div", "registered-item", "");
      const info = createElement("div", "", "");
      info.append(createElement("strong", "", `${index + 1}. ${item.productName}`));
      info.append(createElement("span", "", `핀번호 ${item.maskedPin}`));
      const meta = createElement("div", "registered-actions", "");
      meta.append(createElement("em", "", formatWon(item.amount)));
      const deleteButton = createElement("button", "registered-delete", "삭제");
      deleteButton.type = "button";
      deleteButton.addEventListener("click", () => {
        registeredGifts.splice(index, 1);
        const product = giftProducts.find((gift) => gift.id === selectedProductId);
        if (product) renderDetail(product);
      });
      meta.append(deleteButton);
      row.append(info, meta);
      items.append(row);
    });
  }

  list.append(items);
  return list;
};

const renderDetail = (product) => {
  const card = createElement("article", "detail-card", "");
  const top = createElement("div", "detail-top", "");
  const titleWrap = createElement("div", "detail-title", "");
  const icon = createElement("span", "gift-icon", product.badge);
  icon.style.setProperty("--icon-color", product.color);

  const titleText = createElement("div", "", "");
  titleText.append(createElement("h3", "", `${product.name} 상세 입력`));
  titleText.append(createElement("p", "", "핀번호 4칸과 상품권 금액을 입력한 뒤 등록해주세요."));
  titleWrap.append(icon, titleText);
  top.append(titleWrap, createElement("span", "rate-badge", `매입 ${product.rate}`));

  const amountTabs = createElement("div", "amount-tabs", "");
  const productAmountOptions = Array.isArray(product.amountOptions) && product.amountOptions.length ? product.amountOptions : amountOptions;
  selectedAmount = productAmountOptions[0].value;
  const selectedName = createElement("div", "selected-product-box", "");
  const selectedInfo = createElement("div", "selected-info", "");
  selectedInfo.append(createElement("span", "", "선택한 상품권 / 매입률"));
  selectedInfo.append(createElement("strong", "", `${product.name} · 매입 ${product.rate}`));
  const selectedAmountText = createElement("em", "", `선택 금액: ${formatWon(selectedAmount)}`);
  selectedName.append(selectedInfo, selectedAmountText);

  productAmountOptions.forEach((amount, index) => {
    const tab = createElement("button", `amount-tab${index === 0 ? " is-selected" : ""}`, amount.label);
    tab.type = "button";
    tab.dataset.amount = String(amount.value);
    tab.addEventListener("click", () => {
      amountTabs.querySelectorAll(".amount-tab").forEach((item) => item.classList.remove("is-selected"));
      tab.classList.add("is-selected");
      selectedAmount = amount.value;
      selectedAmountText.textContent = `선택 금액: ${formatWon(selectedAmount)}`;
    });
    amountTabs.append(tab);
  });

  const form = createElement("form", "dynamic-form", "");
  form.id = `${product.id}Form`;

  const pinRow = createElement("div", "pin-row", "");
  const pinLabel = createElement("label", "", "핀번호");
  pinLabel.htmlFor = "pin1";
  const pinGrid = createElement("div", "pin-grid", "");
  for (let index = 1; index <= 4; index += 1) {
    pinGrid.append(createPinField(index));
  }
  bindPinInputEvents(pinGrid);
  pinRow.append(pinLabel, pinGrid);

  const action = createElement("button", "detail-submit", "등록");
  action.type = "submit";
  form.append(selectedName, pinRow, action);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const pins = [...form.querySelectorAll(".pin-grid input")].map((input) => input.value.trim());
    if (pins.some((pin) => pin.length === 0)) {
      alert("핀번호 4칸을 모두 입력해주세요.");
      return;
    }

    if (pins.some((pin) => pin.length !== 4)) {
      alert("각 핀번호 입력칸은 4자리로 입력해주세요.");
      return;
    }

    const pinKey = normalizePin(pins);
    const isDuplicate = registeredGifts.some((item) => item.pinKey === pinKey);
    if (isDuplicate) {
      alert("이미 등록된 핀번호입니다. 다른 상품권을 입력해주세요.");
      return;
    }

    registeredGifts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      productId: product.id,
      productName: product.name,
      amount: selectedAmount,
      pins,
      pinKey,
      maskedPin: maskPin(pinKey),
    });

    form.querySelectorAll(".pin-grid input").forEach((input) => {
      input.value = "";
    });
    renderDetail(product);
  });

  const helper = createElement("div", "helper-box", "");
  helper.append(createElement("strong", "", "안내사항"));
  product.help.forEach((message) => {
    const line = createElement("div", "", `- ${message}`);
    helper.append(line);
  });

  card.append(top, amountTabs, form, renderRegisteredList(), helper);
  detailHost.replaceChildren(card);
  detailHost.classList.add("is-visible");
  emptyState.style.display = "none";
};

const selectProduct = (productId) => {
  const product = giftProducts.find((item) => item.id === productId);
  if (!product) return;

  selectedProductId = productId;
  giftList.querySelectorAll(".gift-pill").forEach((button) => {
    const isSelected = button.dataset.productId === productId;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  renderDetail(product);
};

giftList.addEventListener("click", (event) => {
  const button = event.target.closest(".gift-pill");
  if (!button) return;
  selectProduct(button.dataset.productId);
});

quickSubmit.addEventListener("click", async () => {
  if (registeredGifts.length === 0) {
    alert("등록된 상품권이 없습니다. 상품권을 먼저 등록해주세요.");
    return;
  }

  if (!selectedBank) {
    alert("입금 받을 은행을 선택해주세요.");
    openBankModal();
    return;
  }

  if (!accountNumber.value.trim() || !accountHolder.value.trim() || !contactPhone.value.trim()) {
    alert("입금계좌 정보의 계좌번호, 예금주, 연락처를 모두 입력해주세요.");
    return;
  }

  const totalAmount = registeredGifts.reduce((sum, item) => sum + item.amount, 0);
  const receiptNo = createReceiptNumber();
  quickSubmit.disabled = true;

  try {
    await saveReceipt({
      receiptNo,
      phone: normalizePhone(contactPhone.value),
      bankName: selectedBank.name,
      accountHolder: accountHolder.value.trim(),
      totalAmount,
      status: "접수완료",
      requestedAt: new Date().toISOString(),
      items: registeredGifts.map((item) => ({
        productName: item.productName,
        amount: item.amount,
        maskedPin: item.maskedPin,
      })),
    });
    openCompleteModal();
  } catch (error) {
    console.error(error);
    alert("신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    quickSubmit.disabled = false;
  }
});

bankSelectButton.addEventListener("click", openBankModal);
bankChangeButton.addEventListener("click", openBankModal);
bankModalClose.addEventListener("click", (event) => {
  event.preventDefault();
  closeBankModal();
});
bankModal.addEventListener("click", (event) => {
  if (event.target === bankModal) closeBankModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !bankModal.hidden) closeBankModal();
  if (event.key === "Escape" && !completeModal.hidden) closeCompleteModal();
});

completeModal.addEventListener("click", (event) => {
  if (event.target === completeModal) closeCompleteModal();
});

closeCompleteModal();
closeBankModal();

const initPage = async () => {
  await Promise.all([loadGiftcardTypes(), loadNotices()]);
  renderBankOptions();
  renderGiftPills();
  initMainLiveRolling();
};

initPage();



