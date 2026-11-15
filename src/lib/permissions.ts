import type { AppRole } from './types';

export const OWNER_EMAIL = 'paundraoktar@gmail.com';

export interface PermissionSubject {
  id: string;
  roles: readonly AppRole[];
  isOwner?: boolean;
  email?: string;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export function isOwnerSubject(subject: PermissionSubject | null | undefined): boolean {
  if (!subject) return false;
  return Boolean(subject.isOwner) || isOwnerEmail(subject.email);
}

export function hasRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function canAccessAdmin(roles: readonly AppRole[], isOwner: boolean = false): boolean {
  return isOwner || roles.includes('admin') || roles.includes('moderator');
}

export function canBan(actor: PermissionSubject, target: PermissionSubject): boolean {
  if (actor.id === target.id) {
    return false;
  }
  if (isOwnerSubject(target)) {
    return false;
  }
  if (isOwnerSubject(actor) || hasRole(actor.roles, 'admin')) {
    return true;
  }
  if (hasRole(actor.roles, 'moderator')) {
    return target.roles.length === 0;
  }
  return false;
}

export function canManageRoles(actor: PermissionSubject): boolean {
  return isOwnerSubject(actor) || hasRole(actor.roles, 'admin');
}

export function canRemoveAdminRole(adminCount: number): boolean {
  return adminCount > 1;
}

export function canDeletePost(actor: PermissionSubject, postAuthorId: string): boolean {
  if (actor.id === postAuthorId) {
    return true;
  }
  return canAccessAdmin(actor.roles, isOwnerSubject(actor));
}
