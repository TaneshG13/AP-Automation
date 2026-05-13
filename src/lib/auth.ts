const KEY = "ap_auth";
export const ADMIN_EMAIL = "admin@apautomation.ai";
export const ADMIN_PASSWORD = "Admin@123";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
export function login(email: string, password: string): boolean {
  if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}
export function logout() {
  localStorage.removeItem(KEY);
}
