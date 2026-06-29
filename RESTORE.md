# Restoring the Code (Reverting a Bad Merge)

This document explains how to safely roll the repository back to a previous,
known-good state — for example, after an incorrect change was merged.

> **Why this is a guide and not an automated commit:**
> Reverting history is a destructive or semi-destructive git operation that
> depends on knowing the *exact* commit you want to return to. An automated
> agent should not guess which commit to roll back to or force-push over
> shared history, because that risks permanently destroying legitimate work.
> The steps below let a human perform the restore deliberately and safely.

---

## Step 1 — Find the commit you want to return to

List recent commits with dates so you can identify the last good one
(e.g. "2 days ago"):

```bash
git fetch --all
git log --oneline --decorate --date=relative \
  --pretty=format:'%h %ad %an %s' --date=short -n 50
```

To narrow to a specific time window:

```bash
git log --since="3 days ago" --until="2 days ago" --oneline
```

Write down:

- `GOOD_SHA` – the last good commit (state you want to restore), and/or
- `BAD_SHA`  – the wrong commit/merge that AI introduced today.

---

## Step 2 — Choose a strategy

### Option A (RECOMMENDED): Revert — safe, non-destructive

This creates **new** commits that undo the bad changes while preserving full
history. Nobody else's clones break, and there is an audit trail.

Revert a single bad commit:

```bash
git checkout main
git pull origin main
git revert <BAD_SHA>
git push origin main
```

Revert a bad **merge** commit (note the `-m 1` to keep the mainline parent):

```bash
git revert -m 1 <BAD_MERGE_SHA>
git push origin main
```

Revert a range of commits (oldest..newest, exclusive of the first):

```bash
git revert --no-commit <GOOD_SHA>..HEAD
git commit -m "Revert changes back to known-good state (<GOOD_SHA>)"
git push origin main
```

### Option B (DESTRUCTIVE): Hard reset + force push — use with care

This rewrites history so `main` points exactly at the good commit. Anyone with
an existing clone must re-sync. Only do this if you understand the consequences
and have coordinated with collaborators.

```bash
git checkout main
git reset --hard <GOOD_SHA>
# --force-with-lease is safer than --force: it refuses to overwrite
# unexpected remote changes.
git push --force-with-lease origin main
```

---

## Step 3 — Verify

After restoring, confirm the project is back to the expected state:

```bash
# Backend
cd backend
uv sync                 # or: pip install -r requirements
python manage.py check
python manage.py test

# Frontend
cd ../frontend
npm install
npm run build
npm run lint
```

---

## Recovering if something goes wrong

Git keeps a log of where `HEAD` has been. If you reset/force-pushed by mistake,
you can usually get back:

```bash
git reflog                       # find the SHA you were at before
git reset --hard <previous_sha>  # restore your branch to that point
```

Remote branches that were force-pushed can often still be recovered from the
remote's reflog (GitHub Support) or from any collaborator's existing clone:

```bash
git fetch <collaborator-remote>
git reset --hard <collaborator-remote>/main
```

---

## Need help?

If you tell the maintainers (or the AI assistant) the **exact commit SHA** you
want to restore to, an explicit revert pull request can be prepared for review
instead of running these commands manually.
