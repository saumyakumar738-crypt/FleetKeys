---
name: Supabase schema setup
description: Connector capabilities and the manual schema-application boundary for this project.
---

The Replit Supabase connector attached to this project provides authenticated
PostgREST access, including table/view reads and RPC calls, but does not expose
SQL/DDL execution through its SDK. A Supabase MCP/SQL connection is a separate
integration and may not be available or accepted.

**Why:** The fleet API can be implemented and verified against the connector,
but tables and RPC functions do not exist until the migration is applied in an
approved Supabase SQL environment.

**How to apply:** Keep schema creation in the checked-in Supabase migration,
surface the API's explicit missing-schema response, and never request or
expose Supabase credentials in chat.