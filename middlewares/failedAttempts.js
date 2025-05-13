export function isAccountLocked(user){
    if (!user.lockUntil) return false;
    return user.lockUntil > Date.now();
}