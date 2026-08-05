"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../../../../lib/api";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Calendar, DollarSign } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  items: z.array(
    z.object({
      description: z.string().min(1, "Description is required"),
      quantity: z.number().min(0.01, "Quantity must be > 0"),
      rate: z.number().min(0, "Price must be >= 0"),
    })
  ).min(1, "At least one item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: "USD",
      items: [{ description: "", quantity: 1, rate: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");
  
  const calculateTotal = () => {
    return watchItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get("/clients");
        // Backend returns { data: [], pagination: {} }
        const data = res.data.data ?? res.data;
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  const onSubmit = async (data: InvoiceFormValues) => {
    setError(null);
    try {
      const payload = {
        ...data,
        items: data.items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        }))
      };
      
      const res = await api.post("/invoices", payload);
      // Backend returns the full invoice object directly (not wrapped in data)
      const newInvoiceId = res.data?.id;
      
      if (newInvoiceId) {
        router.push(`/invoices/${newInvoiceId}`);
      } else {
        router.push("/invoices");
      }
      router.refresh();
    } catch (err: any) {
      const apiError = err.response?.data?.error || err.response?.data?.message || "Failed to create invoice";
      setError(apiError);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/invoices" className="p-2 hover:bg-[var(--surface-dim)] rounded-md transition-colors text-[var(--foreground-variant)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="section-number">New Invoice</div>
          <h1 className="text-3xl font-bold tracking-tight">Create Draft</h1>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 text-red-600 border border-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Client *
              </label>
              {loadingClients ? (
                <div className="flex items-center h-10 px-3 border border-[var(--border-strong)] rounded-md bg-[var(--surface-dim)] text-[var(--foreground-variant)]">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading clients...
                </div>
              ) : (
                <select
                  className={`block w-full px-3 py-2 border ${
                    errors.clientId ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                  } rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] focus:outline-none focus:ring-1 transition-colors`}
                  {...register("clientId")}
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Issue Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-[var(--foreground-variant)]" />
                </div>
                <input
                  type="date"
                  className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] focus:outline-none focus:ring-1 transition-colors"
                  {...register("issueDate")}
                />
              </div>
              {errors.issueDate && <p className="mt-1 text-sm text-red-600">{errors.issueDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Due Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-[var(--foreground-variant)]" />
                </div>
                <input
                  type="date"
                  className="block w-full pl-10 pr-3 py-2 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] focus:outline-none focus:ring-1 transition-colors"
                  {...register("dueDate")}
                />
              </div>
              {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
            </div>
            
            <div className="col-span-1 md:col-span-2 md:w-1/2">
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Currency
              </label>
              <select
                className="block w-full px-3 py-2 border border-[var(--border-strong)] focus:ring-[var(--foreground)] focus:border-[var(--foreground)] rounded-md bg-[var(--surface-bright)] text-[var(--foreground)] focus:outline-none focus:ring-1 transition-colors"
                {...register("currency")}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          <hr className="border-[var(--border-subtle)]" />

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-medium mb-4">Line Items</h3>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start bg-[var(--surface-dim)] p-4 rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium mb-1 text-[var(--foreground-variant)] sm:hidden">Description</label>
                    <input
                      type="text"
                      placeholder="Service description"
                      className="block w-full px-3 py-2 border border-[var(--border-strong)] rounded-md bg-[var(--surface-bright)] focus:ring-1 focus:ring-[var(--foreground)] focus:outline-none"
                      {...register(`items.${index}.description`)}
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-1 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                    )}
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-xs font-medium mb-1 text-[var(--foreground-variant)] sm:hidden">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      className="block w-full px-3 py-2 border border-[var(--border-strong)] rounded-md bg-[var(--surface-bright)] focus:ring-1 focus:ring-[var(--foreground)] focus:outline-none"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-medium mb-1 text-[var(--foreground-variant)] sm:hidden">Price</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-[var(--foreground-variant)] text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        className="block w-full pl-7 pr-3 py-2 border border-[var(--border-strong)] rounded-md bg-[var(--surface-bright)] focus:ring-1 focus:ring-[var(--foreground)] focus:outline-none"
                        {...register(`items.${index}.rate`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1 sm:mt-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ description: "", quantity: 1, rate: 0 })}
              className="mt-4 flex items-center text-sm font-medium text-[var(--color-electric-cyan)] hover:opacity-80 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Line Item
            </button>
          </div>

          <div className="bg-[var(--surface-dim)] p-6 rounded-lg flex justify-between items-center border border-[var(--border-subtle)]">
            <span className="text-lg font-medium text-[var(--foreground-variant)]">Total</span>
            <span className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: watch('currency') || 'USD' }).format(calculateTotal())}
            </span>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
            <Link href="/invoices" className="btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-solid min-w-[150px]"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Create Draft"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
