'use client';
import React, { useState, useEffect, useRef } from 'react';
import SearchForm from './components/SearchForm';
import PokemonList from './components/PokemonList';
import { getPokemonTypes, getPokemonList } from './services/pokemonService';

export default function HomePage() {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [search, setSearch] = useState('');
  const [pokemons, setPokemons] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const LIMIT = 12;
  const debounceTimeout = useRef();
  const firstSearch = useRef(true);

  useEffect(() => {
    getPokemonTypes().then(setTypes);
  }, []);

  // Debounce search effect
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      fetchPokemons();
      return;
    }
    setLoading(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchPokemons();
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
    // eslint-disable-next-line
  }, [search]);

  // Fetch on type or page change (immediate)
  useEffect(() => {
    fetchPokemons();
    // eslint-disable-next-line
  }, [selectedType, page]);

  async function fetchPokemons() {
    setLoading(true);
    try {
      const { pokemons, total } = await getPokemonList({
        type: selectedType,
        search,
        page,
        limit: LIMIT,
      });
      setPokemons(pokemons);
      setTotalPages(Math.ceil(total / LIMIT));
    } catch (e) {
      setPokemons([]);
      setTotalPages(1);
    }
    setLoading(false);
  }

  function handleTypeChange(type) {
    setSelectedType(type);
    setPage(1);
  }
  function handleSearchChange(val) {
    setSearch(val);
    setPage(1);
  }
  function handlePageChange(newPage) {
    setPage(newPage);
  }
  function handleSubmit(e) {
    e.preventDefault();
    setPage(1);
    fetchPokemons();
  }

  return (
    <main className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Pokemon Search</h1>
      <div className="bg-gray-200 p-6 rounded-lg mb-6">
        <SearchForm
          types={types}
          selectedType={selectedType}
          search={search}
          onTypeChange={handleTypeChange}
          onSearchChange={handleSearchChange}
          onSubmit={handleSubmit}
        />
      </div>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <PokemonList
          pokemons={pokemons}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </main>
  );
}
