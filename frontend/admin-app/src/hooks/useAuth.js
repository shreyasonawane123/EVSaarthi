// frontend/admin-app/src/hooks/useAuth.js
// Convenience hook — import this instead of AuthContext directly.

import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuth = () => useContext(AuthContext);
