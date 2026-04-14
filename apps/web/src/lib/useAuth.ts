"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  plan: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  accessToken: string | null;
}

function fetchProfile(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  userId: string,
  setState: React.Dispatch<React.SetStateAction<AuthState>>
) {
  if (!supabase) return;
  supabase
    .from("profiles")
    .select("display_name, avatar_url, plan")
    .eq("id", userId)
    .single()
    .then((res: { data: Profile | null }) => {
      if (res.data) setState((prev) => ({ ...prev, profile: res.data }));
    });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    accessToken: null,
  });

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      setState({ user: null, profile: null, loading: false, accessToken: null });
      return;
    }

    supabase.auth.getSession().then((res: { data: { session: { user: User; access_token?: string } | null } }) => {
      const session = res.data.session;
      if (session?.user) {
        setState((prev) => ({ ...prev, user: session.user, accessToken: session.access_token || null, loading: false }));
        fetchProfile(supabase, session.user.id, setState);
      } else {
        setState({ user: null, profile: null, loading: false, accessToken: null });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User; access_token?: string } | null) => {
        if (session?.user) {
          setState((prev) => ({ ...prev, user: session.user, accessToken: session.access_token || null, loading: false }));
          fetchProfile(supabase, session.user.id, setState);
        } else {
          setState({ user: null, profile: null, loading: false, accessToken: null });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, [supabase]);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!supabase) return { error: "Supabase not configured" };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error?.message || null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "global" });
    // Clear all Supabase-related storage to prevent auto-login on next sign-in
    Object.keys(localStorage).forEach(key => {
      if (key.includes("supabase") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
    setState({ user: null, profile: null, loading: false, accessToken: null });
  }, [supabase]);

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    accessToken: state.accessToken,
    isAuthenticated: !!state.user,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signOut,
  };
}
