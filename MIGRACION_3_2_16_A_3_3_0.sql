-- ============================================================================
-- SIASCLOUD 3.3.0 · MIGRACIÓN DESDE 3.2.16
-- Consolidación idempotente. No elimina datos ni recrea tablas operacionales.
-- Ejecutar en Supabase SQL Editor antes de desplegar el index.ts 3.3.0.
-- ============================================================================

begin;

-- Configuración social de tienda pública.
alter table public.sias_store_settings add column if not exists instagram_url text;
alter table public.sias_store_settings add column if not exists facebook_url text;
alter table public.sias_store_settings add column if not exists tiktok_url text;
alter table public.sias_store_settings add column if not exists youtube_url text;

-- Galería adicional de imágenes por producto. image_url continúa siendo principal.
create table if not exists public.sias_product_images (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sias_companies(id) on delete cascade,
  product_id uuid not null references public.sias_products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order <= 100),
  created_at timestamptz not null default now(),
  unique(product_id,image_url)
);
create index if not exists sias_product_images_company_product_idx
  on public.sias_product_images(company_id,product_id,sort_order,created_at);
alter table public.sias_product_images enable row level security;

-- Solicitud general de contacto desde la tienda pública.
create or replace function public.sias_store_create_contact_request(
  p_company uuid,
  p_key uuid,
  p_contact jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_number text;
  v_old jsonb;
  v_fingerprint text;
begin
  if p_key is null then raise exception 'SOLICITUD_INVALIDA'; end if;
  if not exists(select 1 from public.sias_companies where id=p_company and active) then
    raise exception 'TIENDA_NO_DISPONIBLE';
  end if;
  if not exists(select 1 from public.sias_store_settings where company_id=p_company and enabled) then
    raise exception 'TIENDA_NO_DISPONIBLE';
  end if;

  v_fingerprint := md5(coalesce(p_contact,'{}'::jsonb)::text || ':CONTACT');

  select id,number,metadata into v_id,v_number,v_old
  from public.sias_documents
  where company_id=p_company and request_key=p_key;

  if v_id is not null then
    if v_old->>'web_fingerprint' is distinct from v_fingerprint then
      raise exception 'SOLICITUD_INVALIDA';
    end if;
    return jsonb_build_object('number',v_number,'reused',true);
  end if;

  v_number := public.sias_next_sequence(p_company,'REQUEST');

  insert into public.sias_documents(
    company_id,document_type,number,status,issue_date,currency,
    net,exempt,tax,discount,shipping,total,payment_status,
    source,notes,request_key,metadata
  ) values (
    p_company,'REQUEST',v_number,'DRAFT',(now() at time zone 'America/Santiago')::date,'CLP',
    0,0,0,0,0,0,'PENDING',
    'WEB',nullif(p_contact->>'message',''),p_key,
    jsonb_build_object(
      'web_contact',p_contact,
      'web_fingerprint',v_fingerprint,
      'web_request_kind','CONTACT'
    )
  ) returning id into v_id;

  insert into public.sias_notifications(user_id,title,message,type,module,reference_id)
    select u.id,'Nueva solicitud de contacto',v_number||' · '||coalesce(p_contact->>'name','Cliente'),'INFO','STORE',v_id::text
    from public.sias_users u
    where u.active and (
      u.superadmin or exists(
        select 1 from public.sias_user_companies uc
        where uc.user_id=u.id and uc.company_id=p_company
      )
    );

  return jsonb_build_object('number',v_number,'id',v_id);
end $$;

revoke all on function public.sias_store_create_contact_request(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sias_store_create_contact_request(uuid,uuid,jsonb) to service_role;

-- Versión consolidada.
update public.sias_installation
   set version='3.3.0', updated_at=now()
 where id=1;

commit;
notify pgrst,'reload schema';
