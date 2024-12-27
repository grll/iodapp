import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex justify-between rounded-full my-6 py-4 px-8 border border-gray-300 bg-white items-center max-w-5xl mx-3 lg:mx-auto">
      <h1 className="text-3xl font-bold">iod</h1>
      <Button asChild>
        <a href="https://iod.ai" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4" />
          go to website
        </a>
      </Button>
    </header>
  );
}
