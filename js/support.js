const noticeList = document.querySelector("[data-notice-list]");
const noticePanel = document.querySelector("[data-notice-panel]");
const noticeDetail = document.querySelector("[data-notice-detail]");
const faqPanel = document.querySelector("[data-faq-panel]");
const tabButtons = [...document.querySelectorAll("[data-support-tab]")];

const notices = [
  {
    id: 12,
    category: "수수료",
    title: "2026년 5월 상품권 매입 수수료 안내",
    author: "세움비즈",
    date: "2026.05.19",
    body: "2026년 5월 상품권 매입 수수료와 권종별 접수 기준을 안내드립니다. 접수 전 상품권 종류와 금액을 다시 한 번 확인해주시기 바랍니다.",
  },
  {
    id: 11,
    category: "수수료",
    title: "2026년 4월 상품권 매입 수수료 안내",
    author: "세움비즈",
    date: "2026.04.30",
    body: "2026년 4월 기준 상품권 매입 수수료 안내입니다. 시장 상황에 따라 일부 상품권의 매입 기준이 조정될 수 있습니다.",
  },
  {
    id: 10,
    category: "상담",
    title: "제휴업체 및 대량거래 상담문의",
    author: "관리자",
    date: "2026.04.18",
    body: "제휴업체 및 대량거래는 별도 상담을 통해 진행됩니다. 거래 상품권 종류, 예상 수량, 희망 처리 시간을 함께 알려주시면 빠르게 안내드리겠습니다.",
  },
  {
    id: 9,
    category: "서비스",
    title: "상품권 판매 사이트 오픈안내",
    author: "세움비즈",
    date: "2026.04.02",
    body: "상품권 판매 관련 신규 사이트가 오픈되었습니다. 자세한 이용 방법은 추후 공지사항을 통해 순차적으로 안내드리겠습니다.",
  },
  {
    id: 8,
    category: "점검",
    title: "은행 점검시간 입금 처리 안내",
    author: "관리자",
    date: "2026.03.27",
    body: "매일 23시45분부터 00시30분까지는 은행 점검시간입니다. 해당 시간 접수 건은 점검 이후 순차적으로 입금 처리됩니다.",
  },
  {
    id: 7,
    category: "안내",
    title: "모바일 상품권 핀번호 입력 유의사항",
    author: "세움비즈",
    date: "2026.03.12",
    body: "모바일 상품권 핀번호는 숫자를 빠짐없이 입력해야 합니다. 일부 번호가 누락되면 확인이 지연될 수 있습니다.",
  },
  {
    id: 6,
    category: "안내",
    title: "입금 계좌 정보 오입력 시 처리 안내",
    author: "관리자",
    date: "2026.02.24",
    body: "입금은행, 계좌번호, 예금주 정보가 정확하지 않으면 입금 처리가 지연될 수 있습니다. 신청 전 계좌 정보를 반드시 확인해주세요.",
  },
  {
    id: 5,
    category: "서비스",
    title: "신세계상품권 매입 접수 정상화 안내",
    author: "세움비즈",
    date: "2026.02.10",
    body: "일시적으로 지연되었던 신세계상품권 매입 접수가 정상화되었습니다. 현재 모든 권종 접수가 가능합니다.",
  },
  {
    id: 4,
    category: "안내",
    title: "롯데모바일 상품권 접수 가능 권종 안내",
    author: "세움비즈",
    date: "2026.01.28",
    body: "롯데모바일 상품권은 접수 가능한 권종이 제한될 수 있습니다. 접수 화면에서 선택 가능한 금액을 기준으로 신청해주세요.",
  },
  {
    id: 3,
    category: "공지",
    title: "설 연휴 기간 24시간 접수 운영 안내",
    author: "관리자",
    date: "2026.01.15",
    body: "설 연휴 기간에도 24시간 접수는 정상 운영됩니다. 다만 은행 및 제휴사 사정에 따라 일부 입금 처리는 지연될 수 있습니다.",
  },
];

const setActiveTab = (target) => {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.supportTab === target;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (target === "faq") {
    if (noticePanel) noticePanel.hidden = true;
    if (noticeDetail) noticeDetail.hidden = true;
    if (faqPanel) faqPanel.hidden = false;
    return;
  }

  if (noticePanel) noticePanel.hidden = false;
  if (noticeDetail) noticeDetail.hidden = true;
  if (faqPanel) faqPanel.hidden = true;
};

const renderNoticeDetail = (notice) => {
  if (!noticePanel || !noticeDetail) return;

  const category = document.createElement("span");
  category.className = "notice-category";
  category.textContent = notice.category;

  const title = document.createElement("h2");
  title.textContent = notice.title;

  const meta = document.createElement("dl");
  meta.className = "notice-detail-meta";
  [
    ["작성자", notice.author],
    ["작성일", notice.date],
  ].forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    meta.append(term, description);
  });

  const body = document.createElement("p");
  body.className = "notice-detail-body";
  body.textContent = notice.body;

  const backButton = document.createElement("button");
  backButton.className = "notice-back-button";
  backButton.type = "button";
  backButton.textContent = "목록으로 돌아가기";
  backButton.addEventListener("click", () => {
    noticeDetail.hidden = true;
    noticePanel.hidden = false;
  });

  noticeDetail.replaceChildren(category, title, meta, body, backButton);
  noticePanel.hidden = true;
  noticeDetail.hidden = false;
};

const createNoticeRow = (notice, index) => {
  const row = document.createElement("tr");
  row.tabIndex = 0;

  const number = document.createElement("td");
  number.textContent = String(index + 1);

  const category = document.createElement("td");
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "notice-category";
  categoryBadge.textContent = notice.category;
  category.append(categoryBadge);

  const title = document.createElement("td");
  title.className = "notice-title-cell";
  const titleButton = document.createElement("button");
  titleButton.className = "notice-title-button";
  titleButton.type = "button";
  titleButton.textContent = notice.title;
  titleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    renderNoticeDetail(notice);
  });
  title.append(titleButton);

  const author = document.createElement("td");
  author.textContent = notice.author;

  const date = document.createElement("td");
  date.textContent = notice.date;

  row.addEventListener("click", () => renderNoticeDetail(notice));
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      renderNoticeDetail(notice);
    }
  });

  row.append(number, category, title, author, date);
  return row;
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.supportTab));
});

if (noticeList) {
  noticeList.replaceChildren(...notices.map(createNoticeRow));
}
