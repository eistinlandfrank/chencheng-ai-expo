# Server-only configuration

Create these files outside the Git checkout, set them to mode `0600`, and point
`SECRETS_DIR` at their containing directory:

- `platform.env`: existing platform authentication, SQLite, WebAuthn, AI, and public URL values.
- `visitor.env`: server-only `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and public app metadata. The visitor app has no third-party platform SDK or account dependency.
- `webhook.env`: `GITHUB_REPOSITORY=eistinlandfrank/chencheng-ai-expo`, a random
  `GITHUB_WEBHOOK_SECRET` of at least 32 characters, and optionally `WEBHOOK_PATH`.

Never copy these files into the repository or Docker image. The webhook secret
must be identical to the secret configured on the GitHub repository webhook.
