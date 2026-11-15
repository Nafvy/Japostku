import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessAdmin,
  canBan,
  canDeletePost,
  canManageRoles,
  canRemoveAdminRole,
  isOwnerEmail,
  OWNER_EMAIL,
} from './permissions';

test('canAccessAdmin allows admin, moderator, and owner', () => {
  assert.equal(canAccessAdmin(['admin']), true);
  assert.equal(canAccessAdmin(['moderator']), true);
  assert.equal(canAccessAdmin(['admin', 'moderator']), true);
  assert.equal(canAccessAdmin([], true), true);
  assert.equal(canAccessAdmin([]), false);
});

test('canBan prevents banning self or website owner', () => {
  assert.equal(
    canBan({ id: 'u1', roles: ['admin'] }, { id: 'u1', roles: ['admin'] }),
    false
  );
  assert.equal(
    canBan({ id: 'u2', roles: ['moderator'] }, { id: 'u2', roles: ['moderator'] }),
    false
  );
  assert.equal(
    canBan(
      { id: 'a1', roles: ['admin'] },
      { id: 'owner1', roles: ['admin'], isOwner: true, email: OWNER_EMAIL }
    ),
    false
  );
});

test('canBan lets admin ban anyone except self or owner, moderator only roleless users', () => {
  const admin = { id: 'a1', roles: ['admin'] as const };
  const owner = { id: 'o1', roles: [] as const, isOwner: true };
  const mod = { id: 'm1', roles: ['moderator'] as const };
  const mod2 = { id: 'm2', roles: ['moderator'] as const };
  const regular = { id: 'u1', roles: [] as const };

  assert.equal(canBan(admin, regular), true);
  assert.equal(canBan(owner, admin), true);
  assert.equal(canBan(admin, mod), true);
  assert.equal(canBan(mod, regular), true);
  assert.equal(canBan(mod, admin), false);
  assert.equal(canBan(mod, mod2), false);
  assert.equal(canBan(regular, mod), false);
});

test('canManageRoles is restricted to admin and owner', () => {
  assert.equal(canManageRoles({ id: 'a1', roles: ['admin'] }), true);
  assert.equal(canManageRoles({ id: 'o1', roles: [], isOwner: true }), true);
  assert.equal(canManageRoles({ id: 'm1', roles: ['moderator'] }), false);
  assert.equal(canManageRoles({ id: 'u1', roles: [] }), false);
});

test('canRemoveAdminRole prevents removing the last admin', () => {
  assert.equal(canRemoveAdminRole(1), false);
  assert.equal(canRemoveAdminRole(0), false);
  assert.equal(canRemoveAdminRole(2), true);
});

test('canDeletePost allows post author, moderator, admin, and owner', () => {
  assert.equal(canDeletePost({ id: 'u1', roles: [] }, 'u1'), true);
  assert.equal(canDeletePost({ id: 'u1', roles: [] }, 'u2'), false);
  assert.equal(canDeletePost({ id: 'm1', roles: ['moderator'] }, 'u2'), true);
  assert.equal(canDeletePost({ id: 'a1', roles: ['admin'] }, 'u2'), true);
  assert.equal(canDeletePost({ id: 'o1', roles: [], isOwner: true }, 'u2'), true);
});

test('isOwnerEmail matches configured owner case-insensitively', () => {
  assert.equal(isOwnerEmail(OWNER_EMAIL), true);
  assert.equal(isOwnerEmail(`  ${OWNER_EMAIL.toUpperCase()}  `), true);
  assert.equal(isOwnerEmail('other@example.com'), false);
  assert.equal(isOwnerEmail(null), false);
});
