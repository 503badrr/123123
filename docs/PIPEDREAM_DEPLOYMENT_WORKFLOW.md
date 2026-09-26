# Pipedream production deployment workflow

This runbook configures the production workflow for Switch Store:

`GitHub push -> validate event -> claim deployment -> wait for Cloudflare Worker build -> optional cache purge -> update Supabase -> notify Slack`

Production identifiers:

- Repository: `503badrr/cosmic-switch-preview`
- Branch: `main`
- Cloudflare Worker: `dark-disk-4155`
- Domains: `swwiitch.com`, `www.swwiitch.com`
- Supabase project ref: `slnjgmwckknzwjcmlolj`
- Slack channel ID: `C0BNNH28BEW`

Never paste a secret into a GitHub file, workflow code, Slack message, or chat. Enter secrets directly in Pipedream as project-scoped Secret variables.

## Required Pipedream variables

| Variable | Value | Secret |
| --- | --- | --- |
| `ALLOWED_REPO` | `503badrr/cosmic-switch-preview` | No |
| `TARGET_BRANCH` | `main` | No |
| `DEPLOY_ENV` | `production` | No |
| `DEPLOY_PATH_PREFIXES_JSON` | `["src/","public/","package.json","package-lock.json","wrangler.jsonc"]` | No |
| `CF_ACCOUNT_ID` | Cloudflare account ID | No |
| `CF_WORKER_NAME` | `dark-disk-4155` | No |
| `CF_API_TOKEN` | Newly-created user-scoped token | Yes |
| `CF_PURGE_ENABLED` | `false` initially | No |
| `CF_ZONE_ID` | Zone ID for `swwiitch.com`; required only when purge is enabled | No |
| `CF_PURGE_HOSTS_JSON` | `["swwiitch.com","www.swwiitch.com"]` | No |
| `SUPABASE_URL` | `https://slnjgmwckknzwjcmlolj.supabase.co` | No |
| `SUPABASE_SECRET_KEY` | Supabase `sb_secret_...` key | Yes |
| `SLACK_CHANNEL_ID` | `C0BNNH28BEW` | No |

Connect GitHub and Slack as Pipedream Connected Accounts instead of storing their OAuth tokens as variables.

Create a new **user-scoped** Cloudflare API token and restrict its resources to the exact account and zone. Required permissions:

- Account -> Workers Builds Configuration -> Edit
- Account -> Workers Scripts -> Read
- Zone -> Cache Purge, only when `CF_PURGE_ENABLED=true`

The Workers Builds API does not accept account-scoped API tokens. The Worker tag used by that API is discovered at runtime from the Worker name, so it does not need to be copied into Pipedream.

## Workflow steps

### 1. GitHub trigger

Add the GitHub **New Webhook Event (Instant)** trigger, select the repository, and subscribe only to `push`. Connect through OAuth. Do not use the per-commit trigger because a multi-commit push would run this workflow more than once.

### 2. `normalize_github`

Add a Node.js code step with this exact name:

```js
export default defineComponent({
  async run({ steps, $ }) {
    const event = steps.trigger.event;
    const targetBranch = process.env.TARGET_BRANCH;
    const allowedRepo = process.env.ALLOWED_REPO;

    if (!targetBranch || !allowedRepo) {
      throw new Error("TARGET_BRANCH and ALLOWED_REPO are required");
    }
    if (event.repository?.full_name !== allowedRepo) {
      return $.flow.exit("Ignored: repository is not allowed");
    }
    if (event.ref !== `refs/heads/${targetBranch}`) {
      return $.flow.exit(`Ignored ref: ${event.ref}`);
    }
    if (event.deleted || !event.head_commit || !event.after) {
      return $.flow.exit("Ignored: deleted ref or missing head commit");
    }

    const message = event.head_commit.message ?? "";
    if (/\[(skip deploy|skip pipedream)\]/i.test(message)) {
      return $.flow.exit("Ignored by commit message");
    }

    const changedFiles = [
      ...new Set(
        (event.commits ?? []).flatMap((commit) => [
          ...(commit.added ?? []),
          ...(commit.modified ?? []),
          ...(commit.removed ?? []),
        ]),
      ),
    ];
    const prefixes = JSON.parse(
      process.env.DEPLOY_PATH_PREFIXES_JSON || "[]",
    );

    // If GitHub omitted commit file lists, proceed rather than creating a
    // false negative. Apply path filtering only when changed files exist.
    if (
      prefixes.length > 0 &&
      changedFiles.length > 0 &&
      !changedFiles.some((file) =>
        prefixes.some((prefix) => file === prefix || file.startsWith(prefix)),
      )
    ) {
      return $.flow.exit("Ignored: no deploy-related files changed");
    }

    const deliveryId =
      event.headers?.["x-github-delivery"] ??
      event["x-github-delivery"] ??
      null;

    return {
      commit_sha: event.after,
      short_sha: event.after.slice(0, 7),
      branch: targetBranch,
      repository: event.repository.full_name,
      repository_url: event.repository.html_url,
      commit_message: message,
      commit_url: event.head_commit.url,
      author_name:
        event.head_commit.author?.username ??
        event.head_commit.author?.name ??
        event.sender?.login ??
        event.pusher?.name ??
        "unknown",
      github_actor: event.sender?.login ?? null,
      github_delivery_id: deliveryId,
      changed_files: changedFiles,
    };
  },
});
```

### 3. `claim_deployment`

This step runs before Cloudflare or Slack side effects. The database constraints ensure that a replay of the same push exits cleanly.

```js
import { createClient } from "@supabase/supabase-js@2.112.3";

export default defineComponent({
  async run({ steps, $ }) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
    }

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const github = steps.normalize_github.$return_value;

    const { data, error } = await supabase
      .from("deployments")
      .insert({
        repository: github.repository,
        repository_url: github.repository_url,
        environment: process.env.DEPLOY_ENV || "production",
        branch: github.branch,
        commit_sha: github.commit_sha,
        commit_message: github.commit_message,
        commit_url: github.commit_url,
        author_name: github.author_name,
        github_actor: github.github_actor,
        github_delivery_id: github.github_delivery_id,
        status: "processing",
      })
      .select("id, started_at")
      .single();

    if (error?.code === "23505") {
      return $.flow.exit("Duplicate deployment already claimed");
    }
    if (error) {
      throw new Error(
        `Supabase claim failed [${error.code ?? "unknown"}]: ${error.message}`,
      );
    }
    return data;
  },
});
```

### 4. `wait_for_cloudflare_build`

Cloudflare's Git integration starts the Worker build independently from the same GitHub push. This step polls the Workers Builds API for the exact commit SHA. It uses Pipedream reruns, so the waiting time does not consume compute time.

```js
export default defineComponent({
  async run({ steps, $ }) {
    const accountId = process.env.CF_ACCOUNT_ID;
    const workerName = process.env.CF_WORKER_NAME;
    const token = process.env.CF_API_TOKEN;
    const github = steps.normalize_github.$return_value;
    const MAX_RERUNS = 40;
    const DELAY_MS = 15_000;
    const run = $.context.run;

    if (!accountId || !workerName || !token) {
      return {
        success: false,
        error: "CF_ACCOUNT_ID, CF_WORKER_NAME, and CF_API_TOKEN are required",
      };
    }

    const api = async (path) => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4${path}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        const details = (payload.errors ?? [])
          .map((item) => `${item.code}: ${item.message}`)
          .join("; ");
        throw new Error(
          `Cloudflare API failed (${response.status}): ${details || "unknown error"}`,
        );
      }
      return payload.result;
    };

    try {
      let workerTag = run.context?.workerTag ?? null;
      if (!workerTag) {
        const workers = await api(
          `/accounts/${encodeURIComponent(accountId)}/workers/scripts`,
        );
        workerTag = workers.find((worker) => worker.id === workerName)?.tag;
        if (!workerTag) {
          return {
            success: false,
            error: `Cloudflare Worker not found: ${workerName}`,
          };
        }
      }

      const builds = await api(
        `/accounts/${encodeURIComponent(accountId)}` +
          `/builds/workers/${encodeURIComponent(workerTag)}/builds` +
          `?page=1&per_page=50`,
      );
      const expectedSha = github.commit_sha.toLowerCase();
      const build = builds.find((item) => {
        const metadata = item.build_trigger_metadata ?? {};
        return (
          String(metadata.commit_hash ?? "").toLowerCase() === expectedSha &&
          metadata.branch === github.branch
        );
      });

      if (!build || build.status !== "stopped") {
        if (run.runs >= MAX_RERUNS + 1) {
          return {
            success: false,
            error: `Timed out waiting for Cloudflare build ${github.short_sha}`,
          };
        }
        $.flow.rerun(DELAY_MS, { workerTag }, MAX_RERUNS);
        return {
          success: null,
          waiting: true,
          worker_tag: workerTag,
          build_id: build?.build_uuid ?? null,
          build_status: build?.status ?? "not_found_yet",
        };
      }

      return {
        success: build.build_outcome === "success",
        worker_tag: workerTag,
        build_id: build.build_uuid ?? null,
        build_status: build.status,
        build_outcome: build.build_outcome ?? "unknown",
        created_on: build.created_on ?? null,
        stopped_on: build.stopped_on ?? null,
        error:
          build.build_outcome === "success"
            ? null
            : `Cloudflare build outcome: ${build.build_outcome ?? "unknown"}`,
      };
    } catch (error) {
      if (run.runs < MAX_RERUNS + 1) {
        $.flow.rerun(
          DELAY_MS,
          { workerTag: run.context?.workerTag ?? null },
          MAX_RERUNS,
        );
        return { success: null, waiting: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

`$.flow.rerun` works only after the workflow is deployed. A manual test of this step in the editor is expected to cancel instead of sleeping and rerunning.

### 5. `purge_cloudflare`

Keep `CF_PURGE_ENABLED=false` until stale content is observed and a cache rule is confirmed as the cause. Worker static-asset deployments generally do not need a whole-zone purge. When enabled, this step purges only the two production hostnames.

```js
export default defineComponent({
  async run({ steps }) {
    const build = steps.wait_for_cloudflare_build.$return_value;
    if (build.success !== true) {
      return { success: true, skipped: true, reason: "build_not_successful" };
    }
    if ((process.env.CF_PURGE_ENABLED || "false").toLowerCase() !== "true") {
      return { success: true, skipped: true, mode: "disabled" };
    }

    try {
      const token = process.env.CF_API_TOKEN;
      const zoneId = process.env.CF_ZONE_ID;
      const hosts = JSON.parse(
        process.env.CF_PURGE_HOSTS_JSON ||
          '["swwiitch.com","www.swwiitch.com"]',
      );
      if (!token || !zoneId || !Array.isArray(hosts) || hosts.length === 0) {
        throw new Error("Invalid Cloudflare purge configuration");
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hosts }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        const details = (payload.errors ?? [])
          .map((item) => `${item.code}: ${item.message}`)
          .join("; ");
        throw new Error(
          `Cloudflare purge failed (${response.status}): ${details || "unknown error"}`,
        );
      }
      return {
        success: true,
        skipped: false,
        mode: "hosts",
        hosts,
        purge_id: payload.result?.id ?? null,
      };
    } catch (error) {
      return {
        success: false,
        skipped: false,
        mode: "hosts",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

### 6. `finalize_deployment`

```js
import { createClient } from "@supabase/supabase-js@2.112.3";

export default defineComponent({
  async run({ steps }) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    const claim = steps.claim_deployment.$return_value;
    const build = steps.wait_for_cloudflare_build.$return_value;
    const purge = steps.purge_cloudflare.$return_value;
    const success = build.success === true && purge.success === true;
    const errorMessage = [build.error, purge.error].filter(Boolean).join("; ");

    const { data, error } = await supabase
      .from("deployments")
      .update({
        cloudflare_deployment_id: build.build_id ?? null,
        cloudflare_purge_id: purge.purge_id ?? null,
        purge_mode: purge.mode ?? null,
        status: success ? "success" : "failed",
        error_message: success ? null : errorMessage || "Unknown deployment failure",
        deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", claim.id)
      .select("id, repository, commit_sha, status, error_message, deployed_at")
      .single();

    if (error) {
      throw new Error(
        `Supabase finalize failed [${error.code ?? "unknown"}]: ${error.message}`,
      );
    }
    return data;
  },
});
```

### 7. `build_slack_message`

```js
export default defineComponent({
  async run({ steps }) {
    const github = steps.normalize_github.$return_value;
    const build = steps.wait_for_cloudflare_build.$return_value;
    const purge = steps.purge_cloudflare.$return_value;
    const deployment = steps.finalize_deployment.$return_value;

    const escapeSlack = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/@(channel|here|everyone)\b/gi, "@\u200B$1");
    const message = escapeSlack(github.commit_message)
      .replace(/\s+/g, " ")
      .slice(0, 500);
    const ok = deployment.status === "success";
    const commitLink = github.commit_url
      ? `<${github.commit_url}|${github.short_sha}>`
      : github.short_sha;

    const lines = [
      ok ? "✅ *تم نشر Switch Store بنجاح*" : "❌ *فشل نشر Switch Store*",
      `*المستودع:* <${github.repository_url}|${escapeSlack(github.repository)}>`,
      `*الفرع:* ${escapeSlack(github.branch)}`,
      `*Commit:* ${commitLink}`,
      `*المؤلف:* ${escapeSlack(github.author_name)}`,
      `*الرسالة:* ${message}`,
      `*Cloudflare build:* ${escapeSlack(build.build_outcome ?? build.build_status)}`,
      purge.skipped
        ? `*Cache purge:* skipped (${escapeSlack(purge.mode ?? purge.reason)})`
        : `*Cache purge:* ${purge.success ? "success" : "failed"}`,
    ];
    if (!ok) lines.push(`*الخطأ:* ${escapeSlack(deployment.error_message)}`);
    return { text: lines.join("\n") };
  },
});
```

### 8. Slack action

Add Slack **Send Message to Channel**, connect through OAuth, select the private channel with ID `C0BNNH28BEW`, and set its text to:

```text
{{steps.build_slack_message.$return_value.text}}
```

The Pipedream Slack bot must be invited to the private channel.

### 9. `fail_if_needed`

This final step makes failed deployments visible as failed Pipedream executions, after the audit row and Slack notification have been written.

```js
export default defineComponent({
  async run({ steps }) {
    const deployment = steps.finalize_deployment.$return_value;
    if (deployment.status !== "success") {
      throw new Error(deployment.error_message || "Deployment failed");
    }
    return { success: true, deployment_id: deployment.id };
  },
});
```

## Safe rollout checklist

1. Revoke any Cloudflare token exposed outside the password manager or Pipedream secret store.
2. Add a newly-created token directly to Pipedream; never send it through chat.
3. Add the Supabase secret key directly to Pipedream.
4. Keep cache purge disabled for the first end-to-end test.
5. Connect GitHub and Slack with OAuth and invite the Slack bot to the private channel.
6. Deploy the Pipedream workflow.
7. Push one harmless commit to `main` and verify exactly one deployment row and one Slack message.
8. Confirm that a replay exits as a duplicate and produces no second purge or Slack message.
9. Enable hostname purge only if a verified cache rule leaves stale content after a successful Worker deployment.

