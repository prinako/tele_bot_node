CREATE TABLE IF NOT EXISTS bot_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  telegram_chat_id BIGINT NOT NULL UNIQUE,

  chat_type TEXT NOT NULL CHECK (chat_type IN ('group', 'supergroup', 'channel')),
  title TEXT,
  username TEXT,

  added_by_telegram_user_id BIGINT,

  bot_status TEXT NOT NULL DEFAULT 'active',

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_installation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bot_installation_id UUID NOT NULL REFERENCES bot_installations(id)
    ON DELETE CASCADE,

  message_thread_id BIGINT NOT NULL,
  name TEXT,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_bot_installation_topic UNIQUE (
    bot_installation_id,
    message_thread_id
  )
);

CREATE INDEX IF NOT EXISTS idx_bot_installations_chat_id
  ON bot_installations(telegram_chat_id);

CREATE INDEX IF NOT EXISTS idx_bot_installations_chat_type
  ON bot_installations(chat_type);

CREATE INDEX IF NOT EXISTS idx_bot_installations_status
  ON bot_installations(bot_status);

CREATE INDEX IF NOT EXISTS idx_bot_installation_topics_installation
  ON bot_installation_topics(bot_installation_id);

CREATE INDEX IF NOT EXISTS idx_bot_installation_topics_thread
  ON bot_installation_topics(message_thread_id);
