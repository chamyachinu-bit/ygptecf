-- ============================================================
-- Audit history visibility for high-level roles
-- ============================================================

create policy "audit_logs_high_level_read"
  on public.audit_logs for select
  using (
    public.get_my_role() in ('events_team', 'finance_team', 'accounts_team')
  );
