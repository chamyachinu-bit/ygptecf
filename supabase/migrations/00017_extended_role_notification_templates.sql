insert into public.notification_templates (recipient_role, notification_type, subject_template, body_template)
values
  (
    'bot',
    'approval_required',
    'BOT Oversight Update: {{event_title}}',
    E'Hello {{recipient_name}},\n\nAn event has reached a point worth trustee visibility.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'bot',
    'status_changed',
    'BOT Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'bot',
    'budget_flagged',
    'BOT Budget Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA budget alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'designer',
    'approval_required',
    'Designer Action Needed: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA visible event may need creative follow-through.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'designer',
    'status_changed',
    'Designer Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'designer',
    'budget_flagged',
    'Designer Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA workflow alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'social_media_team',
    'approval_required',
    'Social Media Follow-up: {{event_title}}',
    E'Hello {{recipient_name}},\n\nAn event has moved into a stage worth social/documentation visibility.\n\nEvent: {{event_title}} ({{event_code}})\nRegion: {{event_region}}\nDate: {{event_date}}\nLocation: {{event_location}}\n\nNotes:\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'social_media_team',
    'status_changed',
    'Social Media Update: {{event_title}} is {{event_status}}',
    E'Hello {{recipient_name}},\n\nStatus update for "{{event_title}}" ({{event_code}}): {{event_status}}.\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  ),
  (
    'social_media_team',
    'budget_flagged',
    'Social Media Alert: {{event_title}}',
    E'Hello {{recipient_name}},\n\nA workflow alert was raised for "{{event_title}}" ({{event_code}}).\n\n{{notification_message}}\n\nOpen here:\n{{event_link}}\n'
  )
on conflict (recipient_role, notification_type) do nothing;
