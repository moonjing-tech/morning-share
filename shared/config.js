// ============================================================
//  产品工作台 · 全局配置
//  shared/config.js
// ============================================================

// ── Supabase ──────────────────────────────────────────────
const SUPABASE_URL = 'https://onjsynypkulmuccfanxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AXyuAflG7Ts9G-bAr6zHew_9PwG_I5t';
const SUPABASE_BUCKET = 'files';
const SUPABASE_TABLE  = 'shares';
const SUPABASE_APP_TABLE = 'app_updates';
// GEO 模块
const SUPABASE_GEO_QUESTIONS_TABLE = 'geo_questions';
const SUPABASE_GEO_RUNS_TABLE = 'geo_runs';
const SUPABASE_GEO_BRAND_DICT_TABLE = 'geo_brand_dict';
const SUPABASE_GEO_PROVIDERS_TABLE = 'geo_providers';
const SUPABASE_GEO_LATEST_VIEW = 'geo_question_latest_runs';
const SUPABASE_GEO_PROVIDER_LATEST_VIEW = 'geo_question_provider_latest_runs';

// ── AI 默认配置 ───────────────────────────────────────────
const AI_DEFAULT_CONFIG = {
  url:   'https://ark.cn-beijing.volces.com/api/v3',
  key:   'b5ec5b5d-3632-4e13-b0f6-f2cef6e841a1',
  model: 'doubao-seed-2-0-code-preview-260215',
};

// ── localStorage Keys ─────────────────────────────────────
const LS_KEYS = {
  watchFunds: 'watch_funds',
  appLastReadTime: 'app_last_read_time',
  aiConfig: 'ai_config',
  geoApiKey: 'geo_ark_api_key',
};

// ── 导航页面映射 ──────────────────────────────────────────
//  path        → { navId, title, icon }
const NAV_MAP = {
  'index.html':  { navId: 'nav-list', title: '晨会分享',     icon: '🚀' },
  'detail.html': { navId: 'nav-list', title: '内容详情',     icon: '📄' },
  'fund.html':   { navId: 'nav-fund', title: '基金实时估值', icon: '📈' },
  'app.html':    { navId: 'nav-app',  title: '竞品追踪',     icon: '📱' },
  'geo.html':    { navId: 'nav-geo',  title: 'GEO监测',     icon: '🌐' },
};

// ── 工具函数：读取 AI 配置（优先 localStorage）─────────────
function getAIConfig() {
  try {
    const saved = localStorage.getItem(LS_KEYS.aiConfig);
    if (saved) return { ...AI_DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch (e) {}
  return { ...AI_DEFAULT_CONFIG };
}

// ── 工具函数：保存 AI 配置 ────────────────────────────────
function saveAIConfig(cfg) {
  localStorage.setItem(LS_KEYS.aiConfig, JSON.stringify(cfg));
}