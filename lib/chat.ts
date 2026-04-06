export function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "advisor":
      return "Advisor";
    case "chapter_officer":
      return "Officer";
    case "state_officer":
      return "State Officer";
    case "national_officer":
      return "National Officer";
    case "admin":
      return "Admin";
    default:
      return "Member";
  }
}

export function roleBadgeColors(role: string | null | undefined) {
  switch (role) {
    case "advisor":
      return {
        bg: "#DBEAFE",
        text: "#1D4ED8",
      };
    case "chapter_officer":
      return {
        bg: "#DCFCE7",
        text: "#15803D",
      };
    case "state_officer":
    case "national_officer":
      return {
        bg: "#F3E8FF",
        text: "#7E22CE",
      };
    case "admin":
      return {
        bg: "#FEE2E2",
        text: "#B91C1C",
      };
    default:
      return {
        bg: "#F1F5F9",
        text: "#475569",
      };
  }
}

export function formatMessageTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}