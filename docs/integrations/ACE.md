# ACE (`ajaxorg/ace`) — install & embed

> **Read this first.** ACE is the **Ajax.org Cloud9 Editor** — a browser-based
> **source-code editor widget**. It is *not* an AI agent, and it does **not**
> control your computer, mouse, keyboard, or screen. It draws an editable,
> syntax-highlighted text area inside a web page and nothing more.
>
> If you want AI agents that control your computer to "get more tasks done",
> see [agenticSeek.md](./agenticSeek.md) and [AgentGPT.md](./AgentGPT.md) in this
> folder (autonomous agents that browse the web and run commands), or a
> screen/mouse-control project such as OpenInterpreter, Self-Operating-Computer,
> or Anthropic Computer Use. ACE pairs *with* those as the code-editing surface.

Where ACE is genuinely useful for G0DM0D3: an editable code block in a chat
reply, a multi-line prompt editor, or a JSON/settings editor — anywhere you'd
otherwise use a bare `<textarea>`.

## Two ways to get ACE

The `ajaxorg/ace` repo is the **source**. For embedding you almost always want
the **prebuilt distribution** instead:

```bash
# Recommended: prebuilt, ready to <script src>
npm install ace-builds        # ships src-min-noconflict/ace.js + themes + modes

# Or the source repo (build tooling required)
git clone https://github.com/ajaxorg/ace.git
cd ace && npm install
node ./Makefile.dryice.js normal   # needs the architect-build dep from GitHub
```

Both are version 1.44.0 here. The build step needs `architect-build` (fetched
from a GitHub tarball); if your network blocks that, use `ace-builds` — it is
byte-for-byte the distribution you would have produced.

## Minimal working embed

A complete, offline demo lives in [`examples/ace-editor/`](../../examples/ace-editor/).
To run it:

```bash
cd examples/ace-editor
npm install ace-builds            # or symlink an existing install
ln -s node_modules/ace-builds ace-builds   # so ./ace-builds/... resolves
python3 -m http.server 8080
# open http://localhost:8080
```

The core is only a few lines:

```html
<div id="editor">function greet(name){ return "hi " + name; }</div>
<script src="./ace-builds/src-min-noconflict/ace.js"></script>
<script>
  const editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.session.setMode("ace/mode/javascript");
</script>
```

## Using ACE inside the Next.js app (React)

```bash
npm install react-ace ace-builds
```

```tsx
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";

export function JsonEditor({ value, onChange }: {
  value: string; onChange: (v: string) => void;
}) {
  return (
    <AceEditor
      mode="json"
      theme="monokai"
      value={value}
      onChange={onChange}
      width="100%"
      setOptions={{ useWorker: false }}
    />
  );
}
```

`useWorker: false` avoids the separate web-worker asset for inline editors —
handy for a chat message or a settings panel.
