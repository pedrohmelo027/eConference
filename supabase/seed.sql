-- Dados de desenvolvimento (não use em produção).
-- Aplicado pela Supabase CLI no `supabase db reset` (config.jsonc → db.seed) e, no projeto
-- econference-dev, pelo SQL Editor. É idempotente: pode rodar de novo.
-- Processos já vêm da migration de estrutura. Usuários entram na Fase 3 (UC02).

insert into public.projetos (nome, codigo) values
  ('Esteira 24 ASTA', 'ET024'),
  ('Esteira 36 ASTA', 'ET036'),
  ('Esteira DUPLA', null),
  ('Pés inclinados', null)
on conflict do nothing;

-- Solicitação da planilha de exemplo (docs/planilha-modelo/eConference-planilha-exemplo.xlsx),
-- em rascunho, como fica depois da importação (UC05).
do $$
declare
  v_projeto uuid;
  v_sol uuid;
begin
  select id into v_projeto from public.projetos where nome = 'Esteira 24 ASTA';
  if exists (select 1 from public.solicitacoes where projeto_id = v_projeto and titulo = 'Módulos motor - esteiras 24 ASTA') then
    return;
  end if;

  insert into public.solicitacoes (projeto_id, titulo, data, hora, observacao)
  values (v_projeto, 'Módulos motor - esteiras 24 ASTA', '2026-11-17', '09:39',
          'Desenhos no anexo MODULOS-MOTOR-24.rar')
  returning id into v_sol;

  insert into public.solicitacao_itens
    (solicitacao_id, processo_id, codigo, material, medida, quantidade, data_solicitacao)
  select v_sol, p.id, i.codigo, nullif(i.material, ''), i.medida, i.quantidade, date '2026-11-17'
  from (values
    ('Corte Laser',   'ET024-MA-001-008',                      'SAE 1020',      '9,525 mm',        4),
    ('Corte Laser',   'ET024-MA-001-012',                      'SAE 1020',      '6,35 mm',         8),
    ('Corte e Dobra', 'ET024-MA-002-003',                      'SAE 1020',      '3,0 mm',         12),
    ('Oxicorte',      'ET024-MA-003-001',                      'ASTM A36',      '25,4 mm',         2),
    ('Roletes',       'ET024-RL-001-001',                      'Tubo SAE 1020', 'Ø 89 x 600 mm',  40),
    ('Matéria-Prima', 'VIGA U 6" 1ª ALMA',                     'ASTM A36',      '6 m',             6),
    ('Comerciais',    'PARAFUSO SEXTAVADO DIN 933 - M10 X 20', 'Aço zincado',   'M10 x 20',      120),
    ('Comerciais',    'ARRUELA LISA DIN 125 - M10',            'Aço zincado',   'M10',           120),
    ('Comerciais',    'ROLAMENTO 6205 2RS',                    '',              '25 x 52 x 15 mm', 16)
  ) as i (processo, codigo, material, medida, quantidade)
  join public.processos p on p.nome = i.processo;
end
$$;
