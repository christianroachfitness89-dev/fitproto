-- migration_v11: client-submitted check-ins from portal
-- ──────────────────────────────────────────────────────────────

-- submit_portal_check_in
-- Called anonymously from the client portal. The client UUID acts as
-- the access token (security definer bypasses RLS).

create or replace function public.submit_portal_check_in(
  p_client_id    uuid,
  p_weight_kg    decimal default null,
  p_body_fat_pct decimal default null,
  p_energy_level int     default null,
  p_sleep_hours  decimal default null,
  p_notes        text    default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.clients where id = p_client_id) then
    return jsonb_build_object('error', 'not_found');
  end if;

  if p_energy_level is not null and p_energy_level not between 1 and 10 then
    return jsonb_build_object('error', 'energy_level must be 1-10');
  end if;

  insert into public.check_ins (
    client_id, checked_in_at,
    weight_kg, body_fat_pct, energy_level, sleep_hours, notes
  ) values (
    p_client_id, current_date,
    p_weight_kg, p_body_fat_pct, p_energy_level, p_sleep_hours, p_notes
  ) returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$;

grant execute on function public.submit_portal_check_in(uuid, decimal, decimal, int, decimal, text) to anon;
