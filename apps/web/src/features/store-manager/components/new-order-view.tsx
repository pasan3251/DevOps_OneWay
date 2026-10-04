"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Snowflake,
  Sun,
  Trash2,
} from "lucide-react";
import {
  storeApi,
  type CutoffInfo,
  type ProductCatalogItem,
  type StoreOrder,
  type StoreProfile,
} from "../store-manager-api";
import { formatDate } from "../store-manager-format";

interface NewOrderViewProps {
  outlet: StoreProfile;
  cutoff: CutoffInfo;
  existingOrders: StoreOrder[];
  onOrderCreated: () => void;
  onCancel: () => void;
}

type OrderStep = 1 | 2 | 3;
type Temperature = StoreOrder["tempRequirement"];
const orderSteps: Array<{ number: OrderStep; label: string }> = [
  { number: 1, label: "Delivery context" },
  { number: 2, label: "Order items" },
  { number: 3, label: "Review and submit" },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The order could not be submitted.";
}

export function NewOrderView({
  outlet,
  cutoff,
  existingOrders,
  onOrderCreated,
  onCancel,
}: NewOrderViewProps) {
  const firstDateOrders = existingOrders.filter(
    (order) => order.orderDate === cutoff.nextDeliveryDate && order.status !== "CANCELLED",
  );
  const initialTemperature: Temperature =
    outlet.brand === "Fresh" &&
    firstDateOrders.some((order) => order.tempRequirement === "ambient") &&
    !firstDateOrders.some((order) => order.tempRequirement === "chilled")
      ? "chilled"
      : "ambient";
  const [step, setStep] = useState<OrderStep>(1);
  const [orderDate, setOrderDate] = useState(cutoff.nextDeliveryDate);
  const [temperature, setTemperature] = useState<Temperature>(initialTemperature);
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const catalog = useMemo(
    () => storeApi.getCatalogForStore(outlet.brand),
    [outlet.brand],
  );
  const regimeCatalog = useMemo(
    () => catalog.filter((item) => item.tempRequirement === temperature),
    [catalog, temperature],
  );
  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(regimeCatalog.map((item) => item.category)))],
    [regimeCatalog],
  );
  const visibleCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return regimeCatalog.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (!normalized) return true;
      return [item.name, item.sku, item.category].some((value) =>
        value.toLowerCase().includes(normalized),
      );
    });
  }, [category, query, regimeCatalog]);

  const selectedItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          product: catalog.find((item) => item.id === productId),
          quantity,
        }))
        .filter(
          (entry): entry is { product: ProductCatalogItem; quantity: number } =>
            Boolean(entry.product),
        ),
    [cart, catalog],
  );
  const totals = useMemo(
    () =>
      selectedItems.reduce(
        (summary, { product, quantity }) => ({
          units: summary.units + quantity,
          weight: summary.weight + product.unitWeightKg * quantity,
          volume: summary.volume + product.unitVolumeM3 * quantity,
        }),
        { units: 0, weight: 0, volume: 0 },
      ),
    [selectedItems],
  );

  const existingForDate = existingOrders.filter(
    (order) => order.orderDate === orderDate && order.status !== "CANCELLED",
  );
  const ambientTaken = existingForDate.some((order) => order.tempRequirement === "ambient");
  const chilledTaken = existingForDate.some((order) => order.tempRequirement === "chilled");
  const selectedRegimeTaken = temperature === "ambient" ? ambientTaken : chilledTaken;

  function updateQuantity(productId: string, value: number) {
    const quantity = Math.max(0, Math.min(999, Math.floor(value || 0)));
    setCart((current) => {
      const next = { ...current };
      if (quantity === 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  function chooseTemperature(next: Temperature) {
    if (next === temperature) return;
    setTemperature(next);
    setCart({});
    setCategory("ALL");
    setQuery("");
    setError("");
  }

  function chooseDate(nextDate: string) {
    setOrderDate(nextDate);
    setError("");
    const ordersForNextDate = existingOrders.filter(
      (order) => order.orderDate === nextDate && order.status !== "CANCELLED",
    );
    const selectedTaken = ordersForNextDate.some(
      (order) => order.tempRequirement === temperature,
    );
    if (!selectedTaken || outlet.brand !== "Fresh") return;
    const alternative: Temperature = temperature === "ambient" ? "chilled" : "ambient";
    const alternativeTaken = ordersForNextDate.some(
      (order) => order.tempRequirement === alternative,
    );
    if (!alternativeTaken) chooseTemperature(alternative);
  }

  function continueFromContext() {
    if (selectedRegimeTaken) {
      setError(`A ${temperature} order already exists for ${formatDate(orderDate)}.`);
      return;
    }
    setError("");
    setStep(2);
  }

  function continueToReview() {
    if (totals.units === 0) {
      setError("Add at least one catalog item before reviewing the order.");
      return;
    }
    setError("");
    setStep(3);
  }

  async function submitOrder() {
    setSubmitting(true);
    setError("");
    try {
      await storeApi.createOrder({
        orderDate,
        tempRequirement: temperature,
        items: selectedItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      });
      onOrderCreated();
    } catch (submissionError) {
      setError(errorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="store-page-stack store-order-builder">
      <section className="store-task-header">
        <div>
          <span className="store-eyebrow">Controlled replenishment request</span>
          <h2>Build one complete order</h2>
          <p>Choose the delivery cycle, add items, then review once before submission.</p>
        </div>
        <button className="store-secondary-button" type="button" onClick={onCancel}>
          Cancel and return
        </button>
      </section>

      <ol className="store-stepper" aria-label="Order creation progress">
        {orderSteps.map(({ number, label }) => (
          <li key={number} data-state={step === number ? "current" : step > number ? "complete" : "upcoming"}>
            <span>{step > number ? <Check size={15} /> : number}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      {error && (
        <div className="store-feedback is-error" role="alert">
          <AlertTriangle size={17} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {step === 1 && (
        <section className="store-panel store-builder-panel" aria-labelledby="context-title">
          <header className="store-panel-heading">
            <div>
              <span className="store-eyebrow">Step 1 of 3</span>
              <h2 id="context-title">Select the delivery context</h2>
              <p>The 16:00 Colombo cutoff determines the earliest eligible delivery day.</p>
            </div>
          </header>

          <div className="store-context-grid">
            <label className="store-field">
              <span><CalendarDays size={15} /> Target delivery date</span>
              <input
                type="date"
                value={orderDate}
                min={cutoff.nextDeliveryDate}
                onChange={(event) => chooseDate(event.target.value)}
              />
              <small>Earliest: {formatDate(cutoff.nextDeliveryDate)}</small>
            </label>

            <div className="store-cycle-note">
              <strong>{cutoff.isPastCutoff ? "Following-run cycle" : "Next-day cycle"}</strong>
              <p>{cutoff.message}</p>
            </div>
          </div>

          <fieldset className="store-regime-fieldset">
            <legend>Goods temperature</legend>
            <p>
              {outlet.brand === "Fresh"
                ? "Fresh outlets may submit one ambient and one chilled order for the same delivery date."
                : `${outlet.brand} outlets use ambient transport only.`}
            </p>
            <div className="store-regime-grid">
              <button
                type="button"
                data-selected={temperature === "ambient"}
                disabled={ambientTaken}
                onClick={() => chooseTemperature("ambient")}
              >
                <span className="store-regime-icon"><Sun size={20} /></span>
                <span><strong>Ambient</strong><small>Dry goods and standard freight</small></span>
                {ambientTaken && <em>Already submitted</em>}
              </button>
              {outlet.brand === "Fresh" && (
                <button
                  type="button"
                  data-selected={temperature === "chilled"}
                  disabled={chilledTaken}
                  onClick={() => chooseTemperature("chilled")}
                >
                  <span className="store-regime-icon"><Snowflake size={20} /></span>
                  <span><strong>Chilled</strong><small>Refrigerated food and produce</small></span>
                  {chilledTaken && <em>Already submitted</em>}
                </button>
              )}
            </div>
          </fieldset>

          <footer className="store-builder-actions">
            <span>{existingForDate.length} active order{existingForDate.length === 1 ? "" : "s"} for this date</span>
            <button className="store-primary-button" type="button" onClick={continueFromContext}>
              Choose items <ArrowRight size={16} />
            </button>
          </footer>
        </section>
      )}

      {step === 2 && (
        <section className="store-panel store-builder-panel" aria-labelledby="items-title">
          <header className="store-panel-heading store-builder-heading">
            <div>
              <span className="store-eyebrow">Step 2 of 3 · {formatDate(orderDate)}</span>
              <h2 id="items-title">Add {temperature} items</h2>
              <p>Quantities are submitted as one indivisible order for Dispatch planning.</p>
            </div>
            <div className="store-builder-total"><small>Selected</small><strong>{totals.units} units</strong></div>
          </header>

          <div className="store-catalog-toolbar">
            <label className="store-search-field">
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU or product" />
            </label>
            <div className="store-filter-pills" aria-label="Product category">
              {categories.map((item) => (
                <button key={item} type="button" data-selected={category === item} onClick={() => setCategory(item)}>
                  {item === "ALL" ? "All categories" : item}
                </button>
              ))}
            </div>
          </div>

          <div className="store-catalog-grid">
            {visibleCatalog.map((product) => {
              const quantity = cart[product.id] || 0;
              return (
                <article className="store-product-card" key={product.id} data-selected={quantity > 0}>
                  <div>
                    <span className="store-product-sku">{product.sku}</span>
                    <h3>{product.name}</h3>
                    <p>{product.packSize} · {product.unitWeightKg} kg per unit</p>
                  </div>
                  <div className="store-quantity-control" aria-label={`Quantity for ${product.name}`}>
                    <button type="button" aria-label={`Remove one ${product.name}`} disabled={quantity === 0} onClick={() => updateQuantity(product.id, quantity - 1)}><Minus size={15} /></button>
                    <input type="number" min="0" max="999" value={quantity} onChange={(event) => updateQuantity(product.id, Number(event.target.value))} aria-label={`${product.name} quantity`} />
                    <button type="button" aria-label={`Add one ${product.name}`} onClick={() => updateQuantity(product.id, quantity + 1)}><Plus size={15} /></button>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="store-builder-actions">
            <button className="store-secondary-button" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
            <div className="store-builder-action-group">
              {totals.units > 0 && <button className="store-text-button" type="button" onClick={() => setCart({})}><Trash2 size={15} /> Clear items</button>}
              <button className="store-primary-button" type="button" onClick={continueToReview} disabled={totals.units === 0}>Review order <ArrowRight size={16} /></button>
            </div>
          </footer>
        </section>
      )}

      {step === 3 && (
        <section className="store-panel store-builder-panel" aria-labelledby="review-title">
          <header className="store-panel-heading">
            <div>
              <span className="store-eyebrow">Step 3 of 3</span>
              <h2 id="review-title">Confirm the complete order</h2>
              <p>Submission sends this order to Dispatch. It can only be cancelled while recorded and before cutoff.</p>
            </div>
            <span className="store-status" data-tone="attention">Awaiting confirmation</span>
          </header>

          <div className="store-review-summary">
            <dl>
              <div><dt>Outlet</dt><dd>{outlet.name}</dd></div>
              <div><dt>Delivery date</dt><dd>{formatDate(orderDate)}</dd></div>
              <div><dt>Goods</dt><dd>{temperature === "chilled" ? "Chilled / reefer" : "Ambient"}</dd></div>
              <div><dt>Planning cycle</dt><dd>{cutoff.isPastCutoff ? "Following run" : "Next-day run"}</dd></div>
            </dl>
            <div className="store-review-metrics">
              <span><small>Units</small><strong>{totals.units}</strong></span>
              <span><small>Weight</small><strong>{totals.weight.toFixed(2)} kg</strong></span>
              <span><small>Volume</small><strong>{totals.volume.toFixed(3)} m³</strong></span>
            </div>
          </div>

          <div className="store-review-lines">
            {selectedItems.map(({ product, quantity }) => (
              <div key={product.id}>
                <span><strong>{product.name}</strong><small>{product.sku} · {product.packSize}</small></span>
                <strong>{quantity}</strong>
              </div>
            ))}
          </div>

          <div className="store-submit-note">
            <CheckCircle2 size={18} aria-hidden="true" />
            <p><strong>What happens next?</strong> Dispatch will either publish a vehicle and ETA or record a formal deferral reason. This order will not be split during planning.</p>
          </div>

          <footer className="store-builder-actions">
            <button className="store-secondary-button" type="button" onClick={() => setStep(2)}><ArrowLeft size={16} /> Edit items</button>
            <button className="store-primary-button" type="button" onClick={() => void submitOrder()} disabled={submitting}>
              <PackageCheck size={17} /> {submitting ? "Submitting…" : "Submit order"}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
