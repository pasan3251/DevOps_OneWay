"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  Snowflake,
  Sun,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  PackageCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  storeApi,
  type StoreProfile,
  type ProductCatalogItem,
  type CutoffInfo,
} from "../store-manager-api";

interface NewOrderViewProps {
  outlet: StoreProfile;
  cutoff: CutoffInfo;
  onOrderCreated: () => void;
  onCancel: () => void;
}

export function NewOrderView({
  outlet,
  cutoff,
  onOrderCreated,
  onCancel,
}: NewOrderViewProps) {
  // Step 1: Order context
  const [orderDate, setOrderDate] = useState<string>(cutoff.nextDeliveryDate);
  const [tempRequirement, setTempRequirement] = useState<'ambient' | 'chilled'>('ambient');

  // Step 2: Product selection
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart: Map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Available catalog filtered by store brand and selected temperature requirement
  const availableCatalog = useMemo(() => {
    const brandCatalog = storeApi.getCatalogForStore(outlet.brand);
    return brandCatalog.filter((item) => {
      // Must match chosen temperature requirement
      if (item.tempRequirement !== tempRequirement) return false;
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [outlet.brand, tempRequirement, selectedCategory, searchQuery]);

  // Unique categories for pills
  const categories = useMemo(() => {
    const brandCatalog = storeApi.getCatalogForStore(outlet.brand);
    const tempMatched = brandCatalog.filter((i) => i.tempRequirement === tempRequirement);
    const cats = Array.from(new Set(tempMatched.map((i) => i.category)));
    return ['ALL', ...cats];
  }, [outlet.brand, tempRequirement]);

  // Cart calculations
  const cartSummary = useMemo(() => {
    let totalItems = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let totalValue = 0;

    const allCatalog = storeApi.getCatalogForStore(outlet.brand);

    for (const [productId, qty] of Object.entries(cart)) {
      if (qty > 0) {
        const prod = allCatalog.find((p) => p.id === productId);
        if (prod) {
          totalItems += qty;
          totalWeight += prod.unitWeightKg * qty;
          totalVolume += prod.unitVolumeM3 * qty;
          totalValue += prod.unitPrice * qty;
        }
      }
    }

    return {
      totalItems,
      totalWeight: totalWeight.toFixed(2),
      totalVolume: totalVolume.toFixed(2),
      totalValue,
    };
  }, [cart, outlet.brand]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const clone = { ...prev };
        delete clone[productId];
        return clone;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setExactQuantity = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = Math.max(0, qty);
      if (next === 0) {
        const clone = { ...prev };
        delete clone[productId];
        return clone;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Submit Order
  const handleSubmitOrder = async () => {
    const items = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      setErrorBanner('Please select at least one product before submitting the replenishment order.');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      await storeApi.createOrder({
        tempRequirement,
        orderDate,
        items,
      });

      onOrderCreated();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Step Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Replenishment Workflow (SM-1)
            </span>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px]">
              {outlet.brand} Catalog
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1">Create Store Order</h1>
          <p className="text-xs text-slate-400">
            Submit daily replenishment demand for {outlet.name} fulfilled by Peliyagoda Central Hub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={cartSummary.totalItems === 0 || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold gap-1.5 text-xs h-9 px-4 shadow-lg shadow-emerald-600/20"
          >
            <PackageCheck className="h-4 w-4" />
            {isSubmitting ? "Validating & Submitting..." : `Submit Order (${cartSummary.totalItems} pkgs)`}
          </Button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 2. Order Context Controls (Delivery Date & Temperature Toggle) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Selector */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-400" />
              Target Operating Delivery Date *
            </label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="bg-slate-950 border-slate-700 text-slate-100 h-10 font-mono text-sm"
              min={cutoff.nextDeliveryDate}
              required
            />
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="h-3 w-3 text-amber-400" />
              {cutoff.isPastCutoff ? (
                <span className="text-rose-400 font-medium">
                  Past 16:00 Cutoff — Order will enter queue for following dispatch run (T+2).
                </span>
              ) : (
                <span>
                  Submitted before 16:00 Colombo time are scheduled for next-day delivery ({cutoff.nextDeliveryDate}).
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Temperature Requirement Selector (SM-ORD-002) */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              Temperature Cargo Regime (SM-ORD-002) *
            </label>

            {outlet.brand === 'Fresh' ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempRequirement('ambient');
                    handleClearCart();
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                    tempRequirement === 'ambient'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold block">Ambient Goods</span>
                    <span className="text-[10px] text-slate-400">Dry grocery &amp; staples</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTempRequirement('chilled');
                    handleClearCart();
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                    tempRequirement === 'chilled'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Snowflake className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold block">Chilled Goods</span>
                    <span className="text-[10px] text-slate-400">Cold chain dairy &amp; produce</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
                <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold block">{outlet.brand} Goods are Ambient Only</span>
                  <span className="text-[11px] text-slate-500">
                    Non-perishable logistics handled via standard ambient fleet.
                  </span>
                </div>
              </div>
            )}

            <span className="text-[11px] text-slate-500 block">
              {outlet.brand === 'Fresh'
                ? "Fresh supermarkets can submit max 1 ambient order and 1 chilled order per date."
                : "Single daily delivery allocated per outlet."}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Product Catalog Grid & Filter Bar */}
      <div className="space-y-4">
        {/* Search & Category Filter Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
            <Input
              type="text"
              placeholder="Search SKUs by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border-slate-700 text-slate-100 pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {availableCatalog.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500 text-xs">
            No products found matching the search criteria or selected temperature requirement.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableCatalog.map((product) => {
              const qty = cart[product.id] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/90 border-sky-500/50 shadow-sm shadow-sky-950/40'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-sky-400 font-semibold bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
                        {product.sku}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        LKR {product.unitPrice.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">
                      {product.name}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{product.packSize}</span>
                      <span>•</span>
                      <span>{product.unitWeightKg} kg</span>
                      <span>•</span>
                      <span>{product.unitVolumeM3} m³</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Order Qty</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, -1)}
                        disabled={qty === 0}
                        className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={qty}
                        onChange={(e) => setExactQuantity(product.id, parseInt(e.target.value) || 0)}
                        className="w-12 h-7 rounded bg-slate-950 border border-slate-700 text-center font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, 1)}
                        className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Sticky Live Cart Summary Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Total Units</span>
              <span className="text-base font-bold text-slate-100">
                {cartSummary.totalItems} pkgs
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Gross Weight</span>
            <span className="text-sm font-semibold text-slate-200">
              {cartSummary.totalWeight} kg
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Gross Volume</span>
            <span className="text-sm font-semibold text-slate-200">
              {cartSummary.totalVolume} m³
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Order Value</span>
            <span className="text-sm font-bold text-emerald-400">
              LKR {cartSummary.totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cartSummary.totalItems > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCart}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 h-9 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          <Button
            onClick={handleSubmitOrder}
            disabled={cartSummary.totalItems === 0 || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs h-10 px-6 gap-2 shadow-lg shadow-emerald-600/30"
          >
            <span>{isSubmitting ? "Validating & Submitting..." : "Submit Replenishment Order"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
