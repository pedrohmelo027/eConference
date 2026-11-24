-- eConference — UC02: gestão de usuários.
-- A definição de senha provisória passa a ir para o histórico (sem o hash), já que ela não
-- altera nenhuma tabela auditada.

create or replace function public.registrar_senha_provisoria(p_usuario_id uuid)
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

  insert into public.auditoria (tabela, registro_id, acao, antes, depois, usuario_id)
  values ('perfis', p_usuario_id, 'update', null,
          jsonb_build_object('evento', 'senha_provisoria_definida'), public.usuario_atual());
end
$$;

revoke all on function public.registrar_senha_provisoria(uuid) from public, anon, authenticated;
grant execute on function public.registrar_senha_provisoria(uuid) to econference_api;
