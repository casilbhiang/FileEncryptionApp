# Remove node_modules from Git

## Problem
`node_modules` folder was committed to git, causing merge conflicts and bloating the repository size.

## Solution

Follow these steps to remove `node_modules` from git while keeping it locally:

### Step 1: Remove node_modules from Git (Keep Local Copy)

```bash
# Navigate to your project root
cd c:\Users\Jeslyn\Desktop\GitHub\FileEncryptionApp

# Remove node_modules from git tracking (but keep the folder locally)
git rm -r --cached frontend/node_modules
git rm -r --cached node_modules

# If there's a backend node_modules too:
git rm -r --cached backend/node_modules
```

**Important**: The `--cached` flag means it will remove from git but **keep the folder on your computer**.

### Step 2: Commit the Removal

```bash
git add .gitignore
git commit -m "Remove node_modules from git tracking"
```

### Step 3: Push to Remote

```bash
git push origin jesslyn
```

### Step 4: Tell Your Team to Clean Up

After you push, your team members should run:

```bash
# Pull the latest changes
git pull

# Remove their local node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules

# Reinstall dependencies
cd frontend
npm install

cd ../backend
pip install -r requirements.txt
```

---

## For Future: Proper Workflow

After this fix, the proper workflow is:

1. **Never commit `node_modules`** - it's already in `.gitignore`
2. **Only commit `package.json` and `package-lock.json`** (or `yarn.lock`)
3. **Team members run `npm install`** after pulling to get dependencies

---

## Why This Happened

`node_modules` was likely committed before `.gitignore` was properly set up. Once a file is tracked by git, adding it to `.gitignore` doesn't remove it from git history.

---

## Verify It Worked

After step 2, check that node_modules is gone from git:

```bash
git status
```

You should see:
```
deleted: frontend/node_modules/...
deleted: node_modules/...
```

After pushing and your team pulls, they should no longer see node_modules in merge conflicts!

---

## Alternative: If You Want to Clean History (Advanced)

If you want to remove `node_modules` from the entire git history (to reduce repo size):

**WARNING: This rewrites git history and requires force push!**

```bash
# Use git filter-branch (dangerous!)
git filter-branch --tree-filter 'rm -rf frontend/node_modules node_modules' HEAD

# Or use BFG Repo-Cleaner (safer, recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
```

**Only do this if:**
- You coordinate with your entire team
- Everyone has backed up their work
- You're comfortable with force pushing

Otherwise, stick with Step 1-3 above!
