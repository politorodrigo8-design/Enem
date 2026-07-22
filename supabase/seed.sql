-- Seed demonstrativo da NexoENEM.
-- Recorrências e pesos são fictícios e servem apenas para validar o MVP.

insert into public.subjects (id, name, area, slug) values
  ('00000000-0000-0000-0000-000000000101', 'Matemática', 'Matemática', 'matematica'),
  ('00000000-0000-0000-0000-000000000102', 'Linguagens', 'Linguagens', 'linguagens'),
  ('00000000-0000-0000-0000-000000000103', 'Sociologia', 'Ciências Humanas', 'sociologia'),
  ('00000000-0000-0000-0000-000000000104', 'Geografia', 'Ciências Humanas', 'geografia'),
  ('00000000-0000-0000-0000-000000000105', 'História', 'Ciências Humanas', 'historia'),
  ('00000000-0000-0000-0000-000000000106', 'Biologia', 'Ciências da Natureza', 'biologia'),
  ('00000000-0000-0000-0000-000000000107', 'Física', 'Ciências da Natureza', 'fisica'),
  ('00000000-0000-0000-0000-000000000108', 'Química', 'Ciências da Natureza', 'quimica'),
  ('00000000-0000-0000-0000-000000000109', 'Redação', 'Redação', 'redacao')
on conflict (slug) do update set name = excluded.name, area = excluded.area;

insert into public.topics (id, subject_id, name, slug, historical_recurrence, priority_weight, difficulty_level, strategic_importance) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Razão e proporção', 'razao-e-proporcao', 92, 9.2, 'Média', 9.5),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Estatística', 'estatistica', 86, 8.6, 'Média', 8.0),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', 'Funções', 'funcoes', 71, 7.1, 'Alta', 7.4),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', 'Interpretação de texto', 'interpretacao-de-texto', 96, 9.6, 'Média', 9.2),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000102', 'Variação linguística', 'variacao-linguistica', 72, 7.2, 'Baixa', 6.4),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000102', 'Gêneros textuais', 'generos-textuais', 66, 6.6, 'Média', 6.0),
  ('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000103', 'Cidadania e direitos', 'cidadania-e-direitos', 78, 7.8, 'Média', 7.6),
  ('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000104', 'Urbanização brasileira', 'urbanizacao-brasileira', 70, 7.0, 'Média', 6.8),
  ('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000105', 'Brasil República', 'brasil-republica', 62, 6.2, 'Alta', 6.0),
  ('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000106', 'Ecologia', 'ecologia', 94, 9.4, 'Média', 9.0),
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000107', 'Eletricidade', 'eletricidade', 82, 8.2, 'Alta', 8.7),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000108', 'Estequiometria', 'estequiometria', 80, 8.0, 'Alta', 8.4),
  ('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000107', 'Termologia', 'termologia', 68, 6.8, 'Média', 6.5)
on conflict (slug) do update set
  historical_recurrence = excluded.historical_recurrence,
  priority_weight = excluded.priority_weight,
  difficulty_level = excluded.difficulty_level,
  strategic_importance = excluded.strategic_importance;

insert into public.questions (id, statement, subject_id, topic_id, difficulty, year, source, is_demo, explanation, correct_option) values
  ('00000000-0000-0000-0000-000000000301', 'Uma receita usa 3 xícaras de farinha para preparar 12 porções. Mantendo a mesma proporção, quantas xícaras serão necessárias para preparar 28 porções?', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 'Média', 2026, 'Questão demonstrativa autoral', true, 'Se 12 porções usam 3 xícaras, cada 4 porções usam 1 xícara. Para 28 porções, 28 dividido por 4 resulta em 7 xícaras.', 'C'),
  ('00000000-0000-0000-0000-000000000302', 'As notas de um estudante em cinco simulados foram 580, 620, 640, 660 e 700. Qual é a média dessas notas?', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 'Baixa', 2026, 'Questão demonstrativa autoral', true, 'A soma das notas é 3200. Dividindo por 5 simulados, a média é 640.', 'C'),
  ('00000000-0000-0000-0000-000000000303', 'Um serviço cobra R$ 18,00 de taxa fixa e R$ 4,00 por unidade entregue. Qual expressão representa o custo C para x unidades?', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203', 'Alta', 2026, 'Questão demonstrativa autoral', true, 'O valor fixo entra uma única vez, e o valor de R$ 4,00 é multiplicado pela quantidade de unidades.', 'B'),
  ('00000000-0000-0000-0000-000000000304', 'Em uma campanha, lê-se: Apague a luz ao sair. A cidade agradece em silêncio. O principal efeito da frase é', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000204', 'Média', 2026, 'Questão demonstrativa autoral', true, 'A frase usa apelo coletivo e linguagem figurada para incentivar uma ação simples de economia.', 'B'),
  ('00000000-0000-0000-0000-000000000305', 'Um estudante escreve a gente vai apresentar o trabalho em uma conversa informal com colegas. Nesse contexto, a expressão a gente é', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000205', 'Baixa', 2026, 'Questão demonstrativa autoral', true, 'A variação linguística depende do contexto. Em conversa informal, a gente é uma forma usual e compreensível.', 'C'),
  ('00000000-0000-0000-0000-000000000306', 'Um texto apresenta título chamativo, breve descrição de um problema público, data, local e convite para participação popular. Esse texto se aproxima de', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000206', 'Média', 2026, 'Questão demonstrativa autoral', true, 'A presença de convite, local e data indica função de convocar pessoas para uma ação ou evento.', 'A'),
  ('00000000-0000-0000-0000-000000000307', 'A criação de conselhos municipais com participação de moradores contribui para a democracia porque', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000207', 'Média', 2026, 'Questão demonstrativa autoral', true, 'Conselhos participativos permitem que a população acompanhe, proponha e fiscalize políticas públicas.', 'B'),
  ('00000000-0000-0000-0000-000000000308', 'O crescimento rápido das cidades sem planejamento tende a intensificar', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000208', 'Média', 2026, 'Questão demonstrativa autoral', true, 'Urbanização acelerada sem planejamento amplia desigualdades, precariza serviços e aumenta problemas ambientais.', 'C'),
  ('00000000-0000-0000-0000-000000000309', 'Ao comparar dois períodos republicanos, um estudante observa permanências de desigualdade no acesso à participação política. Essa análise valoriza', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000209', 'Alta', 2026, 'Questão demonstrativa autoral', true, 'Mudanças políticas podem coexistir com permanências sociais, especialmente quando direitos não são igualmente acessíveis.', 'A'),
  ('00000000-0000-0000-0000-000000000310', 'A retirada de predadores de topo em uma cadeia alimentar pode causar', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000210', 'Média', 2026, 'Questão demonstrativa autoral', true, 'Predadores de topo ajudam a regular populações. Sua retirada pode aumentar algumas espécies e afetar toda a cadeia.', 'B'),
  ('00000000-0000-0000-0000-000000000311', 'Um aparelho de 500 W funciona por 4 horas por dia. Em 10 dias, o consumo aproximado é', '00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000211', 'Alta', 2026, 'Questão demonstrativa autoral', true, '500 W equivalem a 0,5 kW. Em 4 horas, são 2 kWh por dia. Em 10 dias, 20 kWh.', 'D'),
  ('00000000-0000-0000-0000-000000000312', 'Em uma reação simplificada, 2 mol de A formam 1 mol de B. Para formar 3 mol de B, são necessários', '00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000212', 'Alta', 2026, 'Questão demonstrativa autoral', true, 'A proporção é 2 mol de A para 1 mol de B. Para 3 mol de B, multiplica-se por 3: 6 mol de A.', 'D')
on conflict (id) do update set
  statement = excluded.statement,
  explanation = excluded.explanation,
  correct_option = excluded.correct_option;

insert into public.question_options (question_id, option_key, option_text) values
  ('00000000-0000-0000-0000-000000000301','A','5'), ('00000000-0000-0000-0000-000000000301','B','6'), ('00000000-0000-0000-0000-000000000301','C','7'), ('00000000-0000-0000-0000-000000000301','D','8'), ('00000000-0000-0000-0000-000000000301','E','9'),
  ('00000000-0000-0000-0000-000000000302','A','620'), ('00000000-0000-0000-0000-000000000302','B','636'), ('00000000-0000-0000-0000-000000000302','C','640'), ('00000000-0000-0000-0000-000000000302','D','652'), ('00000000-0000-0000-0000-000000000302','E','660'),
  ('00000000-0000-0000-0000-000000000303','A','C = 18x + 4'), ('00000000-0000-0000-0000-000000000303','B','C = 4x + 18'), ('00000000-0000-0000-0000-000000000303','C','C = 22x'), ('00000000-0000-0000-0000-000000000303','D','C = 18 + x'), ('00000000-0000-0000-0000-000000000303','E','C = 4 + 18x'),
  ('00000000-0000-0000-0000-000000000304','A','informar uma lei municipal recém-aprovada.'), ('00000000-0000-0000-0000-000000000304','B','sugerir uma atitude coletiva de economia de energia.'), ('00000000-0000-0000-0000-000000000304','C','criticar o uso de lâmpadas em ambientes públicos.'), ('00000000-0000-0000-0000-000000000304','D','apresentar dados técnicos sobre consumo elétrico.'), ('00000000-0000-0000-0000-000000000304','E','promover uma marca de equipamentos elétricos.'),
  ('00000000-0000-0000-0000-000000000305','A','inadequada por não existir na língua portuguesa.'), ('00000000-0000-0000-0000-000000000305','B','um erro que impede a compreensão da mensagem.'), ('00000000-0000-0000-0000-000000000305','C','adequada ao registro informal da interação.'), ('00000000-0000-0000-0000-000000000305','D','exclusiva de textos científicos.'), ('00000000-0000-0000-0000-000000000305','E','um exemplo de linguagem técnica.'),
  ('00000000-0000-0000-0000-000000000306','A','convocação para evento comunitário.'), ('00000000-0000-0000-0000-000000000306','B','verbete enciclopédico.'), ('00000000-0000-0000-0000-000000000306','C','resenha crítica acadêmica.'), ('00000000-0000-0000-0000-000000000306','D','manual de instruções.'), ('00000000-0000-0000-0000-000000000306','E','relatório financeiro.'),
  ('00000000-0000-0000-0000-000000000307','A','substitui totalmente as eleições periódicas.'), ('00000000-0000-0000-0000-000000000307','B','amplia o acompanhamento social das políticas públicas.'), ('00000000-0000-0000-0000-000000000307','C','elimina a necessidade de leis.'), ('00000000-0000-0000-0000-000000000307','D','concentra decisões em grupos econômicos.'), ('00000000-0000-0000-0000-000000000307','E','reduz a diversidade de opiniões.'),
  ('00000000-0000-0000-0000-000000000308','A','a distribuição igualitária de infraestrutura.'), ('00000000-0000-0000-0000-000000000308','B','a redução automática do trânsito.'), ('00000000-0000-0000-0000-000000000308','C','a segregação socioespacial e a pressão sobre serviços públicos.'), ('00000000-0000-0000-0000-000000000308','D','o desaparecimento das periferias.'), ('00000000-0000-0000-0000-000000000308','E','a ausência de impactos ambientais.'),
  ('00000000-0000-0000-0000-000000000309','A','a ideia de que mudanças institucionais não eliminam automaticamente desigualdades sociais.'), ('00000000-0000-0000-0000-000000000309','B','a ausência de conflitos na história política.'), ('00000000-0000-0000-0000-000000000309','C','a neutralidade total das instituições.'), ('00000000-0000-0000-0000-000000000309','D','a inexistência de movimentos sociais.'), ('00000000-0000-0000-0000-000000000309','E','a redução da cidadania à economia doméstica.'),
  ('00000000-0000-0000-0000-000000000310','A','a estabilidade imediata de todas as populações.'), ('00000000-0000-0000-0000-000000000310','B','desequilíbrio populacional em níveis tróficos inferiores.'), ('00000000-0000-0000-0000-000000000310','C','o fim da competição por recursos.'), ('00000000-0000-0000-0000-000000000310','D','a eliminação da fotossíntese.'), ('00000000-0000-0000-0000-000000000310','E','a redução obrigatória dos produtores.'),
  ('00000000-0000-0000-0000-000000000311','A','2 kWh'), ('00000000-0000-0000-0000-000000000311','B','5 kWh'), ('00000000-0000-0000-0000-000000000311','C','10 kWh'), ('00000000-0000-0000-0000-000000000311','D','20 kWh'), ('00000000-0000-0000-0000-000000000311','E','40 kWh'),
  ('00000000-0000-0000-0000-000000000312','A','1 mol de A'), ('00000000-0000-0000-0000-000000000312','B','2 mol de A'), ('00000000-0000-0000-0000-000000000312','C','3 mol de A'), ('00000000-0000-0000-0000-000000000312','D','6 mol de A'), ('00000000-0000-0000-0000-000000000312','E','9 mol de A')
on conflict (question_id, option_key) do update set option_text = excluded.option_text;

update public.questions q
set
  reviewed = true,
  review_status = 'approved',
  source_verified = true,
  answer_verified = true,
  media_verified = true,
  confidence_level = coalesce(q.confidence_level, 'media'),
  priority_reason = coalesce(
    q.priority_reason,
    'Questao demonstrativa revisada para validar o fluxo de treino do MVP.'
  ),
  priority_score = greatest(q.priority_score, least(100, t.historical_recurrence)),
  estimated_priority = case
    when t.historical_recurrence >= 85 then 'Potencial muito alto de recorrencia do conteudo'
    when t.historical_recurrence >= 75 then 'Alta prioridade'
    when t.historical_recurrence >= 65 then 'Prioridade media'
    else 'Complementar'
  end,
  recurrence_category = case
    when t.historical_recurrence >= 85 then 'Potencial muito alto de recorrencia do conteudo'
    when t.historical_recurrence >= 75 then 'Alta prioridade'
    when t.historical_recurrence >= 65 then 'Prioridade media'
    else 'Complementar'
  end
from public.topics t
where q.topic_id = t.id
  and q.is_demo = true;

insert into public.simulations (id, title, description, duration_minutes, difficulty, status) values
  ('00000000-0000-0000-0000-000000000401', 'Diagnóstico inicial', 'Mapeia gargalos por área e sugere a primeira rota de estudos.', 100, 'Média', 'Disponível'),
  ('00000000-0000-0000-0000-000000000402', 'Matemática essencial', 'Foca nos conteúdos quantitativos com maior potencial de evolução.', 70, 'Alta', 'Disponível'),
  ('00000000-0000-0000-0000-000000000403', 'Ciências da Natureza', 'Integra Biologia, Química e Física em questões contextualizadas.', 85, 'Alta', 'Disponível'),
  ('00000000-0000-0000-0000-000000000404', 'Linguagens e Humanas', 'Treina leitura, interpretação e análise social de textos.', 90, 'Média', 'Disponível'),
  ('00000000-0000-0000-0000-000000000405', 'Reta final', 'Revisão intensiva de prioridades para as últimas semanas.', 140, 'Alta', 'Em breve'),
  ('00000000-0000-0000-0000-000000000406', 'Simulado personalizado', 'Monta uma prova curta a partir das prioridades atuais do aluno.', 55, 'Média', 'Disponível')
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;

insert into public.simulation_questions (simulation_id, question_id, position) values
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301',1),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000304',2),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000307',3),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000310',4),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000311',5),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000312',6),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000301',1),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000302',2),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000303',3),
  ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000310',1),
  ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000311',2),
  ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000312',3),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000304',1),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000305',2),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000306',3),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000307',4),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000308',5),
  ('00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000309',6),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000301',1),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000311',2),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000312',3),
  ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000310',4)
on conflict (simulation_id, position) do update set question_id = excluded.question_id;
