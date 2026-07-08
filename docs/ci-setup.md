# CI Setup

## Why did CI fail?

If you received a **"CI / main run failed"** email, it's usually **not a code bug**.

The workflow failed in ~4 seconds with **no runner assigned**. Common causes on new GitHub accounts:

1. **Spending limit is $0** — GitHub blocks Actions until you set a small limit
2. **Email not verified** — check your inbox for GitHub verification
3. **Actions awaiting approval** — visit the Actions tab and approve workflows

## Fix (5 minutes)

1. Verify email: https://github.com/settings/emails
2. Open billing: https://github.com/settings/billing
3. Under **Spending limits**, set GitHub Actions limit to **$1** (public repos are still free within quota)
4. Go to https://github.com/fahnovinz/inz-ecosystem/actions and click **Run workflow**

## Re-enable auto CI on push

After Actions works manually, edit `.github/workflows/ci.yml` and uncomment the `push` / `pull_request` triggers.

## Run tests locally (no Actions needed)

```bash
node --test test/*.test.js
node bin/inz.js help
```