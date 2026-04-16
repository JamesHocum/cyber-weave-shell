import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type DbMessage = Database["public"]["Tables"]["messages"]["Row"];

export async function listConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(userId: string, mode: Conversation["mode"], model: string) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, mode, model, title: "New session" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameConversation(id: string, title: string) {
  await supabase.from("conversations").update({ title }).eq("id", id);
}

export async function deleteConversation(id: string) {
  await supabase.from("conversations").delete().eq("id", id);
}

export async function listMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertMessage(args: {
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string | null;
  model?: string | null;
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: args.conversationId,
      user_id: args.userId,
      role: args.role,
      content: args.content,
      image_url: args.imageUrl ?? null,
      model: args.model ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", args.conversationId);
  return data;
}

export async function touchConversation(id: string, patch: Partial<Pick<Conversation, "title" | "mode" | "model">>) {
  await supabase.from("conversations").update(patch).eq("id", id);
}
