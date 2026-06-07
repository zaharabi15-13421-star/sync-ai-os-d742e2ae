import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBrandDetails, upsertBrandDetails } from "@/lib/brand-details.functions";
import { EMPTY_BRAND_DETAILS, type BrandDetails } from "@/types/brandDetails";

export function useBrandDetails() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getBrandDetails);
  const upsertFn = useServerFn(upsertBrandDetails);

  const q = useQuery({
    queryKey: ["brand-details"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });

  const m = useMutation({
    mutationFn: (patch: Partial<BrandDetails>) => upsertFn({ data: { patch } }),
    onSuccess: (res) => {
      qc.setQueryData(["brand-details"], { data: res.data });
    },
  });

  const data: BrandDetails = (q.data?.data as BrandDetails) ?? EMPTY_BRAND_DETAILS;
  return {
    data,
    isLoading: q.isLoading,
    error: q.error as Error | null,
    refetch: q.refetch,
    updateSection: m.mutateAsync,
    isUpdating: m.isPending,
  };
}
