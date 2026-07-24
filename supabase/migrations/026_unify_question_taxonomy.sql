-- Unifica a taxonomia de assuntos (topics) e disciplinas (subjects).
-- Contexto: o banco acumulou duas gerações de taxonomia — os registros do seed
-- demonstrativo (nomes acentuados, slugs curtos, ex.: "Eletricidade") e os das
-- importações antigas (nomes sem acento, slugs longos, ex.: "Eletricidade e
-- magnetismo"). O mesmo assunto aparecia fragmentado em 2+ linhas, quebrando o
-- filtro por assunto do Praticar e o plano semanal do Hoje.
-- Fonte canônica dos nomes: src/lib/questions/taxonomy.json (acentuado), o
-- mesmo contrato de scripts/normalize-question-imports.mjs.

begin;

-- 1. Nomes canônicos acentuados (variantes sem acento geradas por imports antigos).
update public.subjects set area = 'Matemática' where area = 'Matematica';
update public.subjects set area = 'Ciências da Natureza' where area = 'Ciencias da Natureza';
update public.subjects set area = 'Ciências Humanas' where area = 'Ciencias Humanas';
update public.subjects set name = 'Matemática' where name = 'Matematica';
update public.questions set discipline = 'Matemática' where discipline = 'Matematica';
update public.subjects set name = 'Física' where name = 'Fisica';
update public.questions set discipline = 'Física' where discipline = 'Fisica';
update public.subjects set name = 'Química' where name = 'Quimica';
update public.questions set discipline = 'Química' where discipline = 'Quimica';
update public.subjects set name = 'História' where name = 'Historia';
update public.questions set discipline = 'História' where discipline = 'Historia';
update public.subjects set name = 'Língua Portuguesa' where name = 'Lingua Portuguesa';
update public.questions set discipline = 'Língua Portuguesa' where discipline = 'Lingua Portuguesa';
update public.subjects set name = 'Inglês' where name = 'Ingles';
update public.questions set discipline = 'Inglês' where discipline = 'Ingles';
update public.subjects set name = 'Educação Física' where name = 'Educacao Fisica';
update public.questions set discipline = 'Educação Física' where discipline = 'Educacao Fisica';
update public.subjects set name = 'Redação' where name = 'Redacao';
update public.questions set discipline = 'Redação' where discipline = 'Redacao';
update public.topics set name = 'Números e operações' where name = 'Numeros e operacoes';
update public.topics set name = 'Razão, proporção e porcentagem' where name = 'Razao, proporcao e porcentagem';
update public.topics set name = 'Matemática financeira' where name = 'Matematica financeira';
update public.topics set name = 'Estatística' where name = 'Estatistica';
update public.topics set name = 'Análise combinatória' where name = 'Analise combinatoria';
update public.topics set name = 'Interpretação de gráficos e tabelas' where name = 'Interpretacao de graficos e tabelas';
update public.topics set name = 'Funções' where name = 'Funcoes';
update public.topics set name = 'Equações e inequações' where name = 'Equacoes e inequacoes';
update public.topics set name = 'Sequências e progressões' where name = 'Sequencias e progressoes';
update public.topics set name = 'Geometria analítica' where name = 'Geometria analitica';
update public.topics set name = 'Genética e evolução' where name = 'Genetica e evolucao';
update public.topics set name = 'Citologia e bioquímica' where name = 'Citologia e bioquimica';
update public.topics set name = 'Imunologia e saúde' where name = 'Imunologia e saude';
update public.topics set name = 'Botânica e zoologia' where name = 'Botanica e zoologia';
update public.topics set name = 'Mecânica' where name = 'Mecanica';
update public.topics set name = 'Ondas e acústica' where name = 'Ondas e acustica';
update public.topics set name = 'Óptica' where name = 'Optica';
update public.topics set name = 'Termologia e termodinâmica' where name = 'Termologia e termodinamica';
update public.topics set name = 'Hidrostática' where name = 'Hidrostatica';
update public.topics set name = 'Física moderna' where name = 'Fisica moderna';
update public.topics set name = 'Soluções e concentração' where name = 'Solucoes e concentracao';
update public.topics set name = 'Funções inorgânicas' where name = 'Funcoes inorganicas';
update public.topics set name = 'Química orgânica' where name = 'Quimica organica';
update public.topics set name = 'Eletroquímica' where name = 'Eletroquimica';
update public.topics set name = 'Termoquímica' where name = 'Termoquimica';
update public.topics set name = 'Cinética e equilíbrio químico' where name = 'Cinetica e equilibrio quimico';
update public.topics set name = 'Atomística e tabela periódica' where name = 'Atomistica e tabela periodica';
update public.topics set name = 'Separação de misturas e propriedades' where name = 'Separacao de misturas e propriedades';
update public.topics set name = 'Química ambiental' where name = 'Quimica ambiental';
update public.topics set name = 'Brasil Colônia' where name = 'Brasil Colonia';
update public.topics set name = 'Brasil Império' where name = 'Brasil Imperio';
update public.topics set name = 'República Velha' where name = 'Republica Velha';
update public.topics set name = 'Ditadura militar e redemocratização' where name = 'Ditadura militar e redemocratizacao';
update public.topics set name = 'Idade Antiga e Média' where name = 'Idade Antiga e Media';
update public.topics set name = 'Idade Contemporânea' where name = 'Idade Contemporanea';
update public.topics set name = 'História da América' where name = 'Historia da America';
update public.topics set name = 'Escravidão e cultura afro-brasileira' where name = 'Escravidao e cultura afro-brasileira';
update public.topics set name = 'Povos indígenas' where name = 'Povos indigenas';
update public.topics set name = 'Urbanização' where name = 'Urbanizacao';
update public.topics set name = 'Globalização e geopolítica' where name = 'Globalizacao e geopolitica';
update public.topics set name = 'População e migrações' where name = 'Populacao e migracoes';
update public.topics set name = 'Agricultura e agropecuária' where name = 'Agricultura e agropecuaria';
update public.topics set name = 'Indústria e energia' where name = 'Industria e energia';
update public.topics set name = 'Filosofia moderna e contemporânea' where name = 'Filosofia moderna e contemporanea';
update public.topics set name = 'Ética e moral' where name = 'Etica e moral';
update public.topics set name = 'Política e Estado' where name = 'Politica e Estado';
update public.topics set name = 'Mídia e sociedade' where name = 'Midia e sociedade';
update public.topics set name = 'Interpretação textual' where name = 'Interpretacao textual';
update public.topics set name = 'Gêneros textuais' where name = 'Generos textuais';
update public.topics set name = 'Funções da linguagem' where name = 'Funcoes da linguagem';
update public.topics set name = 'Variação linguística' where name = 'Variacao linguistica';
update public.topics set name = 'Norma e gramática contextualizada' where name = 'Norma e gramatica contextualizada';
update public.topics set name = 'Coesão e coerência' where name = 'Coesao e coerencia';
update public.topics set name = 'Publicidade e mídia' where name = 'Publicidade e midia';
update public.topics set name = 'Linguagem verbal e não verbal' where name = 'Linguagem verbal e nao verbal';
update public.topics set name = 'Escolas literárias' where name = 'Escolas literarias';
update public.topics set name = 'Literatura contemporânea e marginal' where name = 'Literatura contemporanea e marginal';
update public.topics set name = 'Interpretação de texto em inglês' where name = 'Interpretacao de texto em ingles';
update public.topics set name = 'Interpretação de texto em espanhol' where name = 'Interpretacao de texto em espanhol';
update public.topics set name = 'Artes visuais e música' where name = 'Artes visuais e musica';
update public.topics set name = 'Corpo, saúde e práticas corporais' where name = 'Corpo, saude e praticas corporais';
update public.topics set name = 'Tecnologias da informação e comunicação' where name = 'Tecnologias da informacao e comunicacao';

-- 2. Assuntos legados do seed demonstrativo: renomeia para o assunto canônico
--    equivalente; a mescla de duplicados (passo 4) faz a fusão de fato.
update public.topics set name = 'Eletricidade e magnetismo' where slug = 'eletricidade';
update public.topics set name = 'Termologia e termodinâmica' where slug = 'termologia';
update public.topics set name = 'Ecologia e meio ambiente' where slug = 'ecologia';
update public.topics set name = 'Urbanização' where slug = 'urbanizacao-brasileira';
update public.topics set name = 'República Velha' where slug = 'brasil-republica';
update public.topics set name = 'Interpretação textual' where slug = 'interpretacao-de-texto';
update public.topics set name = 'Razão, proporção e porcentagem' where slug = 'razao-e-proporcao';
-- O assunto "Linguagens" do seed só abriga tópicos de Língua Portuguesa.
update public.subjects set name = 'Língua Portuguesa' where slug = 'linguagens' and name = 'Linguagens';

-- 3. Mescla disciplinas duplicadas (mesma área + mesmo nome): vence a que tem
--    mais questões; tópicos e questões das demais são reapontados.
do $$
declare
  duplicate record;
  winner_id uuid;
begin
  for duplicate in
    select area, name, array_agg(id order by question_count desc, topic_count desc, id) as ids
    from (
      select s.id, s.area, s.name,
        (select count(*) from public.questions q where q.subject_id = s.id) as question_count,
        (select count(*) from public.topics t where t.subject_id = s.id) as topic_count
      from public.subjects s
    ) ranked
    group by area, name
    having count(*) > 1
  loop
    winner_id := duplicate.ids[1];
    update public.topics set subject_id = winner_id
      where subject_id = any(duplicate.ids[2:]);
    update public.questions set subject_id = winner_id
      where subject_id = any(duplicate.ids[2:]);
    delete from public.subjects where id = any(duplicate.ids[2:]);
  end loop;
end $$;

-- 4. Mescla tópicos duplicados (mesma disciplina + mesmo nome): vence o que tem
--    mais questões; herda a maior recorrência/prioridade; reaponta questões,
--    itens de plano e desempenho por tópico (somando os agregados do usuário).
do $$
declare
  duplicate record;
  winner_id uuid;
  loser_ids uuid[];
begin
  for duplicate in
    select subject_id, name, array_agg(id order by question_count desc, id) as ids
    from (
      select t.id, t.subject_id, t.name,
        (select count(*) from public.questions q where q.topic_id = t.id) as question_count
      from public.topics t
    ) ranked
    group by subject_id, name
    having count(*) > 1
  loop
    winner_id := duplicate.ids[1];
    loser_ids := duplicate.ids[2:];

    update public.topics w set
      historical_recurrence = greatest(w.historical_recurrence,
        (select max(l.historical_recurrence) from public.topics l where l.id = any(loser_ids))),
      priority_weight = greatest(w.priority_weight,
        (select max(l.priority_weight) from public.topics l where l.id = any(loser_ids))),
      strategic_importance = greatest(w.strategic_importance,
        (select max(l.strategic_importance) from public.topics l where l.id = any(loser_ids)))
    where w.id = winner_id;

    update public.questions set topic_id = winner_id where topic_id = any(loser_ids);
    update public.study_plan_items set topic_id = winner_id where topic_id = any(loser_ids);

    -- Desempenho: soma os agregados do usuário no tópico vencedor.
    insert into public.user_topic_performance
      (user_id, topic_id, total_answers, correct_answers, accuracy_percentage, priority_score, updated_at)
    select p.user_id, winner_id, sum(p.total_answers), sum(p.correct_answers),
      case when sum(p.total_answers) > 0
        then round(sum(p.correct_answers)::numeric * 100 / sum(p.total_answers))
        else 0 end,
      max(p.priority_score), max(p.updated_at)
    from public.user_topic_performance p
    where p.topic_id = any(loser_ids)
    group by p.user_id
    on conflict (user_id, topic_id) do update set
      total_answers = public.user_topic_performance.total_answers + excluded.total_answers,
      correct_answers = public.user_topic_performance.correct_answers + excluded.correct_answers,
      accuracy_percentage = case
        when public.user_topic_performance.total_answers + excluded.total_answers > 0
        then round((public.user_topic_performance.correct_answers + excluded.correct_answers)::numeric * 100
          / (public.user_topic_performance.total_answers + excluded.total_answers))
        else 0 end,
      priority_score = greatest(public.user_topic_performance.priority_score, excluded.priority_score),
      updated_at = greatest(public.user_topic_performance.updated_at, excluded.updated_at);
    delete from public.user_topic_performance where topic_id = any(loser_ids);

    delete from public.topics where id = any(loser_ids);
  end loop;
end $$;

commit;
