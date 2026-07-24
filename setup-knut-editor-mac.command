#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/local-app"
URL="http://127.0.0.1:4173"
LOG_FILE="${TMPDIR:-/tmp}/knut-thesis-studio.log"

export PATH="/Library/TeX/texbin:/opt/homebrew/bin:/usr/local/bin:$PATH"

step() {
  printf "\n\033[36m==> %s\033[0m\n" "$1"
}

fail() {
  printf "\n\033[31mSetup could not be completed: %s\033[0m\n" "$1"
  printf "Press Return to close..."
  read -r
  exit 1
}

if [ "$(uname -s)" != "Darwin" ]; then
  fail "This launcher is for macOS only."
fi

if [ ! -f "$APP_DIR/server.mjs" ]; then
  fail "The local-app/server.mjs file is missing. Download the complete repository again."
fi

if ! command -v brew >/dev/null 2>&1; then
  step "Installing Homebrew"
  command -v curl >/dev/null 2>&1 || fail "curl is unavailable, so Homebrew cannot be downloaded."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || fail "Homebrew installation failed."
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  step "Installing Node.js"
  brew install node || fail "Node.js installation failed."
else
  printf "[OK] Node.js is already installed.\n"
fi

if ! command -v xelatex >/dev/null 2>&1; then
  step "Installing BasicTeX"
  brew install --cask basictex || fail "BasicTeX installation failed."
  export PATH="/Library/TeX/texbin:$PATH"
else
  printf "[OK] XeLaTeX is already installed.\n"
fi

if ! command -v tlmgr >/dev/null 2>&1; then
  fail "TeX Live Manager was not found. Restart the Mac and run this launcher again."
fi

if ! command -v biber >/dev/null 2>&1 || ! kpsewhich kotex.sty >/dev/null 2>&1; then
  step "Installing LaTeX packages used by the KNUT template"
  sudo tlmgr update --self || fail "TeX Live Manager update failed."
  sudo tlmgr install \
    biber \
    collection-fontsrecommended \
    collection-langcjk \
    collection-latexextra \
    collection-latexrecommended || fail "Required LaTeX package installation failed."
else
  printf "[OK] Required LaTeX packages are already installed.\n"
fi

if curl -fsS "$URL/api/files" >/dev/null 2>&1; then
  step "KNUT Thesis Studio is already running"
  open "$URL"
  exit 0
fi

step "Starting KNUT Thesis Studio"
cd "$APP_DIR"
nohup node server.mjs >"$LOG_FILE" 2>&1 &

for _ in $(seq 1 40); do
  if curl -fsS "$URL/api/files" >/dev/null 2>&1; then
    open "$URL"
    printf "\n\033[32mKNUT Thesis Studio is ready.\033[0m\n"
    printf "Server log: %s\n" "$LOG_FILE"
    exit 0
  fi
  sleep 0.25
done

fail "The local editor did not start. Check $LOG_FILE for details."
