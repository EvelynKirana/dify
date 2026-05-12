# Release Smoke Checklist

Before promoting an rc to stable (or merging the release commit on `main`),
the release author runs through the following against a local dify at the
target tag:

- [ ] `docker compose up` dify-api and dify-web at the target version
- [ ] `difyctl auth login` completes oauth and stores a token
- [ ] `difyctl get workspace` lists workspaces, current marked
- [ ] `difyctl get apps` returns apps for the current workspace
- [ ] `difyctl describe app <id>` returns info + parameters + input_schema
- [ ] `difyctl run app <id> --input "input=hi"` blocking returns echoed answer
- [ ] `difyctl run app <id> --input "input=hi" --stream` streams events
- [ ] `difyctl version` shows correct version, channel, and compat range
- [ ] Uninstall the previous version, install the new tarball via install-cli.sh, repeat the above
