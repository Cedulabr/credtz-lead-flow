import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReuseAlert {
  id: string;
  client_name: string;
  client_phone: string | null;
  bank_name: string;
  payment_date: string;
  alert_date: string;
  user_id: string;
  gestor_id: string | null;
  status: string;
}

interface Profile {
  id: string;
  email: string | null;
  name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reuse-alerts function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    console.log(`Checking for alerts due on: ${today}`);

    // Fetch alerts that are due today and still pending
    const { data: alerts, error: alertsError } = await supabase
      .from("client_reuse_alerts")
      .select("*")
      .eq("alert_date", today)
      .eq("status", "pending");

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      console.log("No alerts due today");
      return new Response(
        JSON.stringify({ message: "No alerts due today", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${alerts.length} alerts due today`);

    // Get unique user IDs (both users and gestors)
    const userIds = new Set<string>();
    alerts.forEach((alert: ReuseAlert) => {
      userIds.add(alert.user_id);
      if (alert.gestor_id) {
        userIds.add(alert.gestor_id);
      }
    });

    // Fetch user profiles with emails
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", Array.from(userIds));

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const profileMap = new Map<string, Profile>();
    (profiles || []).forEach((p: Profile) => {
      profileMap.set(p.id, p);
    });

    let emailsSent = 0;
    let errors: string[] = [];

    // Send emails for each alert
    for (const alert of alerts as ReuseAlert[]) {
      const userProfile = profileMap.get(alert.user_id);
      const gestorProfile = alert.gestor_id ? profileMap.get(alert.gestor_id) : null;

      // Send to user
      if (userProfile?.email) {
        try {
          console.log(`Sending email to user: ${userProfile.email}`);
          
          const { error: emailError } = await resend.emails.send({
            from: "Alertas <onboarding@resend.dev>",
            to: [userProfile.email],
            subject: `🔔 Cliente apto para nova operação - ${alert.bank_name}`,
            html: generateEmailHtml(alert, userProfile.name || "Usuário"),
          });

          if (emailError) {
            console.error(`Error sending email to ${userProfile.email}:`, emailError);
            errors.push(`User ${userProfile.email}: ${emailError.message}`);
          } else {
            emailsSent++;
            console.log(`Email sent successfully to ${userProfile.email}`);
          }
        } catch (err: any) {
          console.error(`Exception sending email to ${userProfile.email}:`, err);
          errors.push(`User ${userProfile.email}: ${err.message}`);
        }
      }

      // Send to gestor
      if (gestorProfile?.email && gestorProfile.email !== userProfile?.email) {
        try {
          console.log(`Sending email to gestor: ${gestorProfile.email}`);
          
          const { error: emailError } = await resend.emails.send({
            from: "Alertas <onboarding@resend.dev>",
            to: [gestorProfile.email],
            subject: `🔔 [Gestor] Cliente apto para nova operação - ${alert.bank_name}`,
            html: generateEmailHtml(alert, gestorProfile.name || "Gestor", true, userProfile?.name),
          });

          if (emailError) {
            console.error(`Error sending email to gestor ${gestorProfile.email}:`, emailError);
            errors.push(`Gestor ${gestorProfile.email}: ${emailError.message}`);
          } else {
            emailsSent++;
            console.log(`Email sent successfully to gestor ${gestorProfile.email}`);
          }
        } catch (err: any) {
          console.error(`Exception sending email to gestor ${gestorProfile.email}:`, err);
          errors.push(`Gestor ${gestorProfile.email}: ${err.message}`);
        }
      }

      // Update alert status to notified
      const { error: updateError } = await supabase
        .from("client_reuse_alerts")
        .update({ 
          status: "notified", 
          notified_at: new Date().toISOString() 
        })
        .eq("id", alert.id);

      if (updateError) {
        console.error(`Error updating alert ${alert.id}:`, updateError);
        errors.push(`Update alert ${alert.id}: ${updateError.message}`);
      }
    }

    console.log(`Process completed. Emails sent: ${emailsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsProcessed: alerts.length,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-reuse-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function generateEmailHtml(
  alert: ReuseAlert, 
  recipientName: string, 
  isGestor: boolean = false,
  userName?: string | null
): string {
  const paymentDate = new Date(alert.payment_date).toLocaleDateString("pt-BR");
  const alertDate = new Date(alert.alert_date).toLocaleDateString("pt-BR");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Reaproveitamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                🔔 Alerta de Reaproveitamento
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                Cliente apto para nova operação
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                Olá, <strong>${recipientName}</strong>!
              </p>
              
              ${isGestor && userName ? `
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
                O vendedor <strong>${userName}</strong> tem um cliente apto para nova operação:
              </p>
              ` : `
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
                Você tem um cliente apto para uma nova operação de crédito:
              </p>
              `}
              
              <!-- Alert Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</p>
                          <p style="color: #111827; font-size: 18px; font-weight: 600; margin: 0;">${alert.client_name}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%" style="padding-right: 12px;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Banco</p>
                                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0;">${alert.bank_name}</p>
                              </td>
                              <td width="50%" style="padding-left: 12px;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Telefone</p>
                                <p style="color: #111827; font-size: 16px; font-weight: 500; margin: 0;">${alert.client_phone || "Não informado"}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%" style="padding-right: 12px;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Data do Pagamento</p>
                                <p style="color: #111827; font-size: 14px; margin: 0;">${paymentDate}</p>
                              </td>
                              <td width="50%" style="padding-left: 12px;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Apto desde</p>
                                <p style="color: #16a34a; font-size: 14px; font-weight: 600; margin: 0;">${alertDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
                O prazo de carência do banco <strong>${alert.bank_name}</strong> foi concluído. 
                Este cliente está liberado para realizar uma nova operação de crédito.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Acesse o sistema para visualizar mais detalhes e registrar o contato com o cliente.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este é um email automático do sistema de alertas de reaproveitamento.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(handler);
