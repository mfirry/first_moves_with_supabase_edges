import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  name: string;
  nickname?: string;
  date_of_birth?: string;
  address?: string;
  country?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const requestData: CreateUserRequest = await req.json();
    const { email, name, nickname, date_of_birth, address, country } =
      requestData;

    // Strip whitespace from string fields
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedName = name?.trim();
    const trimmedNickname = nickname?.trim();
    const trimmedCountry = country?.trim();

    if (!trimmedEmail || !trimmedName) {
      return new Response(
        JSON.stringify({ error: "Email and name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Create user in database
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email: trimmedEmail,
        name: trimmedName,
        nickname: trimmedNickname,
        date_of_birth,
        address,
        country: trimmedCountry,
        status: "inactive",
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to create user", details: userError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Create Stripe customer
    const stripeCustomerData: Stripe.CustomerCreateParams = {
      email: trimmedEmail,
      name: trimmedName,
      metadata: {
        user_id: user.id,
      },
    };

    if (address) {
      stripeCustomerData.address = {
        line1: address,
        country: trimmedCountry || undefined,
      };
    }

    const stripeCustomer = await stripe.customers.create(stripeCustomerData);

    // 3. Update user with Stripe customer ID
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user with Stripe ID:", updateError);
      return new Response(
        JSON.stringify({
          error: "User created but failed to link Stripe customer",
          user,
          stripeCustomer: stripeCustomer.id,
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
        user: updatedUser,
        stripe_customer_id: stripeCustomer.id,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
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
