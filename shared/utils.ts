export function getCurrentShift(): "1st" | "2nd" | "3rd" {
  const now = new Date();
  const hours = now.getHours();
  
  if (hours >= 7 && hours < 15) {
    return "1st"; // 7AM - 3PM
  } else if (hours >= 15 && hours < 23) {
    return "2nd"; // 3PM - 11PM
  } else {
    return "3rd"; // 11PM - 7AM
  }
}

export function getShiftTimeRange(shift: "1st" | "2nd" | "3rd"): string {
  switch (shift) {
    case "1st":
      return "7:00 AM - 3:00 PM";
    case "2nd":
      return "3:00 PM - 11:00 PM";
    case "3rd":
      return "11:00 PM - 7:00 AM";
  }
}
