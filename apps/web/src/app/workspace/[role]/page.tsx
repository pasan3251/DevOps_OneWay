import { notFound } from "next/navigation";
import { isRole } from "@/features/auth/accounts";
import { RoleWorkspace } from "@/features/auth/role-workspace";
import { DispatcherDashboard } from "@/features/dispatcher/dispatcher-dashboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  if (role === "dispatcher") return <DispatcherDashboard />;
  return <RoleWorkspace role={role} />;
}
