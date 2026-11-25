[![make.fun](https://make.fun/badge/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2.svg)](https://make.fun/bounty/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2?utm_source=github&utm_medium=readme&utm_campaign=u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2)
[![rank](https://make.fun/badge/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2/qw123gyj-dev/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2/rank.svg)](https://make.fun/bounty/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2)
[![reward](https://make.fun/badge/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2/qw123gyj-dev/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2/reward.svg)](https://make.fun/bounty/u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2?utm_source=github&utm_medium=readme&utm_campaign=u-puan-the-word-you-d-delete-from-the-dictionary-9e774bc2)

# The Word You'd Delete From the Dictionary

A deterministic entry picker for the make.fun bounty "The Word You'd Delete From the Dictionary". `main.ts` scores 16 hand-written candidate words against the judge's brief — in the brief's own order: a real word a reader recognises, a deletion that is funny at first sight, humour that comes from the word itself (its sound, its double meanings, the gap it would leave), a fresh pick the rest of the field would not think of first, and an exact single word, spelled correctly, with nothing added — then writes the winning word to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–77 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a pick that only names a subject without a twist is capped, predictable gags like "moist" are docked on funniness and freshness, the twist must land a beat after the word itself (the reader reads the word, then realises what is gone), and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning word:

> tomorrow

Nothing can ever be put off again: everything is due today, procrastination dies on the spot, and "tomorrow never comes" becomes literal. It is a real word every reader knows, the joke lands the moment the word is gone, the humour comes entirely from the gap the deletion leaves, and it is not the first word the field reaches for — unlike "moist", "irregardless", or "literally".

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/delete-word-out node main.ts
cat /tmp/delete-word-out/entry.txt
```
