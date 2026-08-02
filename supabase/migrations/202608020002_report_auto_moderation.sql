-- Automatically hide a public deck after five unique reports.
create or replace function public.auto_hide_reported_deck()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.deck_reports where public_deck_id = new.public_deck_id) >= 5 then
    update public.public_decks set is_active = false where id = new.public_deck_id;
  end if;
  return new;
end;
$$;

drop trigger if exists deck_reports_auto_hide on public.deck_reports;
create trigger deck_reports_auto_hide
after insert on public.deck_reports
for each row execute function public.auto_hide_reported_deck();
