import { Badge } from "@/components/ui/Badge";
import type { DatasetValidity } from "@/lib/instagram/validity";

const VALIDITY_LABEL: Record<DatasetValidity, string> = {
  complete: "Verified complete",
  unverified: "Unverified",
  partial: "Partial",
  invalid: "Invalid",
};

const VALIDITY_TONE: Record<DatasetValidity, "green" | "neutral" | "orange" | "rose"> = {
  complete: "green",
  unverified: "neutral",
  partial: "orange",
  invalid: "rose",
};

export function ValidityBadge({ validity }: { validity: DatasetValidity }) {
  return <Badge tone={VALIDITY_TONE[validity]}>{VALIDITY_LABEL[validity]}</Badge>;
}
