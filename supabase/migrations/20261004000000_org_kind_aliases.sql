-- Any website, not only B2B brands: what kind of organisation it is (changes
-- which checks apply and how buyer questions are written), and other names AI
-- answers may use for it (e.g. "BJP" for "Bharatiya Janata Party").
alter table public.brands
  add column kind text not null default 'business'
    check (kind in ('business', 'political_party', 'nonprofit', 'government', 'other')),
  add column aliases text[] not null default '{}'
    check (cardinality(aliases) <= 10);
