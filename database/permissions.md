# Database — Permissions & RLS

## Modèle RBAC

```
Role        Mandats     Biens (autres) Finance KPI éq.  Recrut. Settings
admin       full        full           full    full     full    full
manager     full        full           lecture full     full    lecture
agent       les siens   ses biens      —       sien     —       —
assistant   lecture     lecture        —       —        —       —
```

## Politique RLS (pattern)

Toute table tenant porte `agency_id`. Politique standard :

```sql
alter table <t> enable row level security;

create policy "tenant_isolation_select" on <t>
  for select
  using (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

create policy "tenant_isolation_insert" on <t>
  for insert
  with check (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

create policy "tenant_isolation_update" on <t>
  for update
  using (agency_id = (auth.jwt() ->> 'agency_id')::uuid)
  with check (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

## Politiques par table (extraits)

### properties
- `agent` ne voit que ses propres biens (`owner_user_id = auth.uid()`).
- `manager` et `admin` voient tout.

```sql
create policy "agents_own_properties" on properties
  for select
  using (
    agency_id = (auth.jwt() ->> 'agency_id')::uuid
    and (
      (auth.jwt() ->> 'role') in ('admin','manager','assistant')
      or owner_user_id = auth.uid()
    )
  );
```

### financial_records
- Accès **admin uniquement** par défaut.

### candidates
- Accès `admin` + `manager` (recrutement).
- `agent` aveugle.

### audit_logs
- **Append-only** : aucun update/delete.
- Lecture admin only.

```sql
create policy "audit_no_update" on audit_logs
  for update using (false);
create policy "audit_no_delete" on audit_logs
  for delete using (false);
```

## Validation côté API
RLS = première barrière. Backend ajoute :
- **Quotas** par plan (`quotas` table).
- **Module check** : si `mandates` désactivé pour ce tenant → 403.
- **Audit trail** : log avant chaque mutation sensible.
