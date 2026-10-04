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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Replenishment Workflow (SM-1)
            </span>
            <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px]">
              {outlet.brand} Catalog
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">Create Store Order</h1>
          <p className="text-xs text-muted-foreground">
            Submit daily replenishment demand for {outlet.name} fulfilled by Peliyagoda Central Hub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-border text-foreground hover:bg-muted text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={cartSummary.totalItems === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 text-xs h-9 px-4 shadow-sm"
          >
            <PackageCheck className="h-4 w-4" />
            {isSubmitting ? "Validating & Submitting..." : `Submit Order (${cartSummary.totalItems} pkgs)`}
          </Button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3 text-destructive text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 2. Order Context Controls (Delivery Date & Temperature Toggle) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Selector */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Target Operating Delivery Date *
            </label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="bg-background border-border text-foreground h-10 font-mono text-sm"
              min={cutoff.nextDeliveryDate}
              required
            />
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {cutoff.isPastCutoff ? (
                <span className="text-destructive font-medium">
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
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-medium text-foreground block">
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
                      ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                      : 'bg-background border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  <Sun className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-semibold block">Ambient Goods</span>
                    <span className="text-[10px] text-muted-foreground">Dry grocery &amp; staples</span>
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
                      ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                      : 'bg-background border-border text-muted-foreground hover:border-foreground/50'
                  }`}
                >
                  <Snowflake className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-semibold block">Chilled Goods</span>
                    <span className="text-[10px] text-muted-foreground">Cold chain dairy &amp; produce</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-background rounded-lg border border-border flex items-center gap-2.5 text-xs text-foreground">
                <Sun className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-semibold block">{outlet.brand} Goods are Ambient Only</span>
                  <span className="text-[11px] text-muted-foreground">
                    Non-perishable logistics handled via standard ambient fleet.
                  </span>
                </div>
              </div>
            )}

            <span className="text-[11px] text-muted-foreground block">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search SKUs by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border-border text-foreground pl-9 h-9 text-xs"
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
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {availableCatalog.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
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
                      ? 'bg-card border-primary shadow-sm'
                      : 'bg-card border-border hover:border-foreground/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded border border-border">
                        {product.sku}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        LKR {product.unitPrice.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                      {product.name}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{product.packSize}</span>
                      <span>•</span>
                      <span>{product.unitWeightKg} kg</span>
                      <span>•</span>
                      <span>{product.unitVolumeM3} m³</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">Order Qty</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, -1)}
                        disabled={qty === 0}
                        className="h-7 w-7 rounded bg-muted hover:bg-accent text-foreground disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors border border-border"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={qty}
                        onChange={(e) => setExactQuantity(product.id, parseInt(e.target.value) || 0)}
                        className="w-12 h-7 rounded bg-background border border-border text-center font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, 1)}
                        className="h-7 w-7 rounded bg-muted hover:bg-accent text-foreground flex items-center justify-center transition-colors border border-border"
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
      <div className="sticky bottom-4 z-20 bg-card/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-border">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Total Units</span>
              <span className="text-base font-bold text-foreground">
                {cartSummary.totalItems} pkgs
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Gross Weight</span>
            <span className="text-sm font-semibold text-foreground">
              {cartSummary.totalWeight} kg
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Gross Volume</span>
            <span className="text-sm font-semibold text-foreground">
              {cartSummary.totalVolume} m³
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Order Value</span>
            <span className="text-sm font-bold text-foreground">
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
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-9 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          <Button
            onClick={handleSubmitOrder}
            disabled={cartSummary.totalItems === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-6 gap-2 shadow-md"
          >
            <span>{isSubmitting ? "Validating & Submitting..." : "Submit Replenishment Order"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

