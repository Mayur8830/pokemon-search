import React from 'react';
import Link from 'next/link';

function PokemonCard({ pokemon }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
      <img src={pokemon.image} alt={pokemon.name} className="w-32 h-32 object-contain mb-2" />
      <div className="font-bold text-lg mb-2">{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</div>
      <Link href={`/${pokemon.name}`} className="text-blue-700 hover:underline mt-auto">Details →</Link>
    </div>
  );
}

export default PokemonCard; 