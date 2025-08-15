"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import Card from "react-bootstrap/Card"
import Button from "react-bootstrap/Button"
import Form from "react-bootstrap/Form"
import Alert from "react-bootstrap/Alert"
import Badge from "react-bootstrap/Badge"
import ProgressBar from "react-bootstrap/ProgressBar"
import { Copy, ChevronDown, ChevronRight, Search, AlertTriangle, Loader, Layers, ChevronLeft } from "lucide-react"

// Extract root ID from isoform ID (e.g., "MSTRG.9923.1.p1" -> "MSTRG.9923")
const extractRootId = (id) => {
  if (!id) return null
  // Handle patterns like "MSTRG.9923.1.p1" or "MSTRG.9923.1"
  const match = id.match(/^([^.]+\.\d+)/)
  return match ? match[1] : id
}

// Extract isoform number from ID (e.g., "MSTRG.9923.1.p1" -> "1")
const extractIsoformNumber = (id) => {
  if (!id) return "1"
  const match = id.match(/^[^.]+\.\d+\.(\d+)/)
  return match ? match[1] : "1"
}

// Flexible data normalization functions
const normalizeProteinEntry = (id, proteinData, nucleotideData, annotations, index) => {
  if (!id) {
    return null
  }

  try {
    const normalized = {
      id: String(id),
      rootId: extractRootId(id),
      isoform: extractIsoformNumber(id),
      species: extractSpeciesFromId(id),
      protein: proteinData?.sequence || "",
      nucleotide: nucleotideData?.sequence || "",
      proteinDescription: proteinData?.description || "",
      nucleotideDescription: nucleotideData?.description || "",
      annotations: [],
    }

    if (Array.isArray(annotations)) {
      normalized.annotations = annotations
        .map((ann, annIndex) => normalizeAnnotation(ann, index, annIndex))
        .filter((ann) => ann !== null)
    }

    return normalized
  } catch (error) {
    console.warn(`Error normalizing entry ${id}:`, error)
    return null
  }
}

// Extract species information from ID
const extractSpeciesFromId = (id) => {
  if (id.includes("_")) {
    const parts = id.split("_")
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase()
      if (part.length >= 3 && !part.match(/^\d+$/)) {
        return part
      }
    }
  }

  const match = id.match(/^([A-Za-z]+)/)
  return match ? match[1].toLowerCase() : "unknown"
}

const normalizeAnnotation = (annotation, entryIndex, annIndex) => {
  if (!annotation || typeof annotation !== "object") {
    return null
  }

  try {
    const database = annotation.database || "Unknown"
    const feature = annotation.feature || annotation.description || "No feature available"
    const feature_id = annotation.feature_id || annotation.id || ""
    let evalue = annotation.evalue || "N/A"
    let score = annotation.score || 0

    if (typeof evalue === "string" && evalue !== "-" && evalue !== "N/A") {
      try {
        const numValue = Number.parseFloat(evalue)
        if (!isNaN(numValue) && numValue !== 0) {
          evalue = numValue.toExponential(2)
        }
      } catch (e) {
        // Keep original if conversion fails
      }
    }

    if (typeof score === "string") {
      const numScore = Number.parseFloat(score)
      score = isNaN(numScore) ? 0 : numScore
    }

    return {
      database: String(database),
      feature: String(feature),
      feature_id: String(feature_id),
      evalue: String(evalue),
      score: Number(score),
    }
  } catch (error) {
    console.warn(`Error normalizing annotation:`, error)
    return null
  }
}

function ProteinViewer() {
  const [allProteins, setAllProteins] = useState([])
  const [groupedProteins, setGroupedProteins] = useState([])
  const [displayProteins, setDisplayProteins] = useState([])
  const [locusAnnotations, setLocusAnnotations] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState("Initializing...")
  const [loadError, setLoadError] = useState(null)
  const [query, setQuery] = useState("")
  const [selectedSpecies, setSelectedSpecies] = useState("all")
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [expandedIsoforms, setExpandedIsoforms] = useState({})
  const [copySuccess, setCopySuccess] = useState(false)
  const [sequenceType, setSequenceType] = useState("protein")
  const [dataErrors, setDataErrors] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadingDetails, setLoadingDetails] = useState({
    proteins: false,
    nucleotides: false,
    annotations: false,
    locus: false,
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)

  const INITIAL_DISPLAY_SIZE = 500

  // Load and process protein data from four separate files
  const loadProteinData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      setLoadingStatus("Fetching database files...")
      setLoadingProgress(5)

      const files = [
        { name: "protein_seqs.json", key: "proteins" },
        { name: "nucleotide_seqs.json", key: "nucleotides" },
        { name: "annotations.json", key: "annotations" },
        { name: "locus__annotations.json", key: "locus" },
      ]

      const loadedData = {}
      const errors = []

      setLoadingStatus("Loading JSON files...")
      setLoadingProgress(10)

      const loadPromises = files.map(async (file, index) => {
        try {
          setLoadingDetails((prev) => ({ ...prev, [file.key]: "loading" }))

          console.log(`Loading ${file.name}...`)
          const response = await fetch(`/${file.name}`)
          if (!response.ok) {
            throw new Error(`Failed to load ${file.name}: ${response.status} ${response.statusText}`)
          }

          const text = await response.text()
          console.log(`${file.name} loaded, text length: ${text.length}`)

          setLoadingStatus(`Parsing ${file.name}...`)
          const data = JSON.parse(text)

          console.log(`${file.name} parsed successfully`)

          loadedData[file.key] = data
          setLoadingDetails((prev) => ({ ...prev, [file.key]: "complete" }))

          const progressStep = 60 / files.length
          setLoadingProgress(10 + (index + 1) * progressStep)

          return {
            file: file.name,
            success: true,
            count: Array.isArray(data) ? data.length : Object.keys(data).length,
          }
        } catch (error) {
          console.error(`Error loading ${file.name}:`, error)
          errors.push(`${file.name}: ${error.message}`)
          setLoadingDetails((prev) => ({ ...prev, [file.key]: "error" }))
          return { file: file.name, success: false, error: error.message }
        }
      })

      setLoadingStatus("Processing database files...")
      const results = await Promise.all(loadPromises)

      const successfulLoads = results.filter((r) => r.success)
      if (successfulLoads.length === 0) {
        throw new Error("Failed to load any database files: " + errors.join("; "))
      }

      console.log("Load results:", results)

      setLoadingProgress(75)
      setLoadingStatus("Merging and normalizing data...")

      setLocusAnnotations(loadedData.locus || {})

      const mergedData = mergeProteinData(loadedData.proteins, loadedData.nucleotides, loadedData.annotations)

      setLoadingProgress(85)
      setLoadingStatus("Grouping by locus...")

      const grouped = groupProteinsByLocus(mergedData, loadedData.locus || {})

      setLoadingProgress(90)
      setLoadingStatus("Finalizing...")

      setAllProteins(mergedData)
      setGroupedProteins(grouped)
      setDisplayProteins(grouped.slice(0, INITIAL_DISPLAY_SIZE))
      setTotalEntries(grouped.length)

      if (errors.length > 0) {
        setDataErrors(errors)
      }

      setLoadingProgress(100)
      setLoadingStatus("Complete!")
      setLoading(false)

      console.log(
        `Successfully loaded and processed ${mergedData.length} protein entries into ${grouped.length} locus groups`,
      )
    } catch (error) {
      console.error("Error loading protein data:", error)
      setLoadError(error.message)
      setLoading(false)
    }
  }

  const mergeProteinData = (proteins, nucleotides, annotations) => {
    const mergedMap = new Map()

    const allIds = new Set()

    if (proteins && typeof proteins === "object") {
      Object.keys(proteins).forEach((id) => allIds.add(id))
    }

    if (nucleotides && typeof nucleotides === "object") {
      Object.keys(nucleotides).forEach((id) => allIds.add(id))
    }

    if (annotations && typeof annotations === "object") {
      Object.keys(annotations).forEach((id) => allIds.add(id))
    }

    console.log(`Found ${allIds.size} unique protein IDs across all databases`)

    allIds.forEach((id) => {
      const proteinData = proteins?.[id] || null
      const nucleotideData = nucleotides?.[id] || null
      const annotationData = annotations?.[id] || []

      const normalized = normalizeProteinEntry(id, proteinData, nucleotideData, annotationData, 0)
      if (normalized) {
        mergedMap.set(id, normalized)
      }
    })

    return Array.from(mergedMap.values())
  }

  const groupProteinsByLocus = (proteins, locusAnnotations) => {
    const locusGroups = new Map()

    proteins.forEach((protein) => {
      const rootId = protein.rootId

      if (!locusGroups.has(rootId)) {
        const functionalAnnotation = locusAnnotations[rootId] || "Unknown Function"

        locusGroups.set(rootId, {
          rootId,
          functionalAnnotation,
          isoforms: [],
          totalIsoforms: 0,
          species: new Set(),
          databases: new Set(),
        })
      }

      const group = locusGroups.get(rootId)
      group.isoforms.push(protein)
      group.totalIsoforms++
      group.species.add(protein.species)

      protein.annotations.forEach((ann) => {
        group.databases.add(ann.database)
      })
    })

    return Array.from(locusGroups.values())
      .map((group) => ({
        ...group,
        species: Array.from(group.species),
        databases: Array.from(group.databases),
      }))
      .sort((a, b) => b.totalIsoforms - a.totalIsoforms)
  }

  useEffect(() => {
    loadProteinData()
  }, [])

  const performSearch = useCallback(
    async (searchQuery, speciesFilter) => {
      if (!searchQuery.trim() && speciesFilter === "all") {
        setDisplayProteins(groupedProteins.slice(0, INITIAL_DISPLAY_SIZE))
        return
      }

      setIsSearching(true)

      const results = groupedProteins.filter((group) => {
        const matchesSpecies = speciesFilter === "all" || group.species.includes(speciesFilter)

        if (!searchQuery.trim()) return matchesSpecies

        const queryLower = searchQuery.toLowerCase().trim()

        const matchesFunctionalAnnotation = group.functionalAnnotation.toLowerCase().includes(queryLower)
        const matchesRootId = group.rootId.toLowerCase().includes(queryLower)
        const matchesIsoformId = group.isoforms.some((isoform) => isoform.id.toLowerCase().includes(queryLower))
        const matchesDatabase = group.databases.some((db) => db.toLowerCase().includes(queryLower))
        const matchesAnnotation = group.isoforms.some((isoform) =>
          isoform.annotations.some(
            (ann) =>
              ann.feature.toLowerCase().includes(queryLower) || ann.feature_id.toLowerCase().includes(queryLower),
          ),
        )

        return (
          matchesSpecies &&
          (matchesFunctionalAnnotation || matchesRootId || matchesIsoformId || matchesDatabase || matchesAnnotation)
        )
      })

      setDisplayProteins(results.slice(0, 2000))
      setIsSearching(false)
    },
    [groupedProteins],
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query, selectedSpecies)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, selectedSpecies, performSearch])

  const handleToggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const handleIsoformToggle = (groupIndex, isoformId) => {
    const key = `${groupIndex}-${isoformId}`
    setExpandedIsoforms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
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

  const species = useMemo(() => {
    const speciesSet = new Set()
    displayProteins.forEach((group) => {
      group.species.forEach((sp) => speciesSet.add(sp))
    })
    return Array.from(speciesSet).sort()
  }, [displayProteins])

  const filteredData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return displayProteins.slice(startIndex, endIndex)
  }, [displayProteins, currentPage, itemsPerPage])

  const totalPages = Math.ceil(displayProteins.length / itemsPerPage)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  useEffect(() => {
    setCurrentPage(1)
    setExpandedIndex(null)
    setExpandedIsoforms({})
  }, [query, selectedSpecies])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="text-center" style={{ minWidth: "400px" }}>
          <Loader className="spinner-border text-primary mb-3" size={32} />
          <h5 className="text-white">Loading Multi-Database System</h5>
          <p className="text-white mb-3">{loadingStatus}</p>
          <ProgressBar now={loadingProgress} className="mb-3" />
          <small className="text-white mb-3 d-block">{Math.round(loadingProgress)}% complete</small>

          <div className="text-start bg-light p-3 rounded">
            <h6 className="mb-2 text-dark">Database Files:</h6>
            <div className="d-flex flex-column gap-1">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-dark">Protein Sequences:</span>
                <Badge
                  bg={
                    loadingDetails.proteins === "complete"
                      ? "success"
                      : loadingDetails.proteins === "error"
                        ? "danger"
                        : "secondary"
                  }
                >
                  {loadingDetails.proteins === "complete"
                    ? "Loaded"
                    : loadingDetails.proteins === "error"
                      ? "Error"
                      : "Loading..."}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-dark">Nucleotide Sequences:</span>
                <Badge
                  bg={
                    loadingDetails.nucleotides === "complete"
                      ? "success"
                      : loadingDetails.nucleotides === "error"
                        ? "danger"
                        : "secondary"
                  }
                >
                  {loadingDetails.nucleotides === "complete"
                    ? "Loaded"
                    : loadingDetails.nucleotides === "error"
                      ? "Error"
                      : "Loading..."}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-dark">Annotations:</span>
                <Badge
                  bg={
                    loadingDetails.annotations === "complete"
                      ? "success"
                      : loadingDetails.annotations === "error"
                        ? "danger"
                        : "secondary"
                  }
                >
                  {loadingDetails.annotations === "complete"
                    ? "Loaded"
                    : loadingDetails.annotations === "error"
                      ? "Error"
                      : "Loading..."}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-dark">Locus Annotations:</span>
                <Badge
                  bg={
                    loadingDetails.locus === "complete"
                      ? "success"
                      : loadingDetails.locus === "error"
                        ? "danger"
                        : "secondary"
                  }
                >
                  {loadingDetails.locus === "complete"
                    ? "Loaded"
                    : loadingDetails.locus === "error"
                      ? "Error"
                      : "Loading..."}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert variant="danger" className="m-3">
        <AlertTriangle size={20} className="me-2" />
        <strong>Error Loading Multi-Database System</strong>
        <p className="mb-2 mt-2">{loadError}</p>

        {dataErrors.length > 0 && (
          <div className="mt-3">
            <strong>File-specific errors:</strong>
            <ul className="mb-0 mt-2">
              {dataErrors.map((error, idx) => (
                <li key={idx} className="small">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr />
        <div className="small">
          <strong>Troubleshooting:</strong>
          <ul className="mb-0 mt-2">
            <li>
              Make sure these files exist in `/public/`: protein_seqs.json, nucleotide_seqs.json, annotations.json,
              locus__annotations.json
            </li>
            <li>Verify the JSON files contain valid data structures</li>
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
  const hasFullDataset = groupedProteins.length > 0
  const displayCount = displayProteins.length

  return (
    <section className="bg-primary rounded p-4 m-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 font-monospace mb-0 text-white">
          Locus-Based Protein Explorer
          <span className="text-white-50 fs-6 ms-2">
            (Page {currentPage} of {totalPages}: showing {filteredData.length} of {displayCount.toLocaleString()}{" "}
            {isShowingInitialSubset ? `of ${totalEntries.toLocaleString()} total` : "found"})
          </span>
        </h2>
        <div className="d-flex align-items-center gap-2">
          {isSearching && <Loader className="spinner-border spinner-border-sm text-white" size={16} />}
          <Layers size={16} className="text-white" />
        </div>
      </div>

      {isShowingInitialSubset && groupedProteins.length > 0 && (
        <Alert variant="info" className="py-2 mb-3">
          <Layers size={16} className="me-2" />
          <strong>Locus Groups Loaded:</strong> Showing first {INITIAL_DISPLAY_SIZE.toLocaleString()} loci of{" "}
          {totalEntries.toLocaleString()} total, organized by gene locus with isoforms grouped together.
        </Alert>
      )}

      {dataErrors.length > 0 && (
        <Alert variant="warning" className="py-2 mb-3">
          <AlertTriangle size={16} className="me-2" />
          <strong>Partial Load:</strong> Some database files had issues: {dataErrors.length} error(s). System is running
          with available data.
        </Alert>
      )}

      {copySuccess && (
        <Alert variant="success" className="py-2 mb-3">
          Sequence copied to clipboard!
        </Alert>
      )}

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
              placeholder="Search functions, loci, IDs, databases..."
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
                {sp === "evm"
                  ? "A. H11648 (LGE03) *EVM"
                  : sp === "mstrg"
                    ? "A. H11648 (LGE03) *MSTRG"
                    : sp.charAt(0).toUpperCase() + sp.slice(1)}
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

      {displayProteins.length > itemsPerPage && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!hasPrevPage}
              className="d-flex align-items-center gap-1"
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!hasNextPage}
              className="d-flex align-items-center gap-1"
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
          <div className="text-white-50 small">
            Page {currentPage} of {totalPages} ({displayCount.toLocaleString()} total results)
          </div>
        </div>
      )}

      <div
        className="d-flex flex-column gap-3"
        style={{
          height: "480px",
          overflowY: "auto",
        }}
      >
        {filteredData.map((group, groupIndex) => (
          <Card key={`${group.rootId}-${groupIndex}`} className="bg-light border-0 flex-shrink-0">
            <Card.Body className="p-3">
              <Button
                variant="link"
                onClick={() => handleToggle(groupIndex)}
                className="text-primary text-decoration-none p-0 d-flex align-items-center justify-content-between w-100 text-start"
              >
                <div className="d-flex flex-column align-items-start gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-dark fs-5">{group.functionalAnnotation}</span>
                    <Badge bg="outline-secondary" className="text-xs">
                      {group.rootId}
                    </Badge>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="success" className="text-xs">
                      {group.totalIsoforms} isoforms
                    </Badge>
                    {group.databases.slice(0, 3).map((db, idx) => (
                      <Badge key={idx} bg="info" className="text-xs">
                        {db}
                      </Badge>
                    ))}
                    {group.databases.length > 3 && (
                      <Badge bg="info" className="text-xs">
                        +{group.databases.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                {expandedIndex === groupIndex ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>

              {expandedIndex === groupIndex && (
                <div className="mt-4">
                  <h6 className="fw-semibold text-dark mb-3">
                    Isoforms for {group.rootId} ({group.totalIsoforms}):
                  </h6>

                  <div className="d-flex flex-column gap-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {group.isoforms.map((isoform, isoformIndex) => {
                      const isoformKey = `${groupIndex}-${isoform.id}`
                      const isIsoformExpanded = expandedIsoforms[isoformKey]
                      const currentSequence = sequenceType === "protein" ? isoform.protein : isoform.nucleotide
                      const hasSequence = currentSequence && currentSequence.length > 0

                      return (
                        <div key={isoform.id} className="bg-white border rounded p-2">
                          <Button
                            variant="link"
                            onClick={() => handleIsoformToggle(groupIndex, isoform.id)}
                            className="text-primary text-decoration-none p-0 d-flex align-items-center justify-content-between w-100 text-start"
                          >
                            <div className="d-flex align-items-center gap-2">
                              <code className="text-dark fw-semibold">{isoform.id}</code>
                              <Badge bg="outline-secondary" className="text-xs">
                                Isoform {isoform.isoform}
                              </Badge>
                              <Badge bg="secondary" className="text-xs">
                                {isoform.species}
                              </Badge>
                              {isoform.annotations.length > 0 && (
                                <Badge bg="info" className="text-xs">
                                  {isoform.annotations.length} annotations
                                </Badge>
                              )}
                              {!hasSequence && (
                                <Badge bg="warning" className="text-xs">
                                  No {sequenceType}
                                </Badge>
                              )}
                            </div>
                            {isIsoformExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </Button>

                          {isIsoformExpanded && (
                            <div className="mt-3">
                              {isoform.annotations && isoform.annotations.length > 0 ? (
                                <div className="mb-3">
                                  <h6 className="fw-semibold text-dark mb-2">
                                    Additional Annotations ({isoform.annotations.length}):
                                  </h6>
                                  <div
                                    className="d-flex flex-column gap-1"
                                    style={{ maxHeight: "150px", overflowY: "auto" }}
                                  >
                                    {isoform.annotations.map((ann, idx) => (
                                      <div key={idx} className="bg-light border rounded p-2">
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                          <div className="d-flex flex-column">
                                            <code className="text-primary fw-bold small">
                                              {ann.feature_id || "N/A"}
                                            </code>
                                            <small className="text-muted">{ann.database}</small>
                                          </div>
                                          <small className="text-muted">E-value: {ann.evalue}</small>
                                        </div>
                                        <p className="text-dark mb-0 small">{ann.feature}</p>
                                        <small className="text-muted">Score: {ann.score}</small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-3">
                                  <h6 className="fw-semibold text-dark mb-2">Additional Annotations:</h6>
                                  <div className="bg-light border rounded p-2 text-center text-muted">
                                    <small>No additional annotations available</small>
                                  </div>
                                </div>
                              )}

                              <div className="mb-2">
                                <h6 className="fw-semibold text-dark mb-2">
                                  {sequenceType === "protein" ? "Protein" : "Nucleotide"} Sequence:
                                  {hasSequence && (
                                    <small className="text-muted ms-2">({currentSequence.length} chars)</small>
                                  )}
                                </h6>
                                {hasSequence ? (
                                  <>
                                    <pre
                                      className="bg-dark text-success p-2 rounded small"
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-all",
                                        maxHeight: "100px",
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
                                      <Copy size={12} />
                                      Copy Sequence
                                    </Button>
                                  </>
                                ) : (
                                  <div className="bg-light border rounded p-2 text-center text-muted">
                                    <small>
                                      No {sequenceType === "protein" ? "protein" : "nucleotide"} sequence available
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}

        {filteredData.length === 0 && displayProteins.length === 0 && !isSearching && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No locus data available</p>
              <p className="small">Waiting for databases to load...</p>
            </div>
          </div>
        )}

        {filteredData.length === 0 && displayProteins.length > 0 && !isSearching && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No matching loci found</p>
              <p className="small">
                {query ? `No results for "${query}"` : "Try searching for a function, locus ID, or database"}
              </p>
              {query && (
                <Button variant="outline-light" size="sm" onClick={() => setQuery("")} className="mt-2">
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {displayProteins.length > itemsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-light" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              First
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!hasPrevPage}
              className="d-flex align-items-center gap-1"
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <span className="text-white-50 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!hasNextPage}
              className="d-flex align-items-center gap-1"
            >
              Next
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
          <div className="text-white-50 small">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, displayCount)} of{" "}
            {displayCount.toLocaleString()} results
          </div>
        </div>
      )}

      <div className="mt-3 text-center">
        <small className="text-white-50">
          💡 Try searching: "PCD6", "ALIX", "MSTRG.9923", "CDD", "PANTHER"
          {hasFullDataset && ` (searches across all ${totalEntries.toLocaleString()} loci)`}
        </small>
      </div>
    </section>
  )
}

export default ProteinViewer
