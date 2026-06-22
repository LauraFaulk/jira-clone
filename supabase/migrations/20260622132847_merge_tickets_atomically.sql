create or replace function public.merge_tickets(
  remaining_ticket_id bigint,
  merged_ticket_id bigint
)
returns public.tickets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  remaining_ticket public.tickets;
  merged_ticket public.tickets;
  combined_ticket public.tickets;
begin
  if remaining_ticket_id = merged_ticket_id then
    raise exception 'A ticket cannot be merged with itself.';
  end if;

  select *
  into remaining_ticket
  from public.tickets
  where id = remaining_ticket_id
  for update;

  if not found then
    raise exception 'The remaining ticket could not be found.';
  end if;

  select *
  into merged_ticket
  from public.tickets
  where id = merged_ticket_id
  for update;

  if not found then
    raise exception 'The ticket being merged could not be found.';
  end if;

  update public.tickets
  set
    description = concat_ws(
      E'\n\n',
      nullif(remaining_ticket.description, ''),
      format(
        E'---\n### Merged Ticket #%s: %s\n**Original status:** %s\n**Original priority:** %s\n**Originally created:** %s\n\n%s',
        merged_ticket.id,
        merged_ticket.title,
        merged_ticket.status,
        coalesce(merged_ticket.priority, 'Not set'),
        merged_ticket.created_at,
        coalesce(merged_ticket.description, 'No detailed description provided.')
      )
    ),
    developer_notes = concat_ws(
      E'\n\n',
      nullif(remaining_ticket.developer_notes, ''),
      format(
        E'--- Merged from ticket #%s: %s ---\n%s',
        merged_ticket.id,
        merged_ticket.title,
        coalesce(merged_ticket.developer_notes, 'No developer notes provided.')
      )
    ),
    subtasks = coalesce(remaining_ticket.subtasks, '[]'::jsonb)
      || coalesce(merged_ticket.subtasks, '[]'::jsonb),
    attachments = coalesce(remaining_ticket.attachments, '[]'::jsonb)
      || coalesce(merged_ticket.attachments, '[]'::jsonb),
    tech_wizard = array(
      select distinct wizard
      from unnest(
        coalesce(remaining_ticket.tech_wizard, array[]::text[])
        || coalesce(merged_ticket.tech_wizard, array[]::text[])
      ) as wizard
      where wizard is not null and wizard <> ''
    ),
    priority = case
      when lower(coalesce(remaining_ticket.priority, '')) in ('highest', 'urgent', 'critical')
        or lower(coalesce(merged_ticket.priority, '')) in ('highest', 'urgent', 'critical') then 'Highest'
      when lower(coalesce(remaining_ticket.priority, '')) = 'high'
        or lower(coalesce(merged_ticket.priority, '')) = 'high' then 'High'
      when lower(coalesce(remaining_ticket.priority, '')) = 'medium'
        or lower(coalesce(merged_ticket.priority, '')) = 'medium' then 'Medium'
      when lower(coalesce(remaining_ticket.priority, '')) = 'low'
        or lower(coalesce(merged_ticket.priority, '')) = 'low' then 'Low'
      when lower(coalesce(remaining_ticket.priority, '')) = 'lowest'
        or lower(coalesce(merged_ticket.priority, '')) = 'lowest' then 'Lowest'
      else coalesce(remaining_ticket.priority, merged_ticket.priority)
    end
  where id = remaining_ticket_id
  returning * into combined_ticket;

  delete from public.tickets
  where id = merged_ticket_id;

  return combined_ticket;
end;
$$;

revoke all on function public.merge_tickets(bigint, bigint) from public;
grant execute on function public.merge_tickets(bigint, bigint) to anon, authenticated;
