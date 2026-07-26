"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

const ACCEPTED_EXTENSIONS = [".zip", ".json"];

export function Dropzone({ onFileSelected, error }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const isValid = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!isValid) return;
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200",
          dragOver ? "border-ink bg-cream scale-[1.01]" : "border-border-strong bg-white"
        )}
      >
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", dragOver ? "bg-ink text-white" : "bg-surface text-ink-faint")}>
          <UploadCloud size={24} />
        </div>
        <p className="mt-5 text-base font-medium text-ink">Drop your Instagram export here</p>
        <p className="mt-1 text-sm text-ink-faint">ZIP recommended</p>

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.json"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={13} />
          Your file is processed locally and never uploaded to our servers.
        </p>
      </div>
      {error && <p className="mt-3 text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
