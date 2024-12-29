import { useEffect, useState } from "react";

import { logger } from "../../shared/logger";
import { MCPServerConfig } from "../../main/claude";

import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function ServersManager() {
  const { toast } = useToast();
  const [servers, setServers] = useState<{
    [serverName: string]: MCPServerConfig;
  }>({});
  const [isDeleting, setIsDeleting] = useState<{
    [serverName: string]: boolean;
  }>({});

  useEffect(() => {
    window.ipc.invoke("claude:get-mcp-servers", undefined)
      .then(({ success, data, error }) => {
        if (success) {
          setServers(data);
        } else {
          toast({
            title: "Servers Manager Error",
            description: error,
            variant: "destructive",
          });
          logger.error("get-mcp-servers error:", new Error(error));
        }
      })
      .catch((error) => {
        toast({
          title: "Servers Manager Error",
          description:
            "An unexpected error occurred while getting MCP servers from your Claude Desktop App.",
          variant: "destructive",
        });
        logger.error("Unexpected error during ipc.invoke('claude:get-mcp-servers'):", error);
      });
  }, []);

  useEffect(() => {
    window.ipc.on("claude:config-changed", ({ config }) => {
      setServers(config.mcpServers);
    });
  }, []);

  const handleDelete = async (serverName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the server "${serverName}"?`
      )
    ) {
      return;
    }

    setIsDeleting((prev) => ({ ...prev, [serverName]: true }));

    try {
      const { success, error } = await window.ipc.invoke("claude:delete-mcp-server", { serverName });
      if (success) {
        setServers((prevServers) => {
          const updatedServers = { ...prevServers };
          delete updatedServers[serverName];
          return updatedServers;
        });
        toast({
          title: "Server Deleted",
          description: `The server "${serverName}" has been successfully deleted.`,
        });
      } else {
        toast({
          title: "Delete Error",
          description: error,
          variant: "destructive",
        });
        logger.error("delete-mcp-server error:", new Error(error));
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: `An unexpected error occurred while deleting "${serverName}".`,
        variant: "destructive",
      });
      logger.error("Unexpected delete error:", error);
    } finally {
      setIsDeleting((prev) => ({ ...prev, [serverName]: false }));
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-4 m-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Claude Desktop MCP Servers Manager
        </CardTitle>
        <CardDescription>
          Manage your MCP servers installed on the Claude Desktop App.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Server Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(servers).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No servers installed. Follow the instructions above to install
                  a MCP server.
                </TableCell>
              </TableRow>
            ) : (
              Object.keys(servers).map((serverName) => (
                <TableRow key={serverName}>
                  <TableCell>{serverName}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(serverName)}
                      disabled={isDeleting[serverName]}
                    >
                      {isDeleting[serverName] ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
