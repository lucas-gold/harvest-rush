import { StateStorage } from "zustand/middleware";

// Plain localStorage, not AsyncStorage -- this app currently only ships to
// web (see the Firebase/Fly.io deploy scripts), and "persists until you
// clear cookies/site data" is exactly localStorage's model. Every method
// no-ops harmlessly wherever localStorage isn't available (SSR, native
// without a storage polyfill) instead of throwing.
export const webStorage: StateStorage = {
  getItem: (name) => (typeof localStorage === "undefined" ? null : localStorage.getItem(name)),
  setItem: (name, value) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(name);
  },
};
