-- 034: a escala de autopercepção mudou de sentido (commit 7fd3ef6, 2026-07-28):
-- antes 5 = "Muito difícil"; agora 1 = "Muita dificuldade" e 5 = "Muita facilidade".
-- Converte os valores gravados na semântica antiga (v -> 6 - v), uma única vez.
--
-- ATENÇÃO: aplicar junto do deploy dessa mudança de código. Diagnósticos salvos
-- DEPOIS do deploy do commit 7fd3ef6 já estão na semântica nova e seriam
-- corrompidos por uma segunda inversão — confira a janela antes de aplicar.
--
-- Os scores em user_topic_performance NÃO precisam de recálculo: os antigos
-- foram computados com a fórmula antiga sobre valores antigos (boost correto),
-- e novos diagnósticos usam a fórmula nova sobre valores invertidos — o boost
-- resultante é o mesmo nos dois casos.

update public.profiles
set perceived_difficulties = (
  select coalesce(
    jsonb_object_agg(
      entry.key,
      case
        when entry.value ~ '^[0-9]+(\.[0-9]+)?$'
          then to_jsonb((6 - least(5, greatest(1, round(entry.value::numeric))))::int)
        else to_jsonb(entry.value)
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each_text(perceived_difficulties) as entry(key, value)
)
where perceived_difficulties <> '{}'::jsonb;
