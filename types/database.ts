export type UserRole =
  | 'regional_coordinator'
  | 'events_team'
  | 'finance_team'
  | 'accounts_team'
  | 'bot'
  | 'designer'
  | 'social_media_team'
  | 'admin'

export type ProfileApprovalStatus =
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'

export type EventStatus =
  | 'draft'
  | 'submitted'
  | 'events_approved'
  | 'finance_approved'
  | 'funded'
  | 'rejected'
  | 'on_hold'
  | 'completed'
  | 'report_submitted'
  | 'archived'

export type ApprovalDecision = 'approved' | 'rejected' | 'on_hold'

export type NotificationType =
  | 'approval_required'
  | 'status_changed'
  | 'budget_flagged'
  | 'event_reminder'
  | 'report_due'

export type FlyerRequestStatus =
  | 'requested'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'released'

export type SocialWorkflowStatus =
  | 'requested'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'completed'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  region: string | null
  approval_status: ProfileApprovalStatus
  approved_at?: string | null
  approved_by?: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  event_code: string
  title: string
  description: string | null
  goal: string | null
  region: string
  event_date: string
  event_end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string
  venue_gmaps_link: string | null
  expected_attendees: number
  participant_profile: string | null
  coordinator_name: string | null
  coordinator_phone: string | null
  coordinator_email: string | null
  requires_budget: boolean
  budget_justification: string | null
  social_media_required: boolean
  social_media_channels: string[]
  social_media_requirements: string | null
  social_media_caption: string | null
  status: EventStatus
  created_by: string
  current_reviewer: UserRole | null
  submitted_at: string | null
  completed_at: string | null
  is_budget_flagged: boolean
  flag_reason: string | null
  drive_event_url?: string | null
  proposal_drive_url?: string | null
  media_drive_url?: string | null
  report_drive_url?: string | null
  invoice_drive_url?: string | null
  drive_sync_status?: string
  drive_sync_message?: string | null
  drive_synced_at?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  profiles?: Profile
  budgets?: Budget[]
  approvals?: Approval[]
  files?: EventFile[]
}

export interface Budget {
  id: string
  event_id: string
  category: string
  description: string | null
  justification: string | null
  estimated_amount: number
  actual_amount: number | null
  currency: string
  created_at: string
  updated_at: string
}

export interface BudgetSummary {
  event_id: string
  total_estimated: number
  total_actual: number
  line_items: number
  currency: string
}

export interface Approval {
  id: string
  event_id: string
  reviewer_id: string
  stage: UserRole
  decision: ApprovalDecision
  comments: string | null
  decided_at: string
  created_at: string
  // Joined
  profiles?: Profile
  approval_comments?: ApprovalComment[]
}

export interface ApprovalComment {
  id: string
  approval_id: string
  event_id: string
  reviewer_id: string
  stage: UserRole
  decision: ApprovalDecision
  comment: string | null
  is_revision: boolean
  created_at: string
}

export interface EventFile {
  id: string
  event_id: string
  uploaded_by: string
  file_name: string
  file_type: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  // Joined
  profiles?: Profile
}

export interface RegionOption {
  id: string
  name: string
  is_active: boolean
  drive_root_url?: string | null
  proposal_root_url?: string | null
  media_root_url?: string | null
  report_root_url?: string | null
  invoice_root_url?: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  event_id: string | null
  link_path?: string | null
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  email_sent: boolean
  email_delivery_key?: string | null
  email_delivery_status?: string
  email_delivery_attempts?: number
  email_last_attempted_at?: string | null
  email_sent_at?: string | null
  email_last_error?: string | null
  created_at: string
}

export interface NotificationTemplate {
  id: string
  recipient_role: UserRole
  notification_type: NotificationType
  subject_template: string
  body_template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AppSettings {
  id: string
  media_drive_url: string | null
  demo_autofill_enabled?: boolean
  notification_test_email: string | null
  notification_test_mode?: 'off' | 'all_stages' | 'stage_specific'
  regional_coordinator_test_email?: string | null
  events_team_test_email?: string | null
  finance_team_test_email?: string | null
  accounts_team_test_email?: string | null
  bot_test_email?: string | null
  designer_test_email?: string | null
  social_media_team_test_email?: string | null
  admin_test_email?: string | null
  regions_note?: string | null
  drive_apps_script_url?: string | null
  drive_apps_script_secret?: string | null
  drive_default_root_url?: string | null
  drive_default_proposal_root_url?: string | null
  drive_default_media_root_url?: string | null
  drive_default_report_root_url?: string | null
  drive_default_invoice_root_url?: string | null
  created_at: string
  updated_at: string
}

export interface EventReport {
  id: string
  event_id: string
  submitted_by: string
  actual_attendees: number | null
  execution_details: string | null
  outcome_summary: string | null
  challenges: string | null
  lessons_learned: string | null
  budget_notes: string | null
  social_media_writeup: string | null
  donations_received: number
  donation_notes: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  actual_location: string | null
  follow_up_actions: string | null
  auto_summary: string | null
  submitted_at: string
  created_at: string
}

export interface FlyerRequest {
  id: string
  event_id: string
  requested_by: string | null
  assigned_designer: string | null
  approver_id: string | null
  status: FlyerRequestStatus
  drive_link: string | null
  notes: string | null
  approval_notes: string | null
  approved_at: string | null
  released_at: string | null
  created_at: string
  updated_at: string
}

export interface SocialWorkflowItem {
  id: string
  event_id: string
  requested_by: string | null
  assigned_social_owner: string | null
  status: SocialWorkflowStatus
  drive_link: string | null
  content_notes: string | null
  caption_text: string | null
  completion_notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  event_id: string | null
  user_id: string | null
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// Dashboard analytics types
export interface DashboardStats {
  total_events: number
  pending_approval: number
  funded_events: number
  completed_events: number
  total_budget_estimated: number
  total_budget_actual: number
}
