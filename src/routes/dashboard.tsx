import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { ZarvisChat } from "@/components/app/ZarvisChat";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user || !session?.access_token) {
      void navigate({ to: "/", replace: true });
    }
  }, [loading, navigate, session?.access_token, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (!user || !session?.access_token) {
    // Auth resolved with no session — render nothing while the redirect runs.
    return null;
  }

  return (
    <div className="flex min-h-screen w-full text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-8 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <ZarvisChat />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
