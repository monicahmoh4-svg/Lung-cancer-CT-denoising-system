#!/usr/bin/env bash
# =============================================================================
# LungDenoise AI — GitHub Setup Script
# Run once to initialise git repo and push to GitHub
# =============================================================================
set -e

REPO_NAME="lungdenoise-ai"
GITHUB_USER="${GITHUB_USER:-}"          # set via env or prompt below

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'
YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'

header() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
err()    { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║     LungDenoise AI — GitHub Deployment       ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ───────────────────────────────────────────────────────
header "Checking prerequisites"
command -v git  >/dev/null 2>&1 || err "git not installed"
command -v gh   >/dev/null 2>&1 || warn "GitHub CLI (gh) not installed — manual push only"
ok "git found: $(git --version)"

# ── GitHub username ───────────────────────────────────────────────────────────
if [ -z "$GITHUB_USER" ]; then
    read -rp "Enter your GitHub username: " GITHUB_USER
fi
[ -z "$GITHUB_USER" ] && err "GitHub username is required"

REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

# ── Initialise git ─────────────────────────────────────────────────────────────
header "Initialising git repository"
if [ ! -d ".git" ]; then
    git init
    ok "git init complete"
else
    ok "git repo already initialised"
fi

git config user.name  "${GITHUB_USER}"
git config user.email "${GITHUB_USER}@users.noreply.github.com"

# ── Create .gitignore safe directories ───────────────────────────────────────
mkdir -p backend/uploads backend/outputs backend/app/models
touch backend/uploads/.gitkeep backend/outputs/.gitkeep backend/app/models/.gitkeep

# ── Stage all files ────────────────────────────────────────────────────────────
header "Staging files"
git add -A
git status --short | head -30
ok "Files staged"

# ── Initial commit ─────────────────────────────────────────────────────────────
header "Creating initial commit"
git commit -m "🫁 LungDenoise AI — Initial commit

Full-stack CT image Gaussian noise detection & removal system.

Pipeline: AGF + Haar Wavelet DWT + DnCNN + IDWT

Key metrics (IQ-OTH/NCCD, 1294 CT scans):
  - PSNR:  34.76 dB (best) · 28.28 dB (avg)
  - SSIM:  1.0000 (Images R1–R3)
  - MSE:   26.46 (Image R1, lowest)
  - Time:  16.7 ms/image

Stack:
  - Frontend: React 18 + Vite + Tailwind → Vercel
  - Backend:  FastAPI + Python 3.11 → Render
  - DB:       SQLite (async) / PostgreSQL-ready

Reference: Abuya et al., Appl. Sci. 2023, 13, 12069" || ok "Nothing new to commit"

git branch -M main

# ── Create GitHub repo (requires gh CLI) ─────────────────────────────────────
header "Creating GitHub repository"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh repo create "${REPO_NAME}" \
        --public \
        --description "🫁 Hospital-grade CT Gaussian noise removal — AGF + Haar Wavelet + DnCNN" \
        --remote origin \
        --source . \
        --push \
        && ok "Repository created and pushed: ${REPO_URL}" \
        || warn "Repo may already exist — trying git push"
    git push -u origin main --force
else
    warn "GitHub CLI not authenticated. Manual steps:"
    echo ""
    echo "  1. Create repo at: https://github.com/new"
    echo "     Name: ${REPO_NAME}  |  Public  |  No README"
    echo ""
    echo "  2. Then run:"
    echo "     git remote add origin ${REPO_URL}"
    echo "     git push -u origin main"
fi

# ── Print deployment instructions ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Deployment Instructions${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}FRONTEND → Vercel:${NC}"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import: github.com/${GITHUB_USER}/${REPO_NAME}"
echo "  3. Root Directory: frontend"
echo "  4. Add env var:"
echo "     VITE_API_URL = https://lungdenoise-api.onrender.com"
echo "  5. Click Deploy ✓"
echo ""
echo -e "${BOLD}BACKEND → Render:${NC}"
echo "  1. Go to https://render.com/deploy"
echo "  2. New Web Service → github.com/${GITHUB_USER}/${REPO_NAME}"
echo "  3. Root Directory: backend"
echo "  4. Build: pip install -r requirements.txt"
echo "  5. Start: uvicorn app.main:app --host 0.0.0.0 --port \$PORT"
echo "  6. Add env vars from backend/.env.example"
echo "  7. Deploy ✓"
echo ""
echo -e "${BOLD}LIVE URLS:${NC}"
echo "  Frontend: https://${REPO_NAME}.vercel.app"
echo "  Backend:  https://lungdenoise-api.onrender.com"
echo "  API Docs: https://lungdenoise-api.onrender.com/api/docs"
echo ""
ok "Setup complete! 🫁"
