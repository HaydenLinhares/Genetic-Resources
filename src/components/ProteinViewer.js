"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import Card from "react-bootstrap/Card"
import Button from "react-bootstrap/Button"
import Form from "react-bootstrap/Form"
import Alert from "react-bootstrap/Alert"
import Badge from "react-bootstrap/Badge"
import ProgressBar from "react-bootstrap/ProgressBar"
import { Copy, ChevronDown, ChevronRight, Search, AlertTriangle, Loader, Database, Zap } from "lucide-react"

// Flexible data normalization functions that handle any irregularities
const normalizeProteinEntry = (entry, index) => {
  if (!entry || typeof entry !== "object") {
    return null
  }

  try {
    const normalized = {
      id: String(entry.id || entry.ID || entry.identifier || entry.name || `Unknown_${index}`),
      species: String(entry.species || entry.Species || entry.organism || entry.source || "unknown"),
      protein: String(entry.protein || entry.protein_sequence || entry.proteinSeq || entry.aa_sequence || ""),
      nucleotide: String(
        entry.nucleotide || entry.nucleotide_sequence || entry.dna_sequence || entry.nt_sequence || "",
      ),
      annotations: [],
    }

    const annotationsField =
      entry.annotations ||
      entry.annotation ||
      entry.functional_annotations ||
      entry.functions ||
      entry.ko_annotations ||
      []

    if (Array.isArray(annotationsField)) {
      normalized.annotations = annotationsField
        .map((ann, annIndex) => normalizeAnnotation(ann, index, annIndex))
        .filter((ann) => ann !== null)
    } else if (annotationsField && typeof annotationsField === "object") {
      normalized.annotations = [normalizeAnnotation(annotationsField, index, 0)].filter((ann) => ann !== null)
    }

    return normalized
  } catch (error) {
    return null
  }
}

const normalizeAnnotation = (annotation, entryIndex, annIndex) => {
  if (!annotation || typeof annotation !== "object") {
    return null
  }

  try {
    const ko = annotation.KO || annotation.ko || annotation.kegg || annotation.KEGG || annotation.id || ""
    let evalue = annotation.evalue || annotation.e_value || annotation.E_value || annotation.eval || "N/A"
    let definition =
      annotation.definition ||
      annotation.desc ||
      annotation.description ||
      annotation.function ||
      annotation.name ||
      "No definition available"
    let score = annotation.score || annotation.bit_score || annotation.bitscore || 0
    let threshold = annotation.threshold || annotation.cutoff || annotation.min_score || 0

    // Handle malformed evalue fields
    if (typeof evalue === "string" && evalue.includes('"')) {
      const cleanEvalue = evalue.replace(/['"]/g, "")
      if (cleanEvalue && !definition.includes(cleanEvalue)) {
        definition = cleanEvalue + " " + definition
      }
      evalue = "N/A"
    }

    if (typeof score === "string") {
      const numScore = Number.parseFloat(score)
      score = isNaN(numScore) ? 0 : numScore
    }

    if (typeof threshold === "string") {
      const numThreshold = Number.parseFloat(threshold)
      threshold = isNaN(numThreshold) ? 0 : numThreshold
    }

    if (typeof evalue === "number") {
      evalue = evalue.toString()
    }

    return {
      KO: String(ko),
      threshold: Number(threshold),
      score: Number(score),
      evalue: String(evalue),
      definition: String(definition),
    }
  } catch (error) {
    return null
  }
}

// Chunked JSON parser for large files
const parseJSONInChunks = async (text, chunkSize = 500, onChunk = () => {}) => {
  try {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) {
      throw new Error("Data must be an array")
    }

    const chunks = []
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      chunks.push(chunk)

      // Call callback with progress
      await onChunk(chunk, i, data.length)

      // Allow UI to update between chunks
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    return data
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`)
  }
}

function ProteinViewer() {
  const [allProteins, setAllProteins] = useState([])
  const [displayProteins, setDisplayProteins] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState("Initializing...")
  const [loadError, setLoadError] = useState(null)
  const [query, setQuery] = useState("")
  const [selectedSpecies, setSelectedSpecies] = useState("all")
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [sequenceType, setSequenceType] = useState("protein")
  const [dataErrors, setDataErrors] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)

  const INITIAL_DISPLAY_SIZE = 500
  const CHUNK_SIZE = 500

  // Load and process protein data in chunks
  useEffect(() => {
    const loadProteinData = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        setLoadingStatus("Fetching protein data...")
        setLoadingProgress(0)

        const response = await fetch("/protein_data.json")
        if (!response.ok) {
          throw new Error(`Failed to load protein data: ${response.status} ${response.statusText}`)
        }

        setLoadingStatus("Reading file...")
        setLoadingProgress(10)

        const text = await response.text()

        setLoadingStatus("Processing first batch...")
        setLoadingProgress(20)

        let firstChunkProcessed = false
        let processedCount = 0

        const allData = await parseJSONInChunks(text, CHUNK_SIZE, async (chunk, currentIndex, total) => {
          processedCount += chunk.length
          const progress = Math.min(90, 20 + (currentIndex / total) * 70)
          setLoadingProgress(progress)

          if (!firstChunkProcessed) {
            // Process and display first chunk immediately
            const normalizedChunk = chunk
              .map((entry, idx) => normalizeProteinEntry(entry, idx))
              .filter((entry) => entry !== null)

            setDisplayProteins(normalizedChunk.slice(0, INITIAL_DISPLAY_SIZE))
            setTotalEntries(total)
            setLoadingStatus(`Displaying first ${Math.min(INITIAL_DISPLAY_SIZE, normalizedChunk.length)} entries...`)
            setLoading(false) // Allow UI to show results
            setBackgroundLoading(true)
            firstChunkProcessed = true
          }

          setLoadingStatus(`Processed ${processedCount.toLocaleString()} of ${total.toLocaleString()} entries...`)
        })

        // Store complete dataset for searching
        setAllProteins(allData)
        setLoadingProgress(100)
        setLoadingStatus("Complete!")
        setBackgroundLoading(false)

        console.log(`Successfully loaded ${allData.length} protein entries`)
      } catch (error) {
        console.error("Error loading protein data:", error)
        setLoadError(error.message)
        setLoading(false)
        setBackgroundLoading(false)
      }
    }

    loadProteinData()
  }, [])

  // Handle search across available data
  const performSearch = useCallback(
    async (searchQuery, speciesFilter) => {
      if (!searchQuery.trim() && speciesFilter === "all") {
        // No search - show initial subset
        const initialData = allProteins.slice(0, INITIAL_DISPLAY_SIZE)
        const normalized = initialData
          .map((entry, idx) => normalizeProteinEntry(entry, idx))
          .filter((entry) => entry !== null)
        setDisplayProteins(normalized)
        return
      }

      setIsSearching(true)

      // Search through available data
      const searchData = allProteins.length > 0 ? allProteins : displayProteins

      const results = []
      const batchSize = 1000

      for (let i = 0; i < searchData.length; i += batchSize) {
        const batch = searchData.slice(i, i + batchSize)

        const batchResults = batch.filter((entry) => {
          const normalized = normalizeProteinEntry(entry, i)
          if (!normalized) return false

          const matchesSpecies = speciesFilter === "all" || normalized.species === speciesFilter

          if (!searchQuery.trim()) return matchesSpecies

          const queryLower = searchQuery.toLowerCase().trim()
          const matchesId = normalized.id.toLowerCase().includes(queryLower)
          const matchesKO = normalized.annotations.some((ann) => ann.KO && ann.KO.toLowerCase().includes(queryLower))
          const matchesDefinition = normalized.annotations.some(
            (ann) => ann.definition && ann.definition.toLowerCase().includes(queryLower),
          )

          return matchesSpecies && (matchesId || matchesKO || matchesDefinition)
        })

        results.push(...batchResults)

        // Limit results for performance
        if (results.length >= 1000) {
          results.splice(1000)
          break
        }

        // Allow UI updates between batches
        if (i % (batchSize * 5) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }

      const normalizedResults = results
        .map((entry, idx) => normalizeProteinEntry(entry, idx))
        .filter((entry) => entry !== null)

      setDisplayProteins(normalizedResults)
      setIsSearching(false)
    },
    [allProteins, displayProteins],
  )

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query, selectedSpecies)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, selectedSpecies, performSearch])

  const handleToggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleCopy = async (sequence) => {
    try {
      await navigator.clipboard.writeText(sequence)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      alert("Failed to copy sequence")
    }
  }

  // Get unique species from available data
  const species = useMemo(() => {
    const dataToUse = allProteins.length > 0 ? allProteins.slice(0, 5000) : displayProteins // Sample for species
    const speciesSet = new Set()

    dataToUse.forEach((entry) => {
      const normalized = normalizeProteinEntry(entry, 0)
      if (normalized) {
        speciesSet.add(normalized.species)
      }
    })

    return Array.from(speciesSet).sort()
  }, [allProteins, displayProteins])

  // Display data (first 6 results)
  const filteredData = useMemo(() => {
    return displayProteins.slice(0, 6)
  }, [displayProteins])

  // Reset expanded index when results change
  useEffect(() => {
    setExpandedIndex(null)
  }, [query, selectedSpecies])

  // Loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="text-center" style={{ minWidth: "300px" }}>
          <Loader className="spinner-border text-primary mb-3" size={32} />
          <h5>Loading Protein Data</h5>
          <p className="text-muted mb-3">{loadingStatus}</p>
          <ProgressBar now={loadingProgress} className="mb-2" />
          <small className="text-muted">{Math.round(loadingProgress)}% complete</small>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <Alert variant="danger" className="m-3">
        <AlertTriangle size={20} className="me-2" />
        <strong>Error Loading Protein Data</strong>
        <p className="mb-2 mt-2">{loadError}</p>
        <hr />
        <div className="small">
          <strong>Troubleshooting:</strong>
          <ul className="mb-0 mt-2">
            <li>Make sure the file `/public/protein_data.json` exists</li>
            <li>Verify the JSON file contains a valid array of protein objects</li>
            <li>Check the browser console for more detailed error information</li>
          </ul>
        </div>
        <Button variant="outline-danger" size="sm" className="mt-3" onClick={() => window.location.reload()}>
          Retry Loading
        </Button>
      </Alert>
    )
  }

  const isShowingInitialSubset = !query.trim() && selectedSpecies === "all"
  const hasFullDataset = allProteins.length > 0
  const displayCount = displayProteins.length

  return (
    <section className="bg-primary rounded p-4 m-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 font-monospace mb-0 text-white">
          Sequence Explorer
          <span className="text-white-50 fs-6 ms-2">
            (Showing {filteredData.length} of 6 results from {displayCount.toLocaleString()}{" "}
            {isShowingInitialSubset && hasFullDataset ? `of ${totalEntries.toLocaleString()} total` : "found"})
          </span>
        </h2>
        <div className="d-flex align-items-center gap-2">
          {(isSearching || backgroundLoading) && (
            <Loader className="spinner-border spinner-border-sm text-white" size={16} />
          )}
          <Zap size={16} className="text-white" />
        </div>
      </div>

      {/* Background loading indicator */}
      {backgroundLoading && (
        <Alert variant="success" className="py-2 mb-3">
          <Zap size={16} className="me-2" />
          <strong>Fast Loading Active:</strong> Showing first {INITIAL_DISPLAY_SIZE} entries immediately. Full dataset
          loading in background for complete search capability.
          <div className="mt-2">
            <ProgressBar now={loadingProgress} size="sm" />
            <small>{loadingStatus}</small>
          </div>
        </Alert>
      )}

      {/* Performance info */}
      {isShowingInitialSubset && hasFullDataset && !backgroundLoading && (
        <Alert variant="info" className="py-2 mb-3">
          <Database size={16} className="me-2" />
          <strong>Ready:</strong> Showing first {INITIAL_DISPLAY_SIZE.toLocaleString()} entries of{" "}
          {totalEntries.toLocaleString()} total. Search works across the entire dataset.
        </Alert>
      )}

      {copySuccess && (
        <Alert variant="success" className="py-2 mb-3">
          Sequence copied to clipboard!
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="position-relative">
            <Search
              className="position-absolute text-muted"
              size={16}
              style={{ left: "12px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
            />
            <Form.Control
              type="text"
              placeholder={hasFullDataset ? "Search across all proteins..." : "Search current proteins..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: "40px", backgroundColor: "rgba(255,255,255,0.9)" }}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="col-md-4">
          <Form.Select
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
            style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
          >
            <option value="all">All Species ({species.length} available)</option>
            {species.map((sp) => (
              <option key={sp} value={sp}>
                {sp.charAt(0).toUpperCase() + sp.slice(1)}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="col-md-4">
          <Form.Select
            value={sequenceType}
            onChange={(e) => setSequenceType(e.target.value)}
            style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
          >
            <option value="protein">Protein Sequence</option>
            <option value="nucleotide">Nucleotide Sequence</option>
          </Form.Select>
        </div>
      </div>

      {/* Results */}
      <div
        className="d-flex flex-column gap-3"
        style={{
          height: "480px",
          overflowY: "auto",
        }}
      >
        {filteredData.map((entry, index) => {
          const currentSequence = sequenceType === "protein" ? entry.protein : entry.nucleotide
          const hasSequence = currentSequence && currentSequence.length > 0

          return (
            <Card key={`${entry.id}-${index}`} className="bg-light border-0 flex-shrink-0">
              <Card.Body className="p-3">
                <Button
                  variant="link"
                  onClick={() => handleToggle(index)}
                  className="text-primary text-decoration-none p-0 d-flex align-items-center justify-content-between w-100 text-start"
                >
                  <div className="d-flex flex-column align-items-start gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-dark">{entry.id}</span>
                      <Badge bg="secondary" className="text-xs">
                        {entry.species}
                      </Badge>
                      {!hasSequence && (
                        <Badge bg="warning" className="text-xs">
                          No {sequenceType}
                        </Badge>
                      )}
                    </div>
                    {entry.annotations && entry.annotations.length > 0 && (
                      <div className="d-flex flex-wrap gap-1">
                        {entry.annotations.slice(0, 2).map((ann, idx) => (
                          <Badge key={idx} bg="info" className="text-xs">
                            {ann.KO}
                          </Badge>
                        ))}
                        {entry.annotations.length > 2 && (
                          <Badge bg="info" className="text-xs">
                            +{entry.annotations.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {expandedIndex === index ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>

                {expandedIndex === index && (
                  <div className="mt-4">
                    {/* Annotations */}
                    {entry.annotations && entry.annotations.length > 0 ? (
                      <div className="mb-4">
                        <h5 className="fw-semibold text-dark mb-2">
                          Functional Annotations ({entry.annotations.length}):
                        </h5>
                        <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {entry.annotations.map((ann, idx) => (
                            <div key={idx} className="bg-white border rounded p-2">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <code className="text-primary fw-bold">{ann.KO || "N/A"}</code>
                                <small className="text-muted">E-value: {ann.evalue}</small>
                              </div>
                              <p className="text-dark mb-0 small">{ann.definition}</p>
                              <div className="d-flex gap-2 mt-1">
                                <small className="text-muted">Score: {ann.score}</small>
                                <small className="text-muted">Threshold: {ann.threshold}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <h5 className="fw-semibold text-dark mb-2">Functional Annotations:</h5>
                        <div className="bg-white border rounded p-3 text-center text-muted">
                          <p className="mb-0">No functional annotations available</p>
                          <small>This sequence has not been annotated yet</small>
                        </div>
                      </div>
                    )}

                    {/* Sequence */}
                    <div className="mb-3">
                      <h5 className="fw-semibold text-dark mb-2">
                        {sequenceType === "protein" ? "Protein" : "Nucleotide"} Sequence:
                        {hasSequence && <small className="text-muted ms-2">({currentSequence.length} chars)</small>}
                      </h5>
                      {hasSequence ? (
                        <>
                          <pre
                            className="bg-dark text-success p-3 rounded small"
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              maxHeight: "150px",
                              overflowY: "auto",
                              fontFamily: "monospace",
                            }}
                          >
                            {currentSequence}
                          </pre>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleCopy(currentSequence)}
                            className="mt-2 d-flex align-items-center gap-2"
                          >
                            <Copy size={14} />
                            Copy {sequenceType === "protein" ? "Protein" : "Nucleotide"} Sequence
                          </Button>
                        </>
                      ) : (
                        <div className="bg-white border rounded p-3 text-center text-muted">
                          <p className="mb-0">
                            No {sequenceType === "protein" ? "protein" : "nucleotide"} sequence available
                          </p>
                          <small>
                            Try switching to {sequenceType === "protein" ? "nucleotide" : "protein"} sequence
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )
        })}

        {/* Empty state */}
        {filteredData.length === 0 && displayProteins.length === 0 && !isSearching && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No protein data available</p>
              <p className="small">Waiting for data to load...</p>
            </div>
          </div>
        )}

        {/* No search results */}
        {filteredData.length === 0 && displayProteins.length > 0 && !isSearching && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No matching entries found</p>
              <p className="small">
                {query ? `No results for "${query}"` : "Try searching for a protein ID, KO term, or function"}
              </p>
              {query && (
                <Button variant="outline-light" size="sm" onClick={() => setQuery("")} className="mt-2">
                  Clear Search
                </Button>
              )}
            </div
          </div>
        )}
      </div>

      {/* Search tips */}
      <div className="mt-3 text-center">
        <small className="text-white-50">
          💡 Try searching: "AF_TRINITY", "K00521", "ferric", "phytepsin"
          {hasFullDataset && ` (searches across all ${totalEntries.toLocaleString()} proteins)`}
        </small>
      </div>
    </section>
  )
}

export default ProteinViewer
