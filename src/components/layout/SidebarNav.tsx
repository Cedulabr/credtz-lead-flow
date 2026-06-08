import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, User, Share2, Settings, ChevronDown, Menu, X, LogOut,
  Store, Receipt, Clock, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { useUserMenu } from "@/hooks/useUserMenu";
import { getIcon } from "@/config/modules";
import easynLogo from "@/assets/easyn-logo.png";
import { toast } from "sonner";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type FlatItem = { id: string; label: string; icon: LucideIcon };

const STORAGE_KEY = "easyn_sidebar_state_v2";

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Always-visible top items (no permission gating)
const TOP_ITEMS: FlatItem[] = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "my-data", label: "Meus Dados", icon: User },
  { id: "time-clock", label: "Controle de Ponto", icon: Clock },
];

const BOTTOM_ITEMS: FlatItem[] = [
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "billing", label: "Faturamento", icon: Receipt },
  { id: "indicate", label: "Indicar", icon: Share2 },
];

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenState);
  const { sections } = useUserMenu();
  const visibleSections = useMemo(
    () => sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.moduleKey !== "time-clock"),
      }))
      .filter((section) => section.items.length > 0),
    [sections]
  );

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  // Auto-expand section containing the current route
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const s of visibleSections) {
        if (s.items.some((it) => it.moduleKey === activeTab) && !prev[s.categoryKey]) {
          next[s.categoryKey] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibleSections, activeTab]);

  useEffect(() => { setMobileOpen(false); }, [activeTab]);

  const userInitials = useMemo(() => {
    const name = profile?.name || user?.email || "";
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
  }, [profile, user]);

  const roleBadge = useMemo(() => {
    if (isAdmin) return { label: "Admin", className: "bg-emerald-100 text-emerald-700" };
    const r = (profile as any)?.role as string | undefined;
    if (!r) return null;
    return { label: r.charAt(0).toUpperCase() + r.slice(1), className: "bg-blue-100 text-blue-700" };
  }, [isAdmin, profile]);

  const toggleGroup = useCallback((id: string) =>
    setOpenGroups((s) => ({ ...s, [id]: !s[id] })), []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessão encerrada");
  };

  const renderFlatItem = (it: FlatItem, isSub = false) => {
    const Icon = it.icon;
    const active = activeTab === it.id;
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => onTabChange(it.id)}
        className={cn(
          "group w-full flex items-center gap-2.5 mx-1.5 rounded-lg transition-colors",
          isSub ? "h-8 pl-[42px] pr-3 text-[12.5px]" : "h-[34px] px-3.5 text-[13px]",
          active
            ? "bg-primary/15 text-primary font-medium"
            : "text-foreground/80 hover:bg-secondary"
        )}
        style={{ width: "calc(100% - 12px)" }}
      >
        {!isSub && <Icon className="shrink-0" size={18} strokeWidth={active ? 2.5 : 2} />}
        <span className="flex-1 text-left truncate">{it.label}</span>
      </button>
    );
  };

  const renderSection = (section: typeof visibleSections[number]) => {
    const Icon = getIcon(section.icon);
    const isOpen = !!openGroups[section.categoryKey];
    const hasActive = section.items.some((it) => it.moduleKey === activeTab);
    return (
      <div key={section.categoryKey}>
        <button
          type="button"
          onClick={() => toggleGroup(section.categoryKey)}
          className={cn(
            "group w-full flex items-center gap-3 mx-1.5 rounded-lg transition-all duration-200 h-[40px] px-4 text-[13.5px]",
            hasActive ? "text-foreground font-semibold bg-muted/40" : "text-foreground/70 hover:bg-muted/60"
          )}
          style={{ width: "calc(100% - 12px)" }}
          aria-expanded={isOpen}
        >
          <Icon className="shrink-0 text-primary/80" size={18} strokeWidth={2} />
          <span className="flex-1 text-left truncate">{section.label}</span>
          <ChevronDown size={16} className={cn("transition-transform duration-300 opacity-60", isOpen ? "rotate-0" : "-rotate-90")} />
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: isOpen ? `${section.items.length * 36 + 4}px` : "0px" }}
        >
          <div className="py-0.5 space-y-0.5">
            {section.items.map((it) => {
              const ItemIcon = getIcon(it.icon);
              return renderFlatItem({ id: it.moduleKey, label: it.label, icon: ItemIcon }, true);
            })}
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[hsl(218_92%_50%)] flex items-center justify-center overflow-hidden shrink-0">
          <img src={logoUrl || easynLogo} alt={`${companyName} logo`} className="w-7 h-7 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight truncate">{companyName || "Easyn"}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Serviços</div>
        </div>
      </div>

      {user && (
        <div className="mx-3 mb-4 px-3 py-3 rounded-2xl bg-gradient-to-br from-primary/10 via-muted/50 to-muted/30 border border-primary/10 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[12px] font-bold shrink-0 border-2 border-primary/20 shadow-inner">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-foreground truncate">{profile?.name || user.email}</div>
            <div className="text-[11px] font-medium text-muted-foreground truncate opacity-80">{companyName}</div>
          </div>
          {roleBadge && (
            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm", roleBadge.className)}>
              {roleBadge.label}
            </span>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto pb-2 sidebar-scroll" style={{ scrollbarWidth: "thin" }}>
        {/* Always visible top */}
        <div className="space-y-0.5">
          {TOP_ITEMS.map((it) => renderFlatItem(it))}
        </div>

        {/* Dynamic sections */}
        {visibleSections.length > 0 && (
          <div className="mx-3.5 my-1.5 border-t border-border/60" style={{ borderTopWidth: "0.5px" }} />
        )}
        <div className="space-y-0.5">
          {visibleSections.map(renderSection)}
        </div>

        {/* Always visible bottom utilities */}
        <div className="mx-3.5 my-1.5 border-t border-border/60" style={{ borderTopWidth: "0.5px" }} />
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map((it) => renderFlatItem(it))}
        </div>
      </nav>

      <div className="border-t border-border/60 p-2 space-y-0.5" style={{ borderTopWidth: "0.5px" }}>
        {isAdmin && (
          <button
            type="button"
            onClick={() => (window.location.href = "/admin")}
            className="w-full flex items-center gap-3 mx-1.5 rounded-lg h-[40px] px-4 text-[13.5px] text-foreground/70 hover:bg-muted/60 transition-all duration-200"
            style={{ width: "calc(100% - 12px)" }}
          >
            <Settings className="shrink-0 text-primary/60" size={18} strokeWidth={2} />
            <span className="flex-1 text-left">Admin</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 mx-1.5 rounded-lg h-[40px] px-4 text-[13.5px] text-destructive/80 hover:bg-destructive/10 transition-all duration-200"
          style={{ width: "calc(100% - 12px)" }}
        >
          <LogOut className="shrink-0" size={18} strokeWidth={2} />
          <span className="flex-1 text-left font-medium">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
      `}</style>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-40 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[hsl(218_92%_50%)] flex items-center justify-center overflow-hidden">
            <img src={logoUrl || easynLogo} alt="logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-semibold text-sm">{companyName || "Easyn"}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-secondary"
          aria-label="Abrir menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-card border-r flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      <aside
        className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen bg-card border-r"
        style={{ width: 220, minWidth: 220 }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default SidebarNav;
