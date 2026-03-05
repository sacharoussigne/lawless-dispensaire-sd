import { createAccessControl } from "better-auth/plugins";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";


const defaultApplicationPermissions = {
    stock: ["view", "create", "update", "delete", "craft-read", "craft-write"],
    orders: ["view", "create", "update", "delete"],
    // items: ["view", "create", "update", "delete"],
    // companies: ["view", "create", "update", "delete"],
    application: ["access", "management"],
};
export const statement = {
    ...defaultStatements, // Les permissions par défaut (user, session)

    // Vos ressources personnalisées
    ...defaultApplicationPermissions,
} as const;



const ac = createAccessControl(statement);

const user = ac.newRole({
    ...userAc.statements,
    stock: [],
    orders: [],
    // items: [],
    // companies: [],
    application: []
});

const admin = ac.newRole({
    ...adminAc.statements,
    ...defaultApplicationPermissions,
});

const employee = ac.newRole({
    ...userAc.statements,
    stock: ["view", "craft-read"],
    orders: ["view"],
    // items: ["view"],
    // companies: ["view"],
    application: ["access"],
});

const inventory_manager = ac.newRole({
    ...userAc.statements,
    stock: ["view", "create", "update", "delete", "craft-read", "craft-write"],
    orders: ["view", "create", "update", "delete"],
    // items: ["view"],
    // companies: ["view"],
    application: ["access", "management"],
});

// Map des rôles pour faciliter l'accès
const rolesMap = {
    user,
    admin,
    employee,
    inventory_manager,
} as const;

/**
 * Vérifie si un rôle a une permission spécifique en utilisant directement les rôles
 * Plus performant que d'utiliser l'API Better Auth
 * @param roleName Le nom du rôle de l'utilisateur
 * @param resource La ressource à vérifier (ex: "application", "stock", "orders")
 * @param action L'action à vérifier (ex: "access", "view", "create")
 * @returns true si le rôle a la permission, false sinon
 */
export function checkRolePermission(
    roleName: string | null | undefined,
    resource: keyof typeof statement,
    action: string
): boolean {
    if (!roleName) {
        return false;
    }

    const roles = roleName.split(",").map((r) => r.trim()).filter((r) => r.length > 0);

    for (const role of roles) {
        const roleObj = rolesMap[role as keyof typeof rolesMap];
        if (!roleObj) {
            continue;
        }

        const resourcePermissions = roleObj.statements[resource];
        if (!resourcePermissions) {
            continue;
        }

        if (resourcePermissions.includes(action as any)) {
            return true;
        }
    }

    return false;
}

export function hasRole(
    roleName: string | null | undefined,
    roleToCheck: keyof typeof rolesMap | string
): boolean {
    if (!roleName) {
        return false;
    }

    const roles = roleName.split(",").map((r) => r.trim()).filter((r) => r.length > 0);
    const target = String(roleToCheck).trim();

    return roles.includes(target);
}

export { ac, user, admin, employee, inventory_manager };