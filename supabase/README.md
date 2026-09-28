# Fleet Key Control Supabase setup

The API server uses the Replit Supabase connector through PostgREST. The
connector can read and write exposed tables and RPCs, but it cannot execute
DDL. Apply the migration below once in the Supabase SQL Editor:

```text
supabase/migrations/001_fleet_key_control.sql
```

The migration creates:

- fleet users, primary keys, key history, and transfer records
- duplicate driver keys and penalty records
- read views used by the API
- transactional RPCs for transfer creation, acceptance, rejection, and
  cancellation
- transactional RPCs for driver-key allotment and penalty issue/reversal

The API requires the acting fleet user in the `X-Fleet-User-Id` header. The
header is an application identity boundary for the current prototype; it is
not a replacement for an authentication provider. Use stable IDs from
`fleet_users`, such as `amit-patel`, when seeding or integrating the mobile
client.