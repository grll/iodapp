import { useEffect } from "react";

import { useToast } from "./use-toast";

/**
 * Hook to handle notifications from the main process.
 * it displays messages received on the notify channel as toast notifications.
 */
export function useNotifications() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = window.ipc.on("notify", ({ type, title, message }) => {
      toast({
        title: title ?? "Notification",
        description: message,
        variant: type === "error" ? "destructive" : "default",
      });
    });

    return () => unsubscribe();
  }, []);
}
