# Restoring Your Code to a Previous State

> This document was added in response to Issue #12 ("restore my code to 2 days ago").
>
> **Important:** Rolling code back to an earlier point in time is a Git history
> operation that must be performed in your local clone (or via your Git host).
> An automated pull request cannot safely choose *which* commit corresponds to
> "2 days ago" for you, nor should it perform a destructive history rewrite on
> your behalf. The good news: the previous state of your code is already saved
> in Git history, so nothing is lost — follow the steps below to bring it back.

---

## Step 1 — Find the commit from ~2 days ago

List commits within a date window:

```bash
git log --since="3 days ago" --until="1 day ago" --oneline
```

Or browse all commits with their dates and pick the one you want:

```bash
git log --pretty=format:"%h  %ad  %an  %s" --date=local
```

Note the short commit hash (e.g. `a1b2c3d`) of the state you want to return to.
We'll refer to it as `<commit-hash>` below.

---

## Step 2 — Preview what changed (non-destructive)

Before restoring, see exactly what would change:

```bash
# Show the diff between the old commit and the current state
git diff <commit-hash> HEAD

# Show which files differ
git diff --stat <commit-hash> HEAD
```

---

## Step 3 — Restore (pick ONE option)

### Option A — Safe revert (RECOMMENDED)

Keeps full history and creates new commits that undo everything after
`<commit-hash>`. This is the safest option and is easy to undo.

```bash
git revert --no-commit <commit-hash>..HEAD
git commit -m "Restore code to state of <commit-hash>"
git push
```

### Option B — Restore the working tree to a snapshot, then commit

Brings your files back to exactly how they looked at `<commit-hash>`, while
still preserving the existing history.

```bash
git restore --source=<commit-hash> .
git status            # review the staged/unstaged changes
git commit -am "Restore code to <commit-hash>"
git push
```

### Option C — Hard reset (DESTRUCTIVE — use with caution)

This rewrites history and discards commits made after `<commit-hash>`.
Only do this if you are certain and have a backup branch.

```bash
# Create a safety backup branch first!
git branch backup-before-restore

git reset --hard <commit-hash>
git push --force-with-lease
```

---

## Step 4 — Restore a single file (optional)

If you only want to roll back one file rather than the whole project:

```bash
git checkout <commit-hash> -- path/to/file.py
git commit -m "Restore path/to/file.py to <commit-hash>"
```

---

## Recovering if something goes wrong

Git keeps a reflog of where `HEAD` has been. You can almost always get back:

```bash
git reflog            # find the previous HEAD position
git reset --hard HEAD@{1}
```

---

## Summary

| Goal                                   | Recommended command                                  |
|----------------------------------------|------------------------------------------------------|
| See history with dates                 | `git log --pretty=format:"%h %ad %s" --date=local`   |
| Preview changes                        | `git diff <commit-hash> HEAD`                        |
| Safely roll back (keep history)        | `git revert --no-commit <commit-hash>..HEAD`         |
| Snapshot working tree to old state     | `git restore --source=<commit-hash> .`               |
| Hard rollback (destructive)            | `git reset --hard <commit-hash>`                     |
| Restore one file                       | `git checkout <commit-hash> -- path/to/file`         |
| Undo a mistake                         | `git reflog` + `git reset --hard HEAD@{1}`           |
