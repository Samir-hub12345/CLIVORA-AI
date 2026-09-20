export function statusLabel(status: string) {
  return ({ awaiting_review: "Waiting for review", in_review: "Being reviewed", approved: "Reviewed", rejected: "More information needed", referred: "Referred by doctor", scheduled: "Scheduled", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>)[status] || status.replaceAll("_", " ");
}