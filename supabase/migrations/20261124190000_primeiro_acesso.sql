-- eConference — troca obrigatória de senha no primeiro acesso (UC01).
--
-- Quando uma senha provisória é definida (criação do usuário ou redefinição pelo admin), o hash
-- dela é guardado em senhas_provisorias. Enquanto a senha atual do usuário no Supabase Auth for
-- essa mesma, a troca está pendente. Ao trocar a senha, o hash muda e a pendência some sozinha:
-- não há flag que o cliente possa alterar.

create table public.senhas_provisorias (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  hash text not null,
  definida_em timestamptz not null default now()
);
-- Ninguém lê esta tabela diretamente; só as funções abaixo (security definer).
alter table public.senhas_provisorias enable row level security;
revoke all on public.senhas_provisorias from anon, authenticated, econference_api;

-- A senha atual ainda é a provisória?
create function public.troca_senha_pendente(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.senhas_provisorias sp
      join auth.users u on u.id = sp.usuario_id
     where sp.usuario_id = p_usuario_id
       and u.encrypted_password = sp.hash
  )
$$;

-- Marca a senha atual do usuário como provisória (chamada logo após criar ou redefinir a senha).
create function public.registrar_senha_provisoria(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.senhas_provisorias (usuario_id, hash)
  select u.id, u.encrypted_password
    from auth.users u
   where u.id = p_usuario_id
     and u.encrypted_password is not null
  on conflict (usuario_id) do update
    set hash = excluded.hash, definida_em = now();

  if not found then
    raise exception 'Usuário sem senha definida no Supabase Auth.' using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.troca_senha_pendente(uuid) from public, anon, authenticated;
revoke all on function public.registrar_senha_provisoria(uuid) from public, anon, authenticated;
grant execute on function public.troca_senha_pendente(uuid) to econference_api;
grant execute on function public.registrar_senha_provisoria(uuid) to econference_api;
