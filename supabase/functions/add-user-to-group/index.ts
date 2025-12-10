import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AddUserToGroupRequest {
  user_id: string;
  group_id: string;
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

    const requestData: AddUserToGroupRequest = await req.json();
    const { user_id, group_id } = requestData;

    if (!user_id || !group_id) {
      return new Response(
        JSON.stringify({ error: "user_id and group_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "User not found",
          details: userError,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id, name, status")
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return new Response(
        JSON.stringify({
          error: "Group not found",
          details: groupError,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({
          error: "User is already a member of this group",
          member: existingMember,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add user to group
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id,
        user_id,
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error adding user to group:", memberError);
      return new Response(
        JSON.stringify({
          error: "Failed to add user to group",
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
        membership,
        message: `User added to group "${group.name}"`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in add-user-to-group function:", error);
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
