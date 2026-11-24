-- eConference — acesso ao banco.
-- 1. O front NÃO acessa o banco: anon e authenticated não têm nenhum privilégio (README, princípio 2).
-- 2. A API conecta com o papel econference_api (sem DDL, sem acesso ao schema auth).
--    A senha é definida por ambiente, fora das migrations (README, "Banco de dados").
-- 3. RLS ativado em todas as tabelas, com política só para econference_api.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'econference_api') then
    create role econference_api nologin noinherit;
  end if;
end
$$;

grant usage on schema public to econference_api;
grant usage on schema extensions to econference_api;

-- Ninguém além da API: tira os privilégios padrão do Supabase para anon/authenticated
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;

-- Privilégios da API (o mínimo de cada tabela)
grant select, insert, update on public.perfis to econference_api;
grant select, insert, update, delete on public.processos to econference_api;
grant select, insert, update on public.projetos to econference_api;
grant select, insert on public.importacoes to econference_api;
grant select, insert, update, delete on public.solicitacoes to econference_api;
grant select, insert, update, delete on public.solicitacao_itens to econference_api;
grant select, insert on public.recebimento_lancamentos to econference_api; -- só insert (RN08)
grant select on public.auditoria to econference_api;                        -- escrita só por gatilho
grant select on public.vw_itens_saldo, public.vw_solicitacoes_resumo, public.vw_projetos_resumo
  to econference_api;
grant execute on function public.usuario_atual(), public.recebido_do_item(uuid) to econference_api;

-- RLS
alter table public.perfis enable row level security;
alter table public.processos enable row level security;
alter table public.projetos enable row level security;
alter table public.importacoes enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.solicitacao_itens enable row level security;
alter table public.recebimento_lancamentos enable row level security;
alter table public.auditoria enable row level security;

create policy api_acesso on public.perfis for all to econference_api using (true) with check (true);
create policy api_acesso on public.processos for all to econference_api using (true) with check (true);
create policy api_acesso on public.projetos for all to econference_api using (true) with check (true);
create policy api_acesso on public.importacoes for all to econference_api using (true) with check (true);
create policy api_acesso on public.solicitacoes for all to econference_api using (true) with check (true);
create policy api_acesso on public.solicitacao_itens for all to econference_api using (true) with check (true);
create policy api_leitura on public.recebimento_lancamentos for select to econference_api using (true);
create policy api_insercao on public.recebimento_lancamentos for insert to econference_api with check (true);
create policy api_leitura on public.auditoria for select to econference_api using (true);
