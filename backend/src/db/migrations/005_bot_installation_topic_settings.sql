ALTER TABLE bot_installations
  ADD COLUMN IF NOT EXISTS agenda_register_topic_id UUID
    REFERENCES bot_installation_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agenda_paid_topic_id UUID
    REFERENCES bot_installation_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bot_installations_agenda_register_topic
  ON bot_installations(agenda_register_topic_id);

CREATE INDEX IF NOT EXISTS idx_bot_installations_agenda_paid_topic
  ON bot_installations(agenda_paid_topic_id);
