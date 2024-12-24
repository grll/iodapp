import { useEffect } from "react";

import { useToast } from "@/hooks/use-toast";

export function Test() {
  const { toast } = useToast();

  useEffect(() => {
    const unlisten = window.installer.onInstallError((error) => {
      toast({
        title: "Install Error",
        description: error,
        variant: "destructive",
      });
    });

    return () => {
      unlisten();
    };
  }, []);

  useEffect(() => {
    const unlisten = window.installer.onInstallSuccess((message) => {
      toast({
        title: "Install Success",
        description: message,
      });
    });

    return () => {
      unlisten();
    };
  }, []);

  useEffect(() => {
    const unlisten = window.claude.onConfigChanged((config) => {
      toast({
        title: "Config Changed",
        description: JSON.stringify(config),
      });
    });

    return () => {
      unlisten();
    };
  }, []);

  useEffect(() => {
    const unlisten = window.claude.onConfigError((error) => {
      toast({
        title: "Config Error",
        description: error,
        variant: "destructive",
      });
    });

    return () => {
      unlisten();
    };
  }, []);

  return <h2 className="text-2xl font-bold">Hello from React Again!</h2>;
}
