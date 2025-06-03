const API_BASE = 'https://pokeapi.co/api/v2';

export async function getPokemonTypes() {
  const res = await fetch(`${API_BASE}/type`);
  if (!res.ok) throw new Error('Failed to fetch types');
  const data = await res.json();
  return data.results;
}

export async function getPokemonList({ type = '', search = '', page = 1, limit = 12 }) {
  let pokemons = [];
  let total = 0;
  if (type) {
    // For type, we still need to fetch all and filter, as the API does not support pagination for type endpoint
    const res = await fetch(`${API_BASE}/type/${type}`);
    if (!res.ok) throw new Error('Failed to fetch by type');
    const data = await res.json();
    pokemons = data.pokemon.map(p => p.pokemon);
    if (search) {
      pokemons = pokemons.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    total = pokemons.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    pokemons = pokemons.slice(start, end);
  } else {
    // Use offset and limit for pagination
    const offset = (page - 1) * limit;
    let url = `${API_BASE}/pokemon?limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch pokemons');
    const data = await res.json();
    pokemons = data.results;
    total = data.count;
    if (search) {
      // If searching, we need to fetch all and filter (API does not support search param)
      // This is inefficient, but required for search
      const allRes = await fetch(`${API_BASE}/pokemon?limit=${total}`);
      if (!allRes.ok) throw new Error('Failed to fetch all pokemons for search');
      const allData = await allRes.json();
      let filtered = allData.results.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      total = filtered.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      pokemons = filtered.slice(start, end);
    }
  }
  // Fetch images for each
  const withImages = await Promise.all(pokemons.map(async (p) => {
    const details = await getPokemonDetails(p.name);
    return {
      name: p.name,
      image: details.sprites?.other['official-artwork']?.front_default || details.sprites?.front_default || '',
    };
  }));
  return { pokemons: withImages, total };
}

export async function getPokemonDetails(name) {
  const res = await fetch(`${API_BASE}/pokemon/${name}`);
  if (!res.ok) throw new Error('Failed to fetch details');
  return await res.json();
} 