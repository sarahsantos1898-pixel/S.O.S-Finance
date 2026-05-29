import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  nome: string;
  saldo: number;
}
export interface Cartao {
  id: string;
  banco: string;
  limite: number;
  gasto: number;
}
export interface Transacao {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  cartao_id: string | null;
  data: string;
}

export const api = {
  async signUp(nome: string, email: string, senha: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, senha: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data;
  },

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, saldo")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Perfil não encontrado");
    return data as Profile;
  },

  async getCartoes(userId: string): Promise<Cartao[]> {
    const { data, error } = await supabase
      .from("cartoes")
      .select("id, banco, limite, gasto")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cartao[];
  },

  async getTransacoes(userId: string): Promise<Transacao[]> {
    const { data, error } = await supabase
      .from("transacoes")
      .select("id, tipo, descricao, valor, cartao_id, data")
      .eq("user_id", userId)
      .order("data", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Transacao[];
  },

  async addCartao(userId: string, banco: string, limite: number) {
    const { error } = await supabase
      .from("cartoes")
      .insert({ user_id: userId, banco, limite, gasto: 0 });
    if (error) throw error;
  },

  async removeCartao(id: string) {
    const { error } = await supabase.from("cartoes").delete().eq("id", id);
    if (error) throw error;
  },

  async addTransacao(
    userId: string,
    tipo: "entrada" | "saida",
    descricao: string,
    valor: number,
    cartaoId: string | null
  ) {
    const { error } = await supabase
      .from("transacoes")
      .insert({ user_id: userId, tipo, descricao, valor, cartao_id: cartaoId });
    if (error) throw error;

    // Atualiza saldo do profile e gasto do cartão (cliente, sob RLS do usuário)
    const profile = await api.getProfile(userId);
    const delta = tipo === "entrada" ? valor : -valor;
    await supabase
      .from("profiles")
      .update({ saldo: Number(profile.saldo) + delta })
      .eq("id", userId);

    if (tipo === "saida" && cartaoId) {
      const { data: c } = await supabase
        .from("cartoes")
        .select("gasto")
        .eq("id", cartaoId)
        .maybeSingle();
      if (c) {
        await supabase
          .from("cartoes")
          .update({ gasto: Number(c.gasto) + valor })
          .eq("id", cartaoId);
      }
    }
  },

  async removeTransacao(t: Transacao, userId: string) {
    const { error } = await supabase.from("transacoes").delete().eq("id", t.id);
    if (error) throw error;
    const profile = await api.getProfile(userId);
    const delta = t.tipo === "entrada" ? -t.valor : t.valor;
    await supabase
      .from("profiles")
      .update({ saldo: Number(profile.saldo) + delta })
      .eq("id", userId);
    if (t.tipo === "saida" && t.cartao_id) {
      const { data: c } = await supabase
        .from("cartoes")
        .select("gasto")
        .eq("id", t.cartao_id)
        .maybeSingle();
      if (c) {
        await supabase
          .from("cartoes")
          .update({ gasto: Math.max(0, Number(c.gasto) - t.valor) })
          .eq("id", t.cartao_id);
      }
    }
  },
};
