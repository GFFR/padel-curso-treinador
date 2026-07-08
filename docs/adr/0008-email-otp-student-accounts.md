# Email OTP student accounts

**Supersedes [0006 — Phone OTP student accounts](./0006-phone-otp-student-accounts.md).**

The MVP switches student login from phone-number OTP to email OTP, still using Supabase
Auth. Stable student identity is still needed early for repeat-suppressed exam assembly,
user-level averages, admin stats, support follow-up, and longitudinal performance by
course theme — email OTP satisfies the same identity need without an SMS provider.

Email OTP removes the SMS-provider dependency and its per-message cost entirely: Supabase
sends the one-time code by email using its own mail sender (or a custom SMTP provider for
production volume). It also avoids password management altogether — there is no separate
signup step, no password-reset flow, and no stored credential to leak. Every login
requires proving control of the email inbox by entering a fresh code, which is simpler to
operate than phone OTP and secure enough for this use case (a study tool, not a
certification system).

The login flow shape is unchanged from phone OTP: one route, two steps (enter identifier,
enter code), account auto-created on first successful code entry.
