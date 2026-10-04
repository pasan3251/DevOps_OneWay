"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Truck,
  RotateCw,
  LogOut,
  ChevronDown,
  Building2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaypointLogo } from "@/components/waypoint-logo";
import { authService } from "@/features/auth/auth-service";
import {
  storeApi,
  DEMO_OUTLETS,
  type StoreOverviewData,
  type StoreOrder,
} from "./store-manager-api";

import { OverviewView } from "./components/overview-view";
import { NewOrderView } from "./components/new-order-view";
import { OrdersView } from "./components/orders-view";
import { DeliveriesView } from "./components/deliveries-view";

export function StoreManagerDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'new-order' | 'orders' | 'deliveries'>('overview');
  const [data, setData] = useState<StoreOverviewData | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState<boolean>(false);

  // Load store overview data
  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const overview = await storeApi.getOverview();
      const orderList = await storeApi.getOrders();
      setData(overview);
      setOrders(orderList);
    } catch (err) {
      console.error('Failed to load store manager data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching active store outlet (for testing & demo purposes)
  const handleSelectOutlet = (outletId: string) => {
    storeApi.setActiveOutlet(outletId);
    setStoreDropdownOpen(false);
    loadData(true);
  };

  const handleLogout = () => {
    authService.signOut();
    router.push('/');
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        <span className="text-xs">Initializing Store Operational Context...</span>
      </div>
    );
  }

  const activeOutlet = data.outlet;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Role Identity */}
          <div className="flex items-center gap-3">
            <WaypointLogo light />
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold uppercase tracking-wider"
              >
                Store Manager
              </Badge>
              <span className="text-xs text-slate-400 hidden md:inline">
                • Supply Chain Demand Portal
              </span>
            </div>
          </div>

          {/* Store Switcher & User Actions */}
          <div className="flex items-center gap-3">
            {/* Store Outlet Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-sky-400" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeOutlet.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {storeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-800">
                    Switch Assigned Outlet (Demo Scope)
                  </div>
                  {DEMO_OUTLETS.map((outlet) => (
                    <button
                      key={outlet.id}
                      type="button"
                      onClick={() => handleSelectOutlet(outlet.id)}
                      className={`w-full px-3 py-2 text-left text-xs flex flex-col transition-colors ${
                        outlet.id === activeOutlet.id
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{outlet.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{outlet.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{outlet.brand} Retail • {outlet.district}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 h-8 w-8 p-0"
              title="Refresh Store Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs h-8 px-2.5 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* 2. Secondary View Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
          <nav className="flex space-x-1 sm:space-x-4 py-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'overview'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Store Overview
            </button>

            <button
              onClick={() => setActiveTab('new-order')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'new-order'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Order
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'orders'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Orders
              {data.activeCounts.total > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {data.activeCounts.total}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('deliveries')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'deliveries'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              Deliveries &amp; Receiving
              {data.inboundDeliveries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-400 border border-sky-800">
                  {data.inboundDeliveries.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* 3. Main Operational Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView
            data={data}
            onNavigateToNewOrder={() => setActiveTab('new-order')}
            onNavigateToOrders={() => setActiveTab('orders')}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setActiveTab('orders');
            }}
            onRefresh={() => loadData(true)}
          />
        )}

        {activeTab === 'new-order' && (
          <NewOrderView
            outlet={data.outlet}
            cutoff={data.cutoff}
            onOrderCreated={() => {
              loadData(true);
              setActiveTab('orders');
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            selectedOrder={selectedOrder}
            onSelectOrder={setSelectedOrder}
            onRefresh={() => loadData(true)}
            onNavigateToNewOrder={() => setActiveTab('new-order')}
          />
        )}

        {activeTab === 'deliveries' && (
          <DeliveriesView
            deliveries={data.inboundDeliveries}
            onRefresh={() => loadData(true)}
          />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Waypoint Logistics Management System • Store Manager Portal (SM-1, SM-3, ALT-1)
          </span>
          <span className="font-mono text-[11px] text-slate-600">
            Fulfillment Depot: Peliyagoda Central Hub (District Delivery Protocol)
          </span>
        </div>
      </footer>
    </div>
  );
}
