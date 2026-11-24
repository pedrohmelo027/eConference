-- eConference — views de saldo e andamento. Saldo e status são sempre calculados, nunca gravados.
-- As mesmas regras estão em packages/shared/src/calculos.ts (com testes).
-- security_invoker: a view respeita as permissões e o RLS de quem consulta.

-- Por item: solicitado, recebido (RN03), saldo, % (RN06) e status (RN04).
-- Item cancelado tem saldo 0: não conta como falta.
create view public.vw_itens_saldo
with (security_invoker = true)
as
select
  i.id,
  i.solicitacao_id,
  s.projeto_id,
  i.processo_id,
  p.nome as processo,
  p.peso,
  i.codigo,
  i.codigo_normalizado,
  i.material,
  i.medida,
  i.data_solicitacao,
  i.quantidade as solicitado,
  r.recebido,
  case when i.cancelado_em is not null then 0 else i.quantidade - r.recebido end as saldo,
  round(r.recebido::numeric / i.quantidade, 4) as percentual,
  case
    when i.cancelado_em is not null then 'cancelado'
    when r.recebido = 0 then 'pendente'
    when r.recebido < i.quantidade then 'parcial'
    else 'completo'
  end as status,
  i.cancelado_em,
  i.motivo_cancelamento,
  s.liberada_em,
  r.ultimo_recebimento_em
from public.solicitacao_itens i
join public.solicitacoes s on s.id = i.solicitacao_id
join public.processos p on p.id = i.processo_id
cross join lateral (
  select
    coalesce(sum(case when l.tipo = 'entrada' then l.quantidade else -l.quantidade end), 0)::integer
      as recebido,
    max(l.lancado_em) as ultimo_recebimento_em
  from public.recebimento_lancamentos l
  where l.item_id = i.id
) r;

-- Por solicitação: totais, % simples, % ponderado (RN07) e status (RN05).
-- Totais ignoram itens cancelados. % nulo quando não há item ativo.
create view public.vw_solicitacoes_resumo
with (security_invoker = true)
as
select
  s.id,
  s.projeto_id,
  pr.nome as projeto,
  s.titulo,
  s.data,
  s.hora,
  s.observacao,
  s.importacao_id,
  s.liberada_em,
  s.cancelada_em,
  s.motivo_cancelamento,
  s.criado_em,
  case
    when s.cancelada_em is not null then 'cancelada'
    when s.liberada_em is null then 'rascunho'
    when t.itens_com_saldo > 0 then 'aberta'
    else 'concluida'
  end as status,
  t.itens,
  t.itens_completos,
  t.itens_com_saldo,
  t.itens_cancelados,
  t.pecas_solicitadas,
  t.pecas_recebidas,
  t.pecas_faltantes,
  round(t.pecas_recebidas::numeric / nullif(t.pecas_solicitadas, 0), 4) as percentual,
  round(t.recebido_ponderado / nullif(t.solicitado_ponderado, 0), 4) as percentual_ponderado
from public.solicitacoes s
join public.projetos pr on pr.id = s.projeto_id
cross join lateral (
  select
    count(*) filter (where v.status <> 'cancelado')::integer as itens,
    count(*) filter (where v.status = 'completo')::integer as itens_completos,
    count(*) filter (where v.status in ('pendente', 'parcial'))::integer as itens_com_saldo,
    count(*) filter (where v.status = 'cancelado')::integer as itens_cancelados,
    coalesce(sum(v.solicitado) filter (where v.status <> 'cancelado'), 0)::integer as pecas_solicitadas,
    coalesce(sum(v.recebido) filter (where v.status <> 'cancelado'), 0)::integer as pecas_recebidas,
    coalesce(sum(v.saldo) filter (where v.status <> 'cancelado'), 0)::integer as pecas_faltantes,
    coalesce(sum(v.solicitado * v.peso) filter (where v.status <> 'cancelado'), 0) as solicitado_ponderado,
    coalesce(sum(v.recebido * v.peso) filter (where v.status <> 'cancelado'), 0) as recebido_ponderado
  from public.vw_itens_saldo v
  where v.solicitacao_id = s.id
) t;

-- Por projeto: mesmos totais, considerando só solicitações liberadas e não canceladas
-- (o que PCP e Produção acompanham). Rascunhos aparecem só na contagem.
create view public.vw_projetos_resumo
with (security_invoker = true)
as
select
  pr.id,
  pr.nome,
  pr.codigo,
  pr.encerrado_em,
  pr.criado_em,
  c.solicitacoes_rascunho,
  c.solicitacoes_abertas,
  c.solicitacoes_concluidas,
  c.solicitacoes_canceladas,
  t.itens,
  t.itens_completos,
  t.itens_com_saldo,
  t.pecas_solicitadas,
  t.pecas_recebidas,
  t.pecas_faltantes,
  round(t.pecas_recebidas::numeric / nullif(t.pecas_solicitadas, 0), 4) as percentual,
  round(t.recebido_ponderado / nullif(t.solicitado_ponderado, 0), 4) as percentual_ponderado
from public.projetos pr
cross join lateral (
  select
    count(*) filter (where r.status = 'rascunho')::integer as solicitacoes_rascunho,
    count(*) filter (where r.status = 'aberta')::integer as solicitacoes_abertas,
    count(*) filter (where r.status = 'concluida')::integer as solicitacoes_concluidas,
    count(*) filter (where r.status = 'cancelada')::integer as solicitacoes_canceladas
  from public.vw_solicitacoes_resumo r
  where r.projeto_id = pr.id
) c
cross join lateral (
  select
    count(*) filter (where v.status <> 'cancelado')::integer as itens,
    count(*) filter (where v.status = 'completo')::integer as itens_completos,
    count(*) filter (where v.status in ('pendente', 'parcial'))::integer as itens_com_saldo,
    coalesce(sum(v.solicitado) filter (where v.status <> 'cancelado'), 0)::integer as pecas_solicitadas,
    coalesce(sum(v.recebido) filter (where v.status <> 'cancelado'), 0)::integer as pecas_recebidas,
    coalesce(sum(v.saldo) filter (where v.status <> 'cancelado'), 0)::integer as pecas_faltantes,
    coalesce(sum(v.solicitado * v.peso) filter (where v.status <> 'cancelado'), 0) as solicitado_ponderado,
    coalesce(sum(v.recebido * v.peso) filter (where v.status <> 'cancelado'), 0) as recebido_ponderado
  from public.vw_itens_saldo v
  join public.solicitacoes s on s.id = v.solicitacao_id
  where v.projeto_id = pr.id
    and s.liberada_em is not null
    and s.cancelada_em is null
) t;
