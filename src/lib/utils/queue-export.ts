import type { QueueItemRecord } from "@/lib/db/schema";

export function queueToText(items: QueueItemRecord[]): string {
  return items.map((i) => i.normalizedUsername).join("\n");
}

export function queueToCsv(items: QueueItemRecord[]): string {
  const header = "username,profileUrl,source,status,addedAt";
  const rows = items.map((i) =>
    [i.normalizedUsername, i.profileUrl, i.source, i.status, i.addedAt]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export function queueToJson(items: QueueItemRecord[]): string {
  return JSON.stringify(items, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
