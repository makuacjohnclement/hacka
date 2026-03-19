import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { AuthContext } from './AuthContextInstance';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('smartaid_role') || null);

  function login(email, password, role = 'user') {
    return signInWithEmailAndPassword(auth, email, password).then((cred) => {
      setUserRole(role);
      sessionStorage.setItem('smartaid_role', role);
      return cred;
    });
  }

  function signup(email, password, role = 'user') {
    return createUserWithEmailAndPassword(auth, email, password).then((cred) => {
      setUserRole(role);
      sessionStorage.setItem('smartaid_role', role);
      return cred;
    });
  }

  function logout() {
    setUserRole(null);
    sessionStorage.removeItem('smartaid_role');
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserRole(null);
        sessionStorage.removeItem('smartaid_role');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({ currentUser, userRole, login, signup, logout }),
    [currentUser, userRole],
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
