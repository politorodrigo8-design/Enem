import { redirect } from "next/navigation";

export default function ReviewPage() {
  redirect("/dashboard/praticar?tab=revisao");
}
