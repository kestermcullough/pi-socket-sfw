# pi-socket-sfw

A [Pi](https://pi.dev) skill that installs [Socket Firewall Free](https://docs.socket.dev/docs/socket-firewall-free) (`sfw`) and aliases supported package managers through it.

## What it does

The `socket-sfw` skill can run an installer/verifier that:

- installs Socket Firewall Free with `npm i -g sfw`
- adds interactive shell aliases:
  - `alias npm="sfw npm"`
  - `alias yarn="sfw yarn"`
  - `alias pnpm="sfw pnpm"`
  - `alias pip="sfw pip"`
  - `alias uv="sfw uv"`
  - `alias cargo="sfw cargo"`
- verifies `sfw --help` and checks aliases in available interactive shells

## Install in Pi

From GitHub:

```bash
pi install git:github.com/kestermcullough/pi-socket-sfw
```

Or pinned to a tag once releases exist:

```bash
pi install git:github.com/kestermcullough/pi-socket-sfw@v0.1.0
```

After installing, restart Pi or run `/reload` in the Pi TUI.

## Use

Ask Pi to use the skill, or invoke it directly:

```text
/skill:socket-sfw install socket firewall and aliases
```

The skill instructs Pi to run:

```bash
skills/socket-sfw/scripts/install-sfw-aliases.sh
```

To verify without changing shell files:

```bash
skills/socket-sfw/scripts/install-sfw-aliases.sh --verify-only
```

## Notes

- Shell aliases only apply to interactive shells. Scripts and CI should call `sfw npm ...`, `sfw uv ...`, etc. explicitly.
- Socket Firewall Free is wrapper-mode only, requires network access, and does not support private/custom registries in the free version.
- Review the skill and script before running: skills can instruct agents to execute commands on your machine.
