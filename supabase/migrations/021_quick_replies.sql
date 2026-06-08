-- ============================================================
-- 021_quick_replies.sql — Quick Replies feature
-- ============================================================

CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each shortcut must be unique per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_replies_account_shortcut
  ON quick_replies(account_id, shortcut);

CREATE INDEX IF NOT EXISTS idx_quick_replies_account
  ON quick_replies(account_id);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quick_replies_select ON quick_replies;
CREATE POLICY quick_replies_select ON quick_replies FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS quick_replies_insert ON quick_replies;
CREATE POLICY quick_replies_insert ON quick_replies FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS quick_replies_update ON quick_replies;
CREATE POLICY quick_replies_update ON quick_replies FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS quick_replies_delete ON quick_replies;
CREATE POLICY quick_replies_delete ON quick_replies FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON quick_replies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quick_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
