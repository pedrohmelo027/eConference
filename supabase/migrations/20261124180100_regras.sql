-- eConference — regras de negócio garantidas no banco (defesa em profundidade; a API valida antes).
-- Erros de regra usam SQLSTATE P0001 com mensagem em português; a API repassa a mensagem.

-- Usuário da transação. A API faz `select set_config('app.usuario_id', '<uuid>', true)`.
create function public.usuario_atual()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

-- Recebido do item = entradas − estornos (RN03).
create function public.recebido_do_item(p_item_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(case when l.tipo = 'entrada' then l.quantidade else -l.quantidade end), 0)::integer
    from public.recebimento_lancamentos l
   where l.item_id = p_item_id
$$;

-- ---------------------------------------------------------------- atualizado_em
create function public.tg_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tg_atualizado_em();
create trigger processos_atualizado_em before update on public.processos
  for each row execute function public.tg_atualizado_em();
create trigger projetos_atualizado_em before update on public.projetos
  for each row execute function public.tg_atualizado_em();
create trigger solicitacoes_atualizado_em before update on public.solicitacoes
  for each row execute function public.tg_atualizado_em();
create trigger solicitacao_itens_atualizado_em before update on public.solicitacao_itens
  for each row execute function public.tg_atualizado_em();

-- ---------------------------------------------------------------- auditoria (RN08, UC15)
create function public.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  -- update sem mudança real (só atualizado_em) não vai para o histórico
  if tg_op = 'UPDATE' and (v_antes - 'atualizado_em') = (v_depois - 'atualizado_em') then
    return null;
  end if;

  insert into public.auditoria (tabela, registro_id, acao, antes, depois, usuario_id)
  values (
    tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id')::uuid,
    lower(tg_op),
    v_antes,
    v_depois,
    public.usuario_atual()
  );
  return null;
end
$$;

create trigger perfis_auditoria after insert or update or delete on public.perfis
  for each row execute function public.tg_auditoria();
create trigger processos_auditoria after insert or update or delete on public.processos
  for each row execute function public.tg_auditoria();
create trigger projetos_auditoria after insert or update or delete on public.projetos
  for each row execute function public.tg_auditoria();
create trigger importacoes_auditoria after insert on public.importacoes
  for each row execute function public.tg_auditoria();
create trigger solicitacoes_auditoria after insert or update or delete on public.solicitacoes
  for each row execute function public.tg_auditoria();
create trigger solicitacao_itens_auditoria after insert or update or delete on public.solicitacao_itens
  for each row execute function public.tg_auditoria();
create trigger recebimento_lancamentos_auditoria after insert on public.recebimento_lancamentos
  for each row execute function public.tg_auditoria();

-- ---------------------------------------------------------------- imutáveis (RN08)
create function public.tg_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'recebimento_lancamentos' then
    raise exception 'Lançamentos de recebimento não podem ser alterados nem apagados. Use estorno.'
      using errcode = 'P0001';
  end if;
  raise exception 'O histórico não pode ser alterado nem apagado.' using errcode = 'P0001';
end
$$;

create trigger recebimento_lancamentos_imutavel
  before update or delete on public.recebimento_lancamentos
  for each row execute function public.tg_imutavel();
create trigger recebimento_lancamentos_sem_truncate
  before truncate on public.recebimento_lancamentos
  for each statement execute function public.tg_imutavel();
create trigger auditoria_imutavel
  before update or delete on public.auditoria
  for each row execute function public.tg_imutavel();
create trigger auditoria_sem_truncate
  before truncate on public.auditoria
  for each statement execute function public.tg_imutavel();

-- ---------------------------------------------------------------- solicitações (RN05, UC07, UC08)
create function public.tg_solicitacoes_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.projetos p where p.id = new.projeto_id and p.encerrado_em is not null) then
      raise exception 'Projeto encerrado não recebe novas solicitações.' using errcode = 'P0001';
    end if;
    if new.liberada_em is not null then
      raise exception 'A solicitação é criada como rascunho e liberada depois.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.liberada_em is not null then
      raise exception 'Solicitação liberada não pode ser excluída; cancele-a.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  -- UPDATE
  if old.liberada_em is not null and new.liberada_em is distinct from old.liberada_em then
    raise exception 'Solicitação liberada não volta para rascunho.' using errcode = 'P0001';
  end if;
  if old.cancelada_em is not null and new.cancelada_em is distinct from old.cancelada_em then
    raise exception 'Solicitação cancelada não pode ser reativada.' using errcode = 'P0001';
  end if;
  if old.liberada_em is not null and new.projeto_id <> old.projeto_id then
    raise exception 'Depois de liberada, a solicitação não muda de projeto.' using errcode = 'P0001';
  end if;
  if old.liberada_em is null and new.liberada_em is not null
     and not exists (
       select 1 from public.solicitacao_itens i where i.solicitacao_id = new.id and i.cancelado_em is null
     ) then
    raise exception 'Só é possível liberar uma solicitação com pelo menos um item.' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger solicitacoes_regras
  before insert or update or delete on public.solicitacoes
  for each row execute function public.tg_solicitacoes_regras();

-- ---------------------------------------------------------------- itens (RN09, UC06, UC07)
create function public.tg_itens_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sol record;
  v_recebido integer;
begin
  select s.liberada_em, s.cancelada_em
    into v_sol
    from public.solicitacoes s
   where s.id = coalesce(new.solicitacao_id, old.solicitacao_id);

  if tg_op = 'INSERT' then
    if v_sol.cancelada_em is not null then
      raise exception 'Solicitação cancelada não recebe novos itens.' using errcode = 'P0001';
    end if;
    if new.cancelado_em is not null then
      raise exception 'O item não pode ser criado já cancelado.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- v_sol vem vazio quando a própria solicitação (rascunho) está sendo descartada em cascata
    if v_sol.liberada_em is not null then
      raise exception 'Item de solicitação liberada não pode ser excluído; cancele-o.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  -- UPDATE
  if new.solicitacao_id <> old.solicitacao_id then
    raise exception 'O item não pode mudar de solicitação.' using errcode = 'P0001';
  end if;
  if old.cancelado_em is not null and new.cancelado_em is distinct from old.cancelado_em then
    raise exception 'Item cancelado não pode ser reativado.' using errcode = 'P0001';
  end if;
  if old.cancelado_em is null and new.cancelado_em is not null and v_sol.liberada_em is null then
    raise exception 'Em rascunho o item é removido, não cancelado.' using errcode = 'P0001';
  end if;

  if v_sol.liberada_em is not null and new.quantidade <> old.quantidade then
    if new.quantidade > old.quantidade then
      raise exception 'Depois de liberada, a quantidade não pode aumentar. Cadastre um novo item.'
        using errcode = 'P0001';
    end if;
    v_recebido := public.recebido_do_item(new.id);
    if new.quantidade < v_recebido then
      raise exception 'A quantidade não pode ficar abaixo do já recebido (%).', v_recebido
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;

create trigger solicitacao_itens_regras
  before insert or update or delete on public.solicitacao_itens
  for each row execute function public.tg_itens_regras();

-- ---------------------------------------------------------------- lançamentos (RN02, RN11, UC11, UC12)
create function public.tg_lancamentos_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item record;
  v_original record;
  v_recebido integer;
begin
  -- Trava a linha do item: dois lançamentos simultâneos no mesmo item são serializados,
  -- e o saldo conferido abaixo não fica desatualizado.
  select i.id, i.quantidade, i.cancelado_em, s.liberada_em, s.cancelada_em
    into v_item
    from public.solicitacao_itens i
    join public.solicitacoes s on s.id = i.solicitacao_id
   where i.id = new.item_id
     for update of i;

  if not found then
    raise exception 'Item não encontrado.' using errcode = 'P0001';
  end if;
  if v_item.liberada_em is null then
    raise exception 'A solicitação ainda não foi liberada e não pode receber peças.' using errcode = 'P0001';
  end if;

  v_recebido := public.recebido_do_item(new.item_id);

  if new.tipo = 'entrada' then
    if v_item.cancelado_em is not null or v_item.cancelada_em is not null then
      raise exception 'Item cancelado não recebe peças.' using errcode = 'P0001';
    end if;
    if v_recebido + new.quantidade > v_item.quantidade then
      raise exception 'Quantidade acima do saldo: o saldo é %, foram informadas %.',
        v_item.quantidade - v_recebido, new.quantidade
        using errcode = 'P0001',
              hint = 'Lance só até o saldo; a sobra vai para o almoxarifado.';
    end if;
    return new;
  end if;

  -- estorno
  select l.item_id, l.tipo, l.quantidade
    into v_original
    from public.recebimento_lancamentos l
   where l.id = new.estorna_id;

  if not found or v_original.item_id <> new.item_id then
    raise exception 'O lançamento a estornar não pertence a este item.' using errcode = 'P0001';
  end if;
  if v_original.tipo <> 'entrada' then
    raise exception 'Um estorno não pode ser estornado. Para refazer, lance de novo.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.recebimento_lancamentos l where l.estorna_id = new.estorna_id) then
    raise exception 'Este lançamento já foi estornado.' using errcode = 'P0001';
  end if;
  if new.quantidade <> v_original.quantidade then
    raise exception 'O estorno deve ter a mesma quantidade do lançamento original (%).', v_original.quantidade
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger recebimento_lancamentos_regras
  before insert on public.recebimento_lancamentos
  for each row execute function public.tg_lancamentos_regras();
