-- 028: keep database legal versions synchronized with application legal config.

update public.legal_document_versions
set is_current = false
where document_type = 'terms_of_use'
  and version <> '2026-07-24';

update public.legal_document_versions
set is_current = false
where document_type = 'privacy_policy'
  and version <> '2026-07-24';

update public.legal_document_versions
set is_current = false
where document_type = 'refund_policy'
  and version <> '2026-07-23';

insert into public.legal_document_versions (
  document_type,
  version,
  effective_at,
  content_hash,
  is_current
)
values
  (
    'terms_of_use',
    '2026-07-24',
    '2026-07-24 00:00:00-03'::timestamptz,
    '50aa8c390912a6142f50722112817f2931dd977a3a3ccf0b854508613c4a69d5',
    true
  ),
  (
    'privacy_policy',
    '2026-07-24',
    '2026-07-24 00:00:00-03'::timestamptz,
    '32db8163b8428a114c8402c5911ea4f9e8a4a8fe59f05057c653f9475b7e7fb0',
    true
  ),
  (
    'refund_policy',
    '2026-07-23',
    '2026-07-23 00:00:00-03'::timestamptz,
    '8c8d2a6e904b91d39eb9a53e9c4e2d8a77f9d2fb00e32b45d9b596f4df9558d1',
    true
  )
on conflict (document_type, version) do update set
  effective_at = excluded.effective_at,
  content_hash = excluded.content_hash,
  is_current = excluded.is_current;
