import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface DuplicateDialogProps {
  open: boolean;
  onCancel: () => void;
  onImportAnyway: () => void;
}

export function DuplicateDialog({ open, onCancel, onImportAnyway }: DuplicateDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="This exact follower snapshot has already been imported"
      description="Every follower and following username in this export matches an existing snapshot exactly."
    >
      <div className="flex flex-col gap-2">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onImportAnyway} variant="secondary">
          Import Anyway
        </Button>
      </div>
    </Dialog>
  );
}
