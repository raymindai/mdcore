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
  });

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      setState({ user: null, profile: null, loading: false });
      return;
    }

    supabase.auth.getSession().then((res: { data: { session: { user: User } | null } }) => {
      const session = res.data.session;
      if (session?.user) {
        setState((prev) => ({ ...prev, user: session.user, loading: false }));
        fetchProfile(supabase, session.user.id, setState);
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User } | null) => {
        if (session?.user) {
          setState((prev) => ({ ...prev, user: session.user, loading: false }));
          fetchProfile(supabase, session.user.id, setState);
        } else {
          setState({ user: null, profile: null, loading: false });
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
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false });
  }, [supabase]);

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: !!state.user,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signOut,
  };
}
