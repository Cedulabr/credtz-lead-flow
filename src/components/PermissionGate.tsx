import { useAuth } from "@/contexts/AuthContext";
import { BlockedAccess } from "@/components/BlockedAccess";

interface PermissionGateProps {
  permissionKey: string;
  blockedMessage: string;
  children: React.ReactNode;
}

export function PermissionGate({ permissionKey, blockedMessage, children }: PermissionGateProps) {
  const { profile, isAdmin } = useAuth();

  if (isAdmin) return <>{children}</>;

  const profileData = profile as any;
  const hasAccess = profileData?.[permissionKey] === true;

  if (!hasAccess) {
    return <BlockedAccess message={blockedMessage} />;
  }

  return <>{children}</>;
}
