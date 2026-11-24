-- Cria o primeiro administrador (ou qualquer usuário) direto no banco, com senha provisória.
-- Use só para o primeiro admin de cada ambiente; os demais usuários são criados pelo admin (UC02).
-- Rode no SQL Editor do Supabase trocando os três valores abaixo. No primeiro acesso o sistema
-- obriga a trocar a senha (migration 20261124190000_primeiro_acesso).
do $$
declare
  v_email text := 'email@rotexmaquinas.com.br';  -- trocar
  v_nome text := 'Nome do administrador';        -- trocar
  v_senha text := 'senha-provisoria';            -- trocar (mín. 6 caracteres)
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', lower(v_email),
    extensions.crypt(v_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', v_nome), now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', lower(v_email), 'email_verified', true),
    'email', now(), now()
  );

  insert into public.perfis (id, nome, email, papel) values (v_id, v_nome, lower(v_email), 'admin');
  perform public.registrar_senha_provisoria(v_id);
end
$$;
