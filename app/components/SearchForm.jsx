import React from 'react';

function SearchForm({ types, selectedType, search, onTypeChange, onSearchChange, onSubmit }) {
  return (
    <form className="flex flex-col md:flex-row gap-4 mb-6" onSubmit={onSubmit}>
      <select
        className="p-2 border rounded w-full md:w-1/4"
        value={selectedType}
        onChange={e => onTypeChange(e.target.value)}
      >
        <option value="">Select</option>
        {types.map(type => (
          <option key={type.name} value={type.name}>{type.name.charAt(0).toUpperCase() + type.name.slice(1)}</option>
        ))}
      </select>
      <div className="flex w-full md:w-2/4">
        <input
          className="p-2 border rounded-l w-full"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        <button type="submit" className="bg-blue-900 text-white px-6 rounded-r">Search</button>
      </div>
    </form>
  );
}

export default SearchForm; 