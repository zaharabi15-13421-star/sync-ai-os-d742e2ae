import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBrandSummaryExtras,
  upsertBrandSummaryExtras,
  enhanceBrandSummaryField,
  type BrandSummaryExtras,
} from "@/lib/brand-summary-extras.functions";

export function useBrandSummaryExtras() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getBrandSummaryExtras);
  const upsertFn = useServerFn(upsertBrandSummaryExtras);
  const enhanceFn = useServerFn(enhanceBrandSummaryField);

  const query = useQuery({
    queryKey: ["brand-summary-extras"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (patch: Partial<BrandSummaryExtras>) => upsertFn({ data: { patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand-summary-extras"] }),
  });

  return {
    data: (query.data?.data ?? null) as BrandSummaryExtras | null,
    loading: query.isLoading,
    save: save.mutateAsync,
    saving: save.isPending,
    enhance: enhanceFn,
  };
}
