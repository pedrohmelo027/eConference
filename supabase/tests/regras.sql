-- Testes das regras do banco (gatilhos, views, privilégios).
-- Rode no SQL Editor do Supabase (ou psql como postgres). Tudo acontece numa transação que
-- termina com um erro proposital "RELATORIO": nada fica gravado. Toda linha deve começar com "ok"
-- ou ser um valor esperado; qualquer "FALHOU" é regressão.
--
-- Esperado: parcial saldo=1 · completo saldo=0 · após estorno parcial recebido=1 saldo=3 ·
-- solicitação aberta 1/4 25% → concluida · projeto 100% · auditoria com usuário.
do $teste$
declare
  r text := E'\n';
  u uuid := gen_random_uuid();
  pj uuid; s uuid; s2 uuid; i1 uuid; i2 uuid; l1 uuid; e1 uuid;
  proc_laser uuid; proc_com uuid;
  v record; n int;
begin
  insert into auth.users (id, email, aud, role) values (u, 'teste@rotex.com.br', 'authenticated', 'authenticated');
  insert into public.perfis (id, nome, email, papel) values (u, 'Teste', 'teste@rotex.com.br', 'producao');
  select id into proc_laser from public.processos where nome = 'Corte Laser';
  select id into proc_com from public.processos where nome = 'Comerciais';
  execute 'grant econference_api to postgres';
  set local role econference_api;
  perform set_config('app.usuario_id', u::text, true);

  insert into public.projetos (nome) values ('Projeto Teste') returning id into pj;
  insert into public.solicitacoes (projeto_id, titulo, data) values (pj, 'Sol teste', current_date) returning id into s;
  insert into public.solicitacao_itens (solicitacao_id, processo_id, codigo, quantidade, data_solicitacao)
    values (s, proc_laser, '  et024-ma-001-008 ', 4, current_date) returning id into i1;
  insert into public.solicitacao_itens (solicitacao_id, processo_id, codigo, quantidade, data_solicitacao)
    values (s, proc_com, 'PARAFUSO   M10', 10, current_date) returning id into i2;
  select codigo_normalizado into v from public.solicitacao_itens where id = i1;
  r := r || 'código normalizado (esperado ET024-MA-001-008): ' || v.codigo_normalizado || E'\n';

  begin
    insert into public.solicitacao_itens (solicitacao_id, processo_id, codigo, quantidade, data_solicitacao)
      values (s, proc_laser, 'ET024-MA-001-008', 1, current_date);
    r := r || E'FALHOU: aceitou código repetido\n';
  exception when others then r := r || 'ok código repetido → ' || sqlerrm || E'\n'; end;

  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, lancado_por) values (i1, 'entrada', 1, u);
    r := r || E'FALHOU: rascunho recebeu\n';
  exception when others then r := r || 'ok rascunho → ' || sqlerrm || E'\n'; end;

  update public.solicitacao_itens set quantidade = 5 where id = i1;
  update public.solicitacao_itens set quantidade = 4 where id = i1;
  r := r || E'ok rascunho: quantidade alterada livremente\n';

  insert into public.solicitacoes (projeto_id, titulo, data) values (pj, 'Vazia', current_date) returning id into s2;
  begin
    update public.solicitacoes set liberada_em = now(), liberada_por = u where id = s2;
    r := r || E'FALHOU: liberou sem itens\n';
  exception when others then r := r || 'ok liberar vazia → ' || sqlerrm || E'\n'; end;
  delete from public.solicitacoes where id = s2;
  r := r || E'ok rascunho descartado\n';

  update public.solicitacoes set liberada_em = now(), liberada_por = u where id = s;
  begin
    update public.solicitacoes set liberada_em = null where id = s;
    r := r || E'FALHOU: voltou para rascunho\n';
  exception when others then r := r || 'ok voltar rascunho → ' || sqlerrm || E'\n'; end;

  insert into public.recebimento_lancamentos (item_id, tipo, quantidade, lancado_por) values (i1, 'entrada', 3, u) returning id into l1;
  select status, saldo, percentual into v from public.vw_itens_saldo where id = i1;
  r := r || format(E'após 3 de 4: status=%s saldo=%s %%=%s\n', v.status, v.saldo, v.percentual);
  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, lancado_por) values (i1, 'entrada', 2, u);
    r := r || E'FALHOU: passou do solicitado\n';
  exception when others then r := r || 'ok acima do saldo → ' || sqlerrm || E'\n'; end;
  insert into public.recebimento_lancamentos (item_id, tipo, quantidade, lancado_por) values (i1, 'entrada', 1, u);
  select status, saldo into v from public.vw_itens_saldo where id = i1;
  r := r || format(E'após 4 de 4: status=%s saldo=%s\n', v.status, v.saldo);

  begin
    update public.solicitacao_itens set quantidade = 11 where id = i2;
    r := r || E'FALHOU: aumentou quantidade\n';
  exception when others then r := r || 'ok aumentar → ' || sqlerrm || E'\n'; end;
  begin
    update public.solicitacao_itens set quantidade = 3 where id = i1;
    r := r || E'FALHOU: reduziu abaixo do recebido\n';
  exception when others then r := r || 'ok reduzir abaixo → ' || sqlerrm || E'\n'; end;
  update public.solicitacao_itens set quantidade = 8 where id = i2;
  r := r || E'ok reduziu i2 de 10 para 8\n';

  begin
    update public.recebimento_lancamentos set quantidade = 2 where id = l1;
    r := r || E'FALHOU: API alterou lançamento\n';
  exception when others then r := r || 'ok alterar lançamento (API) → ' || sqlerrm || E'\n'; end;

  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, estorna_id, motivo, lancado_por) values (i1, 'estorno', 1, l1, 'erro', u);
    r := r || E'FALHOU: estorno com quantidade diferente\n';
  exception when others then r := r || 'ok estorno qtd diferente → ' || sqlerrm || E'\n'; end;
  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, estorna_id, lancado_por) values (i1, 'estorno', 3, l1, u);
    r := r || E'FALHOU: estorno sem motivo\n';
  exception when others then r := r || 'ok estorno sem motivo → ' || sqlerrm || E'\n'; end;
  insert into public.recebimento_lancamentos (item_id, tipo, quantidade, estorna_id, motivo, lancado_por)
    values (i1, 'estorno', 3, l1, 'lançado no item errado', u) returning id into e1;
  select status, recebido, saldo into v from public.vw_itens_saldo where id = i1;
  r := r || format(E'após estorno: status=%s recebido=%s saldo=%s\n', v.status, v.recebido, v.saldo);
  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, estorna_id, motivo, lancado_por) values (i1, 'estorno', 3, l1, 'de novo', u);
    r := r || E'FALHOU: estornou duas vezes\n';
  exception when others then r := r || 'ok estornar de novo → ' || sqlerrm || E'\n'; end;
  begin
    insert into public.recebimento_lancamentos (item_id, tipo, quantidade, estorna_id, motivo, lancado_por) values (i1, 'estorno', 3, e1, 'estorno do estorno', u);
    r := r || E'FALHOU: estornou um estorno\n';
  exception when others then r := r || 'ok estornar estorno → ' || sqlerrm || E'\n'; end;

  begin
    delete from public.solicitacao_itens where id = i2;
    r := r || E'FALHOU: excluiu item liberado\n';
  exception when others then r := r || 'ok excluir item → ' || sqlerrm || E'\n'; end;
  begin
    delete from public.solicitacoes where id = s;
    r := r || E'FALHOU: excluiu solicitação liberada\n';
  exception when others then r := r || 'ok excluir solicitação → ' || sqlerrm || E'\n'; end;

  update public.solicitacao_itens set cancelado_em = now(), cancelado_por = u, motivo_cancelamento = 'não precisa mais' where id = i2;
  select status, itens, itens_cancelados, pecas_solicitadas, pecas_recebidas, percentual, percentual_ponderado
    into v from public.vw_solicitacoes_resumo where id = s;
  r := r || format(E'solicitação: status=%s itens=%s cancelados=%s peças=%s/%s %%=%s pond=%s\n',
    v.status, v.itens, v.itens_cancelados, v.pecas_recebidas, v.pecas_solicitadas, v.percentual, v.percentual_ponderado);
  insert into public.recebimento_lancamentos (item_id, tipo, quantidade, lancado_por) values (i1, 'entrada', 3, u);
  select status into v from public.vw_solicitacoes_resumo where id = s;
  r := r || format(E'solicitação após completar i1 (i2 cancelado): status=%s\n', v.status);
  select solicitacoes_concluidas, pecas_solicitadas, percentual into v from public.vw_projetos_resumo where id = pj;
  r := r || format(E'projeto: concluídas=%s peças=%s %%=%s\n', v.solicitacoes_concluidas, v.pecas_solicitadas, v.percentual);

  update public.projetos set encerrado_em = now() where id = pj;
  begin
    insert into public.solicitacoes (projeto_id, titulo, data) values (pj, 'Nova', current_date);
    r := r || E'FALHOU: projeto encerrado recebeu solicitação\n';
  exception when others then r := r || 'ok projeto encerrado → ' || sqlerrm || E'\n'; end;

  select count(*) as total, count(*) filter (where usuario_id = u) as com_usuario into v
    from public.auditoria where registro_id in (pj, s, i1, i2);
  r := r || format(E'auditoria: %s eventos, %s com usuário\n', v.total, v.com_usuario);
  select count(*) into n from public.auditoria where tabela = 'solicitacoes' and registro_id = s2 and acao = 'delete';
  r := r || format(E'auditoria do rascunho descartado (esperado 1): %s\n', n);

  reset role;
  begin
    update public.recebimento_lancamentos set quantidade = 9 where id = l1;
    r := r || E'FALHOU: postgres alterou lançamento\n';
  exception when others then r := r || 'ok gatilho imutável (postgres) → ' || sqlerrm || E'\n'; end;
  set local role anon;
  begin
    perform 1 from public.solicitacoes limit 1;
    r := r || E'FALHOU: anon leu solicitações\n';
  exception when others then r := r || 'ok anon → ' || sqlerrm || E'\n'; end;
  set local role authenticated;
  begin
    perform 1 from public.vw_itens_saldo limit 1;
    r := r || E'FALHOU: authenticated leu view\n';
  exception when others then r := r || 'ok authenticated → ' || sqlerrm || E'\n'; end;

  raise exception 'RELATORIO (transação desfeita):%', r;
end
$teste$;
