export enum Role {
    USER = "user",
    ADMIN = "admin",
    EMPLOYEE = "employee",
    INVENTORY_MANAGER = "inventory_manager",
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
    }
};