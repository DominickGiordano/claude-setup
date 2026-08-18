# Code Style

Always loads. Governs the code itself. `writing-style.md` governs the prose
around it — chat, PRs, commits, comments.

Write the version a competent engineer writes when nobody is watching. The
failure mode this exists to correct: code that *looks* professional — docstrings
on every function, custom exception types, defensive fallbacks, a `utils/`
module, a comment narrating each line — and is 4x longer than it needed to be.
That extra mass is not robustness. It is surface area, and someone has to read it.

## The rules

**Say it once.** If the code says `total = sum(prices)`, do not add
`# calculate the total`. Comments explain *why*: a surprising business rule, a
workaround for an upstream bug, a decision that looks wrong but isn't. Never *what*.

**Let it crash.** No `try/except` without a specific recovery action. A real
traceback beats a caught error that logs and returns `None`, then explodes 40
lines later with no context. No bare `except`, no `except Exception: pass`, no
fallback path invented for a failure nobody named.

**Don't abstract until it hurts.** One implementation needs no base class,
protocol, registry, or factory. Two similar functions are fine as two functions.
Abstract on the third, and only if the shape is genuinely the same. A dataclass
holding two arguments is worse than two arguments.

**Prefer functions to classes.** Reach for a class when there's real state. A
class whose methods never touch `self` is a module with extra steps.

**No speculative code.** No parameters nobody passes, no config flags nobody
flips, no `**kwargs` passthrough "for flexibility", no backward-compat shim for
code that shipped ten minutes ago.

**Straight line beats nesting.** Guard clauses and early returns. Past three
levels of indentation, restructure.

**Names are short and true.** `rows`, not `processed_data_records`. `path`, not
`input_file_path_str`. A name should be as long as the scope it lives in.

**Stdlib first.** No dependency for what twenty lines of stdlib does. No
framework for a script.

**Delete instead of deprecating.** Version control remembers. No commented-out
code, no `# OLD:` blocks, no `_v2` beside `_v1`.

**Quiet output.** No emoji, no `print("=" * 60)` banners, no
`"🚀 Starting pipeline..."`. Print results, not narration.

**Docstrings when they earn it.** One line on a public function with a
non-obvious contract. None on `def add(a, b)`.

**Type hints on the seams.** Signatures yes, every local no. `dict` beats
`Dict[str, Any]`.

## Before you finish

Reread the change as a diff and ask, line by line: what breaks if this line is
gone? Delete every line that answers "nothing." Then check the shape:

- Comment restating the code → delete
- `try/except` with no recovery → delete
- Class with one method → function
- Function called from one place, used once → inline it
- Config object with fewer than three fields → arguments
- Docstring longer than the function → one line or none
- Log line narrating control flow → delete

Then report what you built in one or two sentences. No summary section, no
"Key Features" list. The code is the deliverable.

## What this is not

Short because nothing unnecessary is there — not because necessary things were
removed. Keep real edge cases, error handling with a genuine recovery path
(retry a flaky call, skip a bad row and report the count), tests, the comment
explaining the weird thing, and correctness. Terse and wrong is still wrong.

Don't golf either. A clever one-liner that takes a minute to decode fails the
same standard as the 60-line version — both make the reader work. Plain and
boring beats both.

Worked examples of each failure mode live in the `caveman-code` skill; load it
when a task feels like it "needs" a class hierarchy, a config object, or a
helper module.
