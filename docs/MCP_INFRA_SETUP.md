# Switch MCP & Infrastructure Setup

This document records the non-secret integration contract for Switch.

## Workspace MCP configuration

The repository includes `.vscode/mcp.json` for VS Code / Codespaces agent sessions.

Configured servers:

```text
cloudflare-api -> https://mcp.cloudflare.com/mcp
github         -> https://api.githubcopilot.com/mcp
zid            -> ${env:ZID_MCP_URL}
```

VS Code workspace MCP uses the top-level `servers` key. Do not replace it with `mcpServers` in `.vscode/mcp.json`.

### Zid MCP

The Zid AI Tools page supplies a dedicated remote SSE endpoint on `zam-mcp-server.zid.sa`.
The endpoint path contains credential material, so the full URL must not be committed to the repository.

Set it only in the developer/Codespaces environment:

```bash
export ZID_MCP_URL='https://zam-mcp-server.zid.sa/.../sse'
```

Then start/restart the `zid` server from **MCP: List Servers** in VS Code.

Security rules:

- Never put the live Zid URL directly in `.vscode/mcp.json`.
- Never expose it with a `VITE_*` variable.
- Treat rotation of the Zid MCP URL like rotation of an API credential.
- Use only the scopes/tools required for catalog, order, or store operations.

## Cloudflare MCP

Cloudflare Code Mode MCP:

```text
https://mcp.cloudflare.com/mcp
```

Use OAuth authorization in the client and grant least privilege. Production remains the existing Worker `dark-disk-4155`; MCP access must not create a second production project.

## GitHub MCP

GitHub MCP server:

```text
https://api.githubcopilot.com/mcp
```

GitHub remains the canonical source for `503badrr/cosmic-switch-preview`.

Recommended repository permissions:

- Metadata: Read-only
- Contents: Read & write when code changes are intentionally requested
- Issues: Read & write
- Pull requests: Read & write
- Actions: Read-only
- Administration: No access by default
- Secrets: No access
- Webhooks: No access unless deliberately configured
- Workflows: No access unless workflow mutation is explicitly required

## Snowflake ↔ GitHub MCP

GitHub App name: `Switch Snowflake MCP`

Required URLs:

```text
Homepage URL:
https://swwiitch.com

OAuth redirect URI:
https://identity.snowflake.com/oauth2/callback

GitHub MCP server:
https://api.githubcopilot.com/mcp

OAuth authorization endpoint:
https://github.com/login/oauth/authorize

OAuth token endpoint:
https://github.com/login/oauth/access_token
```

Do not commit the GitHub App private key, OAuth client secret, installation tokens, or `.pem` / `.key` material.

## GitLab

GitLab is a secondary SCM/CI integration. GitHub remains canonical unless a deliberate migration is approved.

## DigitalOcean

DigitalOcean is optional infrastructure for remote development or auxiliary services. It is not the production storefront host while Cloudflare remains the runtime.

Rules:

- Use a dedicated SSH key for remote workspaces.
- Never reuse the GitHub App private key as an SSH key.
- Keep secrets outside the repository.
- Prefer least privilege and delete temporary droplets when no longer needed.

## Secret-handling baseline

The following must never be committed:

- GitHub App private keys
- OAuth client secrets
- Cloudflare API tokens
- credential-bearing Zid MCP URLs
- `SUPABASE_SERVICE_ROLE_KEY`
- Shopify private Storefront tokens
- Tap / Telr / HyperPay / Moyasar secret keys
- webhook signing secrets
- SSH private keys

Public/example configuration may be committed only when it contains placeholders or values explicitly designed to be public.
