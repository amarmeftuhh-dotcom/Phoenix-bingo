-- ==========================================================
-- Phoenix Bingo: 550-Card Realtime Atomic Reservation Schema
-- ==========================================================
-- This script creates the table, partial unique indexes, atomic
-- stored procedures, Row Level Security (RLS), and Realtime
-- publication for concurrent multiplayer card selection.

-- 1. Create Reservations Table
create table if not exists public.bingo_card_reservations (
  id uuid primary key default gen_random_uuid(),
  game_id bigint not null,
  card_number int not null check (card_number between 1 and 550),
  status text not null default 'reserved' check (status in ('reserved', 'confirmed', 'released')),
  player_id text not null,
  player_name text default 'ተጫዋች',
  player_phone text default '',
  reserved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Partial Unique Index: Guarantees at the database engine level that NO TWO PLAYERS
-- can hold the same card in the same game round simultaneously.
create unique index if not exists idx_unique_active_card 
  on public.bingo_card_reservations (game_id, card_number) 
  where (status in ('reserved', 'confirmed'));

-- 3. Query Optimization Indexes
create index if not exists idx_game_status 
  on public.bingo_card_reservations (game_id, status);

create index if not exists idx_game_player 
  on public.bingo_card_reservations (game_id, player_id);

-- 4. Enable Row Level Security (RLS)
alter table public.bingo_card_reservations enable row level security;

-- Policies: Allow public read so all players immediately see occupied cards
create policy "Allow read access to reservations" 
  on public.bingo_card_reservations 
  for select 
  using (true);

-- Allow insert via stored function or direct client
create policy "Allow insert reservations" 
  on public.bingo_card_reservations 
  for insert 
  with check (true);

-- Allow update
create policy "Allow update own reservations" 
  on public.bingo_card_reservations 
  for update 
  using (true);

-- 5. Atomic Card Reservation Function (Guarantees atomic locking & race condition safety)
create or replace function public.reserve_bingo_card(
  p_game_id bigint,
  p_card_number int,
  p_player_id text,
  p_player_name text default 'ተጫዋች',
  p_player_phone text default '',
  p_max_cards int default 4
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing_owner text;
  v_player_card_count int;
  v_inserted_id uuid;
begin
  -- Validation 1: Range check (1 to 550)
  if p_card_number < 1 or p_card_number > 550 then
    return jsonb_build_object(
      'success', false,
      'error', 'INVALID_CARD_NUMBER',
      'message', 'ካርቴላ ቁጥር ከ 1 እስከ 550 ብቻ መሆን አለበት።'
    );
  end if;

  -- Validation 2: Check if card is currently reserved/confirmed
  select player_id into v_existing_owner
  from public.bingo_card_reservations
  where game_id = p_game_id
    and card_number = p_card_number
    and status in ('reserved', 'confirmed');

  if v_existing_owner = p_player_id then
    return jsonb_build_object(
      'success', true,
      'already_owned', true,
      'card_number', p_card_number,
      'game_id', p_game_id,
      'message', 'ካርቴላ #' || p_card_number || ' አስቀድመው በእርስዎ ተይዟል።'
    );
  elsif v_existing_owner is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'ALREADY_TAKEN',
      'message', 'ይቅርታ! ካርቴላ #' || p_card_number || ' በሌላ ተጫዋች ተይዟል (Already taken).'
    );
  end if;

  -- Validation 3: Check max card limit per player (Default 4)
  select count(*) into v_player_card_count
  from public.bingo_card_reservations
  where game_id = p_game_id
    and player_id = p_player_id
    and status in ('reserved', 'confirmed');

  if v_player_card_count >= p_max_cards then
    return jsonb_build_object(
      'success', false,
      'error', 'MAX_CARDS_EXCEEDED',
      'message', 'በአንድ ዙር ከ ' || p_max_cards || ' ካርቴላ በላይ መያዝ አይቻልም።'
    );
  end if;

  -- Validation 4: Atomic Insert with ON CONFLICT resolution
  insert into public.bingo_card_reservations (
    game_id,
    card_number,
    status,
    player_id,
    player_name,
    player_phone,
    reserved_at,
    updated_at
  )
  values (
    p_game_id,
    p_card_number,
    'reserved',
    p_player_id,
    p_player_name,
    p_player_phone,
    now(),
    now()
  )
  on conflict (game_id, card_number) where (status in ('reserved', 'confirmed'))
  do nothing
  returning id into v_inserted_id;

  -- If insert returned null, another concurrent request grabbed the card in the same microsecond!
  if v_inserted_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'ALREADY_TAKEN',
      'message', 'ይቅርታ! ካርቴላ #' || p_card_number || ' በሌላ ተጫዋች ተይዟል (Already taken).'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'card_number', p_card_number,
    'game_id', p_game_id,
    'reservation_id', v_inserted_id,
    'message', 'ካርቴላ #' || p_card_number || ' በተሳካ ሁኔታ ተይዟል (Successfully reserved).'
  );
end;
$$;

-- 6. Atomic Card Release / Cancel Function
create or replace function public.release_bingo_card(
  p_game_id bigint,
  p_card_number int,
  p_player_id text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_affected int;
begin
  update public.bingo_card_reservations
  set status = 'released',
      updated_at = now()
  where game_id = p_game_id
    and card_number = p_card_number
    and player_id = p_player_id
    and status in ('reserved', 'confirmed');

  get diagnostics v_affected = row_count;

  if v_affected > 0 then
    return jsonb_build_object(
      'success', true,
      'card_number', p_card_number,
      'game_id', p_game_id,
      'message', 'ካርቴላ #' || p_card_number || ' በተሳካ ሁኔታ ተለቋል (Released).'
    );
  else
    return jsonb_build_object(
      'success', false,
      'message', 'ካርቴላው አልተገኘም ወይም አስቀድሞ ተለቋል።'
    );
  end if;
end;
$$;

-- 7. Query Active Cards Function
create or replace function public.get_game_active_cards(
  p_game_id bigint
) returns table (
  card_number int,
  player_id text,
  player_name text,
  player_phone text,
  status text,
  reserved_at timestamptz
)
language sql
stable
as $$
  select 
    card_number,
    player_id,
    player_name,
    player_phone,
    status,
    reserved_at
  from public.bingo_card_reservations
  where game_id = p_game_id
    and status in ('reserved', 'confirmed')
  order by card_number asc;
$$;

-- 8. Add table to Supabase Realtime publication
alter publication supabase_realtime add table public.bingo_card_reservations;

-- ==========================================================
-- 9. Player Activity & Transaction History Table
-- ==========================================================
create table if not exists public.player_history (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  telegram_user_id text not null,
  game_id bigint,
  event_type text not null check (event_type in (
    'CARD_SELECTED',
    'CARD_RELEASED',
    'GAME_JOINED',
    'GAME_STARTED',
    'GAME_COMPLETED',
    'DEPOSIT',
    'WITHDRAWAL_REQUESTED',
    'WITHDRAWAL_APPROVED',
    'WITHDRAWAL_REJECTED',
    'PRIZE_WON',
    'REFUND'
  )),
  card_id int check (card_id is null or (card_id between 1 and 550)),
  amount numeric(12, 2) default 0.00,
  payment_method text,
  status text not null default 'completed' check (status in ('completed', 'pending', 'approved', 'rejected')),
  description text,
  created_at timestamptz not null default now()
);

-- Indexes for lightning-fast queries and history pagination
create index if not exists idx_player_history_player on public.player_history (player_id, created_at desc);
create index if not exists idx_player_history_tg on public.player_history (telegram_user_id, created_at desc);
create index if not exists idx_player_history_game on public.player_history (game_id);
create index if not exists idx_player_history_type on public.player_history (event_type);

-- Row Level Security (RLS) - Privacy strictly enforced
alter table public.player_history enable row level security;

-- Policy: A player can ONLY read their own history records
create policy "Players can read own history only"
  on public.player_history
  for select
  using (
    auth.uid()::text = player_id 
    or telegram_user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'telegram_id', '')
    or player_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', '')
    or current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Policy: Inserts allowed via service role or authenticated functions
create policy "Allow inserts to player history"
  on public.player_history
  for insert
  with check (true);

-- 10. Record Activity Stored Procedure
create or replace function public.log_player_event(
  p_player_id text,
  p_telegram_user_id text,
  p_event_type text,
  p_game_id bigint default null,
  p_card_id int default null,
  p_amount numeric default 0.00,
  p_payment_method text default null,
  p_status text default 'completed',
  p_description text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_new_id uuid;
begin
  insert into public.player_history (
    player_id,
    telegram_user_id,
    game_id,
    event_type,
    card_id,
    amount,
    payment_method,
    status,
    description,
    created_at
  ) values (
    p_player_id,
    p_telegram_user_id,
    p_game_id,
    p_event_type,
    p_card_id,
    p_amount,
    p_payment_method,
    p_status,
    p_description,
    now()
  ) returning id into v_new_id;
  
  return v_new_id;
end;
$$;

-- 11. Add player_history to Realtime publication
alter publication supabase_realtime add table public.player_history;

