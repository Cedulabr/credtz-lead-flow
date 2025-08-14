import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function AdminTest() {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Loading auth state...</div>;
  }

  return (
    <Card className="max-w-md mx-auto m-4">
      <CardHeader>
        <CardTitle>Admin Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>User ID:</strong> {user?.id || "No user"}</p>
          <p><strong>Email:</strong> {user?.email || "No email"}</p>
        </div>
        
        <div>
          <p><strong>Profile Name:</strong> {profile?.name || "No profile"}</p>
          <p><strong>Profile Role:</strong> {profile?.role || "No role"}</p>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Admin User" : "Regular User"}
          </Badge>
        </div>

        <div>
          <p><strong>Is Admin:</strong> {isAdmin ? "Yes" : "No"}</p>
          <p><strong>Loading:</strong> {loading ? "Yes" : "No"}</p>
        </div>

        {isAdmin && (
          <Button onClick={() => window.location.href = '/admin'} className="w-full">
            Go to Admin Panel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}