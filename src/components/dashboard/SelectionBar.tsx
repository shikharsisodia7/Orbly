import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface SelectionBarProps {
  count: number;
  onSelectVisible: () => void;
  onClear: () => void;
  onAddToQueue: () => void;
}

export function SelectionBar({ count, onSelectVisible, onClear, onAddToQueue }: SelectionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-lg"
        >
          <span className="text-sm font-medium text-ink">{count} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectVisible}>
              Select visible
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
            <Button size="sm" onClick={onAddToQueue}>
              Add to Unfollow Queue
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
