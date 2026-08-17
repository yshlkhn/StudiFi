import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;


    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();


        // No session found
        if (!session) {
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }


        // Verify user still exists in Supabase
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();


        // User deleted or session invalid
        if (error || !user) {
          await supabase.auth.signOut();

          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }

          return;
        }


        // Valid session
        if (mounted) {
          setSession(session);
          setUser(user);
          setLoading(false);
        }


      } catch (error) {
        console.error("Auth initialization error:", error.message);

        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {

        if (!mounted) return;


        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

      }
    );


    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);



  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}