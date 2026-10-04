"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  Snowflake,
  Sun,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storeApi, type StoreOrder } from "../store-manager-api";

interface OrdersViewProps {
  orders: StoreOrder[];
  selectedOrder: StoreOrder | null;
  onSelectOrder: (order: StoreOrder | null) => void;
  onRefresh: () => void;
  onNavigateToNewOrder: () => void;
}

export function OrdersView({
  orders,
  selectedOrder,
  onSelectOrder,
  onRefresh,
  onNavigateToNewOrder,
}: OrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.orderDate.includes(q) ||
          order.tempRequirement.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Handle Cancellation
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setIsCancelling(true);
    setActionError(null);

    try {
      await storeApi.cancelOrder(selectedOrder.id);
      setCancelConfirmOpen(false);
      onSelectOrder(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancellable =
    selectedOrder &&
    (selectedOrder.status === 'ORDER_RECORDED' || selectedOrder.status === 'QUEUED_NEXT_RUN');

  return (
    <div className="space-y-5">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">Replenishment Orders</h1>
          <p className="text-xs text-muted-foreground">
            Lifecycle monitoring for all recorded, scheduled, in-transit, and delivered orders.
          </p>
        </div>

        <Button
          onClick={onNavigateToNewOrder}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-9 px-4 shadow-sm"
        >
          New Order
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by order number or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border text-foreground pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ORDER_RECORDED', label: 'Recorded (Pre-Cutoff)' },
            { id: 'QUEUED_NEXT_RUN', label: 'Queued Next Run' },
            { id: 'ASSIGNED', label: 'Assigned to Fleet' },
            { id: 'IN_TRANSIT', label: 'In Transit' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                statusFilter === pill.id
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Orders Data Table */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
          No replenishment orders found matching current filters.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 border-b border-border text-muted-foreground uppercase font-medium text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Cargo Regime</th>
                  <th className="py-3 px-4">Consignment Size</th>
                  <th className="py-3 px-4">Cutoff Status</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredOrders.map((order) => {
                  const isChilled = order.tempRequirement === 'chilled';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {order.orderDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isChilled ? (
                            <Snowflake className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Sun className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span className="capitalize">{order.tempRequirement}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {order.totalItemsCount} pkgs ({order.totalWeightKg} kg / {order.totalVolumeM3} m³)
                      </td>
                      <td className="py-3 px-4">
                        {order.isCutoffLocked ? (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            Cutoff Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            Pre-Cutoff
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-muted text-foreground border-border"
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Canonical Order Detail Drawer / Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && onSelectOrder(null)}>
          <DialogContent className="sm:max-w-[640px] bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-foreground font-mono">
                      {selectedOrder.orderNumber}
                    </DialogTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-muted text-foreground border-border"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Submitted: {new Date(selectedOrder.submissionTime).toLocaleString()}
                  </DialogDescription>
                </div>

                <Badge variant="outline" className="bg-muted text-foreground text-xs capitalize border-border">
                  {selectedOrder.tempRequirement} Cargo
                </Badge>
              </div>
            </DialogHeader>

            {actionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-background rounded-lg border border-border text-center text-xs">
              <div>
                <span className="text-muted-foreground block">Total Items</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">
                  {selectedOrder.totalItemsCount} pkgs
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Consignment Weight</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">
                  {selectedOrder.totalWeightKg} kg
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Consignment Volume</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">
                  {selectedOrder.totalVolumeM3} m³
                </span>
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Manifest Item Lines ({selectedOrder.items?.length || 0})
              </h4>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground text-[10px] uppercase border-b border-border">
                    <tr>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Wt</th>
                      <th className="py-2 px-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono text-foreground font-semibold text-[11px]">
                          {item.productCode}
                        </td>
                        <td className="py-2 px-3 font-medium text-foreground">
                          {item.productName}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-foreground">
                          {item.quantityRequested}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          {item.unitWeightKg} kg
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">
                          LKR {item.unitPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contextual Actions */}
            <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between w-full">
              <div>
                {isCancellable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelConfirmOpen(true)}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs h-8 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel Order (Pre-Cutoff)
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Cancellation locked ({selectedOrder.status})
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectOrder(null)}
                className="border-border text-foreground text-xs h-8 hover:bg-muted"
              >
                Close Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. Cancellation Confirmation Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Order Cancellation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to cancel order <strong className="text-foreground">{selectedOrder?.orderNumber}</strong>?
              This action cannot be undone and releases replenishment capacity back to the Peliyagoda hub.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelConfirmOpen(false)}
              className="border-border text-foreground text-xs h-8 hover:bg-muted"
            >
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={handleCancelOrder}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-8"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

