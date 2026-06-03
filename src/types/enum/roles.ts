export enum Role {
    USER = "user",
    ADMIN = "admin",
    EMPLOYEE = "employee",
    INVENTORY_MANAGER = "inventory_manager",
    INVENTORY_VIEWER = "inventory_viewer",
    PRIVATE_PRACTITIONER = "private_practitioner",
    DIRECTION = "direction",
}

export const DISPENSARY_MEMBER_ROLES = [
    Role.ADMIN,
    Role.EMPLOYEE,
    Role.INVENTORY_MANAGER,
    Role.INVENTORY_VIEWER,
    Role.PRIVATE_PRACTITIONER,
    Role.DIRECTION,
] as const;

export type DispensaryMemberRole = (typeof DISPENSARY_MEMBER_ROLES)[number];

export function parseRoleList(roleNames: string | null | undefined): Role[] {
    if (!roleNames) {
        return [];
    }
    return roleNames
        .split(',')
        .map((r) => r.trim())
        .filter((r): r is Role => Object.values(Role).includes(r as Role));
}

export function formatRolesList(roleNames: string | null | undefined): string {
    return parseRoleList(roleNames)
        .map((r) => rolesAsString(r))
        .join(', ');
}

export function serializeRoleList(roles: string[]): string {
    const unique = [...new Set(roles.map((r) => r.trim()).filter((r) => r.length > 0))];
    return unique.join(',');
}

export const rolesAsString = (role: Role): string => {
    switch (role) {
        case Role.USER:
            return "Utilisateur";
        case Role.ADMIN:
            return "Administrateur";
        case Role.EMPLOYEE:
            return "Employé";
        case Role.INVENTORY_MANAGER:
            return "Gestionnaire de stock";
        case Role.INVENTORY_VIEWER:
            return "Consultant de stock";
        case Role.PRIVATE_PRACTITIONER:
            return "Praticien privé";
        case Role.DIRECTION:
            return "Direction";
    }
};