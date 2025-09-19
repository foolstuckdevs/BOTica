# BOTica Authentication & Session Flow

## Overview

The system uses a short-lived JWT (NextAuth session token) plus a server-stored, hashed refresh token issued at sign-in. This provides:

- Stateless authorization checks (JWT in NextAuth)
- Rotation-capable refresh tokens (revocable) for longevity
- Role-based idle timeout (pharmacists vs admins)
- Secure HttpOnly storage (no `localStorage`)

## Components

| Component                                   | Purpose                                               |
| ------------------------------------------- | ----------------------------------------------------- |
| `auth.ts`                                   | NextAuth credentials provider; JWT/session callbacks  |
| `refresh_tokens` table                      | Persists hashed refresh tokens & rotation metadata    |
| `/api/auth/refresh`                         | Rotates refresh token & sets new cookie               |
| `useAutoRefreshToken`                       | Client polling hook to refresh near-expiry session    |
| `useInactivityLogout` + `InactivityWatcher` | Idle detection & auto sign-out                        |
| `middleware.ts`                             | Route protection, RBAC, stale refresh cookie clearing |

## Sign-In Flow

1. User submits credentials with optional `rememberMe`.
2. Server action `signInWithCredentials` validates + calls `signIn('credentials')`.
3. On success, it creates a refresh token row and sets `rt` HttpOnly cookie.
4. JWT max age:
   - Remember me: 30 days
   - Standard: 8 hours
5. User redirected to `/dashboard` (hard navigation to ensure fresh session hydration).

## Refresh Token

- Stored hashed in DB (`sha256`). Raw token only sent once in cookie.
- Rotation: `/api/auth/refresh` verifies existing, inserts new, revokes old.
- Expiry durations:
  - Remember me: 30 days
  - Standard: 12 hours (refresh lifespan can outlive initial 8h access token window but promotes re-auth sooner).

## Automatic Refresh

`SessionLifecycle` mounts `useAutoRefreshToken` which every 60s:

1. Reads session expiry.
2. If within 5 min of expiry, POST `/api/auth/refresh`.
3. On `204` => refresh token rotated & session updated.
4. On `401` => cookie cleared by middleware on next navigation (user eventually redirected to sign-in).

## Inactivity Logout

`InactivityWatcher` sets dual timers:

- Pharmacist idle timeout: 15 min (warn at 14 min)
- Admin idle timeout: 60 min (warn at 59 min)
  On timeout: calls `signOut()` with redirect to `/sign-in?reason=idle`.

## Middleware Protections

- Clears stale `rt` cookie when an unauthenticated user hits protected routes or auth pages.
- Redirects unauthorized roles with `?denied=...` for toast display.

## Revocation

Calling a future manual revoke (e.g., on password change) should call:
`revokeAllUserRefreshTokens(userId)` and clear cookie; user must sign in again.

## Security Notes

- HttpOnly + SameSite=Lax prevents XSS token extraction & CSRF on typical navigation.
- Optionally set `Secure` flag in production (already conditional).
- Consider binding refresh token to user-agent hash & partial IP for anomaly detection (future enhancement).

## Future Enhancements

| Idea                                                    | Benefit                    |
| ------------------------------------------------------- | -------------------------- |
| Add device table with last seen + manual revoke         | Admin visibility & control |
| Sliding refresh window (rotate only when <50% lifespan) | Fewer writes               |
| Add warning modal before idle logout                    | Better UX                  |
| Encrypt token hash with pepper                          | Harder offline cracking    |

## Developer Tips

- Always generate/run migration after schema changes.
- Use `needsRefresh()` for quick heuristic (5 min threshold).
- Avoid storing raw refresh token anywhere except cookie at issuance time.

## Troubleshooting

| Symptom                      | Likely Cause                              | Fix                                                  |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Refresh endpoint 401         | Expired/rotated/stale token               | Clear cookies, re-login                              |
| Idle logout too aggressive   | User performing only background tasks     | Extend timeout or capture additional activity events |
| Build warning about `crypto` | Forgot `export const runtime = 'nodejs';` | Add runtime directive                                |

---

Last updated: current implementation phase.
