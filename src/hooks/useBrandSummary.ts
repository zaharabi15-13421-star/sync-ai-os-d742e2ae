import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBrandSummary, updateBrandSummary, enhanceBrandSummaryField, detectBrandAssets } from "@/lib/brand-summary.functions";
import type { BrandSummary } from "@/types/brandSummary";

export function useBrandSummary() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getBrandSummary);
  const updateFn = useServerFn(updateBrandSummary);
  const enhanceFn = useServerFn(enhanceBrandSummaryField);
  const detectFn = useServerFn(detectBrandAssets);

  const query = useQuery({
    queryKey: ["brand-summary"],
    queryFn: () => fetchFn(),
    staleTime: 30_000,
  });

  const update = useMutation({
    mutationFn: (patch: Partial<BrandSummary>) =>
      updateFn({ data: { patch: patch as Record<string, unknown> } }) as Promise<{ success: true; data: BrandSummary }>,
    onSuccess: (res) => {
      qc.setQueryData(["brand-summary"], { data: res.data });
    },
  });

  const enhance = useMutation({
    mutationFn: (input: { field: string; current_value: string; instruction?: string | null }) =>
      enhanceFn({ data: input }) as Promise<{ success: boolean; enhanced_value?: string; error?: string; message?: string }>,
  });

  const detect = useMutation({
    mutationFn: (input: { url: string; detect?: string[] }) =>
      detectFn({ data: input }) as Promise<{ logo_url: string | null; tagline: string | null; brand_values: string[] | null; brand_aesthetic: string | null }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand-summary"] }),
  });

  return { query, update, enhance, detect };
}
