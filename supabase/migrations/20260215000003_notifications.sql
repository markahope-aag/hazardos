-- ============================================
-- NOTIFICATIONS SYSTEM
-- Phase 4: In-app notifications and email alerts
-- ============================================

-- ============================================
-- NOTIFICATIONS TABLE
-- In-app notifications for users
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification type
  type VARCHAR(50) NOT NULL,
  -- 'job_assigned', 'job_completed', 'job_completion_review'
  -- 'proposal_signed', 'proposal_viewed'
  -- 'invoice_paid', 'invoice_overdue', 'invoice_viewed'
  -- 'feedback_received', 'testimonial_pending'
  -- 'system', 'reminder'

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entity
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Action URL
  action_url TEXT,
  action_label VARCHAR(100),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal',
  -- 'low', 'normal', 'high', 'urgent'

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- Per-user settings for notification channels
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Notification type
  notification_type VARCHAR(50) NOT NULL,

  -- Channels
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- ============================================
-- PUSH SUBSCRIPTIONS
-- PWA push notification subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Device info
  device_name VARCHAR(255),
  user_agent TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active)
  WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications - users can only see their own
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Notification preferences - users can manage their own
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Push subscriptions - users can manage their own
DROP POLICY IF EXISTS "Users can manage their push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Create notification for all users with a specific role in an org
CREATE OR REPLACE FUNCTION create_notification_for_role(
  p_organization_id UUID,
  p_role VARCHAR(50),
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal'
)
RETURNS SETOF notifications AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id FROM profiles
    WHERE organization_id = p_organization_id
    AND role = p_role
  LOOP
    RETURN QUERY
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      priority
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_type,
      p_title,
      p_message,
      p_entity_type,
      p_entity_id,
      p_action_url,
      p_priority
    )
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Initialize default notification preferences for a user
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_user_id UUID, p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  notification_types TEXT[] := ARRAY[
    'job_assigned',
    'job_completed',
    'job_completion_review',
    'proposal_signed',
    'proposal_viewed',
    'invoice_paid',
    'invoice_overdue',
    'feedback_received',
    'system'
  ];
  nt TEXT;
BEGIN
  FOREACH nt IN ARRAY notification_types
  LOOP
    INSERT INTO notification_preferences (user_id, organization_id, notification_type, in_app, email, push)
    VALUES (p_user_id, p_org_id, nt, true, true, false)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEFAULT NOTIFICATION TYPES
-- Reference for application layer
-- ============================================
COMMENT ON TABLE notifications IS 'Notification types:
- job_assigned: When a crew member is assigned to a job
- job_completed: When a job is marked as completed
- job_completion_review: When a completion needs admin review
- proposal_signed: When a customer signs a proposal
- proposal_viewed: When a customer views a proposal
- invoice_paid: When an invoice is paid
- invoice_overdue: When an invoice becomes overdue
- invoice_viewed: When a customer views an invoice
- feedback_received: When customer feedback is submitted
- testimonial_pending: When a testimonial needs approval
- system: System announcements
- reminder: Scheduled reminders';
