# Security Specification — Japostku Firestore

## 1. Data Invariants
1. Public user profile (`/users/{userId}`) contains zero PII (`email` and `whatsapp` are isolated in `/users/{userId}/private/info`).
2. Private PII (`/users/{userId}/private/info`) is readable and writable only by the owner of `{userId}` or the bootstrapped website owner/admin with verified email (`email_verified == true`).
3. Regular users cannot self-assign `isOwner: true`, `isVerified: true`, `isPinned: true`, or create documents in `/admins/{userId}`. Only the bootstrapped website owner (`paundraoktar@gmail.com` with `email_verified == true`) holds owner privileges.
4. Every post creation requires `authorId == request.auth.uid`, valid category/status, price `>= 0`, `1 <= images.size() <= 5`, and server timestamp `request.time`.
5. Terminal state (`status == 'sold'`) cannot be reverted or modified by non-admin/non-owner unless explicitly allowed; updates strictly validate `isValidPost()` and `affectedKeys().hasOnly(...)`.
6. Document IDs match `^[a-zA-Z0-9_\\-]+$` and stay `<= 128` characters.

## 2. Dirty Dozen Adversarial Payloads
1. **Shadow Update on UserPublic**: `{ uid, displayName: "Test", isOwner: true, isVerified: true, extraField: 1 }` -> Denied by `hasOnly` and `!isOwner` check.
2. **Email Spoofing**: `token.email == 'paundraoktar@gmail.com'` with `token.email_verified == false` -> Denied by `isVerifiedUser()`.
3. **PII Leak Read**: User B attempts `get(/users/userA/private/info)` -> Denied by `isUser(userId)`.
4. **Admin Self-Escalation**: User B attempts `set(/admins/userB, { role: 'admin' })` -> Denied by `isOwnerUser()`.
5. **Post Author Spoofing**: User B creates post with `authorId: 'userA'` -> Denied by `incoming().authorId == request.auth.uid`.
6. **Self-Pin Spoofing**: Non-owner creates post with `isPinned: true` -> Denied by `incoming().isPinned == false` for non-owners.
7. **Self-Verified Badge Spoofing**: Non-owner sets `authorVerified: true` -> Denied by `isOwnerUser()` requirement.
8. **ID Poisoning**: Document created with 500-char ID or `/` characters -> Denied by `isValidId()`.
9. **Array Overflow**: Post created with 12 images or 0 images -> Denied by `images.size() >= 1 && images.size() <= 5`.
10. **Immutable Field Tampering**: Update attempts to change `createdAt` or `authorId` -> Denied by `affectedKeys().hasOnly(...)` and equality check.
11. **Timestamp Spoofing**: Client sets `createdAt` to future timestamp instead of `request.time` -> Denied by `incoming().createdAt == request.time`.
12. **Blanket List Scraping on Private PII**: Unauthenticated or non-admin attempts `list` on `/users/{userId}/private` -> Denied by `isUser(userId) || isAdmin()`.
