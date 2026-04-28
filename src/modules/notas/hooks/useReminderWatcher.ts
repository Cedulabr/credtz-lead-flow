import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "../types";

const POLL_INTERVAL = 30_000; // 30s
const NOTIFIED_KEY = "notas:reminders:notified";

function getNotifiedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function persistNotified(set: Set<string>) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

function fireBrowserNotification(note: Note) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(`Lembrete: ${note.title || "Sem título"}`, {
      body: note.title
        ? "Sua nota está agendada para agora."
        : "Você tem um lembrete agendado para agora.",
      tag: `note-${note.id}`,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn("Falha ao disparar notificação", e);
  }
}

/**
 * Observa lembretes vencidos do usuário (notas próprias ou da empresa quando
 * gestor/admin) e dispara: (1) popup grande in-app via callback, (2) push
 * notification do navegador.
 *
 * Para evitar repetição, marcamos `reminder_notified_at` na nota e
 * mantemos uma blacklist local para a sessão.
 */
export function useReminderWatcher() {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState<Note[]>([]);
  const notifiedRef = useRef<Set<string>>(getNotifiedSet());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkDueReminders = useCallback(async () => {
    if (!user) return;
    try {
      const nowIso = new Date().toISOString();
      // Reload set in case other tabs touched it
      notifiedRef.current = getNotifiedSet();

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .is("trashed_at", null)
        .eq("archived", false)
        .not("reminder_at", "is", null)
        .lte("reminder_at", nowIso)
        .is("reminder_notified_at" as any, null);

      if (error || !data) return;

      const fresh = (data as Note[]).filter(
        (n) => !notifiedRef.current.has(n.id)
      );

      if (fresh.length === 0) return;

      // Mark each as notified, both in DB and locally
      for (const note of fresh) {
        notifiedRef.current.add(note.id);
        fireBrowserNotification(note);
        // best-effort DB update; ignore RLS failure (e.g. another company)
        await supabase
          .from("notes")
          .update({ reminder_notified_at: new Date().toISOString() } as any)
          .eq("id", note.id);
      }
      persistNotified(notifiedRef.current);

      setActiveAlerts((prev) => {
        const ids = new Set(prev.map((n) => n.id));
        return [...prev, ...fresh.filter((n) => !ids.has(n.id))];
      });
    } catch (e) {
      console.warn("Reminder watcher falhou:", e);
    }
  }, [user]);

  // request permission + start polling
  useEffect(() => {
    if (!user) return;
    ensureNotificationPermission();
    checkDueReminders();
    intervalRef.current = setInterval(checkDueReminders, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, checkDueReminders]);

  // refresh when tab becomes visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkDueReminders();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [checkDueReminders]);

  const dismissAlert = (noteId: string) => {
    setActiveAlerts((prev) => prev.filter((n) => n.id !== noteId));
  };

  const dismissAll = () => setActiveAlerts([]);

  return { activeAlerts, dismissAlert, dismissAll, requestPermission: ensureNotificationPermission };
}
