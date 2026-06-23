/* ==========================================================================
   [GW App Gallery - Client JavaScript Application]
   ========================================================================== */

// 1. Supabase Credentials Configuration
// ※ 이 사이트는 완전한 클라이언트 앱(SPA)이므로, 공개적으로 노출되어도 무방한 'anon' (공개) 키를 사용합니다.
const SUPABASE_URL = "https://uypqettuaytbcyfhngnq.supabase.co";

// ⚠️ 사용자의 24시간 안전한 읽기/쓰기가 가능한 anon 키를 이곳에 입력해 주세요.
// 일단 빈 값으로 두며, 유효한 키가 지정되지 않았을 경우 사용자에게 경고 메시지를 노출합니다.
const SUPABASE_ANON_KEY = "sb_publishable_Q7otgfp69OfgIKzQAlRa_g_HDwcLDZc"; 

let supabaseClient = null;

// Initialize Supabase Client
if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY_HERE") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase Anon Key가 비어있습니다. 실제 기능을 작동하려면 app.js의 SUPABASE_ANON_KEY를 설정해야 합니다.");
}

// Global Application State
let currentUser = null;
let currentProfile = null;
let currentApps = [];
let activeCategory = "all";
let activeSort = "recent";
let searchQuery = "";
let activeAuthorRole = "all";
let selectedApp = null;

// 무한 스크롤 상태
const PAGE_SIZE = 10;
let currentPage = 0;
let isLoadingMore = false;
let hasMore = true;

// File Upload State
let uploadedCoverFile = null;
let uploadedHtmlFile = null;
// 갤러리 이미지: {file:File|null, url:string|null, previewSrc:string} 배열
let galleryItems = [];
const MAX_GALLERY_IMAGES = 8;

// Edit Mode State
let editingAppId = null;
let editingAppOriginal = null;

// Blob URL 관리 (소스코드 실행 시 생성, 모달 닫을 때 해제)
let currentBlobUrl = null;

// 현재 선택된 등록 방법 (link / html / code)
let activeMethod = "link";

/* ==========================================================================
   DOM Elements Selection
   ========================================================================== */
const elements = {
  // App UI
  appsGrid: document.getElementById("apps-grid"),
  emptyState: document.getElementById("empty-state"),
  searchInput: document.getElementById("search-input"),
  categoryTabs: document.getElementById("category-tabs"),
  sortSelect: document.getElementById("sort-select"),
  addAppBtn: document.getElementById("add-app-btn"),
  
  // Navigation & User
  loginNavBtn: document.getElementById("login-nav-btn"),
  userProfile: document.getElementById("user-profile"),
  userDisplayName: document.getElementById("user-display-name"),
  logoutBtn: document.getElementById("logout-btn"),
  
  // Auth Modal
  authModal: document.getElementById("auth-modal"),
  tabLogin: document.getElementById("tab-login"),
  tabSignup: document.getElementById("tab-signup"),
  loginForm: document.getElementById("login-form"),
  signupForm: document.getElementById("signup-form"),
  loginEmail: document.getElementById("login-email"),
  loginPass: document.getElementById("login-password"),
  signupUser: document.getElementById("signup-username"),
  signupEmail: document.getElementById("signup-email"),
  signupPass: document.getElementById("signup-password"),
  
  // Add App Modal
  addAppModal: document.getElementById("add-app-modal"),
  addAppForm: document.getElementById("add-app-form"),
  appTitle: document.getElementById("app-title"),
  appCategory: document.getElementById("app-category"),
  appDescription: document.getElementById("app-description"),
  appBodyText: document.getElementById("app-body-text"),
  appUrl: document.getElementById("app-url"),
  coverFile: document.getElementById("app-cover-file"),
  coverZone: document.getElementById("cover-zone"),
  coverPreviewContainer: document.getElementById("cover-preview-container"),
  coverPreview: document.getElementById("cover-preview"),
  removeCoverBtn: document.getElementById("remove-cover-btn"),
  htmlFile: document.getElementById("app-html-file"),
  htmlZone: document.getElementById("html-zone"),
  htmlUploadText: document.getElementById("html-upload-text"),
  htmlBadge: document.getElementById("html-badge"),
  htmlFilename: document.getElementById("html-filename"),
  removeHtmlBtn: document.getElementById("remove-html-btn"),
  galleryFile: document.getElementById("app-gallery-file"),
  galleryZone: document.getElementById("gallery-zone"),
  galleryPreviews: document.getElementById("gallery-previews"),
  submitAppBtn: document.getElementById("submit-app-btn"),
  
  // Detail Modal
  detailModal: document.getElementById("detail-modal"),
  detailCategory: document.getElementById("detail-category"),
  detailTitle: document.getElementById("detail-title"),
  detailAuthor: document.getElementById("detail-author"),
  detailDate: document.getElementById("detail-date"),
  detailViews: document.getElementById("detail-views"),
  detailCover: document.getElementById("detail-cover"),
  detailDescText: document.getElementById("detail-desc-text"),
  detailBody: document.getElementById("detail-body"),
  detailBodyText: document.getElementById("detail-body-text"),
  detailGalleryWrap: document.getElementById("detail-gallery-wrap"),
  detailGallery: document.getElementById("detail-gallery"),
  iframeRunner: document.getElementById("iframe-runner"),
  appIframe: document.getElementById("app-iframe"),
  iframeFullscreenBtn: document.getElementById("iframe-fullscreen-btn"),
  launchAppBtn: document.getElementById("launch-app-btn"),
  likeAppBtn: document.getElementById("like-app-btn"),
  editAppBtn: document.getElementById("edit-app-btn"),
  deleteAppBtn: document.getElementById("delete-app-btn"),
  shareAppBtn: document.getElementById("share-app-btn"),
  detailLikesBtnText: document.getElementById("detail-likes-btn-text"),
  commentsList: document.getElementById("comments-list"),
  commentForm: document.getElementById("comment-form"),
  commentText: document.getElementById("comment-text"),
  commentAnonWarning: document.getElementById("comment-anonymous-warning"),
  commentLoginLink: document.getElementById("comment-login-link")
};

/* ==========================================================================
   Application Initialization
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Lucide 아이콘 초기화
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
  
  // Supabase 클라이언트 확인
  if (!supabaseClient) {
    showSystemNotice("Supabase 설정이 필요합니다. app.js 소스코드 상단의 SUPABASE_ANON_KEY를 설정해 주세요.");
    elements.appsGrid.innerHTML = `
      <div class="loading-state">
        <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--accent-pink);"></i>
        <h3 style="margin-top: 14px; color: var(--text-primary);">Supabase API 키가 설정되지 않았습니다</h3>
        <p style="margin-top: 6px;">app.js 파일의 10번째 라인 근처에 학원 Supabase 프로젝트의 anon 키를 붙여넣어 주세요.</p>
      </div>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  setupEventListeners();
  checkAuthSession();
  fetchApps(true);
  checkDbStatus();
  initInfiniteScroll();
  checkSharedAppUrl();
});

/* ==========================================================================
   Auth Section (로그인 / 회원관리)
   ========================================================================== */

async function checkAuthSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Session fetch error:", error);
    return;
  }
  
  handleUserSession(session?.user || null);
  
  // Auth 상태 리스너 구독
  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleUserSession(session?.user || null).catch(err => {
      console.error("Auth state change error:", err);
    });
  });
}

async function handleUserSession(user) {
  currentUser = user;
  
  if (user) {
    // 사용자가 로그인한 상태
    elements.loginNavBtn.style.display = "none";
    elements.userProfile.style.display = "flex";
    elements.addAppBtn.style.display = "inline-flex";
    elements.commentAnonWarning.style.display = "none";
    elements.commentForm.style.display = "flex";
    
    // 프로필 정보 조회
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      
    if (error) {
      console.error("Profile fetch error:", error);
      // 프로필 정보가 테이블에 아직 생성되지 않은 경우 예외 보완
      currentProfile = { username: user.email.split("@")[0], role: "user" };
    } else {
      currentProfile = profile;
    }
    
    elements.userDisplayName.textContent = `${currentProfile.username} ${currentProfile.role === "teacher" ? "강사" : "학생"}`;
  } else {
    // 비로그인 상태
    elements.loginNavBtn.style.display = "inline-flex";
    elements.userProfile.style.display = "none";
    elements.addAppBtn.style.display = "none";
    elements.commentAnonWarning.style.display = "block";
    elements.commentForm.style.display = "none";
    currentProfile = null;
  }
}

// 회원가입 신청 핸들러
elements.signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const roleInput = elements.signupForm.querySelector("input[name='signup-role']:checked");
  if (!roleInput) {
    alert("강사 또는 학생을 선택해 주세요.");
    return;
  }
  const role = roleInput.value;
  const username = elements.signupUser.value.trim();
  const email = elements.signupEmail.value.trim();
  const password = elements.signupPass.value;

  const submitBtn = elements.signupForm.querySelector("button[type='submit']");
  setButtonLoading(submitBtn, true);

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, role } // 트리거가 수신하여 profiles 테이블에 입력
    }
  });
  
  setButtonLoading(submitBtn, false);
  
  if (error) {
    alert(`회원가입 중 오류가 발생했습니다: ${error.message}`);
  } else {
    alert("회원가입이 완료되었습니다!\n이제 로그인하여 앱 갤러리를 이용할 수 있습니다.");
    elements.signupForm.reset();
    closeModal(elements.authModal);
  }
});

// 로그인 핸들러
elements.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPass.value;
  
  const submitBtn = elements.loginForm.querySelector("button[type='submit']");
  setButtonLoading(submitBtn, true);
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  
  setButtonLoading(submitBtn, false);
  
  if (error) {
    alert(`로그인 실패: ${error.message}`);
  } else {
    closeModal(elements.authModal);
    elements.loginForm.reset();
  }
});

// 로그아웃 핸들러
elements.logoutBtn.addEventListener("click", async () => {
  if (confirm("로그아웃 하시겠습니까?")) {
    await supabaseClient.auth.signOut();
  }
});

/* ==========================================================================
   Data Fetching & Rendering (앱 데이터 조회 및 렌더링)
   ========================================================================== */

async function fetchApps(reset = true) {
  if (isLoadingMore) return;   // reset/더보기 모두 동시 실행 방지
  if (!reset && !hasMore) return;

  isLoadingMore = true;

  if (reset) {
    currentPage = 0;
    currentApps = [];
    hasMore = true;
    setGridLoading(true);
  } else {
    document.getElementById("load-more-spinner").classList.remove("spinner-hidden");
  }

  const from = currentPage * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabaseClient.from("apps").select("*");

  if (activeCategory   !== "all") query = query.eq("category",    activeCategory);
  if (activeAuthorRole !== "all") query = query.eq("author_role",  activeAuthorRole);

  if (searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%`);
  }

  if (activeSort === "recent")  query = query.order("created_at",  { ascending: false });
  else if (activeSort === "popular") query = query.order("views_count", { ascending: false });
  else if (activeSort === "likes")   query = query.order("likes_count", { ascending: false });

  query = query.range(from, to);

  const { data, error } = await query;

  if (reset) setGridLoading(false);
  else document.getElementById("load-more-spinner").classList.add("spinner-hidden");

  isLoadingMore = false;

  if (error) {
    console.error("Apps load error:", error);
    return;
  }

  const batch = data || [];
  if (batch.length < PAGE_SIZE) hasMore = false;

  if (reset) {
    currentApps = batch;
    renderApps();
  } else {
    const newCards = batch.filter(a => !currentApps.find(b => b.id === a.id));
    currentApps = [...currentApps, ...newCards];
    appendCards(newCards);
  }

  currentPage++;
}

const CATEGORY_PLACEHOLDER = {
  education:  { emoji: "📚", label: "교육자료",  color: "#4f46e5" },
  literature: { emoji: "📖", label: "문학작품",  color: "#be123c" },
  art:        { emoji: "🎨", label: "예술작품",  color: "#db2777" },
  science:    { emoji: "🔬", label: "과학자료",  color: "#059669" },
  coding:     { emoji: "💻", label: "코딩",     color: "#0891b2" },
  maker:      { emoji: "🛠️", label: "메이커",   color: "#d97706" },
  etc:        { emoji: "✨", label: "기타",     color: "#7c3aed" },
};

function makeCoverHtml(app) {
  if (app.cover_image_url) {
    return `<img class="card-image" src="${escapeHtml(app.cover_image_url)}" alt="${escapeHtml(app.title)}" loading="lazy">`;
  }
  const ph = CATEGORY_PLACEHOLDER[app.category] || CATEGORY_PLACEHOLDER.etc;
  return `<div class="card-placeholder" style="background: linear-gradient(135deg, ${ph.color}22, ${ph.color}44);">
    <span class="card-placeholder-emoji">${ph.emoji}</span>
    <span class="card-placeholder-label" style="color:${ph.color}">${ph.label}</span>
  </div>`;
}

function makeCard(app) {
  const card = document.createElement("div");
  card.className = "app-card";
  card.innerHTML = `
    <div class="card-image-wrapper">
      ${makeCoverHtml(app)}
      <span class="card-badge badge-${app.category}">${getCategoryLabel(app.category)}</span>
      <div class="card-overlay"><i data-lucide="play" class="overlay-icon"></i></div>
    </div>
    <div class="card-content">
      <h3 class="card-title" title="${escapeHtml(app.title)}">${escapeHtml(app.title)}</h3>
      <p class="card-desc">${escapeHtml(app.description) || "사용자 설명서가 등록되지 않은 앱입니다."}</p>
      <div class="card-footer">
        <span class="card-author">
          <i data-lucide="user" class="card-author-icon"></i>
          <span>${escapeHtml(app.author_name) || "익명 메이커"}</span>
        </span>
        <div class="card-stats">
          <span class="stat-item"><i data-lucide="eye"></i> ${app.views_count || 0}</span>
          <span class="stat-item"><i data-lucide="thumbs-up"></i> ${app.likes_count || 0}</span>
        </div>
      </div>
    </div>
  `;
  card.addEventListener("click", () => openAppDetail(app));
  return card;
}

function renderApps() {
  elements.appsGrid.innerHTML = "";

  if (currentApps.length === 0) {
    elements.emptyState.style.display = "flex";
    elements.appsGrid.style.display = "none";
    return;
  }

  elements.emptyState.style.display = "none";
  elements.appsGrid.style.display = "grid";

  currentApps.forEach(app => elements.appsGrid.appendChild(makeCard(app)));
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function appendCards(apps) {
  if (apps.length === 0) return;
  elements.emptyState.style.display = "none";
  elements.appsGrid.style.display = "grid";
  apps.forEach(app => elements.appsGrid.appendChild(makeCard(app)));
  if (typeof lucide !== "undefined") lucide.createIcons();
}

/* ==========================================================================
   App Detail Modal Logic (앱 상세 모달 제어 및 댓글)
   ========================================================================== */

async function openAppDetail(app) {
  selectedApp = app;
  openModal(elements.detailModal);
  
  // UI 매핑
  elements.detailCategory.textContent = getCategoryLabel(app.category);
  elements.detailCategory.className = `category-badge badge-${app.category}`;
  elements.detailTitle.textContent = app.title;
  elements.detailAuthor.textContent = app.author_name || "익명 메이커";
  elements.detailDate.textContent = formatKoreanDate(app.created_at);
  elements.detailViews.textContent = app.views_count || 0;
  // 커버 이미지: 있으면 표시, 없으면 영역 숨김
  if (app.cover_image_url) {
    elements.detailCover.src = app.cover_image_url;
    elements.detailCover.parentElement.style.display = "flex";
  } else {
    elements.detailCover.src = "";
    elements.detailCover.parentElement.style.display = "none";
  }
  elements.detailDescText.textContent = formatDescription(app.description);

  // 작품 본문 (문학작품 등)
  if (app.body_text && app.body_text.trim()) {
    elements.detailBodyText.textContent = app.body_text;
    elements.detailBody.style.display = "block";
  } else {
    elements.detailBody.style.display = "none";
  }

  // 작품 이미지 갤러리 (예술작품 등)
  const gallery = Array.isArray(app.gallery_images) ? app.gallery_images : [];
  if (gallery.length > 0) {
    elements.detailGallery.innerHTML = gallery.map((url, i) => `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="detail-gallery-item" title="크게 보기">
        <img src="${escapeHtml(url)}" alt="작품 이미지 ${i + 1}" loading="lazy">
      </a>
    `).join("");
    elements.detailGalleryWrap.style.display = "block";
  } else {
    elements.detailGallery.innerHTML = "";
    elements.detailGalleryWrap.style.display = "none";
  }

  elements.detailLikesBtnText.textContent = `좋아요 ${app.likes_count || 0}`;
  elements.likeAppBtn.classList.remove("liked");

  // 로그인 상태면 이미 좋아요 눌렀는지 확인
  if (currentUser) {
    const { data: likeRow } = await supabaseClient
      .from("app_likes")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .eq("app_id", app.id)
      .maybeSingle();
    if (likeRow) elements.likeAppBtn.classList.add("liked");
  }
  
  // Blob URL 정리 (이전 소스코드 앱)
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }

  // Iframe 앱 실행기 제어
  if (app.source_code) {
    const blob = new Blob([app.source_code], { type: "text/html" });
    currentBlobUrl = URL.createObjectURL(blob);
    elements.iframeRunner.style.display = "block";
    elements.appIframe.src = currentBlobUrl;
    elements.launchAppBtn.style.display = "inline-flex";
  } else if (app.html_file_path) {
    elements.iframeRunner.style.display = "block";
    elements.appIframe.src = app.html_file_path;
    elements.launchAppBtn.style.display = "inline-flex";
  } else {
    elements.iframeRunner.style.display = "none";
    elements.appIframe.src = "";
    elements.launchAppBtn.style.display = app.app_url ? "inline-flex" : "none";
  }

  // Launch App URL 바인딩
  elements.launchAppBtn.onclick = () => {
    const runUrl = currentBlobUrl || app.html_file_path || app.app_url;
    if (runUrl) window.open(runUrl, "_blank");
  };
  
  // 공유 버튼
  elements.shareAppBtn.onclick = () => copyShareLink(app.id);

  // 수정·삭제 버튼: 본인 또는 관리자(is_admin)
  const isAppAuthor = currentUser && currentUser.id === app.author_id;
  const isAdmin     = currentProfile?.is_admin === true;
  const canEdit     = isAppAuthor || isAdmin;
  elements.editAppBtn.style.display   = canEdit ? "inline-flex" : "none";
  elements.deleteAppBtn.style.display = canEdit ? "inline-flex" : "none";
  if (canEdit) {
    elements.editAppBtn.onclick   = () => openEditMode(app);
    elements.deleteAppBtn.onclick = () => deleteApp(app);
  }

  // 소스코드 다운로드 버튼: 관리자 + source_code 있는 경우만 표시
  const downloadBtn = document.getElementById("download-source-btn");
  if (isAdmin && app.source_code) {
    downloadBtn.style.display = "inline-flex";
    downloadBtn.onclick = () => {
      const fileName = (app.title || "app").replace(/[^a-zA-Z0-9가-힣]/g, "_") + ".html";
      const blob = new Blob([app.source_code], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
  } else {
    downloadBtn.style.display = "none";
  }

  // 댓글 목록 조회
  fetchComments(app.id);
  
  // 조회수(views_count) 증가 — 같은 세션에서 중복 집계 방지
  const viewedKey = `viewed_${app.id}`;
  if (!sessionStorage.getItem(viewedKey)) {
    sessionStorage.setItem(viewedKey, "1");
    supabaseClient
      .rpc("increment_views", { row_id: app.id })
      .then(({ error }) => {
        if (error) {
          supabaseClient
            .from("apps")
            .update({ views_count: (app.views_count || 0) + 1 })
            .eq("id", app.id)
            .then(() => {
              app.views_count = (app.views_count || 0) + 1;
              elements.detailViews.textContent = app.views_count;
            });
        } else {
          app.views_count = (app.views_count || 0) + 1;
          elements.detailViews.textContent = app.views_count;
        }
      });
  }
}

// 좋아요 토글 (DB 중복 방지)
elements.likeAppBtn.onclick = async () => {
  if (!selectedApp) return;
  if (!currentUser) {
    alert("로그인 후 좋아요를 누를 수 있습니다.");
    return;
  }

  const alreadyLiked = elements.likeAppBtn.classList.contains("liked");

  if (alreadyLiked) {
    // 좋아요 취소
    const { error } = await supabaseClient
      .from("app_likes")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("app_id", selectedApp.id);
    if (error) return;

    const newLikes = Math.max(0, (selectedApp.likes_count || 1) - 1);
    await supabaseClient.from("apps").update({ likes_count: newLikes }).eq("id", selectedApp.id);
    selectedApp.likes_count = newLikes;
    elements.detailLikesBtnText.textContent = `좋아요 ${newLikes}`;
    elements.likeAppBtn.classList.remove("liked");
    syncAppInMemory(selectedApp.id, { likes_count: newLikes });

  } else {
    // 좋아요 추가
    const { error } = await supabaseClient
      .from("app_likes")
      .insert({ user_id: currentUser.id, app_id: selectedApp.id });
    if (error) return;

    const newLikes = (selectedApp.likes_count || 0) + 1;
    await supabaseClient.from("apps").update({ likes_count: newLikes }).eq("id", selectedApp.id);
    selectedApp.likes_count = newLikes;
    elements.detailLikesBtnText.textContent = `좋아요 ${newLikes}`;
    elements.likeAppBtn.classList.add("liked");
    syncAppInMemory(selectedApp.id, { likes_count: newLikes });
  }
};

// Iframe 전체화면 시뮬레이션 토글
elements.iframeFullscreenBtn.addEventListener("click", () => {
  elements.iframeRunner.classList.toggle("fullscreen");
  
  // 전체화면 여부에 따른 아이콘 체인지
  const icon = elements.iframeFullscreenBtn.querySelector("i");
  if (elements.iframeRunner.classList.contains("fullscreen")) {
    icon.setAttribute("data-lucide", "minimize-2");
  } else {
    icon.setAttribute("data-lucide", "maximize-2");
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
});

// 댓글 가져오기
async function fetchComments(appId) {
  elements.commentsList.innerHTML = `<p class="comment-warning">댓글을 불러오는 중...</p>`;
  
  const { data, error } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("app_id", appId)
    .order("created_at", { ascending: true });
    
  if (error) {
    console.error("Comments read error:", error);
    elements.commentsList.innerHTML = `<p class="comment-warning">댓글을 불러오는데 실패했습니다.</p>`;
    return;
  }
  
  if (!data || data.length === 0) {
    elements.commentsList.innerHTML = `<p class="comment-warning">등록된 피드백이 없습니다.<br>첫 번째 의견을 남겨주세요!</p>`;
    return;
  }
  
  elements.commentsList.innerHTML = "";
  data.forEach(comment => {
    const card = document.createElement("div");
    card.className = "comment-card";
    const canDelete = currentUser && currentUser.id === comment.author_id;
    card.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.author_name)}</span>
        <span class="comment-date">${formatKoreanDate(comment.created_at)}</span>
      </div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>
      ${canDelete ? `<button class="btn-delete-comment" title="댓글 삭제"><i data-lucide="x"></i></button>` : ""}
    `;
    if (canDelete) {
      card.querySelector(".btn-delete-comment").addEventListener("click", async () => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;
        const { error } = await supabaseClient.from("comments").delete().eq("id", comment.id);
        if (!error) fetchComments(selectedApp.id);
      });
    }
    elements.commentsList.appendChild(card);
  });
}

// 댓글 작성 핸들러
elements.commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !selectedApp) return;
  
  const content = elements.commentText.value.trim();
  if (!content) return;
  
  const submitBtn = elements.commentForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  
  const { data, error } = await supabaseClient
    .from("comments")
    .insert([{
      app_id: selectedApp.id,
      author_id: currentUser.id,
      author_name: currentProfile.username,
      content: content
    }]);
    
  submitBtn.disabled = false;
  
  if (error) {
    alert("댓글을 등록하지 못했습니다: " + error.message);
  } else {
    elements.commentText.value = "";
    fetchComments(selectedApp.id);
  }
});

/* ==========================================================================
   Add App Modal Logic (앱 업로드 및 등록 구현)
   ========================================================================== */

// 드래그 앤 드롭 영역 컨트롤러
function initDragAndDrop(zone, fileInput, onFileSelected) {
  zone.addEventListener("click", () => fileInput.click());
  
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });
  
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      onFileSelected(fileInput.files[0]);
    }
  });
}

// 1. 표지 이미지 업로드 처리기
initDragAndDrop(elements.coverZone, elements.coverFile, (file) => {
  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 업로드할 수 있습니다.");
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert("표지 이미지는 3MB 이하만 업로드할 수 있습니다.");
    return;
  }
  uploadedCoverFile = file;
  
  // 이미지 파일 로컬 프리뷰 표시
  const reader = new FileReader();
  reader.onload = (e) => {
    elements.coverPreview.src = e.target.result;
    elements.coverPreviewContainer.style.display = "flex";
  };
  reader.readAsDataURL(file);
});

elements.removeCoverBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // Zone 클릭으로 전파 방지
  uploadedCoverFile = null;
  elements.coverFile.value = "";
  elements.coverPreview.src = "";
  elements.coverPreviewContainer.style.display = "none";
});

// 1-2. 작품 이미지 갤러리 업로드 처리기 (여러 장)
function addGalleryFiles(fileList) {
  const files = Array.from(fileList);
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      alert(`이미지 파일만 추가할 수 있습니다: ${file.name}`);
      continue;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert(`갤러리 이미지는 장당 3MB 이하여야 합니다: ${file.name}`);
      continue;
    }
    if (galleryItems.length >= MAX_GALLERY_IMAGES) {
      alert(`갤러리 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 가능합니다.`);
      break;
    }
    const item = { file, url: null, previewSrc: "" };
    galleryItems.push(item);
    const reader = new FileReader();
    reader.onload = (e) => { item.previewSrc = e.target.result; renderGalleryPreviews(); };
    reader.readAsDataURL(file);
  }
  renderGalleryPreviews();
}

function renderGalleryPreviews() {
  elements.galleryPreviews.innerHTML = "";
  galleryItems.forEach((item, idx) => {
    const cell = document.createElement("div");
    cell.className = "gallery-preview-cell";
    cell.innerHTML = `
      <img src="${item.previewSrc || item.url || ""}" alt="갤러리 이미지 ${idx + 1}">
      <button type="button" class="gallery-preview-remove" title="이미지 제거"><i data-lucide="x"></i></button>
    `;
    cell.querySelector(".gallery-preview-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      galleryItems.splice(idx, 1);
      renderGalleryPreviews();
    });
    elements.galleryPreviews.appendChild(cell);
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

elements.galleryZone.addEventListener("click", () => elements.galleryFile.click());
elements.galleryZone.addEventListener("dragover", (e) => { e.preventDefault(); elements.galleryZone.classList.add("dragover"); });
elements.galleryZone.addEventListener("dragleave", () => elements.galleryZone.classList.remove("dragover"));
elements.galleryZone.addEventListener("drop", (e) => {
  e.preventDefault();
  elements.galleryZone.classList.remove("dragover");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) addGalleryFiles(e.dataTransfer.files);
});
elements.galleryFile.addEventListener("change", () => {
  if (elements.galleryFile.files && elements.galleryFile.files.length > 0) addGalleryFiles(elements.galleryFile.files);
  elements.galleryFile.value = "";
});

// 2. HTML 파일 업로드 처리기
initDragAndDrop(elements.htmlZone, elements.htmlFile, (file) => {
  if (!file.name.endsWith(".html")) {
    alert("확장자가 .html인 파일만 업로드 가능합니다.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("HTML 파일은 5MB 이하만 업로드할 수 있습니다.");
    return;
  }
  uploadedHtmlFile = file;
  elements.htmlFilename.textContent = file.name;
  elements.htmlBadge.style.display = "flex";
  elements.htmlUploadText.style.display = "none";
});

elements.removeHtmlBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  uploadedHtmlFile = null;
  elements.htmlFile.value = "";
  elements.htmlBadge.style.display = "none";
  elements.htmlUploadText.style.display = "block";
});

// 3. 앱 등록/수정 폼 서브밋 핸들러
elements.addAppForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const title = elements.appTitle.value.trim();
  const category = elements.appCategory.value;
  const description = elements.appDescription.value.trim();
  const bodyText = elements.appBodyText.value.trim();
  const appUrl = elements.appUrl.value.trim();
  const sourceCode = document.getElementById("app-source-code").value.trim();

  // 방법별 최소 입력 검사
  if (activeMethod === "link" && !appUrl) {
    alert("실행할 URL을 입력해 주세요."); return;
  }
  if (activeMethod === "html" && !uploadedHtmlFile && !editingAppOriginal?.html_file_path) {
    alert("HTML 파일을 업로드해 주세요."); return;
  }
  if (activeMethod === "code" && !sourceCode) {
    alert("HTML 소스코드를 붙여넣어 주세요."); return;
  }

  setButtonLoading(elements.submitAppBtn, true);

  try {
    let coverImageUrl = editingAppOriginal?.cover_image_url || "";
    let htmlFileUrl   = editingAppOriginal?.html_file_path  || null;
    let savedSourceCode = editingAppOriginal?.source_code  || null;

    // A. 새 표지 이미지 업로드 (변경된 경우에만)
    if (uploadedCoverFile) {
      const coverExt  = uploadedCoverFile.name.split(".").pop();
      const coverPath = `covers/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${coverExt}`;
      const { error: coverUploadError } = await supabaseClient.storage
        .from("app-gallery").upload(coverPath, uploadedCoverFile);
      if (coverUploadError) throw new Error(`표지 이미지 업로드 실패: ${coverUploadError.message}`);
      coverImageUrl = supabaseClient.storage.from("app-gallery").getPublicUrl(coverPath).data.publicUrl;
    }

    // A-2. 갤러리 이미지 업로드 (새 파일만 업로드, 기존 URL은 유지) — 순서 보존
    const galleryUrls = [];
    for (const item of galleryItems) {
      if (item.url) {
        galleryUrls.push(item.url);
      } else if (item.file) {
        const gExt  = item.file.name.split(".").pop();
        const gPath = `gallery/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${gExt}`;
        const { error: gErr } = await supabaseClient.storage
          .from("app-gallery").upload(gPath, item.file);
        if (gErr) throw new Error(`갤러리 이미지 업로드 실패: ${gErr.message}`);
        galleryUrls.push(supabaseClient.storage.from("app-gallery").getPublicUrl(gPath).data.publicUrl);
      }
    }

    // B. 방법별 처리
    if (activeMethod === "html" && uploadedHtmlFile) {
      const htmlPath = `htmls/${Date.now()}_${uploadedHtmlFile.name}`;
      const { error: htmlUploadError } = await supabaseClient.storage
        .from("app-gallery").upload(htmlPath, uploadedHtmlFile);
      if (htmlUploadError) throw new Error(`HTML 파일 업로드 실패: ${htmlUploadError.message}`);
      htmlFileUrl = supabaseClient.storage.from("app-gallery").getPublicUrl(htmlPath).data.publicUrl;
      savedSourceCode = null;
    } else if (activeMethod === "code") {
      savedSourceCode = sourceCode;
      htmlFileUrl = null;
    } else if (activeMethod === "link") {
      htmlFileUrl = null;
      savedSourceCode = null;
    }

    const appData = {
      title, category, description,
      body_text: bodyText || null,
      gallery_images: galleryUrls,
      app_url: activeMethod === "link" ? (appUrl || null) : null,
      cover_image_url: coverImageUrl,
      html_file_path: htmlFileUrl,
      source_code: savedSourceCode,
    };

    if (editingAppId) {
      // ── 수정 모드 ──
      const { error: updateErr } = await supabaseClient
        .from("apps").update(appData).eq("id", editingAppId);
      if (updateErr) throw updateErr;
      syncAppInMemory(editingAppId, appData);
      alert("앱이 수정되었습니다.");
    } else {
      // ── 신규 등록 모드 ──
      const { error: dbError } = await supabaseClient
        .from("apps")
        .insert([{ ...appData, author_id: currentUser.id, author_name: currentProfile.username, author_role: currentProfile.role || "student" }]);
      if (dbError) throw dbError;
      alert("축하합니다! 작품이 정상적으로 전시되었습니다.");
      fetchApps();
    }

    resetAppForm();
    closeModal(elements.addAppModal);

  } catch (err) {
    console.error("App save error:", err);
    alert(err.message || "저장 중 오류가 발생했습니다.");
  } finally {
    setButtonLoading(elements.submitAppBtn, false);
  }
});

async function deleteApp(app) {
  if (!confirm(`"${app.title}" 앱을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
  const { error } = await supabaseClient.from("apps").delete().eq("id", app.id);
  if (error) { alert("삭제 중 오류가 발생했습니다: " + error.message); return; }
  closeModal(elements.detailModal);
  currentApps = currentApps.filter(a => a.id !== app.id);
  renderApps();
}

function resetAppForm() {
  elements.addAppForm.reset();
  uploadedCoverFile = null;
  uploadedHtmlFile  = null;
  galleryItems      = [];
  renderGalleryPreviews();
  editingAppId       = null;
  editingAppOriginal = null;
  elements.coverPreview.src = "";
  elements.coverPreviewContainer.style.display = "none";
  elements.htmlBadge.style.display = "none";
  elements.htmlUploadText.style.display = "block";
  // 방법 선택 초기화 (링크로)
  activeMethod = "link";
  document.querySelector("input[name='app-method'][value='link']").checked = true;
  document.getElementById("method-link-section").classList.remove("method-hidden");
  document.getElementById("method-html-section").classList.add("method-hidden");
  document.getElementById("method-code-section").classList.add("method-hidden");
  document.querySelectorAll(".method-option").forEach(opt => opt.classList.remove("method-option-active"));
  document.getElementById("method-opt-link").classList.add("method-option-active");
  document.getElementById("app-source-code").value = "";
  // 모달 제목 원복
  document.querySelector("#add-app-modal h2").textContent = "새로운 작품 전시";
  document.querySelector("#add-app-modal .modal-lead").textContent = "선생님과 학생들이 체험할 수 있도록 멋지게 소개해 주세요!";
  document.getElementById("submit-app-btn").querySelector(".btn-text").textContent = "전시하기";
}

function openEditMode(app) {
  editingAppId       = app.id;
  editingAppOriginal = app;

  // 폼 채우기
  elements.appTitle.value       = app.title       || "";
  elements.appCategory.value    = app.category    || "education";
  elements.appDescription.value = app.description || "";
  elements.appBodyText.value    = app.body_text   || "";
  elements.appUrl.value         = app.app_url     || "";

  // 기존 갤러리 이미지 복원 (URL 항목으로)
  const existingGallery = Array.isArray(app.gallery_images) ? app.gallery_images : [];
  galleryItems = existingGallery.map(url => ({ file: null, url, previewSrc: url }));
  renderGalleryPreviews();

  // 등록 방법 복원
  let method = "link";
  if (app.source_code) method = "code";
  else if (app.html_file_path) method = "html";
  activeMethod = method;
  document.querySelector(`input[name='app-method'][value='${method}']`).checked = true;
  document.getElementById("method-link-section").classList.toggle("method-hidden", method !== "link");
  document.getElementById("method-html-section").classList.toggle("method-hidden", method !== "html");
  document.getElementById("method-code-section").classList.toggle("method-hidden", method !== "code");
  document.querySelectorAll(".method-option").forEach(opt => opt.classList.remove("method-option-active"));
  document.querySelector(`input[name='app-method'][value='${method}']`).closest(".method-option").classList.add("method-option-active");
  if (app.source_code) document.getElementById("app-source-code").value = app.source_code;

  // 기존 커버 이미지 미리보기
  if (app.cover_image_url) {
    elements.coverPreview.src = app.cover_image_url;
    elements.coverPreviewContainer.style.display = "flex";
  }

  // 모달 제목/버튼 수정 모드로 변경
  document.querySelector("#add-app-modal h2").textContent = "앱 수정";
  document.querySelector("#add-app-modal .modal-lead").textContent = "내용을 수정한 후 저장하기를 눌러주세요.";
  document.getElementById("submit-app-btn").querySelector(".btn-text").textContent = "저장하기";

  closeModal(elements.detailModal);
  openModal(elements.addAppModal);
}

/* ==========================================================================
   UI Utility Functions & Shared Helpers (유틸리티)
   ========================================================================== */

function setupEventListeners() {
  // 모달 트리거 이벤트
  elements.loginNavBtn.addEventListener("click", () => {
    // 폼 초기 상태 로그인 활성화
    toggleAuthTabs("login");
    openModal(elements.authModal);
  });
  
  elements.commentLoginLink.addEventListener("click", () => {
    toggleAuthTabs("login");
    openModal(elements.authModal);
  });
  
  elements.addAppBtn.addEventListener("click", () => openModal(elements.addAppModal));

  // 등록 방법 선택 라디오
  document.querySelectorAll("input[name='app-method']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      activeMethod = e.target.value;
      document.getElementById("method-link-section").classList.toggle("method-hidden", activeMethod !== "link");
      document.getElementById("method-html-section").classList.toggle("method-hidden", activeMethod !== "html");
      document.getElementById("method-code-section").classList.toggle("method-hidden", activeMethod !== "code");
      document.querySelectorAll(".method-option").forEach(opt => opt.classList.remove("method-option-active"));
      e.target.closest(".method-option").classList.add("method-option-active");
    });
  });

  // 내 활동 버튼
  document.getElementById("my-activity-btn").addEventListener("click", openActivityModal);

  // QR코드 모달
  document.getElementById("qr-btn").addEventListener("click", () => {
    openModal(document.getElementById("qr-modal"));
  });
  document.querySelector("#qr-modal .modal-close").addEventListener("click", () => {
    closeModal(document.getElementById("qr-modal"));
  });
  document.querySelector("#qr-modal .modal-backdrop").addEventListener("click", () => {
    closeModal(document.getElementById("qr-modal"));
  });

  // 내 활동 탭 전환
  document.querySelector(".activity-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".activity-tab");
    if (!tab) return;
    document.querySelectorAll(".activity-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("my-apps-view").classList.toggle("activity-view-hidden", target !== "my-apps");
    document.getElementById("my-posts-view").classList.toggle("activity-view-hidden", target !== "my-posts");
    if (target === "my-posts") fetchMyPosts();
  });

  // 강사 선택 시 실명 안내 표시
  elements.signupForm.querySelectorAll("input[name='signup-role']").forEach(radio => {
    radio.addEventListener("change", () => {
      const notice = document.getElementById("teacher-name-notice");
      notice.classList.toggle("notice-hidden", radio.value !== "teacher");
      if (typeof lucide !== "undefined") lucide.createIcons();
    });
  });
  
  // 모달 닫기
  document.querySelectorAll(".modal-close, .modal-close-btn, .modal-backdrop").forEach(closeBtn => {
    closeBtn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      closeModal(modal);
    });
  });
  
  // 로그인/회원가입 탭 토글
  elements.tabLogin.addEventListener("click", () => toggleAuthTabs("login"));
  elements.tabSignup.addEventListener("click", () => toggleAuthTabs("signup"));
  
  // 검색어 입력 감지 (서버 사이드 — 디바운스 300ms)
  let searchTimer = null;
  elements.searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchApps(true), 300);
  });
  
  // 카테고리 탭 클릭
  elements.categoryTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab-btn");
    if (!tab) return;
    
    elements.categoryTabs.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    tab.classList.add("active");
    
    activeCategory = tab.dataset.category;
    fetchApps();
  });
  
  // 정렬 셀렉트 변경
  elements.sortSelect.addEventListener("change", (e) => {
    activeSort = e.target.value;
    fetchApps();
  });

  // 작성자 구분 필터
  document.querySelector(".role-filter-bar").addEventListener("click", (e) => {
    const btn = e.target.closest(".role-filter-btn");
    if (!btn) return;
    document.querySelectorAll(".role-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeAuthorRole = btn.dataset.role;
    fetchApps();
  });
}

function openModal(modal) {
  modal.classList.add("active");
  document.body.style.overflow = "hidden"; // 배경 스크롤 차단
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
  
  // 상세 모달을 닫을 경우 iframe 리소스 해제하여 성능 저하 방지
  if (modal === elements.detailModal) {
    elements.appIframe.src = "";
    elements.iframeRunner.classList.remove("fullscreen");
    selectedApp = null;
  }
}

function toggleAuthTabs(mode) {
  if (mode === "login") {
    elements.tabLogin.classList.add("active");
    elements.tabSignup.classList.remove("active");
    elements.loginForm.style.display = "flex";
    elements.signupForm.style.display = "none";
  } else {
    elements.tabLogin.classList.remove("active");
    elements.tabSignup.classList.add("active");
    elements.loginForm.style.display = "none";
    elements.signupForm.style.display = "flex";
  }
}

function getCategoryLabel(category) {
  const labels = {
    education: "📚 교육자료",
    literature: "📖 문학작품",
    art: "🎨 예술작품",
    science: "🔬 과학자료",
    coding: "💻 코딩",
    maker: "🛠️ 메이커",
    etc: "✨ 기타"
  };
  return labels[category] || category;
}

// 설명 텍스트에서 번호 항목(1. 2. …) 앞에 자동 줄바꿈 추가
function formatDescription(text) {
  if (!text) return "";
  // 줄바꿈이 이미 충분하면 그대로 반환
  if ((text.match(/\n/g) || []).length >= 3) return text.trim();
  // 숫자. 패턴 앞 공백을 줄바꿈으로 교체
  return text
    .replace(/\s+(\d+\.)\s*/g, '\n$1 ')
    .trim();
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatKoreanDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const parts = {};
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(date).forEach(({ type, value }) => { parts[type] = value; });
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function setButtonLoading(button, isLoading) {
  const textSpan = button.querySelector(".btn-text");
  const spinnerSpan = button.querySelector(".btn-spinner");
  
  if (isLoading) {
    button.disabled = true;
    if (textSpan) textSpan.style.display = "none";
    if (spinnerSpan) spinnerSpan.style.display = "inline-block";
  } else {
    button.disabled = false;
    if (textSpan) textSpan.style.display = "inline-block";
    if (spinnerSpan) spinnerSpan.style.display = "none";
  }
}

function syncAppInMemory(appId, updates) {
  const idx = currentApps.findIndex(a => a.id === appId);
  if (idx !== -1) {
    Object.assign(currentApps[idx], updates);
    renderApps();
  }
}

function setGridLoading(isLoading) {
  if (isLoading) {
    elements.emptyState.style.display = "none";
    elements.appsGrid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>앱 데이터를 동기화하는 중입니다...</p>
      </div>
    `;
    elements.appsGrid.style.display = "flex";
  }
}

function showSystemNotice(msg) {
  console.log("[Notice] " + msg);
}

/* ==========================================================================
   방명록 (Guestbook — 포스트잇)
   posts 테이블 재사용: title, content(본문), author_*, created_at, category 고정 'etc'
   ========================================================================== */

const GB_LIMIT = 100;

// 로그인 여부에 따라 작성 폼 상태 갱신
function gbUpdateAuth() {
  const loggedIn = !!currentUser;
  document.getElementById("gb-login-hint").style.display = loggedIn ? "none" : "block";
  document.getElementById("gb-title").disabled  = !loggedIn;
  document.getElementById("gb-body").disabled   = !loggedIn;
  document.getElementById("gb-submit").disabled = !loggedIn;
  document.getElementById("gb-form").classList.toggle("gb-form-locked", !loggedIn);
}

async function fetchGuestbook() {
  const listEl  = document.getElementById("gb-list");
  const emptyEl = document.getElementById("gb-empty");
  listEl.innerHTML = `<li class="gb-loading">불러오는 중...</li>`;
  emptyEl.classList.add("board-empty-hidden");

  const { data, error } = await supabaseClient
    .from("posts").select("*")
    .order("created_at", { ascending: false })
    .limit(GB_LIMIT);

  listEl.innerHTML = "";
  if (error) {
    emptyEl.textContent = "불러오기 실패";
    emptyEl.classList.remove("board-empty-hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.textContent = "아직 글이 없어요. 첫 메모를 남겨보세요.";
    emptyEl.classList.remove("board-empty-hidden");
    return;
  }
  data.forEach(post => listEl.appendChild(gbRow(post)));
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// 본인 또는 관리자만 삭제 가능 / 수정은 본인만
function gbCanDelete(post) {
  return currentUser && (currentUser.id === post.author_id || (currentProfile && currentProfile.is_admin));
}
function gbCanEdit(post) {
  return currentUser && currentUser.id === post.author_id;
}

function gbRow(post) {
  const li = document.createElement("li");
  li.className = "note-item";
  li.dataset.id = post.id;
  li._data = post;
  gbView(li, post);
  return li;
}

function gbView(li, post) {
  li._data = post;
  const canEdit = gbCanEdit(post);
  const canDel  = gbCanDelete(post);
  li.innerHTML =
    `<div class="nactions">` +
      (canEdit ? `<button class="nedit" title="수정">✏️</button>` : "") +
      (canDel  ? `<button class="ndel" title="삭제">×</button>` : "") +
    `</div>` +
    `<h4>${escapeHtml(post.title)}</h4>` +
    (post.content ? `<div class="nbody">${escapeHtml(post.content)}</div>` : "") +
    `<div class="nmeta">${escapeHtml(post.author_name || "익명")} · ${formatKoreanDate(post.created_at)}</div>`;
  if (canEdit) li.querySelector(".nedit").addEventListener("click", () => gbEdit(li, li._data));
  if (canDel)  li.querySelector(".ndel").addEventListener("click", () => gbDelete(li, post.id));
}

function gbEdit(li, post) {
  li.innerHTML =
    `<input class="ne-title" maxlength="120" value="${escapeHtml(post.title)}">` +
    `<textarea class="ne-body" maxlength="2000" rows="4">${escapeHtml(post.content || "")}</textarea>` +
    `<div class="ne-btns"><button class="ne-cancel">취소</button><button class="ne-save">저장</button></div>`;
  li.querySelector(".ne-cancel").addEventListener("click", () => gbView(li, li._data));
  li.querySelector(".ne-save").addEventListener("click", async () => {
    const title = li.querySelector(".ne-title").value.trim();
    if (!title) { li.querySelector(".ne-title").focus(); return; }
    const content = li.querySelector(".ne-body").value.trim();
    const { data, error } = await supabaseClient
      .from("posts").update({ title, content }).eq("id", post.id).select().single();
    if (error) { alert("수정 실패: " + error.message); return; }
    gbView(li, data);
  });
  li.querySelector(".ne-title").focus();
}

async function gbDelete(li, id) {
  if (!confirm("이 글을 삭제할까요?")) return;
  const { error } = await supabaseClient.from("posts").delete().eq("id", id);
  if (error) { alert("삭제 실패: " + error.message); return; }
  li.remove();
  if (!document.getElementById("gb-list").children.length) {
    const emptyEl = document.getElementById("gb-empty");
    emptyEl.textContent = "아직 글이 없어요. 첫 메모를 남겨보세요.";
    emptyEl.classList.remove("board-empty-hidden");
  }
}

document.getElementById("gb-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) { openModal(document.getElementById("auth-modal")); return; }

  const titleEl = document.getElementById("gb-title");
  const title = titleEl.value.trim();
  const body  = document.getElementById("gb-body").value.trim();
  if (!title) { titleEl.focus(); return; }

  const btn = document.getElementById("gb-submit");
  setButtonLoading(btn, true);
  const { data, error } = await supabaseClient.from("posts").insert([{
    category: "etc", title, content: body,
    author_id: currentUser.id,
    author_name: currentProfile.username,
    author_role: currentProfile.role || "student"
  }]).select().single();
  setButtonLoading(btn, false);

  if (error) { alert("게시 실패: " + error.message); return; }

  document.getElementById("gb-form").reset();
  document.getElementById("gb-empty").classList.add("board-empty-hidden");
  const listEl = document.getElementById("gb-list");
  listEl.insertBefore(gbRow(data), listEl.firstChild);
  titleEl.focus();
});

// 방명록 화면 전환 (모달 X — 갤러리 숨기고 방명록 표시)
function showGuestbook() {
  document.querySelector(".control-section").style.display = "none";
  document.querySelector(".showcase-section").style.display = "none";
  document.getElementById("guestbook-view").style.display = "block";
  gbUpdateAuth();
  fetchGuestbook();
  window.scrollTo(0, 0);
  if (typeof lucide !== "undefined") lucide.createIcons();
}
function hideGuestbook() {
  document.getElementById("guestbook-view").style.display = "none";
  document.querySelector(".control-section").style.display = "";
  document.querySelector(".showcase-section").style.display = "";
}
// 방명록 버튼 = 토글 (방명록 ↔ 갤러리)
document.getElementById("board-btn").addEventListener("click", () => {
  const gbVisible = document.getElementById("guestbook-view").style.display === "block";
  if (gbVisible) hideGuestbook();
  else showGuestbook();
});

/* ==========================================================================
   공유 링크
   ========================================================================== */

function copyShareLink(appId) {
  const url = `${location.origin}${location.pathname}?app=${appId}`;
  navigator.clipboard.writeText(url).then(() => showToast()).catch(() => {
    // clipboard API 미지원 시 fallback
    const el = document.createElement("textarea");
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast();
  });
}

function showToast() {
  const toast = document.getElementById("copy-toast");
  toast.classList.remove("toast-hidden");
  setTimeout(() => toast.classList.add("toast-hidden"), 2400);
}

async function checkSharedAppUrl() {
  const appId = new URLSearchParams(location.search).get("app");
  if (!appId) return;
  // URL 파라미터 제거 (뒤로가기 시 재오픈 방지)
  history.replaceState({}, "", location.pathname);
  const { data, error } = await supabaseClient.from("apps").select("*").eq("id", appId).single();
  if (!error && data) openAppDetail(data);
}

/* ==========================================================================
   내 활동
   ========================================================================== */

async function openActivityModal() {
  openModal(document.getElementById("activity-modal"));
  // 기본 탭: 내 앱
  document.querySelectorAll(".activity-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "my-apps"));
  document.getElementById("my-apps-view").classList.remove("activity-view-hidden");
  document.getElementById("my-posts-view").classList.add("activity-view-hidden");
  fetchMyApps();
}

async function fetchMyApps() {
  if (!currentUser) return;
  const grid  = document.getElementById("my-apps-list");
  const empty = document.getElementById("my-apps-empty");
  grid.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">불러오는 중...</p>`;
  empty.classList.add("board-empty-hidden");

  const { data, error } = await supabaseClient
    .from("apps").select("*")
    .eq("author_id", currentUser.id)
    .order("created_at", { ascending: false });

  grid.innerHTML = "";
  if (error || !data || data.length === 0) {
    empty.classList.remove("board-empty-hidden");
    return;
  }

  data.forEach(app => {
    const card = document.createElement("div");
    card.className = "my-app-card";
    card.innerHTML = `
      <img class="my-app-cover" src="${escapeHtml(app.cover_image_url || "")}" alt="${escapeHtml(app.title)}">
      <div class="my-app-info">
        <p class="my-app-title" title="${escapeHtml(app.title)}">${escapeHtml(app.title)}</p>
        <p class="my-app-meta">👁 ${app.views_count || 0} &nbsp; 👍 ${app.likes_count || 0}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      closeModal(document.getElementById("activity-modal"));
      openAppDetail(app);
    });
    grid.appendChild(card);
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

async function fetchMyPosts() {
  if (!currentUser) return;
  const list  = document.getElementById("my-posts-list");
  const empty = document.getElementById("my-posts-empty");
  list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">불러오는 중...</p>`;
  empty.classList.add("board-empty-hidden");

  const { data, error } = await supabaseClient
    .from("posts").select("*")
    .eq("author_id", currentUser.id)
    .order("created_at", { ascending: false });

  list.innerHTML = "";
  if (error || !data || data.length === 0) {
    empty.classList.remove("board-empty-hidden");
    return;
  }

  data.forEach(post => {
    const item = document.createElement("div");
    item.className = "post-item";
    item.innerHTML = `
      <span class="post-item-title">${escapeHtml(post.title)}</span>
      <span class="post-item-meta">${formatKoreanDate(post.created_at)}</span>
    `;
    item.addEventListener("click", () => {
      closeModal(document.getElementById("activity-modal"));
      showGuestbook();
    });
    list.appendChild(item);
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function initInfiniteScroll() {
  const sentinel = document.getElementById("scroll-sentinel");
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
      fetchApps(false);
    }
  }, { rootMargin: "200px" });
  observer.observe(sentinel);
}

async function checkDbStatus() {
  const dot  = document.getElementById("db-status-dot");
  const text = document.getElementById("db-status-text");
  try {
    const { error } = await supabaseClient.from("apps").select("id").limit(1);
    if (error) throw error;
    dot.className  = "db-status-dot connected";
    text.className = "db-status-text connected";
    text.textContent = "Supabase DB 연결됨";
  } catch {
    dot.className  = "db-status-dot error";
    text.className = "db-status-text error";
    text.textContent = "DB 연결 오류";
  }
}
