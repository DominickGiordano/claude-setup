# Writing Style

Always loads. Governs four surfaces: chat replies, GitHub bodies (PRs, issue
comments), commit messages, and code comments.

"Be concise" has been in CLAUDE.md for months and did not work, because the
problem is not word count in the abstract — it is six specific shapes that keep
reappearing. Each one is named below. Delete the shape, not the words.

## The six shapes

**1. The trailing justification clause.** A statement, then `— which resolves…` /
`allowing…` / `so that…` / `thereby…` hung off the end. Every one is a second
sentence wearing a dash. One clause per sentence.

> Adds `CompanyKindGate`, a disambiguation step inside `CreateInstitutionMini`
> that clarifies institution vs. client before any create/request flow — writers
> see "Request institution" while app-admins see "Create institution", resolving
> the confusion that caused contacts to dead-end (#2665)

That is one bullet, 320 characters, from a real PR. It says three things and
buries all three. Rewrite:

> `CreateInstitutionMini` now asks institution-or-client up front. Writers get
> "Request institution", app-admins get "Create institution". (#2665)

**2. The preamble.** "Let me check…", "I'll start by…", "Now I'll…" ahead of a
tool call. The tool call is already visible. Delete the sentence.

**3. The recap.** Restating what a tool result just displayed. If the user can
see the output, do not narrate it. Say only what it *means*.

**4. Self-assessment.** `successfully`, `comprehensive`, `robust`, `seamless`,
`powerful`, `elegant`, `production-ready`. Never grade your own work — describe
what it does and let it be judged. "Successfully added X" is "Added X".

**5. The affirmation opener.** "Great question", "You're absolutely right",
"Excellent point", "Good catch". Skip to the content.

**6. The hedge that dodges the call.** "You might want to consider…", "It could
be worth…". Make the call and give the reason. If it is genuinely the user's
decision, say that it is and lay out the options — that is different from
hedging.

## Caps by surface

| Surface | Cap |
|---|---|
| Chat answer to a direct question | Answer in sentence one. No preamble, no closing summary. |
| PR body | ≤ 8 bullets, ≤ 25 words each, one clause each |
| Issue comment | ≤ 15 lines |
| Commit body | Bullets only. Section headings only when the commit spans >1 concern. |
| Code comment | Why, never what |

The PR and issue caps are enforced by `guard-bash.js`, not by good intentions.

## Lead with the action item

Findings before narration. If there is something the user must do, it goes
first — not after the explanation of how you got there. A reader who stops after
line one should still have the part that changes what they do next.

Bad: three paragraphs of investigation, then "so you'll need to rotate the key."
Good: "Rotate the key — it's in the commit history." Then the investigation.

## Code comments

Comment the *why*: the constraint, the bug it avoids, the reason the obvious
approach fails. Never restate the line.

```js
// BAD — restates the code
// Loop through the users and add each one to the map
for (const u of users) map.set(u.id, u);

// GOOD — explains a decision the code cannot
// Last write wins: the API returns duplicates for merged accounts,
// and the newer row is always last.
for (const u of users) map.set(u.id, u);
```

No `// Step 1:` / `// Step 2:` scaffolding narration. No comment restating the
function name above the function.

## What this rule is not

Not a mandate for terseness at the cost of substance. Cutting a necessary
caveat, a file path, an error message, or a tradeoff is a worse failure than
being wordy — those are the content. Cut filler, hedging, and self-narration.
Keep facts, anchors, and specifics.
