class Role {
    static CITIZEN = 'citizen';   
    static RESCUE_TEAM = 'rescue_team';
    static RESCUE_COORDINATOR = 'rescue_coordinator';
    static ADMIN = 'admin';
    static MANAGER = 'manager';
    static invalidRoles(role) {
        return [
            Role.ADMIN,
            Role.MANAGER,   
            Role.RESCUE_COORDINATOR,
            Role.RESCUE_TEAM,
            Role.CITIZEN
        ];
    }
}
export default Role;