import { notFound } from "next/navigation";
import { isRole } from "@/features/auth/accounts";
import { RoleWorkspace } from "@/features/auth/role-workspace";
import { DispatcherDashboard } from "@/features/dispatcher/dispatcher-dashboard";
import { LoaderDashboard } from "@/features/loader/loader-dashboard";
import { DriverApp } from "@/features/driver/driver-app";
import { StoreManagerDashboard } from "@/features/store-manager/store-manager-dashboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  if (role === "dispatcher") return <DispatcherDashboard />;
  if (role === "loader") return <LoaderDashboard />;
  if (role === "driver") return <DriverApp />;
  if (role === "store-manager") return <StoreManagerDashboard />;
  return <RoleWorkspace role={role} />;
}

