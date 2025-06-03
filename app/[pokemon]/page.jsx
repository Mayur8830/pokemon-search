import React from 'react';
import { getPokemonDetails } from '../services/pokemonService';
import Breadcrumb from '../components/Breadcrumb';
import Link from 'next/link';

async function fetchPokemon(name) {
  try {
    return await getPokemonDetails(name);
  } catch {
    return null;
  }
}

export default async function PokemonDetailsPage({ params }) {
  const { pokemon } = params;
  const details = await fetchPokemon(pokemon);
  if (!details) {
    return <div className="p-6">Pokémon not found.</div>;
  }
  const image = details.sprites?.other['official-artwork']?.front_default || details.sprites?.front_default || '';
  const types = details.types.map(t => t.type.name).join(', ');
  const stats = details.stats.map(s => s.stat.name).join(', ');
  const abilities = details.abilities.map(a => a.ability.name).join(', ');
  const moves = details.moves.slice(0, 6).map(m => m.move.name).join(', ');

  return (
    <main className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Pokemon Details</h1>
      <div className="bg-gray-200 p-6 rounded-lg max-w-2xl mx-auto">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: details.name }]} />
        {/* <Link href="/" className="text-green-600 hover:underline mb-4 block">&lt; Back</Link> */}
        <div className="bg-teal-200 rounded-lg p-6 flex flex-col items-center">
          <img src={image} alt={details.name} className="w-48 h-48 object-contain mb-4" />
        </div>
        <div className="bg-yellow-200 rounded-lg p-6 mt-4">
          <div className="mb-2"><span className="font-bold">Name:</span> {details.name.charAt(0).toUpperCase() + details.name.slice(1)}</div>
          <div className="mb-2"><span className="font-bold">Type:</span> {types}</div>
          <div className="mb-2"><span className="font-bold">Stats:</span> {stats}</div>
          <div className="mb-2"><span className="font-bold">Abilities:</span> {abilities}</div>
          <div className="mb-2"><span className="font-bold">Some Moves:</span> {moves}</div>
        </div>
      </div>
    </main>
  );
} 