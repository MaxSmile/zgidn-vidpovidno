import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";

const isApprovedStatus = (status: string): boolean => {
  const lower = status.toLowerCase();
  return lower.includes("погоджено") || lower.includes("затверджено");
};

const isErrorStatus = (status: string): boolean => {
  const lower = status.toLowerCase();
  return (
    lower.includes("службове") ||
    lower.includes("пошкодження") ||
    lower.includes("помилка") ||
    lower.includes("відмова") ||
    lower.includes("не")
  );
};

export const getStatusIcon = (status: string) => {
  if (isApprovedStatus(status)) {
    return <CheckCircle2 size={14} className="text-[#00ff66]" />;
  }

  if (isErrorStatus(status)) {
    return <ShieldAlert size={14} className="text-red-400 animate-pulse" />;
  }

  return <Clock size={14} className="text-amber-400" />;
};

export const getStatusClass = (status: string): string => {
  if (isApprovedStatus(status)) {
    return "border-green-500/30 bg-green-500/10 text-green-400";
  }

  if (isErrorStatus(status)) {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
};
