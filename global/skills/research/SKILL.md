---
name: research
description: "Investigate a technology, library, API or approach and write docs/features/[topic]/RESEARCH.md before brainstorming."
disable-model-invocation: true
argument-hint: "[topic]"
context: fork
agent: researcher
---

Research the following topic and write it up. This runs in a forked `researcher`
context, so it will not see the main conversation — everything it needs is below.

Topic: $ARGUMENTS

1. Derive a kebab-case `[topic]` slug from the topic above.
2. Read the codebase for existing patterns, dependencies and prior art relating to it.
   Check `package.json` / `mix.exs` / `pyproject.toml` / `go.mod` for what is already
   installed, and note the installed version.
3. Fetch primary sources with `WebFetch` — the library's own docs, changelog and repo.
   Use `WebSearch` first only when you don't know the canonical URL. Do not answer
   version, pricing, API-shape or limits questions from memory.
4. Write `docs/features/[topic]/RESEARCH.md` in the format defined in your system
   prompt. Every factual claim about an external library gets a URL under Key Links.
5. Finish with the handoff block: the doc path, a one-sentence recommendation, and
   `Next: /brainstorm [topic]`.

If the topic is too vague to research without a clarifying answer, do not guess — write
the doc with status `Inconclusive`, state precisely what you would need, and say so in
the handoff.
