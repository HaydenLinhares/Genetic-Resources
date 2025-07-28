"use client"

import { useEffect, useState, useRef } from "react"

const researcherImages = {
  "Fábio Trigo Raya": "/images/fabio_trigo.jpg",
  // Add more as needed
}

const lightTheme = {
  background: "white",
  text: "#2c7a7b",
  headerBg: "#b2f5ea",
  rowEven: "white",
  rowOdd: "#e6fffa",
  border: "#81e6d9",
  inputBorder: "#4fd1c5",
  shadow: "#b2f5ea",
  dropdownBg: "white",
  cardBg: "#f7fafc",
  accent: "#4fd1c5",
}

const darkTheme = {
  background: "#1a202c",
  text: "#edf2f7",
  headerBg: "#2d3748",
  rowEven: "#2d3748",
  rowOdd: "#4a5568",
  border: "#4fd1c5",
  inputBorder: "#4fd1c5",
  shadow: "#2c7a7b",
  dropdownBg: "#2d3748",
  cardBg: "#2d3748",
  accent: "#4fd1c5",
}

const SpeciesList = () => {
  const [species, setSpecies] = useState([])
  const [error, setError] = useState(null)
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnTextFilters, setColumnTextFilters] = useState({})
  const [columnValueFilters, setColumnValueFilters] = useState({})
  const [dropdownOpenFor, setDropdownOpenFor] = useState(null)
  const [theme, setTheme] = useState("light")
  const [viewMode, setViewMode] = useState("table") // 'table' or 'cards'
  const [isMobile, setIsMobile] = useState(false)
  const [expandedCard, setExpandedCard] = useState(null)
  const dropdownRef = useRef(null)

  const currentTheme = theme === "light" ? lightTheme : darkTheme

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && viewMode === "table") {
        setViewMode("cards")
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [viewMode])

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"))

  useEffect(() => {
    fetch("/species_database.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then((data) => setSpecies(data))
      .catch((err) => setError(err.message))
  }, [])

  const headers = species.length > 0 ? Object.keys(species[0]) : []

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpenFor(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleDropdown = (header) => {
    setDropdownOpenFor((prev) => (prev === header ? null : header))
  }

  const getUniqueValues = (header) => {
    const values = species.map((item) => item[header] || "")
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }

  const toggleValueFilter = (header, value) => {
    setColumnValueFilters((prev) => {
      const prevSet = new Set(prev[header] || [])
      prevSet.has(value) ? prevSet.delete(value) : prevSet.add(value)
      return { ...prev, [header]: Array.from(prevSet) }
    })
  }

  const onColumnTextFilterChange = (header, value) => {
    setColumnTextFilters((prev) => ({
      ...prev,
      [header]: value,
    }))
  }

  const filteredSpecies = species.filter((item) => {
    const globalMatch =
      globalFilter === "" ||
      headers.some((header) => (item[header] || "").toString().toLowerCase().includes(globalFilter.toLowerCase()))

    const textFiltersMatch = Object.entries(columnTextFilters).every(
      ([header, filterValue]) =>
        !filterValue || (item[header] || "").toString().toLowerCase().includes(filterValue.toLowerCase()),
    )

    const valueFiltersMatch = Object.entries(columnValueFilters).every(
      ([header, selectedValues]) => !selectedValues.length || selectedValues.includes((item[header] || "").toString()),
    )

    return globalMatch && textFiltersMatch && valueFiltersMatch
  })

  // Styles
  const containerStyle = {
    padding: isMobile ? "0.5rem" : "1rem",
    fontFamily: "Arial, sans-serif",
    maxWidth: isMobile ? "100%" : 1200,
    margin: "auto",
    backgroundColor: currentTheme.background,
    color: currentTheme.text,
    minHeight: "100vh",
  }

  const headerStyle = {
    fontSize: isMobile ? "1.4rem" : "1.8rem",
    fontWeight: "bold",
    marginBottom: "1rem",
    color: currentTheme.text,
    textAlign: isMobile ? "center" : "left",
  }

  const controlsStyle = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: "0.5rem",
    marginBottom: "1rem",
    alignItems: isMobile ? "stretch" : "center",
  }

  const globalInputStyle = {
    padding: "0.75rem 1rem",
    flex: 1,
    maxWidth: isMobile ? "100%" : 400,
    border: `1px solid ${currentTheme.inputBorder}`,
    borderRadius: 8,
    backgroundColor: currentTheme.dropdownBg,
    color: currentTheme.text,
    fontSize: isMobile ? "16px" : "14px", // Prevent zoom on iOS
  }

  const buttonStyle = {
    padding: "0.75rem 1rem",
    backgroundColor: currentTheme.headerBg,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  }

  const viewToggleStyle = {
    ...buttonStyle,
    backgroundColor: currentTheme.accent,
    color: "white",
  }

  // Card View Styles
  const cardGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  }

  const cardStyle = {
    backgroundColor: currentTheme.cardBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 12,
    padding: "1rem",
    boxShadow: `0 2px 8px ${currentTheme.shadow}`,
    transition: "transform 0.2s ease",
  }

  const cardHeaderStyle = {
    fontSize: "1.1rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
    color: currentTheme.accent,
    borderBottom: `1px solid ${currentTheme.border}`,
    paddingBottom: "0.5rem",
  }

  const cardFieldStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.25rem 0",
    borderBottom: `1px solid ${currentTheme.border}20`,
  }

  const cardLabelStyle = {
    fontWeight: "600",
    fontSize: "0.85rem",
    color: currentTheme.text,
    opacity: 0.8,
  }

  const cardValueStyle = {
    fontSize: "0.9rem",
    color: currentTheme.text,
    textAlign: "right",
    maxWidth: "60%",
    wordBreak: "break-word",
  }

  // Table styles (for desktop)
  const tableWrapperStyle = {
    overflowX: "auto",
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 8,
    boxShadow: `0 4px 12px ${currentTheme.shadow}`,
    marginTop: "1rem",
  }

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "800px", // Ensure minimum width for horizontal scroll
  }

  const thStyle = {
    border: `1px solid ${currentTheme.border}`,
    padding: "0.75rem",
    textAlign: "left",
    backgroundColor: currentTheme.headerBg,
    textTransform: "uppercase",
    letterSpacing: 1,
    verticalAlign: "top",
    position: "relative",
    cursor: "pointer",
    userSelect: "none",
    color: currentTheme.text,
    fontSize: "0.8rem",
    minWidth: "120px",
  }

  const tdStyle = {
    border: `1px solid ${currentTheme.border}`,
    padding: "0.75rem",
    verticalAlign: "middle",
    color: currentTheme.text,
    fontSize: "0.9rem",
  }

  const columnInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.4rem",
    marginTop: 4,
    borderRadius: 4,
    border: `1px solid ${currentTheme.inputBorder}`,
    backgroundColor: currentTheme.dropdownBg,
    color: currentTheme.text,
    fontSize: "0.8rem",
  }

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 10,
    maxHeight: 200,
    overflowY: "auto",
    backgroundColor: currentTheme.dropdownBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: 8,
    boxShadow: `0 4px 12px ${currentTheme.shadow}`,
    padding: "0.5rem",
    minWidth: 200,
    color: currentTheme.text,
  }

  const checkboxLabelStyle = {
    display: "block",
    marginBottom: 4,
    cursor: "pointer",
    fontSize: "0.85rem",
  }

  const checkboxStyle = { marginRight: 6 }

  const rowEven = { backgroundColor: currentTheme.rowEven }
  const rowOdd = { backgroundColor: currentTheme.rowOdd }

  const errorStyle = {
    color: "red",
    marginBottom: "1rem",
    padding: "1rem",
    backgroundColor: "#fee",
    borderRadius: 8,
    textAlign: "center",
  }

  const noResultsStyle = {
    padding: "2rem",
    textAlign: "center",
    color: currentTheme.text,
    fontSize: "1.1rem",
  }

  const loadingStyle = {
    padding: "2rem",
    textAlign: "center",
    color: currentTheme.text,
    fontSize: "1.1rem",
  }

  // Filter summary
  const activeFiltersCount =
    Object.values(columnTextFilters).filter((v) => v).length +
    Object.values(columnValueFilters).filter((v) => v.length > 0).length

  const clearAllFilters = () => {
    setGlobalFilter("")
    setColumnTextFilters({})
    setColumnValueFilters({})
  }

  const renderCard = (item, idx) => (
    <div key={idx} style={cardStyle}>
      <div style={cardHeaderStyle}>{item[headers[0]] || `Item ${idx + 1}`}</div>
      {headers.slice(1).map((header) => (
        <div key={header} style={cardFieldStyle}>
          <span style={cardLabelStyle}>{header.replace(/_/g, " ")}:</span>
          <span style={cardValueStyle}>
            {header === "Collected_by" ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                <img
                  src={researcherImages[item[header]] || "/placeholder.svg"}
                  alt={item[header]}
                  style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
                />
                {item[header] || <em>Unknown</em>}
              </span>
            ) : (
              item[header] || <em>-</em>
            )}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={containerStyle}>
      <h2 style={headerStyle}>Germplasm for Climate Change</h2>

      <div style={controlsStyle}>
        <input
          type="text"
          placeholder="Search any field..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={globalInputStyle}
        />

        <button onClick={toggleTheme} style={buttonStyle}>
          {theme === "light" ? "🌙 Dark" : "🌞 Light"}
        </button>

        {!isMobile && (
          <button onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")} style={viewToggleStyle}>
            {viewMode === "table" ? "📱 Cards" : "📊 Table"}
          </button>
        )}
      </div>

      {/* Filter Summary */}
      {(globalFilter || activeFiltersCount > 0) && (
        <div
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: currentTheme.accent + "20",
            borderRadius: 8,
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>
            {filteredSpecies.length} of {species.length} items shown
            {activeFiltersCount > 0 && ` (${activeFiltersCount} filters active)`}
          </span>
          <button
            onClick={clearAllFilters}
            style={{
              ...buttonStyle,
              padding: "0.25rem 0.75rem",
              fontSize: "0.8rem",
              backgroundColor: "transparent",
              color: currentTheme.accent,
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {error && <div style={errorStyle}>Error: {error}</div>}

      {species.length === 0 && !error && <div style={loadingStyle}>Loading...</div>}

      {species.length > 0 && (
        <>
          {viewMode === "cards" ? (
            <div style={cardGridStyle}>
              {filteredSpecies.length > 0 ? (
                filteredSpecies.map(renderCard)
              ) : (
                <div style={noResultsStyle}>No results found.</div>
              )}
            </div>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header} style={thStyle} onClick={() => toggleDropdown(header)}>
                        {header.replace(/_/g, " ")}
                        <input
                          type="text"
                          placeholder={`Filter ${header.replace(/_/g, " ")}`}
                          value={columnTextFilters[header] || ""}
                          onChange={(e) => onColumnTextFilterChange(header, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={columnInputStyle}
                        />
                        {dropdownOpenFor === header && (
                          <div ref={dropdownRef} style={dropdownStyle} onClick={(e) => e.stopPropagation()}>
                            {getUniqueValues(header).map((value) => (
                              <label key={value || "__empty__"} style={checkboxLabelStyle} title={value}>
                                <input
                                  type="checkbox"
                                  checked={columnValueFilters[header]?.includes(value) || false}
                                  onChange={() => toggleValueFilter(header, value)}
                                  style={checkboxStyle}
                                />
                                {value === "" ? <em>(empty)</em> : value}
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
                            {header === "Collected_by" ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <img
                                  src={researcherImages[item[header]] || "/placeholder.svg"}
                                  alt={item[header]}
                                  style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                                />
                                {item[header] || <em>Unknown</em>}
                              </span>
                            ) : (
                              item[header] || <em>-</em>
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
        </>
      )}
    </div>
  )
}

export default SpeciesList
