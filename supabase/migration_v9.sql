-- migration_v9: portal tasks RPC
-- Returns all incomplete tasks assigned to a client (accessible anon via client_id).

create or replace function public.get_portal_tasks(p_client_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',       t.id,
      'title',    t.title,
      'type',     t.type,
      'due_date', t.due_date
    )
    order by
      case when t.due_date is not null and t.due_date < current_date then 0 else 1 end,
      t.due_date asc nulls last,
      t.created_at asc
  ), '[]'::jsonb)
  from public.tasks t
  where t.client_id = p_client_id
    and t.completed = false
$$;

grant execute on function public.get_portal_tasks(uuid) to anon;
