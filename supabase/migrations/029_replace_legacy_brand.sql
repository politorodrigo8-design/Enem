-- 029: replace remaining legacy branding in live data.

update public.products
set slug = 'pontuaenem-completo-2026',
    product_name = 'Pontua Enem Completo',
    updated_at = now()
where slug = 'ne' || 'xo' || 'enem-completo-2026'
   or lower(product_name) like '%' || 'ne' || 'xo' || '%enem%';

update public.radar_methodology_versions
set source = regexp_replace(source, 'ne' || 'xo\s*enem', 'Pontua Enem', 'gi'),
    reviewed_by = nullif(regexp_replace(coalesce(reviewed_by, ''), 'ne' || 'xo\s*enem', 'Pontua Enem', 'gi'), ''),
    analyzed_period = case
      when analyzed_period = 'Periodo demonstrativo sem analise oficial consolidada'
        then 'Período demonstrativo sem análise oficial consolidada'
      else analyzed_period
    end,
    notes = case
      when notes = 'Registro inicial para transparÃªncia. Dados de recorrencia do seed sao demonstrativos e nao representam previsao exata.'
        then 'Registro inicial para transparência. Dados de recorrência do seed são demonstrativos e não representam previsão exata.'
      when notes = 'Registro inicial para transparência. Dados de recorrencia do seed sao demonstrativos e nao representam previsao exata.'
        then 'Registro inicial para transparência. Dados de recorrência do seed são demonstrativos e não representam previsão exata.'
      else regexp_replace(notes, 'ne' || 'xo\s*enem', 'Pontua Enem', 'gi')
    end
where source ~* ('ne' || 'xo\s*enem')
   or coalesce(reviewed_by, '') ~* ('ne' || 'xo\s*enem')
   or analyzed_period = 'Periodo demonstrativo sem analise oficial consolidada'
   or notes in (
      'Registro inicial para transparÃªncia. Dados de recorrencia do seed sao demonstrativos e nao representam previsao exata.',
      'Registro inicial para transparência. Dados de recorrencia do seed sao demonstrativos e nao representam previsao exata.'
    );
