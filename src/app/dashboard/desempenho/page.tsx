import { redirect } from "next/navigation";

export default function PerformancePage() {
  redirect("/dashboard/radar?tab=desempenho");
}
