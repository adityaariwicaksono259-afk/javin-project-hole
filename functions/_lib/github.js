// ============================================
// GITHUB HELPER — commit file ke repo
// ============================================
// Env yang dibutuhkan:
//   GITHUB_TOKEN  — Personal Access Token (scope: repo)
//   GITHUB_OWNER  — default: adityaariwicaksono259-afk
//   GITHUB_REPO   — default: javin-project-hole
//   GITHUB_BRANCH — default: main
// ============================================

const DEFAULTS = {
  owner: 'adityaariwicaksono259-afk',
  repo: 'javin-project-hole',
  branch: 'main'
};

function getConfig(env) {
  return {
    token: env.GITHUB_TOKEN || '',
    owner: env.GITHUB_OWNER || DEFAULTS.owner,
    repo: env.GITHUB_REPO || DEFAULTS.repo,
    branch: env.GITHUB_BRANCH || DEFAULTS.branch
  };
}

function apiBase(cfg, path) {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`;
}

function headers(cfg) {
  return {
    'Authorization': `Bearer ${cfg.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'JavinBot/1.0'
  };
}

// ============================================
// GET file content
// ============================================
export async function getFile(env, filepath) {
  const cfg = getConfig(env);
  if (!cfg.token) return { ok: false, message: 'GITHUB_TOKEN belum di-set.' };

  const url = apiBase(cfg, `/contents/${filepath}?ref=${cfg.branch}`);
  const r = await fetch(url, { headers: headers(cfg) });
  if (!r.ok) {
    const err = await r.text();
    return { ok: false, message: `GitHub HTTP ${r.status}: ${err.slice(0, 200)}` };
  }
  const j = await r.json();

  // Decode base64 content
  const content = atob(j.content.replace(/\n/g, ''));
  return {
    ok: true,
    content: content,
    sha: j.sha,
    path: j.path,
    size: j.size
  };
}

// ============================================
// PUT file content (create / update)
// ============================================
export async function putFile(env, filepath, contentStr, commitMessage, sha) {
  const cfg = getConfig(env);
  if (!cfg.token) return { ok: false, message: 'GITHUB_TOKEN belum di-set.' };

  // Encode to base64 (unicode-safe)
  const b64 = btoa(unescape(encodeURIComponent(contentStr)));

  const body = {
    message: commitMessage,
    content: b64,
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const url = apiBase(cfg, `/contents/${filepath}`);
  const r = await fetch(url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers(cfg)),
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const err = await r.text();
    return { ok: false, message: `GitHub HTTP ${r.status}: ${err.slice(0, 200)}` };
  }
  const j = await r.json();
  return {
    ok: true,
    commit_sha: j.commit && j.commit.sha,
    commit_url: j.commit && j.commit.html_url,
    content_sha: j.content && j.content.sha
  };
}

// ============================================
// Tambah / update JSON file secara aman
// ============================================
export async function updateJsonFile(env, filepath, updater, commitMessage) {
  const current = await getFile(env, filepath);
  if (!current.ok) return current;

  let data;
  try {
    data = JSON.parse(current.content);
  } catch (e) {
    return { ok: false, message: 'JSON parse error: ' + e.message };
  }

  // Update lewat callback
  const result = await updater(data);
  if (result && result.error) return { ok: false, message: result.error };

  const newContent = JSON.stringify(data, null, 2);
  const put = await putFile(env, filepath, newContent, commitMessage, current.sha);
  return put;
}

// ============================================
// Test koneksi GitHub
// ============================================
export async function testConnection(env) {
  const cfg = getConfig(env);
  if (!cfg.token) return { ok: false, message: 'GITHUB_TOKEN kosong.' };

  const url = apiBase(cfg, '');
  const r = await fetch(url, { headers: headers(cfg) });
  if (!r.ok) return { ok: false, message: `HTTP ${r.status}` };
  const j = await r.json();
  return {
    ok: true,
    repo: j.full_name,
    default_branch: j.default_branch,
    private: j.private
  };
}
