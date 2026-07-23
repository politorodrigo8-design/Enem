import { redirect } from "next/navigation";

export default function HighPriorityTrainingPage() {
  redirect("/dashboard/praticar?tab=banco&focus=priority");
}
