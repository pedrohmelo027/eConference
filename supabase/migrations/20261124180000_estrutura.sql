-- eConference — estrutura: tipos, tabelas, índices e processos iniciais.
-- Regras (gatilhos) em 20261124180100, views em 20261124180200, acesso em 20261124180300.

create extension if not exists pg_trgm with schema extensions;

create type public.papel as enum ('admin', 'engenharia', 'producao', 'pcp');
create type public.tipo_lancamento as enum ('entrada', 'estorno');

-- Usuários do sistema (1:1 com auth.users). Um papel por usuário.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null check (btrim(nome) <> ''),
  email text not null check (btrim(email) <> ''),
  papel public.papel not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index perfis_email_key on public.perfis (lower(btrim(email)));

-- Processos de fabricação / tipo de material, com peso para o andamento ponderado.
create table public.processos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  peso numeric(6, 2) not null check (peso > 0),
  ordem smallint not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index processos_nome_key on public.processos (lower(btrim(nome)));

-- Máquina ou obra. Encerrado = não recebe novas solicitações.
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  codigo text check (codigo is null or btrim(codigo) <> ''),
  encerrado_em timestamptz,
  criado_por uuid references public.perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index projetos_nome_key on public.projetos (lower(btrim(nome)));
create unique index projetos_codigo_key on public.projetos (lower(btrim(codigo))) where codigo is not null;

-- Registro de cada planilha importada (UC05).
create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id),
  arquivo text not null,
  linhas integer not null check (linhas >= 0),
  avisos jsonb not null default '[]'::jsonb,
  importado_por uuid references public.perfis (id),
  importado_em timestamptz not null default now()
);
create index importacoes_projeto_idx on public.importacoes (projeto_id);

-- Solicitação = uma planilha de um projeto. Status calculado em vw_solicitacoes_resumo:
-- rascunho (liberada_em nulo), aberta/concluida (liberada) ou cancelada.
create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id),
  titulo text not null check (btrim(titulo) <> ''),
  data date not null,
  hora time,
  observacao text,
  importacao_id uuid references public.importacoes (id),
  liberada_em timestamptz,
  liberada_por uuid references public.perfis (id),
  cancelada_em timestamptz,
  cancelada_por uuid references public.perfis (id),
  motivo_cancelamento text,
  criado_por uuid references public.perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint solicitacoes_cancelamento_ck check (
    cancelada_em is null
    or (liberada_em is not null and btrim(coalesce(motivo_cancelamento, '')) <> '')
  )
);
create index solicitacoes_projeto_idx on public.solicitacoes (projeto_id);
create index solicitacoes_data_idx on public.solicitacoes (data);

-- Item (linha) de uma solicitação. O mesmo código pode se repetir em outras solicitações (RN01, RN10).
create table public.solicitacao_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes (id) on delete cascade,
  processo_id uuid not null references public.processos (id),
  codigo text not null check (btrim(codigo) <> ''),
  codigo_normalizado text generated always as (
    upper(regexp_replace(btrim(codigo), '\s+', ' ', 'g'))
  ) stored,
  material text,
  medida text,
  quantidade integer not null check (quantidade > 0),
  data_solicitacao date not null,
  cancelado_em timestamptz,
  cancelado_por uuid references public.perfis (id),
  motivo_cancelamento text,
  criado_por uuid references public.perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint solicitacao_itens_unico unique (solicitacao_id, codigo_normalizado, data_solicitacao),
  constraint solicitacao_itens_cancelamento_ck check (
    cancelado_em is null or btrim(coalesce(motivo_cancelamento, '')) <> ''
  )
);
create index solicitacao_itens_solicitacao_idx on public.solicitacao_itens (solicitacao_id);
create index solicitacao_itens_processo_idx on public.solicitacao_itens (processo_id);
-- Busca por parte do código (UC10): ILIKE '%...%'
create index solicitacao_itens_codigo_trgm_idx
  on public.solicitacao_itens using gin (codigo_normalizado extensions.gin_trgm_ops);

-- Lançamentos de recebimento: só INSERT (RN08). Correção = estorno (UC12).
create table public.recebimento_lancamentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.solicitacao_itens (id) on delete restrict,
  tipo public.tipo_lancamento not null,
  quantidade integer not null check (quantidade > 0),
  estorna_id uuid unique references public.recebimento_lancamentos (id) on delete restrict,
  motivo text,
  lote_id uuid not null default gen_random_uuid(),
  lancado_por uuid not null references public.perfis (id),
  lancado_em timestamptz not null default now(),
  constraint recebimento_lancamentos_estorno_ck check ((tipo = 'estorno') = (estorna_id is not null)),
  constraint recebimento_lancamentos_motivo_ck check (
    tipo = 'entrada' or btrim(coalesce(motivo, '')) <> ''
  )
);
create index recebimento_lancamentos_item_idx on public.recebimento_lancamentos (item_id);
create index recebimento_lancamentos_lote_idx on public.recebimento_lancamentos (lote_id);

-- Histórico de alterações de todas as tabelas (UC15). Preenchida só por gatilho.
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('insert', 'update', 'delete')),
  antes jsonb,
  depois jsonb,
  usuario_id uuid,
  em timestamptz not null default now()
);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id, em);

-- Processos iniciais (README, "Regras de negócio"). Pesos configuráveis pelo admin (UC03).
insert into public.processos (nome, peso, ordem) values
  ('Corte Laser', 5, 1),
  ('Corte e Dobra', 5, 2),
  ('Oxicorte', 4, 3),
  ('Roletes', 3, 4),
  ('Matéria-Prima', 3, 5),
  ('Comerciais', 1, 6);
