import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateGroupRequest {
  admin_user_id: string;
  name: string;
  description?: string;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const requestData: CreateGroupRequest = await req.json();
    const { admin_user_id, name, description, status } = requestData;

    // Strip whitespace from string fields
    const trimmedName = name?.trim();
    const trimmedDescription = description?.trim();
    const trimmedStatus = status?.trim() || "active";

    if (!admin_user_id || !trimmedName) {
      return new Response(
        JSON.stringify({ error: "admin_user_id and name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate status
    const validStatuses = ["active", "frozen", "deleted"];
    if (!validStatuses.includes(trimmedStatus)) {
      return new Response(
        JSON.stringify({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", admin_user_id)
      .single();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({
          error: "Admin user not found",
          details: adminError,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if admin user is active
    if (adminUser.status !== "active" && adminUser.status !== "inactive") {
      return new Response(
        JSON.stringify({
          error: "Admin user must have active or inactive status",
          user_status: adminUser.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Create group in database
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        admin_user_id,
        name: trimmedName,
        description: trimmedDescription || null,
        status: trimmedStatus,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      return new Response(
        JSON.stringify({ error: "Failed to create group", details: groupError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Add admin user to group_members
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: admin_user_id,
      });

    if (memberError) {
      console.error("Error adding admin to group_members:", memberError);
      // Try to clean up the group
      await supabase.from("groups").delete().eq("id", group.id);

      return new Response(
        JSON.stringify({
          error: "Group created but failed to add admin as member",
          details: memberError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        group,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-group function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
