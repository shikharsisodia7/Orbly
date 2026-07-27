export interface WizardStage {
  id: string;
  label: string;
  title: string;
  body: string;
  substeps: string[];
  /** Optional emphasised note rendered below the steps. */
  callout?: string;
  action?: { label: string; href: string };
}

export const WIZARD_STAGES: WizardStage[] = [
  {
    id: "account",
    label: "Account",
    title: "Open Instagram settings",
    body: "Instagram keeps your data export tool inside the shared Meta Accounts Center.",
    substeps: [
      "Open Instagram and go to your profile.",
      "Tap the menu icon, then Settings.",
      "Tap Accounts Center, then Your information and permissions.",
    ],
    action: { label: "Open Instagram", href: "https://www.instagram.com/" },
  },
  {
    id: "data",
    label: "Data",
    title: "Start an export",
    body: "Meta lets you export only the categories of data you actually need.",
    substeps: [
      "Tap Export your information.",
      "Choose to create a new export and select this Instagram profile.",
      "When asked what to include, choose specific information and select only Followers and Following.",
    ],
  },
  {
    id: "format",
    label: "Format",
    title: "Set the export options",
    body: "These three settings make sure Orbly can read your export automatically.",
    substeps: [
      "Destination: Download to device.",
      "Date range: All time — check this one carefully. Meta often pre-selects the last year instead, and that silently leaves out most of your followers.",
      "Format: JSON — lets Orbly automatically read your follower relationships.",
    ],
    callout:
      "If you only change one thing on this screen, make it the date range. A date-limited export is the most common cause of follower counts that look wrong.",
  },
  {
    id: "download",
    label: "Download",
    title: "Wait for Meta, then download",
    body: "Meta prepares the file in the background — this can take anywhere from minutes to a day.",
    substeps: [
      "Tap Create export or Start export to submit the request.",
      "Meta will notify you by email or notification when it's ready.",
      "Open the notification and download the ZIP file to your device.",
    ],
  },
  {
    id: "upload",
    label: "Upload",
    title: "Bring it back to Orbly",
    body: "The last step — upload the ZIP here and Orbly takes it from there.",
    substeps: [
      "Come back to this page.",
      "Upload the ZIP file you just downloaded — no need to unzip it.",
      "Orbly reads it locally and never uploads it anywhere.",
    ],
  },
];
