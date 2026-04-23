/* ============================================================
   产品工作台 · 导航逻辑
   shared/nav.js
   ============================================================ */

/* ── 获取当前页面文件名 ─────────────────────────────────────── */
function getCurrentPage() {
  const path = location.pathname;
  const file = path.split('/').pop() || 'index.html';
  // 兼容根路径直接访问（如 http://localhost/）
  return file === '' ? 'index.html' : file;
}

/* ── 渲染侧边栏 HTML ────────────────────────────────────────── */
function renderNav() {
  const current = getCurrentPage();

  const navHTML = `
    <aside class="sidebar" id="sidebar">

      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">📊</div>
        <span class="logo-text">产品工作台</span>
        <span class="logo-version">v1.0</span>
      </div>

      <!-- 主导航 -->
      <nav class="sidebar-nav">

        <div class="nav-group-label">工作台</div>

        <a href="index.html"
           class="nav-item ${current === 'index.html' || current === 'detail.html' ? 'active' : ''}"
           id="nav-list">
          <span class="nav-icon">🚀</span>
          <span class="nav-label">晨会分享</span>
        </a>

        <a href="fund.html"
           class="nav-item ${current === 'fund.html' ? 'active' : ''}"
           id="nav-fund">
          <span class="nav-icon">📈</span>
          <span class="nav-label">基金估值</span>
        </a>

        <a href="app.html"
           class="nav-item ${current === 'app.html' ? 'active' : ''}"
           id="nav-app">
          <span class="nav-icon">📱</span>
          <span class="nav-label">竞品追踪</span>
          <span class="nav-badge" id="nav-app-badge" style="display:none">NEW</span>
        </a>

        <a href="geo.html"
           class="nav-item ${current === 'geo.html' ? 'active' : ''}"
            id="nav-geo">
          <span class="nav-icon">🌐</span>
          <span class="nav-label">GEO监测</span>
        </a>
      </nav>

      <!-- 底部 -->
      <div class="sidebar-footer">
        <div class="nav-divider"></div>
        <div class="nav-item" id="nav-settings" onclick="openSettingsModal && openSettingsModal()">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">设置</span>
        </div>
      </div>

    </aside>
  `;

  // 注入到 #nav-placeholder 或 body 最前
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) {
    placeholder.outerHTML = navHTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  }
}

/* ── 渲染 Toast 容器 ────────────────────────────────────────── */
function renderToastContainer() {
  if (!document.getElementById('toast-container')) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="toast-container"></div>'
    );
  }
}

/* ── Toast 工具函数 ─────────────────────────────────────────── */
function showToast(msg, type = 'info', duration = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ── 竞品 NEW 徽标：检测并显示 ─────────────────────────────── */
async function checkAppNewBadge() {
  try {
    const lastRead = localStorage.getItem(LS_KEYS.appLastReadTime)
      ? Number(localStorage.getItem(LS_KEYS.appLastReadTime))
      : 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const since = Math.max(lastRead, sevenDaysAgo);

    // 查询 app_updates 表中 created_at > since 的条目数
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_APP_TABLE}` +
      `?select=id&created_at=gt.${new Date(since).toISOString()}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('nav-app-badge');
    if (!badge) return;
    if (data.length > 0) {
      badge.textContent = data.length > 99 ? '99+' : String(data.length);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) {
    // 静默失败，不影响主流程
  }
}

/* ── 竞品 NEW 徽标：进入竞品页后清除 ───────────────────────── */
function clearAppNewBadge() {
  localStorage.setItem(LS_KEYS.appLastReadTime, String(Date.now()));
  const badge = document.getElementById('nav-app-badge');
  if (badge) badge.style.display = 'none';
}

/* ── 初始化导航（各页面统一调用） ───────────────────────────── */
function initNav() {
  renderNav();
  renderToastContainer();
  // 非竞品页才检测徽标（竞品页进入后直接清除）
  const current = getCurrentPage();
  if (current !== 'app.html') {
    checkAppNewBadge();
  }
}

/* ── 页面加载完成后自动初始化 ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', initNav);