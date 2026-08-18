---
name: caveman-code
description: >-
  Worked examples of the code-style rules — the wrapper tax, the class that wanted to be a
  function, defensive nesting, comments that pull weight. Shows what to delete when code is
  4x longer than the version a human writes.
when_to_use: >-
  When a task feels like it needs a class hierarchy, a config object, a try/except, or a
  helper module. When reviewing code that reads as over-engineered. Triggers: too many
  comments, over-engineered, simplify this, refactor, defensive code, wrapper, boilerplate.
---

# Caveman Code

Code go from top to bottom. Code do thing. Code stop.

The rules are in `~/.claude/rules/code-style.md` and always in context. This
skill is the examples — each one a real shape that keeps reappearing.

## Example 1 — the wrapper tax

Verbose:

```python
def load_config_from_file(config_file_path: str) -> Optional[Dict[str, Any]]:
    """
    Load configuration from a JSON file.

    Args:
        config_file_path: The path to the configuration file.

    Returns:
        A dictionary containing the configuration, or None if loading failed.
    """
    try:
        # Open the config file for reading
        with open(config_file_path, "r") as f:
            # Parse the JSON content
            config_data = json.load(f)
        logger.info(f"Successfully loaded config from {config_file_path}")
        return config_data
    except FileNotFoundError:
        logger.error(f"Config file not found at {config_file_path}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse config: {e}")
        return None
```

Caveman:

```python
config = json.loads(Path(path).read_text())
```

The function was never needed. If the file is missing, the traceback says so
better than the log line did — and the original returns `None`, so every caller
now needs a check the crash would have made unnecessary.

## Example 2 — the class that wanted to be a function

Verbose:

```python
class DataProcessor:
    def __init__(self, config: ProcessorConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)

    def process(self, df: pd.DataFrame) -> pd.DataFrame:
        self.logger.info("Starting processing")
        df = self._clean(df)
        df = self._transform(df)
        self.logger.info("Processing complete")
        return df

    def _clean(self, df): ...
    def _transform(self, df): ...
```

Caveman:

```python
def process(df, min_amount):
    df = df.dropna(subset=["vendor", "amount"])
    return df[df.amount >= min_amount]
```

## Example 3 — defensive noise

Verbose:

```python
if response is not None:
    if hasattr(response, "data"):
        if response.data is not None and len(response.data) > 0:
            for item in response.data:
                if item is not None:
                    results.append(item)
```

Caveman:

```python
results = response.data
```

If `response.data` can genuinely be missing, handle that one case explicitly.
Don't defend against six hypotheticals.

## Example 4 — comments that pull weight

Bad: `# increment the counter`

Good: `# vendor IDs repeat across regions, so key on (id, region)`

### Length is the wrong axis

The instinct when told "fewer comments" is to shorten. That deletes the wrong
ones. Compare, from a real workflow-validation change:

```python
# BAD — one line, and it earns nothing. The reader can see the call.
# (b) cross-step path accumulation
by_id = {s.get("id"): s for s in steps}

# GOOD — five lines, all of them unrecoverable from the code.
# Memoized on (step, capabilities-so-far) rather than per-path. Enumerating
# simple paths was exponential in the diamond count — 13.9s at 61 steps, hours
# at ~90, on the event loop (#1459). Reaching a step with an accumulator already
# explored from cannot reach a new trifecta, since capabilities only grow.
# The memo is also what stops a cycle now, in place of the old per-path `seen`.
by_id = {s.get("id"): s for s in steps}
```

The good version is 5x longer and is the correct call. It carries a measurement,
an issue ref, and the argument for why the memo is safe — three things no reader
reconstructs from `by_id = {...}`. Someone shortening this to
`# memoize by (step, caps)` has thrown away the entire content and kept the part
the code already said.

So the question is never "is this comment long?" It is "what does a reader lose
if I delete this line?" If the answer is nothing, delete it at any length. If the
answer is an hour of re-derivation, keep it at any length.

`guard-comments.js` enforces only the mechanical half of this — a one-line
comment whose words all appear in the line beneath it. Everything above is
judgment the hook cannot make, which is why it exempts multi-line comments,
issue refs, and anything containing a *because*.

## Example 5 — the JS shapes

```js
// BAD — restates the code
// Loop through the users and add each one to the map
for (const u of users) map.set(u.id, u);

// GOOD — explains a decision the code cannot
// Last write wins: the API returns duplicates for merged accounts,
// and the newer row is always last.
for (const u of users) map.set(u.id, u);
```

No `// Step 1:` / `// Step 2:` scaffolding. No comment restating the function
name above the function. No `interface FooProps` with fields nothing passes.

## Credit

Adapted from the `caveman-code` skill by a colleague at Areté; the rules were
lifted into `rules/code-style.md` so they load every session instead of only
when this skill fires.
