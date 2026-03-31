export type UserRole =
  | 'regional_coordinator'
  | 'events_team'
  | 'finance_team'
  | 'accounts_team'
  | 'admin'

export type EventStatus =
  | 'draft'
  | 'submitted'
  | 'events_approved'
  | 'finance_approved'
  | 'funded'
  | 'rejected'
  | 'on_hold'
  | 'completed'
  | 'archived'

export type ApprovalDecision = 'approved' | 'rejected' | 'on_hold'

export type NotificationType =
  | 'approval_required'
  | 'status_changed'
  | 'budget_flagged'
  | 'event_reminder'
  | 'report_due'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  region: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  region: string
  event_date: string
  event_end_date: string | null
  location: string
  expected_attendees: number
  status: EventStatus
  created_by: string
  current_reviewer: UserRole | null
  submitted_at: string | null
  completed_at: string | null
  is_budget_flagged: boolean
  flag_reason: string | null
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

export interface Notification {
  id: string
  user_id: string
  event_id: string | null
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  email_sent: boolean
  created_at: string
}

export interface EventReport {
  id: string
  event_id: string
  submitted_by: string
  actual_attendees: number | null
  outcome_summary: string | null
  challenges: string | null
  lessons_learned: string | null
  budget_notes: string | null
  auto_summary: string | null
  submitted_at: string
  created_at: string
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
