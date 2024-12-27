import { useEffect } from "react";

import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export function Instructions() {
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

  return (
    <div className="flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center font-medium text-muted-foreground">
            Important: Please keep this application open during setup.
          </div>
          <ol className="space-y-6">
            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                1
              </span>
              <div className="flex-1 pt-1">
                Choose a server to install on{" "}
                <Button variant="link" className="h-auto p-0" asChild>
                  <a
                    href="https://iod.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://iod.ai
                  </a>
                </Button>
                .
              </div>
            </li>

            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                2
              </span>
              <div className="flex-1 pt-1">
                Click &apos;Install&apos; on your selected server and follow the
                setup wizard on the website.
              </div>
            </li>

            <li className="flex items-start gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                3
              </span>
              <div className="flex-1 pt-1">
                Click &apos;Auto-Install (macOS)&apos;. This application will install the
                server and restart Claude Desktop app.
              </div>
            </li>
          </ol>
          <div className="mt-6 text-sm text-muted-foreground">
            The installation will start automatically after these steps. Do not
            close this window until finished.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
