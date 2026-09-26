> [!IMPORTANT]
> This repository is the single source of truth for the Switch storefront.
> GitHub is authoritative, and CI is the NodeJS Quality Gate workflow
> (typecheck + lint + tests + production build + Cloudflare dry-run).
>
> Production deploys only to the Cloudflare Worker `dark-disk-4155`.
> Pull requests use Cloudflare version preview URLs for that same Worker.
> Vercel is not a deployment target, and the duplicate Cloudflare project
> `cosmic-switch-preview` must remain disconnected.
>
> Avoid rewriting published git history (force pushes, rebasing/amending/
> squashing already-pushed commits). Keep the default branch in a working
> state — every merge deploys.
