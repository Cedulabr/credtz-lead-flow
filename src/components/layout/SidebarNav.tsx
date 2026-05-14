import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, User, Share2, FileText, Zap, TrendingUp, Users, Database,
  PhoneCall, Kanban, List, RefreshCw, Radar, Bot,
  Coins, Table, Wallet, BarChart3, UsersRound,
  MessageCircle, MessageSquare, Mic, Phone, PhoneOutgoing,
  File as FileIcon, ClipboardList, Clock, Keyboard, Volume2, GitBranch, NotebookPen,
  Settings, ChevronDown, Menu, X, LogOut, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { supabase } from "@/integrations/supabase/client";
import easynLogo from "@/assets/easyn-logo.png";
import { toast } from "sonner";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type Item = {
  id: string;
  label: string;
  icon: LucideIcon;
  permissionKey?: string | null;
  badgeKey?: "reaproveitamento";
};

type Group = {
  id: string;
  label?: string; // section label, omitted for top
  items: Item[];
  children?: never;
} | {
  id: string;
  label?: string;
  collapsible: {
    id: string;
    label: string;
    icon: LucideIcon;
    permissionKey?: string | null;
    children: Item[];
  };
};

const SECTIONS: Array<
  | { label?: string; items: Item[] }
  | { label: string; items: Array<Item | { type: "group"; id: string; label: string; icon: LucideIcon; permissionKey?: string | null; children: Item[] }> }
> = [
  {
    items: [
      { id: "dashboard", label: "Início", icon: Home },
      { id: "my-data", label: "Meus Dados", icon: User },
      { id: "indicate", label: "Indicar", icon: Share2, permissionKey: "can_access_indicar" },
    ],
  },
  {
    label: "Captação",
    items: [
      { id: "proposal-generator", label: "Gerador de Propostas", icon: FileText, permissionKey: "can_access_gerador_propostas" },
      { id: "activate-leads", label: "Activate Leads", icon: Zap, permissionKey: "can_access_activate_leads" },
      { id: "leads", label: "Leads Premium", icon: TrendingUp, permissionKey: "can_access_premium_leads" },
      { id: "my-clients", label: "Meus Clientes", icon: Users, permissionKey: "can_access_meus_clientes" },
      { id: "baseoff-consulta", label: "Consulta Base OFF", icon: Database, permissionKey: "can_access_baseoff_consulta" },
    ],
  },
  {
    label: "Televendas",
    items: [
      { id: "televendas", label: "Televendas", icon: PhoneCall, permissionKey: "can_access_televendas" },
      {
        type: "group",
        id: "gestao-televendas",
        label: "Gestão Televendas",
        icon: Kanban,
        permissionKey: "can_access_gestao_televendas",
        children: [
          { id: "televendas-manage", label: "Propostas Ativas", icon: List },
          { id: "reaproveitamento", label: "Reaproveitamento", icon: RefreshCw, permissionKey: "can_access_reaproveitamento", badgeKey: "reaproveitamento" },
        ],
      },
      { id: "radar", label: "Radar de Oportunidades", icon: Radar, permissionKey: "can_access_radar" },
      { id: "autolead", label: "AutoLead", icon: Bot, permissionKey: "can_access_autolead" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { id: "finances", label: "Finanças", icon: Coins, permissionKey: "can_access_financas" },
      { id: "commission-table", label: "Tabela de Comissões", icon: Table, permissionKey: "can_access_tabela_comissoes" },
      { id: "commissions", label: "Minhas Comissões", icon: Wallet, permissionKey: "can_access_minhas_comissoes" },
      { id: "performance-report", label: "Relatório de Desempenho", icon: BarChart3, permissionKey: "can_access_relatorio_desempenho" },
      { id: "collaborative", label: "Colaborativo", icon: UsersRound, permissionKey: "can_access_colaborativo" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, permissionKey: "can_access_whatsapp" },
      { id: "sms", label: "Comunicação SMS", icon: MessageSquare, permissionKey: "can_access_sms" },
      { id: "voicer", label: "Easyn Voicer", icon: Mic, permissionKey: "can_access_voicer" },
      { id: "meu-numero", label: "Meu Número", icon: Phone, permissionKey: "can_access_meu_numero" },
      { id: "telefonia", label: "Telefonia", icon: PhoneOutgoing, permissionKey: "can_access_telefonia" },
    ],
  },
  {
    label: "Operações",
    items: [
      { id: "documents", label: "Documentos", icon: FileIcon, permissionKey: "can_access_documentos" },
      { id: "reuse-alerts", label: "Oportunidades", icon: ClipboardList, permissionKey: "can_access_alertas" },
      { id: "time-clock", label: "Controle de Ponto", icon: Clock, permissionKey: "can_access_controle_ponto" },
      { id: "digitacao", label: "Digitação", icon: Keyboard, permissionKey: "can_access_digitacao" },
      { id: "audios", label: "Áudios", icon: Volume2, permissionKey: "can_access_audios" },
      { id: "digitacao-agibank", label: "Digitação Agibank", icon: Keyboard, permissionKey: "can_access_portflow" },
      { id: "notas", label: "Notas & Workspace", icon: NotebookPen, permissionKey: "can_access_notas" },
    ],
  },
];

const STORAGE_KEY = "easyn_sidebar_state";

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadOpenState());
  const [reaprovCount, setReaprovCount] = useState<number>(0);

  const hasAccess = useCallback((key?: string | null): boolean => {
    if (!key) return true;
    if (isAdmin) return true;
    const p = profile as any;
    return p?.[key] !== false;
  }, [isAdmin, profile]);

  // Persist openGroups
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  // Auto-open groups containing the active route on first mount
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const section of SECTIONS) {
        for (const it of section.items) {
          if ((it as any).type === "group") {
            const g = it as any;
            if (g.children.some((c: Item) => c.id === activeTab) && !prev[g.id]) {
              next[g.id] = true;
              changed = true;
            }
          }
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mobile drawer on tab change
  useEffect(() => { setMobileOpen(false); }, [activeTab]);

  // Reaproveitamento badge: count of cancelled proposals, refresh every 5min
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("televendas_propostas" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelada");
      if (!cancelled && typeof count === "number") setReaprovCount(count);
    };
    fetchCount();
    const id = setInterval(fetchCount, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const userInitials = useMemo(() => {
    const name = profile?.name || user?.email || "";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("") || "?";
  }, [profile, user]);

  const roleBadge = useMemo(() => {
    if (isAdmin) return { label: "Admin", className: "bg-emerald-100 text-emerald-700" };
    const r = (profile as any)?.role as string | undefined;
    if (!r) return null;
    return { label: r.charAt(0).toUpperCase() + r.slice(1), className: "bg-blue-100 text-blue-700" };
  }, [isAdmin, profile]);

  const toggleGroup = (id: string) =>
    setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessão encerrada");
  };

  const renderItem = (item: Item, opts?: { isSub?: boolean }) => {
    if (!hasAccess(item.permissionKey)) return null;
    const Icon = item.icon;
    const active = activeTab === item.id;
    const badge = item.badgeKey === "reaproveitamento" && reaprovCount > 0 ? reaprovCount : null;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onTabChange(item.id)}
        className={cn(
          "group w-full flex items-center gap-2.5 mx-1.5 rounded-lg transition-colors",
          opts?.isSub
            ? "h-8 pl-[42px] pr-3 text-[12.5px]"
            : "h-[34px] px-3.5 text-[13px]",
          active
            ? "bg-[hsl(220_100%_96%)] text-[hsl(218_92%_50%)] font-medium dark:bg-primary/15 dark:text-primary"
            : "text-foreground/80 hover:bg-secondary"
        )}
        style={{ width: "calc(100% - 12px)" }}
      >
        {!opts?.isSub && (
          <Icon className="shrink-0" size={16} style={{ width: 18 }} strokeWidth={active ? 2.25 : 1.75} />
        )}
        <span className="flex-1 text-left truncate">{item.label}</span>
        {badge !== null && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    );
  };

  const renderGroup = (group: { id: string; label: string; icon: LucideIcon; permissionKey?: string | null; children: Item[] }) => {
    if (!hasAccess(group.permissionKey)) return null;
    const visibleChildren = group.children.filter((c) => hasAccess(c.permissionKey));
    if (visibleChildren.length === 0) return null;
    const Icon = group.icon;
    const isOpen = !!openGroups[group.id];
    const hasActiveChild = visibleChildren.some((c) => c.id === activeTab);
    return (
      <div key={group.id}>
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "group w-full flex items-center gap-2.5 mx-1.5 rounded-lg transition-colors h-[34px] px-3.5 text-[13px]",
            hasActiveChild ? "text-foreground font-medium" : "text-foreground/80 hover:bg-secondary"
          )}
          style={{ width: "calc(100% - 12px)" }}
          aria-expanded={isOpen}
        >
          <Icon className="shrink-0" size={16} style={{ width: 18 }} strokeWidth={1.75} />
          <span className="flex-1 text-left truncate">{group.label}</span>
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: isOpen ? `${visibleChildren.length * 36 + 4}px` : "0px" }}
        >
          <div className="py-0.5 space-y-0.5">
            {visibleChildren.map((c) => renderItem(c, { isSub: true }))}
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[hsl(218_92%_50%)] flex items-center justify-center overflow-hidden shrink-0">
          <img src={logoUrl || easynLogo} alt={`${companyName} logo`} className="w-7 h-7 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight truncate">{companyName || "Easyn"}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Serviços</div>
        </div>
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg bg-secondary/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate">{profile?.name || user.email}</div>
            <div className="text-[10.5px] text-muted-foreground truncate">{companyName}</div>
          </div>
          {roleBadge && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", roleBadge.className)}>
              {roleBadge.label}
            </span>
          )}
        </div>
      )}

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto pb-2 sidebar-scroll"
        style={{ scrollbarWidth: "thin" }}
      >
        {SECTIONS.map((section, sIdx) => {
          const visibleEntries = section.items.filter((it: any) => {
            if (it.type === "group") {
              return hasAccess(it.permissionKey) && it.children.some((c: Item) => hasAccess(c.permissionKey));
            }
            return hasAccess((it as Item).permissionKey);
          });
          if (visibleEntries.length === 0) return null;
          return (
            <div key={section.label || `top-${sIdx}`}>
              {sIdx > 0 && (
                <div className="mx-3.5 my-1.5 border-t border-border/60" style={{ borderTopWidth: "0.5px" }} />
              )}
              {section.label && (
                <div className="px-3.5 pt-2 pb-1 text-[10px] uppercase tracking-[0.05em] text-muted-foreground/80 font-medium">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleEntries.map((it: any) =>
                  it.type === "group" ? renderGroup(it) : renderItem(it as Item)
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-2 space-y-0.5" style={{ borderTopWidth: "0.5px" }}>
        {isAdmin && (
          <button
            type="button"
            onClick={() => (window.location.href = "/admin")}
            className="w-full flex items-center gap-2.5 mx-1.5 rounded-lg h-[34px] px-3.5 text-[13px] text-foreground/80 hover:bg-secondary transition-colors"
            style={{ width: "calc(100% - 12px)" }}
          >
            <Settings className="shrink-0" size={16} style={{ width: 18 }} strokeWidth={1.75} />
            <span className="flex-1 text-left">Admin</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 mx-1.5 rounded-lg h-[34px] px-3.5 text-[13px] text-foreground/70 hover:bg-secondary transition-colors"
          style={{ width: "calc(100% - 12px)" }}
        >
          <LogOut className="shrink-0" size={16} style={{ width: 18 }} strokeWidth={1.75} />
          <span className="flex-1 text-left">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Inline scrollbar styles */}
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }
      `}</style>

      {/* Mobile top bar */}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-card border-r flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
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
