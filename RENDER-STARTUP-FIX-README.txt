AIDE Africa Render startup fix

This small patch avoids relying on the nested server/server.js path that Render reported missing.

Upload/replace these files in the ROOT of your GitHub repository:
- server.js (new root-level server file)
- package.json (updated start command)

Keep your existing public/ folder at the repository root. Do not upload .env or payment secrets.

Render settings:
- Root Directory: blank (unless your entire app is intentionally inside a subfolder)
- Build Command: npm install
- Start Command: npm start

Commit these changes, then redeploy. Confirm the repository root contains server.js, package.json, and public/.
