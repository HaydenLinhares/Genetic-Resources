import React, { useEffect, useState, useRef } from 'react';

const researcherImages = {
  "Fábio Trigo Raya": "/images/fabio_trigo.jpg",
  // Add more as needed
};

const lightTheme = {
  background: 'white',
  text: '#2c7a7b',
  headerBg: '#b2f5ea',
  rowEven: 'white',
  rowOdd: '#e6fffa',
  border: '#81e6d9',
  inputBorder: '#4fd1c5',
  shadow: '#b2f5ea',
  dropdownBg: 'white',
};

const darkTheme = {
  background: '#1a202c',
  text: '#edf2f7',
  headerBg: '#2d3748',
  rowEven: '#2d3748',
  rowOdd: '#4a5568',
  border: '#4fd1c5',
  inputBorder: '#4fd1c5',
  shadow: '#2c7a7b',
  dropdownBg: '#2d3748',
};

const SpeciesList = () => {
  const [species, setSpecies] = useState([]);
  const [error, setError] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnTextFilters, setColumnTextFilters] = useState({});
  const [columnValueFilters, setColumnValueFilters] = useState({});
  const [dropdownOpenFor, setDropdownOpenFor] = useState(null);
  const [theme, setTheme] = useState('light');
  const dropdownRef = useRef(null);

  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    fetch('/species_database.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setSpecies(data))
      .catch((err) => setError(err.message));
  }, []);

  const headers = species.length > 0 ? Object.keys(species[0]) : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpenFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (header) => {
    setDropdownOpenFor((prev) => (prev === header ? null : header));
  };

  const getUniqueValues = (header) => {
    const values = species.map((item) => item[header] || '');
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  };

  const toggleValueFilter = (header, value) => {
    setColumnValueFilters((prev) => {
      const prevSet = new Set(prev[header] || []);
      prevSet.has(value) ? prevSet.delete(value) : prevSet.add(value);
      return { ...prev, [header]: Array.from(prevSet) };
    });
  };

  const onColumnTextFilterChange = (header, value) => {
    setColumnTextFilters((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const filteredSpecies = species.filter((item) => {
    const globalMatch =
      globalFilter === '' ||
      headers.some((header) =>
        (item[header] || '').toString().toLowerCase().includes(globalFilter.toLowerCase())
      );

    const textFiltersMatch = Object.entries(columnTextFilters).every(
      ([header, filterValue]) =>
        !filterValue || (item[header] || '').toString().toLowerCase().includes(filterValue.toLowerCase())
    );

    const valueFiltersMatch = Object.entries(columnValueFilters).every(
      ([header, selectedValues]) =>
        !selectedValues.length || selectedValues.includes((item[header] || '').toString())
    );

    return globalMatch && textFiltersMatch && valueFiltersMatch;
  });

  // Styles with theme
  const containerStyle = {
    padding: '1rem',
    fontFamily: 'Arial, sans-serif',
    maxWidth: 1000,
    margin: 'auto',
    backgroundColor: currentTheme.background,
    color: currentTheme.text,
    minHeight: '100vh',
  };
  const headerStyle = {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: currentTheme.text,
  };
  const globalInputStyle = {
    padding: '0.5rem 1rem',
    marginBottom: '1rem',
    width: '100%',
    maxWidth: 400,
    border: `1px solid ${currentTheme.inputBorder}`,
    borderRadius: 4,
    backgroundColor: currentTheme.dropdownBg,
    color: currentTheme.text,
  };
  const columnInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.25rem 0.5rem',
    marginTop: 4,
    borderRadius: 3,
    border: `1px solid ${currentTheme.inputBorder}`,
    backgroundColor: currentTheme.dropdownBg,
    color: currentTheme.text,
  };
  const tableWrapperStyle = {
    overflowX: 'auto',
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 6,
    boxShadow: `0 0 6px ${currentTheme.shadow}`,
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = {
    border: `1px solid ${currentTheme.border}`,
    padding: '0.5rem 1rem',
    textAlign: 'left',
    backgroundColor: currentTheme.headerBg,
    textTransform: 'uppercase',
    letterSpacing: 1,
    verticalAlign: 'top',
    position: 'relative',
    cursor: 'pointer',
    userSelect: 'none',
    color: currentTheme.text,
  };
  const tdStyle = {
    border: `1px solid ${currentTheme.border}`,
    padding: '0.5rem 1rem',
    verticalAlign: 'middle',
    color: currentTheme.text,
  };
  const rowEven = { backgroundColor: currentTheme.rowEven };
  const rowOdd = { backgroundColor: currentTheme.rowOdd };
  const errorStyle = { color: 'red', marginBottom: '1rem' };
  const noResultsStyle = {
    padding: '1rem',
    textAlign: 'center',
    color: currentTheme.text,
  };
  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 10,
    maxHeight: 200,
    overflowY: 'auto',
    backgroundColor: currentTheme.dropdownBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 6,
    boxShadow: `0 0 6px ${currentTheme.shadow}`,
    padding: '0.5rem',
    minWidth: 150,
    color: currentTheme.text,
  };
  const checkboxLabelStyle = {
    display: 'block',
    marginBottom: 4,
    cursor: 'pointer',
  };
  const checkboxStyle = { marginRight: 6 };
  const toggleButtonStyle = {
    marginBottom: '1rem',
    padding: '0.4rem 1rem',
    backgroundColor: currentTheme.headerBg,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 4,
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <h2 style={headerStyle}>Germplasm for Climate Change</h2>

      <button onClick={toggleTheme} style={toggleButtonStyle}>
        Toggle {theme === 'light' ? '🌙 Dark' : '🌞 Light'} Mode
      </button>

      <input
        type="text"
        placeholder="Search any field..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        style={globalInputStyle}
      />

      {error && <div style={errorStyle}>Error: {error}</div>}
      {species.length === 0 && !error && <div>Loading...</div>}

      {species.length > 0 && (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} style={thStyle} onClick={() => toggleDropdown(header)}>
                    {header.replace(/_/g, ' ')}
                    <input
                      type="text"
                      placeholder={`Filter ${header.replace(/_/g, ' ')}`}
                      value={columnTextFilters[header] || ''}
                      onChange={(e) => onColumnTextFilterChange(header, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={columnInputStyle}
                    />
                    {dropdownOpenFor === header && (
                      <div
                        ref={dropdownRef}
                        style={dropdownStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getUniqueValues(header).map((value) => (
                          <label key={value || '__empty__'} style={checkboxLabelStyle} title={value}>
                            <input
                              type="checkbox"
                              checked={
                                columnValueFilters[header]?.includes(value) || false
                              }
                              onChange={() => toggleValueFilter(header, value)}
                              style={checkboxStyle}
                            />
                            {value === '' ? <em>(empty)</em> : value}
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSpecies.length > 0 ? (
                filteredSpecies.map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? rowEven : rowOdd}>
                    {headers.map((header) => (
                      <td key={header} style={tdStyle}>
                        {header === "Collected_by" && researcherImages[item[header]] ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                              src={researcherImages[item[header]]}
                              alt={item[header]}
                              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            {item[header]}
                          </span>
                        ) : (
                          item[header]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} style={noResultsStyle}>
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SpeciesList;
