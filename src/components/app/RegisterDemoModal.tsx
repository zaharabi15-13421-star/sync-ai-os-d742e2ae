import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const INDUSTRIES = [
  "Technology / SaaS", "E-commerce / D2C", "Retail", "Fashion & Beauty", "Food & Beverage",
  "Finance / Fintech", "Healthcare", "Education", "Real Estate", "Travel & Hospitality",
  "Media & Entertainment", "Manufacturing", "Agency / Consulting", "Non-profit", "Other",
];

const EMPLOYEE_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,000+"];

const createSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(150),
  industry: z.string().min(1, "Choose an industry"),
  employeeSize: z.string().min(1, "Choose company size"),
  websiteUrl: z.string().trim().max(255).optional().or(z.literal("")),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function GoogleIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}

type Mode = "choose" | "create" | "login" | "success";

const POST_AUTH_REDIRECT_KEY = "brandsync_post_auth_redirect";
const DASHBOARD_PATH = "/dashboard/intelligence";

function getGoogleSignInRedirectOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function RegisterDemoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [googleLoading, setGoogleLoading] = useState(false);

  const reset = () => setMode("choose");
  const handleOpenChange = (v: boolean) => {
    if (!v) setTimeout(reset, 200);
    onOpenChange(v);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      localStorage.setItem(POST_AUTH_REDIRECT_KEY, DASHBOARD_PATH);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getGoogleSignInRedirectOrigin(),
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        toast.error("Google sign-in failed", {
          description: result.error.message ?? "Please try again or use email login.",
        });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return; // browser will navigate
      // Tokens received — session is set
      toast.success("Welcome to BrandSync AI!");
      window.location.href = DASHBOARD_PATH;
    } catch (e) {
      localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : "Please try again or use email login.",
      });
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] glass-strong border-white/10">
        {mode === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Start your free demo
              </DialogTitle>
              <DialogDescription>
                Get instant access to BrandSync AI. No credit card required.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="signup" className="mt-2">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signup">Create account</TabsTrigger>
                <TabsTrigger value="login">Log in</TabsTrigger>
              </TabsList>
              <TabsContent value="signup" className="mt-4 space-y-3">
                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white text-black font-medium h-11 hover:bg-white/90 transition disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </button>
                <div className="relative my-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="bg-transparent px-2">or</span>
                </div>
                <Button onClick={() => setMode("create")} className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600">
                  Create with email
                </Button>
              </TabsContent>
              <TabsContent value="login" className="mt-4 space-y-3">
                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white text-black font-medium h-11 hover:bg-white/90 transition disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </button>
                <Button onClick={() => setMode("login")} variant="outline" className="w-full h-11">
                  Log in with email
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}

        {mode === "create" && (
          <CreateForm onBack={() => setMode("choose")} onDone={() => setMode("success")} />
        )}
        {mode === "login" && (
          <LoginForm onBack={() => setMode("choose")} onDone={() => setMode("success")} />
        )}
        {mode === "success" && <SuccessPanel onClose={() => handleOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-400 mt-1">{msg}</p>;
}

function CreateForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [values, setValues] = useState({ brandName: "", email: "", industry: "", employeeSize: "", websiteUrl: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          brand_name: parsed.data.brandName,
          industry: parsed.data.industry,
          employee_size: parsed.data.employeeSize,
          website_url: parsed.data.websiteUrl || null,
          full_name: parsed.data.brandName,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Welcome aboard.");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">Create your free account</DialogTitle>
        <DialogDescription>Takes under a minute. No credit card.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="mt-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div>
          <Label>Company or Brand Name</Label>
          <Input value={values.brandName} onChange={(e) => setValues({ ...values, brandName: e.target.value })} placeholder="Acme Corporation" />
          <FieldError msg={errors.brandName} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@brand.com" />
          <FieldError msg={errors.email} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Industry</Label>
            <Select value={values.industry} onValueChange={(v) => setValues({ ...values, industry: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors.industry} />
          </div>
          <div>
            <Label>Employee Size</Label>
            <Select value={values.employeeSize} onValueChange={(v) => setValues({ ...values, employeeSize: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{EMPLOYEE_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors.employeeSize} />
          </div>
        </div>
        <div>
          <Label>Website URL <span className="text-muted-foreground font-normal">(Optional)</span></Label>
          <Input value={values.websiteUrl} onChange={(e) => setValues({ ...values, websiteUrl: e.target.value })} placeholder="https://www.acmecorp.com" />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="Min 8 characters" />
          <FieldError msg={errors.password} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
          <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>
        </div>
      </form>
    </>
  );
}

function LoginForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">Log in</DialogTitle>
        <DialogDescription>Access your BrandSync workspace.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="mt-2 space-y-4">
        <div>
          <Label>Email</Label>
          <Input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
          <FieldError msg={errors.password} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
          <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
          </Button>
        </div>
      </form>
    </>
  );
}

function SuccessPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 grid place-items-center mb-3">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <DialogTitle className="text-xl">You're all set!</DialogTitle>
      <DialogDescription className="mt-2">
        Your workspace is ready. Mr. Zarvis will guide you from here.
      </DialogDescription>
      <div className="mt-5 flex flex-col gap-2">
        <a href="/dashboard/intelligence" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 h-11 font-medium">
          Open my dashboard
        </a>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
      </div>
    </div>
  );
}
