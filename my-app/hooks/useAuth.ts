"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { User } from "@/types/user";

const LOCAL_USER_ID_KEY = "cooking-chatbot:user-id";

function fallbackUuid() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  );
}

function getLocalUser(): User {
  let id = window.localStorage.getItem(LOCAL_USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? fallbackUuid();
    window.localStorage.setItem(LOCAL_USER_ID_KEY, id);
  }
  return { id, email: "local@cooking-chatbot.local" };
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const sessionUser = session?.user as
    | ({ email?: string | null } & { id?: string | null })
    | undefined;

  useEffect(() => {
    queueMicrotask(() => {
      setLocalUser(getLocalUser());
    });
  }, []);

  if (sessionUser?.id) {
    return {
      user: {
        id: sessionUser.id,
        email: sessionUser.email ?? "",
      },
      loading: status === "loading",
    };
  }

  return { user: localUser, loading: status === "loading" || !localUser };
}
