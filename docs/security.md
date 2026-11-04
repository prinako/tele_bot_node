# Security and permissions

## Identities

Browser administrators authenticate with the configured password. The backend checks its scrypt hash, issues a random HttpOnly, SameSite=Strict cookie, and expires it after one hour. Production requires Secure cookies and HTTPS origins. Sessions rotate on login and are revoked on logout or backend restart. Login is limited to ten attempts per direct peer address per minute, including successful attempts. Rejected attempts do not expose the hash or submitted password.

The bot authenticates with `Authorization: Bearer <BOT_API_TOKEN>`. It delegates an acting Telegram user using `X-Telegram-User-Id`, taken from the Telegram update's sender. The backend checks current `is_allowed` and `is_admin` flags on each delegated request. Arbitrary clients cannot gain identity by sending the actor header alone.

The bot credential is a privileged trust boundary: it can register observed profiles/memberships and assert Telegram identities. Compromise of this credential allows impersonation, including an admin identity. Keep it only in backend/bot environments, never browser assets or logs. Do not reuse `BOT_TOKEN` as the service credential.

## Permission policy

This policy was selected for the project: creators manage their bills, members manage their own shares, and admins manage everything.

| Action | Browser admin / allowed Telegram admin | Allowed creator | Allowed responsible member | Other allowed user |
| --- | --- | --- | --- | --- |
| Create bill in recorded group | Yes | Yes, with recorded membership | Yes, with recorded membership | Yes, with recorded membership |
| View bill and its members | Yes | Own bill | If recorded in bill's group | If recorded in bill's group |
| Edit or delete bill | Yes | Own bill | No | No |
| Confirm/reverse another member's payment | Yes | Own bill | No | No |
| Confirm/reverse own responsible share | Yes | If responsible | Yes | No |
| View standalone PIX keys | All | Own | Own | Own |
| Register/update standalone PIX key | All | Own | Own | Own |
| Manage user flags, banks, topic settings | Yes | No | No | No |

PIX values already attached to a bill are visible to users authorized to read that bill. The standalone PIX directory remains admin-only. A creator cannot move a bill into a group they do not belong to. Ordinary-user bill/PIX creation overwrites submitted identity fields with the authenticated actor.

Blocked Telegram users cannot execute business operations, even if `is_admin=true`. Observational registration still runs so an admin can discover and allow a new user. New registrations outside `ALLOWED_USERS`/`ADMIN_USERS` start blocked. Existing stored flags are not overwritten during upsert.

## Browser request protection

Only configured exact origins receive credentialed CORS access. Login and session-authenticated writes additionally require a matching `Origin`, protecting against CSRF. No state-changing GET routes are used for authentication. Cookie credentials stay out of localStorage and JavaScript.

`/health` is public and reports process liveness, not database readiness. Other API routes require a service credential or browser session. Service calls without a delegated actor are limited to registration endpoints and the scheduler's pending-bill read. A user ID in a URL or JSON body is a target, never proof of caller identity.

## Operational limits

- Use HTTPS at the reverse proxy. The private Docker backend hop remains HTTP.
- Restrict backend/Adminer host ports and back up PostgreSQL. Adminer has independent database authentication.
- Membership means recorded presence; departure/revocation synchronization with Telegram is future work.
- Browser login is a single shared administrator account; there is no per-browser-admin audit identity or MFA.
- Authorization checks and repository mutations are separate operations. A concurrent permission or membership change can race an in-flight request; recheck in the same transaction if strict revocation semantics are required.
- Business audit logging, persistent sessions, persistent throttling, full callback replay protection and per-conversation durable state are future work.
