# ACE editor embed (offline demo)

A minimal, self-contained [ACE](https://github.com/ajaxorg/ace) code-editor embed.
ACE is a **code editor widget**, not an AI agent — see
[../../docs/integrations/ACE.md](../../docs/integrations/ACE.md).

```bash
npm install                 # pulls prebuilt ace-builds + creates ./ace-builds symlink
npm run serve               # http://localhost:8080
```

`index.html` is the whole demo: it loads `./ace-builds/src-min-noconflict/ace.js`,
mounts an editor, applies the Monokai theme, and lets you switch syntax mode
(javascript / python / json / markdown). No network needed once installed.
