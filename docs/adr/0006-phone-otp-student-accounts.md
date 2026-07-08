# Phone OTP student accounts

> **Superseded by [0008 — Email OTP student accounts](./0008-email-otp-student-accounts.md).**
> Kept for history; the MVP now uses email OTP instead of phone/SMS.

The MVP will include phone-number OTP login for student accounts using Supabase Auth. Stable student identity is needed early for repeat-suppressed exam assembly, user-level averages, admin stats, support follow-up, and longitudinal performance by course theme.

Supabase Auth keeps authentication and application data on the same platform, which is simpler for the first build. Supabase phone login does not require the paid Advanced MFA Phone add-on, but real OTP delivery still requires an SMS provider, so SMS costs may appear depending on provider usage.
