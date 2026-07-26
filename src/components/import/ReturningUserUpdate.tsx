import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

interface ReturningUserUpdateProps {
  onUpload: () => void;
  onShowInstructions: () => void;
}

export function ReturningUserUpdate({ onUpload, onShowInstructions }: ReturningUserUpdateProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-ink">
        <RefreshCw size={22} />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">Create a new snapshot</h1>
      <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-left text-sm text-ink-soft">
        <li>Request another Followers + Following export from Instagram.</li>
        <li>Choose All time.</li>
        <li>Choose JSON.</li>
        <li>Download the ZIP.</li>
        <li>Upload it here.</li>
      </ol>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={onUpload}>
          Upload New Export
        </Button>
        <Button size="lg" variant="secondary" onClick={onShowInstructions}>
          Show Full Instructions
        </Button>
      </div>
    </div>
  );
}
