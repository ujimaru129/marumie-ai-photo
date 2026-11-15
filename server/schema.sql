-- 端末（匿名）。トークンはハッシュだけを持つ。生年は保存しない（18歳以上かどうかの確認だけ）
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  adult_confirmed_at INTEGER NOT NULL,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  free_left INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0
);

-- 生成の記録（写真そのものは残さない。結果の画像は R2 に置き、1日で消える）
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  style TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,          -- running / ok / failed
  paid_with TEXT,                -- free / credits（失敗したら返す）
  cost INTEGER NOT NULL,
  images INTEGER NOT NULL DEFAULT 0,
  models TEXT,                   -- 各バリエーションを作ったモデル（meta / gemini）
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS generations_device ON generations(device_id, created_at);

-- 問題の報告（Google Play の生成 AI アプリのルール）
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  variant INTEGER,
  reason TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);
