import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import RootLayout, { metadata } from '@/app/layout'
import HomePage from '@/app/page'
import PokemonDetailsPage from '@/app/[pokemon]/page'
import { getPokemonDetails, getPokemonList, getPokemonTypes } from '@/app/services/pokemonService'
import { capitalize } from '@/app/utils/helpers'

const knownBug = process.env.SHOW_BUGS ? test : test.fails
const API = 'https://pokeapi.co/api/v2'

/** A fake PokeAPI: `/pokemon` lists `names`, `/type/:t` lists `byType[t]`, details carry a sprite. */
function fakeApi({ names = [], byType = {}, failDetails = [], failTypes = false, failList = false } = {}) {
  const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  const fail = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  const fetch = vi.fn((url) => {
    const u = new URL(url)
    const p = u.pathname.replace('/api/v2', '')
    if (p === '/type') return failTypes ? fail() : ok({ results: Object.keys(byType).map((name) => ({ name })) })
    if (p.startsWith('/type/')) {
      const t = p.slice(6)
      return byType[t] ? ok({ pokemon: byType[t].map((name) => ({ pokemon: { name } })) }) : fail()
    }
    if (p === '/pokemon') {
      if (failList) return fail()
      const limit = Number(u.searchParams.get('limit'))
      const offset = Number(u.searchParams.get('offset') ?? 0)
      return ok({ count: names.length, results: names.slice(offset, offset + limit).map((name) => ({ name })) })
    }
    const name = p.slice('/pokemon/'.length)
    if (failDetails.includes(name)) return fail()
    return ok({
      name,
      sprites: { front_default: `${name}-small.png`, other: { 'official-artwork': { front_default: name === 'ditto' ? null : `${name}.png` } } },
      types: [{ type: { name: 'electric' } }],
      stats: [{ stat: { name: 'hp' } }, { stat: { name: 'speed' } }],
      abilities: [{ ability: { name: 'static' } }],
      moves: Array.from({ length: 8 }, (_, i) => ({ move: { name: `move-${i}` } })),
    })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const many = (n, prefix = 'mon') => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)

describe('pokemonService', () => {
  test('types come from /type', async () => {
    fakeApi({ byType: { fire: [], water: [] } })
    expect(await getPokemonTypes()).toEqual([{ name: 'fire' }, { name: 'water' }])
    fakeApi({ failTypes: true })
    await expect(getPokemonTypes()).rejects.toThrow('Failed to fetch types')
  })

  test('the plain list pages with offset and fetches each image (artwork, else the small sprite)', async () => {
    const fetch = fakeApi({ names: ['pikachu', 'ditto', ...many(20)] })
    const { pokemons, total } = await getPokemonList({ page: 1, limit: 2 })
    expect(total).toBe(22)
    expect(pokemons).toEqual([
      { name: 'pikachu', image: 'pikachu.png' },
      { name: 'ditto', image: 'ditto-small.png' },
    ])
    await getPokemonList({ page: 3, limit: 2 })
    expect(fetch).toHaveBeenCalledWith(`${API}/pokemon?limit=2&offset=4`)
    expect((await getPokemonList({})).pokemons).toHaveLength(12)
  })

  test('search fetches every name and filters case-insensitively, then pages', async () => {
    fakeApi({ names: ['Pikachu', 'raichu', 'bulbasaur', 'pichu'] })
    const page1 = await getPokemonList({ search: 'CHU', limit: 2 })
    expect(page1.total).toBe(3)
    expect(page1.pokemons.map((p) => p.name)).toEqual(['Pikachu', 'raichu'])
    expect((await getPokemonList({ search: 'chu', page: 2, limit: 2 })).pokemons.map((p) => p.name)).toEqual(['pichu'])
  })

  test('a type lists its Pokémon, filtered and paged locally', async () => {
    fakeApi({ byType: { electric: ['pikachu', 'raichu', 'jolteon'] } })
    expect((await getPokemonList({ type: 'electric', limit: 2 })).total).toBe(3)
    const filtered = await getPokemonList({ type: 'electric', search: 'CHU', page: 1, limit: 1 })
    expect(filtered).toEqual({ total: 2, pokemons: [{ name: 'pikachu', image: 'pikachu.png' }] })
  })

  test('every failure throws', async () => {
    fakeApi({ byType: {} })
    await expect(getPokemonList({ type: 'nope' })).rejects.toThrow('Failed to fetch by type')
    fakeApi({ failList: true })
    await expect(getPokemonList({})).rejects.toThrow('Failed to fetch pokemons')
    const fetch = fakeApi({ names: ['a'] })
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ count: 1, results: [] }) }))
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }))
    await expect(getPokemonList({ search: 'a' })).rejects.toThrow('Failed to fetch all pokemons for search')
    fakeApi({ failDetails: ['x'] })
    await expect(getPokemonDetails('x')).rejects.toThrow('Failed to fetch details')
  })

  // FINDING: one Pokémon whose details fail to load fails the whole page of results.
  knownBug('one missing image should not empty the whole list', async () => {
    fakeApi({ names: ['pikachu', 'missingno'], failDetails: ['missingno'] })
    const { pokemons } = await getPokemonList({ limit: 2 })
    expect(pokemons.map((p) => p.name)).toContain('pikachu')
  })
})

describe('home page', () => {
  test('loads types and the first page, and pages through results', async () => {
    fakeApi({ names: many(30), byType: { fire: ['charmander'] } })
    render(<HomePage />)
    expect(await screen.findByText('Mon1')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Fire' })).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getAllByRole('link', { name: 'Details →' })[0]).toHaveAttribute('href', '/mon1')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Mon13')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
  })

  test('choosing a type shows that type from page 1', async () => {
    fakeApi({ names: many(30), byType: { fire: ['charmander', 'vulpix'] } })
    render(<HomePage />)
    await screen.findByText('Mon1')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fire' } })
    expect(await screen.findByText('Charmander')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  test('typing searches after a pause; submitting searches at once', async () => {
    const fetch = fakeApi({ names: ['pikachu', 'raichu', 'bulbasaur'] })
    render(<HomePage />)
    await screen.findByText('Bulbasaur')
    vi.useFakeTimers()
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'chu' } })
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(500))
    vi.useRealTimers()
    expect(await screen.findByText('Raichu')).toBeInTheDocument()
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument()

    const before = fetch.mock.calls.length
    fireEvent.submit(screen.getByRole('button', { name: 'Search' }).closest('form'))
    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(before))
  })

  test('a failed load shows an empty page', async () => {
    fakeApi({ failList: true, byType: {} })
    render(<HomePage />)
    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  // FINDING: with no results there are 0 pages: "Page 1 of 0", and Next stays enabled.
  knownBug('no results should not offer a next page', async () => {
    fakeApi({ names: [], byType: {} })
    render(<HomePage />)
    expect(await screen.findByText(/Page 1 of/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  // FINDING: the first render fetches the list twice (the search effect and the type/page
  // effect both run on mount).
  knownBug('the first page is requested once', async () => {
    const fetch = fakeApi({ names: many(3), byType: {} })
    render(<HomePage />)
    await screen.findByText('Mon1')
    expect(fetch.mock.calls.filter(([url]) => url.includes('/pokemon?')).length).toBe(1)
  })
})

describe('details page', () => {
  test('shows the artwork, types, stats, abilities and the first six moves', async () => {
    fakeApi()
    render(await PokemonDetailsPage({ params: { pokemon: 'pikachu' } }))
    expect(screen.getByRole('img', { name: 'pikachu' })).toHaveAttribute('src', 'pikachu.png')
    expect(screen.getByText('Pikachu')).toBeInTheDocument()
    expect(screen.getByText('hp, speed')).toBeInTheDocument()
    expect(screen.getByText('move-0, move-1, move-2, move-3, move-4, move-5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  })

  test('falls back to the small sprite, then to nothing', async () => {
    fakeApi()
    render(await PokemonDetailsPage({ params: { pokemon: 'ditto' } }))
    expect(screen.getByRole('img', { name: 'ditto' })).toHaveAttribute('src', 'ditto-small.png')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'blank', sprites: { other: {} }, types: [], stats: [], abilities: [], moves: [] }) })))
    const { container } = render(await PokemonDetailsPage({ params: { pokemon: 'blank' } }))
    expect(container.querySelector('img[alt="blank"]').getAttribute('src')).toBeNull()
  })

  test('an unknown Pokémon says so', async () => {
    fakeApi({ failDetails: ['nope'] })
    render(await PokemonDetailsPage({ params: { pokemon: 'nope' } }))
    expect(screen.getByText('Pokémon not found.')).toBeInTheDocument()
  })
})

test('layout, metadata and the helper', () => {
  expect(metadata.title).toBe('Create Next App')
  expect(renderToStaticMarkup(<RootLayout>{<p>x</p>}</RootLayout>)).toContain('<p>x</p>')
  expect(capitalize('pikachu')).toBe('Pikachu')
  expect(capitalize('')).toBe('')
})
