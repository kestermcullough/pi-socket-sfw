#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SHELL_BEGIN="# >>> socket-sfw aliases >>>"
SHELL_END="# <<< socket-sfw aliases <<<"
DO_INSTALL=1

usage() {
  cat <<'EOF'
Usage: install-sfw-aliases.sh [--verify-only]

Installs Socket Firewall Free with `npm i -g sfw`, writes managed shell
aliases for npm/yarn/pnpm/pip/uv/cargo, and verifies sfw plus aliases.

Options:
  --verify-only   Do not install or edit shell startup files; only verify.
  -h, --help      Show this help.
EOF
}

log() { printf '[socket-sfw] %s\n' "$*"; }
warn() { printf '[socket-sfw] warning: %s\n' "$*" >&2; }
die() { printf '[socket-sfw] error: %s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --verify-only)
      DO_INSTALL=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
  shift
done

shell_alias_block() {
  cat <<'EOF'
# >>> socket-sfw aliases >>>
# Route supported package managers through Socket Firewall Free.
if command -v sfw >/dev/null 2>&1; then
  alias npm="sfw npm"
  alias yarn="sfw yarn"
  alias pnpm="sfw pnpm"
  alias pip="sfw pip"
  alias uv="sfw uv"
  alias cargo="sfw cargo"
fi
# <<< socket-sfw aliases <<<
EOF
}

fish_alias_block() {
  cat <<'EOF'
# >>> socket-sfw aliases >>>
# Route supported package managers through Socket Firewall Free.
if type -q sfw
    alias npm "sfw npm"
    alias yarn "sfw yarn"
    alias pnpm "sfw pnpm"
    alias pip "sfw pip"
    alias uv "sfw uv"
    alias cargo "sfw cargo"
end
# <<< socket-sfw aliases <<<
EOF
}

strip_managed_block() {
  awk -v begin="$SHELL_BEGIN" -v end="$SHELL_END" '
    $0 == begin { skip = 1; next }
    $0 == end { skip = 0; next }
    skip != 1 { print }
  ' "$1" | awk '
    { lines[NR] = $0 }
    END {
      n = NR
      while (n > 0 && lines[n] ~ /^[[:space:]]*$/) n--
      for (i = 1; i <= n; i++) print lines[i]
    }
  '
}

write_managed_block() {
  local file="$1"
  local block="$2"
  local dir tmp
  dir="$(dirname "$file")"
  mkdir -p "$dir"
  [ -f "$file" ] || : > "$file"
  tmp="$(mktemp)"
  strip_managed_block "$file" > "$tmp"
  {
    if [ -s "$tmp" ]; then
      cat "$tmp"
      printf '\n\n'
    fi
    printf '%s\n' "$block"
  } > "$file"
  rm -f "$tmp"
  log "updated $file"
}

add_unique() {
  local item="$1"
  local existing
  for existing in "${TARGET_FILES[@]:-}"; do
    [ "$existing" = "$item" ] && return 0
  done
  TARGET_FILES+=("$item")
}

install_sfw() {
  if command -v sfw >/dev/null 2>&1; then
    log "sfw is already installed; retaining current version"
    return 0
  fi
  local npm_bin
  npm_bin="$(command -v npm || true)"
  [ -n "$npm_bin" ] || die "npm was not found; install Node/npm first or install sfw manually"
  log "installing Socket Firewall Free with: $npm_bin i -g sfw"
  "$npm_bin" i -g sfw
}

resolve_sfw() {
  local sfw_bin npm_bin npm_prefix
  sfw_bin="$(command -v sfw || true)"
  if [ -n "$sfw_bin" ]; then
    printf '%s\n' "$sfw_bin"
    return 0
  fi

  npm_bin="$(command -v npm || true)"
  if [ -n "$npm_bin" ]; then
    npm_prefix="$($npm_bin prefix -g 2>/dev/null || true)"
    if [ -n "$npm_prefix" ] && [ -x "$npm_prefix/bin/sfw" ]; then
      export PATH="$npm_prefix/bin:$PATH"
      printf '%s\n' "$npm_prefix/bin/sfw"
      return 0
    fi
  fi

  return 1
}

verify_sfw() {
  local sfw_bin help_output npm_bin
  sfw_bin="$(resolve_sfw)" || die "sfw was not found on PATH after installation"
  log "sfw binary: $sfw_bin"

  help_output="$($sfw_bin --help 2>&1 || true)"
  printf '%s\n' "$help_output" | sed -n '1,8p'
  case "$help_output" in
    *"Socket Firewall Free"*)
      log "sfw --help verification passed"
      ;;
    *)
      die "sfw --help did not contain the expected 'Socket Firewall Free' text"
      ;;
  esac

  npm_bin="$(command -v npm || true)"
  if [ -n "$npm_bin" ]; then
    "$sfw_bin" npm --version >/dev/null
    log "wrapper smoke test passed: sfw npm --version"
  fi
}

verify_aliases_for_shell() {
  local shell_name="$1"
  local shell_bin output
  shell_bin="$(command -v "$shell_name" || true)"
  [ -n "$shell_bin" ] || return 0

  output="$($shell_bin -ic '
failed=0
for name in npm yarn pnpm pip uv cargo; do
  line=$(alias "$name" 2>/dev/null || true)
  case "$line" in
    *"sfw $name"*) printf "ok: %s -> %s\n" "$name" "$line" ;;
    *) printf "missing-or-wrong: %s (%s)\n" "$name" "$line"; failed=1 ;;
  esac
done
exit "$failed"
' 2>&1)" || {
    warn "$shell_name alias verification failed"
    printf '%s\n' "$output" >&2
    return 1
  }

  log "$shell_name alias verification passed"
  printf '%s\n' "$output"
}

verify_fish_aliases() {
  local fish_bin output
  fish_bin="$(command -v fish || true)"
  [ -n "$fish_bin" ] || return 0

  output="$($fish_bin -ic '
set failed 0
for name in npm yarn pnpm pip uv cargo
    set line (alias $name 2>/dev/null)
    if string match -q "*sfw $name*" -- "$line"
        printf "ok: %s -> %s\n" $name "$line"
    else
        printf "missing-or-wrong: %s (%s)\n" $name "$line"
        set failed 1
    end
end
exit $failed
' 2>&1)" || {
    warn "fish alias verification failed"
    printf '%s\n' "$output" >&2
    return 1
  }

  log "fish alias verification passed"
  printf '%s\n' "$output"
}

if [ "$DO_INSTALL" -eq 1 ]; then
  install_sfw

  declare -a TARGET_FILES=()
  add_unique "$HOME/.zshrc"
  add_unique "$HOME/.bashrc"
  [ -f "$HOME/.profile" ] && add_unique "$HOME/.profile"
  [ -f "$HOME/.bash_profile" ] && add_unique "$HOME/.bash_profile"

  shell_block="$(shell_alias_block)"
  for target in "${TARGET_FILES[@]}"; do
    write_managed_block "$target" "$shell_block"
  done

  if command -v fish >/dev/null 2>&1 || [ -d "$HOME/.config/fish" ]; then
    write_managed_block "$HOME/.config/fish/conf.d/socket-sfw.fish" "$(fish_alias_block)"
  fi
else
  log "verify-only mode: skipping install and shell file edits"
fi

verify_sfw

alias_failures=0
verify_aliases_for_shell zsh || alias_failures=1
verify_aliases_for_shell bash || alias_failures=1
verify_fish_aliases || alias_failures=1

if [ "$alias_failures" -ne 0 ]; then
  die "one or more interactive shell alias checks failed"
fi

log "done. Open a new terminal, or source ~/.zshrc / ~/.bashrc, to use the aliases in the current session."
