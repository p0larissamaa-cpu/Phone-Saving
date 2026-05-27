# 📱 Phone Savings Discord Bot — Setup Guide

Follow these steps in order. Takes about 15 minutes total.

token-
MTUwOTAxMDMzMjYyNTAxMDc3OQ.GMNW9L.Z_yVjU67buJbxX--1U06LB9p2ptfVsihkjHcCM

app id-
1509010332625010779

user id-
1078426313238528011

supabase url-
lpngqqkqbhvcigzfpvgr

public key-
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbmdxcWtxYmh2Y2lnemZwdmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzM5MTAsImV4cCI6MjA5NTQwOTkxMH0.wvCA7BZ_wYjRNCxE4teLc1VRkUKJ31wx5GhyeMAaboY


supabase pass- C8lRVx2xJZfcOiAf




---

## Step 1 — Create a Discord Bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it "Phone Savings"
3. Go to **Bot** (left sidebar) → click **Add Bot**
4. Under **Token**, click **Reset Token** → copy and save it *(this is your `DISCORD_TOKEN`)*
5. Go to **OAuth2 → URL Generator**:
   - Scopes: ✅ `bot` + ✅ `applications.commands`
   - Bot Permissions: ✅ `Send Messages` + ✅ `Use Slash Commands` + ✅ `Embed Links` + ✅ `Attach Files`
6. Copy the generated URL → open it → invite the bot to your server

**Get your IDs:**
- **CLIENT_ID**: General Information page → copy "Application ID"
- **OWNER_ID**: Discord → Settings → Advanced → Enable Developer Mode.
  Right-click your own username → "Copy User ID"

---

## Step 2 — Set Up Supabase (free database)

1. Go to https://supabase.com → Sign up free
2. Click **New Project** → name it anything (e.g. "savings")
3. Wait for it to spin up (~1 min)
4. Go to **SQL Editor** → paste the contents of `supabase_setup.sql` → click **Run**
5. Get your keys:
   - **SUPABASE_URL**: Settings → API → Project URL
   - **SUPABASE_KEY**: Settings → API → `anon` `public` key

---

## Step 3 — Deploy to Railway (free hosting)

1. Go to https://railway.app → Sign up with GitHub
2. Push this folder to a new GitHub repo (drag-drop all files on github.com → new repo)
3. In Railway: **New Project → Deploy from GitHub repo** → pick your repo
4. Once deployed, go to your service → **Variables** tab
5. Add each variable:

```
DISCORD_TOKEN    = (from Step 1)
CLIENT_ID        = (from Step 1)
OWNER_ID         = (your Discord user ID)
SUPABASE_URL     = (from Step 2)
SUPABASE_KEY     = (from Step 2)
```

6. Railway restarts automatically — your bot is live!

---

## Step 4 — Use the Bot!

| Command | Who | What it does |
|---|---|---|
| `/progress` | Everyone | Posts the savings card image |
| `/add 500` | Only you | Adds ₹500, posts updated card |
| `/set saved 2000` | Only you | Sets saved amount to ₹2000 |
| `/set target 15000` | Only you | Sets the phone price goal |
| `/reset` | Only you | Clears everything |

---

## What the card looks like

The bot generates and posts a **real image** (not just text) directly in Discord showing:
- 🟩 Dark green themed card matching your HTML page
- 📊 Animated-style progress bar with gradient fill
- 💰 Saved / Left / Goal stat boxes
- 🕒 Last 4 deposits with timestamps
- 🎉 Special celebration state when goal is reached

---

## Troubleshooting

- **Bot doesn't respond**: Check Railway logs for errors
- **Commands don't show up**: Wait up to 1 hour for global slash command registration
- **"Only the owner can use this"**: Make sure `OWNER_ID` is your Discord user ID (not username)
- **Image not showing**: Make sure the bot has "Attach Files" permission in the channel
