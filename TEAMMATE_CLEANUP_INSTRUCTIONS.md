# Instructions for Team Members - Clean Up node_modules

After Jeslyn removes `node_modules` from git and pushes, follow these steps:

## Step 1: Pull the Latest Changes

```bash
git pull
```

## Step 2: Delete Your Local node_modules

### For Windows PowerShell Users:
```powershell
# Navigate to project root first
cd path\to\FileEncryptionApp

# Delete node_modules folders
Remove-Item -Recurse -Force frontend\node_modules
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend\node_modules
```

### For Git Bash / Mac / Linux Users:
```bash
# Navigate to project root first
cd path/to/FileEncryptionApp

# Delete node_modules folders
rm -rf frontend/node_modules
rm -rf node_modules
rm -rf backend/node_modules
```

## Step 3: Reinstall Dependencies

### Frontend:
```bash
cd frontend
npm install
```

### Backend (if using Node):
```bash
cd backend
pip install -r requirements.txt
```

## Step 4: Verify Everything Works

```bash
# Start backend
cd backend
python app.py

# Start frontend (in a new terminal)
cd frontend
npm run dev
```

---

## Troubleshooting

### "node_modules still shows in git status"
Make sure you pulled the latest changes first:
```bash
git pull
git status
```

### "Permission denied when deleting"
Close your IDE/editor and any running dev servers, then try again.

For Windows, you can also try:
```powershell
# Force delete even if files are in use
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue frontend\node_modules
```

### "npm install fails"
Delete `package-lock.json` and try again:
```bash
cd frontend
rm package-lock.json
npm install
```

---

## What Changed?

- `node_modules` is now ignored by git (was causing merge conflicts)
- You only need to run `npm install` once after pulling
- Future pulls won't include node_modules changes
- No more merge conflicts from dependencies!

---

## Important Notes

✅ **DO commit**: `package.json`, `package-lock.json`
❌ **DON'T commit**: `node_modules` folder

Git will now ignore `node_modules` automatically thanks to `.gitignore`.
