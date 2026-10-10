# Testing

`tests/` is a standalone Vitest + React Testing Library suite (jsdom). It changes no app code,
`package.json` or lockfile.

| Tests | Statements | Branches | Functions | Lines |
|------:|-----------:|---------:|----------:|------:|
|    16 |      99.2% |    95.2% |      100% |  100% |

(3 of the 16 are known bugs.)

```bash
npm ci                 # the app (first time)
cd tests && npm ci     # the test tooling (first time)
npm test | npm run coverage | npm run bugs
```

PokeAPI is replaced by an in-test fake (`fakeApi` in `tests/app.test.js`) — no test touches the
network. The service is tested for the plain list (offset paging), search (fetch-all and filter),
type filtering, image fallbacks and every failure; the pages for pagination, type choice, the
debounced search and the details view.

## Known bugs

| Severity | Where | Bug |
|---|---|---|
| Low | `app/page.js` | With no results there are 0 pages: the pager says "Page 1 of 0" and Next stays enabled. |
| Low | `app/services/pokemonService.js` | If one Pokémon's details fail to load, the whole page of results fails and the list goes empty. |
| Low | `app/page.js` | The first page is requested twice on load (the search effect and the type/page effect both run on mount). |

Also noted: responses are not cancelled, so a slow earlier search can overwrite a newer one; a
failed `/type` request is an unhandled promise rejection; the Geist fonts are created in the
layout but never applied; the title is still "Create Next App"; `utils/helpers.js` `capitalize` is
unused (the same logic is inlined); there was no `.gitignore` (one was added that ignores
`node_modules/`, `coverage/` and `.next/`).
