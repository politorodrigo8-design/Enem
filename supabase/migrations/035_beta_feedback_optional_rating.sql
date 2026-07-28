-- 035: a nota do feedback virou opcional na UI; a coluna legada exigia NOT NULL
-- e o código gravava 5 como fallback, poluindo os dados com nota máxima fantasma.
-- O check (rating between 1 and 5) continua valendo para valores não nulos.

alter table public.beta_feedback alter column rating drop not null;
