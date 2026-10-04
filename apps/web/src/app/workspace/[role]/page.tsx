import { notFound } from "next/navigation";
import { isRole } from "@/features/auth/accounts";
import { RoleWorkspace } from "@/features/auth/role-workspace";
import { DispatcherDashboard } from "@/features/dispatcher/dispatcher-dashboard";
import { LoaderDashboard } from "@/features/loader/loader-dashboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  if (role === "dispatcher") return <DispatcherDashboard />;
  if (role === "loader") return <LoaderDashboard />;
  return <RoleWorkspace role={role} />;
}

