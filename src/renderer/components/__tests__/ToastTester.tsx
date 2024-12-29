import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ToastTester() {
  const { toast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      <Button
        onClick={() =>
          toast({
            title: "MCP Servers Error",
            variant: "destructive",
            description: `We failed to retrieve MCP servers from your Claude Desktop App config file.
      We might not have access to the config file or the config file could be wrongly formatted.
      Join our discord for more support: https://discord.gg/claude-desktop
      `,
          })
        }
      >
        Show Default Toast
      </Button>

      <Button
        variant="destructive"
        onClick={() =>
          toast({
            title: "Error Toast",
            description:
              "This is an error message with a longer description that might wrap to multiple lines",
            variant: "destructive",
          })
        }
      >
        Show Error Toast
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          toast({
            description: "This is a toast without a title",
          })
        }
      >
        Show No Title Toast
      </Button>
    </div>
  );
}
