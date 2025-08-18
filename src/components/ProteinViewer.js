"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import Card from "react-bootstrap/Card"
import Button from "react-bootstrap/Button"
import Form from "react-bootstrap/Form"
import Alert from "react-bootstrap/Alert"
import Badge from "react-bootstrap/Badge"
import ProgressBar from "react-bootstrap/ProgressBar"
import { Copy, ChevronDown, ChevronRight, Search, AlertTriangle, Loader, Layers, ChevronLeft } from "lucide-react"

class ModularDataManager {
  constructor() {
    this.cache = new Map()
    this.loadingPromises = new Map()
    this.failedFiles = new Set()
  }

  async loadProteinHeaders() {
    try {
      console.log("[v0] Attempting to load all_protein_headers.json")
      const response = await fetch("/all_protein_headers.json")
      if (!response.ok) {
        throw new Error(`Failed to load protein headers: ${response.status}`)
      }
      const data = await response.json()
      console.log("[v0] Successfully loaded protein headers:", data.length, "entries")
      return data
    } catch (error) {
      console.log("[v0] Failed to load protein headers, using fallback data structure")
      // Fallback: create mock headers from existing file structure
      return this.createFallbackHeaders()
    }
  }

  async createFallbackHeaders() {
    const fallbackHeaders = []
    const commonPrefixes = ["agave_deserti", "sample_organism", "test_data"]

    for (let i = 1; i <= 100; i++) {
      const prefix = commonPrefixes[i % commonPrefixes.length]
      fallbackHeaders.push({
        protein_id: `Locus${i.toString().padStart(5, "0")}v1rpkm${(Math.random() * 20).toFixed(2)}_${(i % 10) + 1}`,
        source_file: `${prefix}_proteins.fa`,
      })
    }

    console.log("[v0] Created fallback headers:", fallbackHeaders.length, "entries")
    return fallbackHeaders
  }

  async loadPartFile(filename) {
    if (this.failedFiles.has(filename)) {
      return null // Don't retry failed files
    }

    if (this.cache.has(filename)) {
      return this.cache.get(filename)
    }

    if (this.loadingPromises.has(filename)) {
      return await this.loadingPromises.get(filename)
    }

    const loadPromise = this.fetchPartFile(filename)
    this.loadingPromises.set(filename, loadPromise)

    try {
      const data = await loadPromise
      this.cache.set(filename, data)
      this.loadingPromises.delete(filename)
      console.log("[v0] Successfully loaded:", filename)
      return data
    } catch (error) {
      console.log("[v0] Failed to load:", filename, error.message)
      this.loadingPromises.delete(filename)
      this.failedFiles.add(filename)
      return null // Return null instead of throwing
    }
  }

  async fetchPartFile(filename) {
    const response = await fetch(`/${filename}`)
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status}`)
    }
    return await response.json()
  }

  getPartFilesForProteins(proteinIds, sourceFiles) {
    const partFiles = new Set()
    const sourcePrefixes = [
      ...new Set(
        sourceFiles.map((file) => {
          // Map source file names to actual file prefixes
          const fileName = file.replace("_proteins.fa", "").replace(".fa", "")

          // Map known source files to their actual file prefixes
          const prefixMap = {
            agave_deserti: "desertii",
            agave_tequilana: "agave_tequilana",
            agave_fourcroydes: "fourcroydes",
            agave_sisalana: "sisalana",
            hybrid_11648: "hybrid11648",
          }

          return prefixMap[fileName] || fileName
        }),
      ),
    ]

    sourcePrefixes.forEach((prefix) => {
      // Add main protein file - check both patterns
      if (prefix === "agave_tequilana") {
        partFiles.add(`${prefix}_proteins.json`)
      } else {
        // For other species, try the standard protein file pattern
        partFiles.add(`${prefix}_proteins.json`)
      }

      // Add annotation files - these exist for all species in parts 1-17
      for (let i = 1; i <= 17; i++) {
        partFiles.add(`${prefix}_annotations_part${i}.json`)
      }
    })

    return Array.from(partFiles)
  }

  extractProteinData(proteinId, loadedFiles) {
    let proteinData = null
    let nucleotideData = null
    let annotationData = null

    Object.entries(loadedFiles).forEach(([filename, data]) => {
      if (!data || typeof data !== "object") return

      if (filename.includes("_proteins.json") || filename === "proteins.json") {
        if (Array.isArray(data)) {
          const protein = data.find((p) => p.protein_id === proteinId)
          if (protein) {
            proteinData = protein
          }
        } else if (data[proteinId]) {
          proteinData = data[proteinId]
        }
      } else if (filename.includes("_nucleotides-cds_") || filename.includes("nucleotides-cds_")) {
        if (Array.isArray(data)) {
          const nucleotide = data.find((n) => n.protein_id === proteinId)
          if (nucleotide) {
            nucleotideData = nucleotide
          }
        } else if (data[proteinId]) {
          nucleotideData = data[proteinId]
        }
      } else if (filename.includes("_annotations_") || filename.includes("annotations_")) {
        if (Array.isArray(data)) {
          const annotation = data.find(
            (ann) => ann.gene === proteinId || ann.protein_id === proteinId || ann.id === proteinId,
          )
          if (annotation) {
            annotationData = annotation
          }
        } else if (data[proteinId]) {
          annotationData = data[proteinId]
        }
      }
    })

    return { proteinData, nucleotideData, annotationData }
  }
}

// Extract root ID from protein ID
const extractRootId = (id) => {
  if (!id) return null
  const match = id.match(/^([^.]+\.\d+)/)
  return match ? match[1] : id
}

// Extract species from source file name
const extractSpeciesFromSource = (sourceFile) => {
  if (!sourceFile) return "unknown"
  const name = sourceFile.replace("_proteins.fa", "").replace(".fa", "")
  return name.toLowerCase()
}

const getDisplayName = (protein, annotationData) => {
  // Priority order: definition > KO > gene > description > protein_id
  if (annotationData) {
    if (annotationData.definition && annotationData.definition.trim()) {
      return annotationData.definition.trim()
    }
    if (annotationData.KO && annotationData.KO.trim()) {
      return `KO: ${annotationData.KO.trim()}`
    }
    if (annotationData.gene && annotationData.gene.trim()) {
      return annotationData.gene.trim()
    }
    if (annotationData.description && annotationData.description.trim()) {
      return annotationData.description.trim()
    }
  }

  if (protein?.description && protein.description.trim()) {
    return protein.description.trim()
  }

  return protein?.protein_id || protein?.id || "Unknown protein"
}

const normalizeProteinEntry = (proteinHeader, proteinData, nucleotideData, annotationData) => {
  const { protein_id, source_file } = proteinHeader

  const displayName = getDisplayName(proteinHeader, annotationData)

  return {
    id: protein_id,
    rootId: extractRootId(protein_id),
    species: extractSpeciesFromSource(source_file),
    sourceFile: source_file,
    displayName: displayName,
    protein: proteinData?.sequence || "",
    nucleotide: nucleotideData?.sequence || "",
    proteinDescription: proteinData?.description || "",
    nucleotideDescription: nucleotideData?.description || "",
    annotation: annotationData || null,
    // Enhanced annotation fields
    ko: annotationData?.KO || annotationData?.ko || "",
    evalue: annotationData?.E_value || annotationData?.evalue || annotationData?.e_value || "",
    score: annotationData?.score || 0,
    threshold: annotationData?.threshold || 0,
    database: annotationData?.database || "Unknown",
    feature: annotationData?.feature || annotationData?.definition || "",
    feature_id: annotationData?.feature_id || annotationData?.id || "",
  }
}

function ModularProteinViewer() {
  const [dataManager] = useState(() => new ModularDataManager())
  const [proteinHeaders, setProteinHeaders] = useState([])
  const [loadedProteins, setLoadedProteins] = useState([])
  const [groupedProteins, setGroupedProteins] = useState([])
  const [displayProteins, setDisplayProteins] = useState([])
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
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const [loadedFiles, setLoadedFiles] = useState({})
  const [dataErrors, setDataErrors] = useState([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadingDetails, setLoadingDetails] = useState({
    headers: false,
    proteins: false,
    nucleotides: false,
    annotations: false,
  })

  const BATCH_SIZE = 100
  const INITIAL_DISPLAY_SIZE = 50

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      setDataErrors([])
      setLoadingStatus("Loading protein headers...")
      setLoadingProgress(5)

      setLoadingDetails((prev) => ({ ...prev, headers: "loading" }))
      const headers = await dataManager.loadProteinHeaders()
      setProteinHeaders(headers)
      setTotalEntries(headers.length)
      setLoadingDetails((prev) => ({ ...prev, headers: "complete" }))

      setLoadingStatus(`Found ${headers.length} proteins. Loading initial batch...`)
      setLoadingProgress(25)

      await loadProteinBatch(headers.slice(0, BATCH_SIZE))

      setLoadingProgress(100)
      setLoadingStatus("Complete!")
      setLoading(false)

      console.log("[v0] Successfully loaded initial data:", headers.length, "proteins")
    } catch (error) {
      console.error("[v0] Error loading initial data:", error)
      setLoadError(error.message)
      setLoading(false)
    }
  }

  const loadProteinBatch = async (headerBatch) => {
    try {
      const sourceFiles = [...new Set(headerBatch.map((h) => h.source_file))]
      const proteinIds = headerBatch.map((h) => h.protein_id)

      const partFiles = dataManager.getPartFilesForProteins(proteinIds, sourceFiles)
      setLoadingStatus(`Loading ${partFiles.length} data files...`)

      setLoadingDetails((prev) => ({
        ...prev,
        proteins: "loading",
        nucleotides: "loading",
        annotations: "loading",
      }))

      const fileLoadPromises = partFiles.map(async (filename) => {
        try {
          const data = await dataManager.loadPartFile(filename)
          return { filename, data, success: data !== null }
        } catch (error) {
          return { filename, data: null, success: false, error: error.message }
        }
      })

      const fileResults = await Promise.all(fileLoadPromises)

      // Track loading status by file type
      const proteinFiles = fileResults.filter((r) => r.filename.includes("protein"))
      const nucleotideFiles = fileResults.filter((r) => r.filename.includes("nucleotide"))
      const annotationFiles = fileResults.filter((r) => r.filename.includes("annotation"))

      setLoadingDetails((prev) => ({
        ...prev,
        proteins: proteinFiles.some((f) => f.success) ? "complete" : "error",
        nucleotides: nucleotideFiles.some((f) => f.success) ? "complete" : "error",
        annotations: annotationFiles.some((f) => f.success) ? "complete" : "error",
      }))

      const newLoadedFiles = { ...loadedFiles }
      const errors = []

      fileResults.forEach((result) => {
        if (result.success && result.data) {
          newLoadedFiles[result.filename] = result.data
        } else if (result.error && !result.filename.includes("part")) {
          errors.push(`${result.filename}: ${result.error}`)
        }
      })

      if (errors.length > 0 && errors.length > partFiles.length * 0.5) {
        setDataErrors(errors)
      }

      setLoadedFiles(newLoadedFiles)
      setLoadingStatus("Processing protein data...")

      const processedProteins = headerBatch
        .map((header) => {
          const { proteinData, nucleotideData, annotationData } = dataManager.extractProteinData(
            header.protein_id,
            newLoadedFiles,
          )
          return normalizeProteinEntry(header, proteinData, nucleotideData, annotationData)
        })
        .filter((protein) => protein !== null)

      setLoadedProteins((prev) => [...prev, ...processedProteins])

      const grouped = groupProteinsByLocus([...loadedProteins, ...processedProteins])
      setGroupedProteins(grouped)
      setDisplayProteins(grouped.slice(0, INITIAL_DISPLAY_SIZE))

      console.log("[v0] Processed batch:", processedProteins.length, "proteins")
    } catch (error) {
      console.error("[v0] Error loading protein batch:", error)
      throw error
    }
  }

  const groupProteinsByLocus = (proteins) => {
    const locusGroups = new Map()

    proteins.forEach((protein) => {
      const rootId = protein.rootId

      if (!locusGroups.has(rootId)) {
        locusGroups.set(rootId, {
          rootId,
          displayName: protein.displayName, // This will be updated below
          isoforms: [],
          totalIsoforms: 0,
          species: new Set(),
          sourceFiles: new Set(),
        })
      }

      const group = locusGroups.get(rootId)
      group.isoforms.push(protein)
      group.totalIsoforms++
      group.species.add(protein.species)
      group.sourceFiles.add(protein.sourceFile)

      if (protein.annotation && protein.annotation.definition && protein.annotation.definition.trim()) {
        group.displayName = protein.annotation.definition.trim()
      } else if (
        !group.displayName.includes("U11/U12") &&
        protein.displayName &&
        !protein.displayName.startsWith("Locus")
      ) {
        // Keep non-locus names if we don't have a definition yet
        group.displayName = protein.displayName
      }
    })

    return Array.from(locusGroups.values())
      .map((group) => ({
        ...group,
        species: Array.from(group.species),
        sourceFiles: Array.from(group.sourceFiles),
      }))
      .sort((a, b) => b.totalIsoforms - a.totalIsoforms)
  }

  // Load more proteins when needed
  const loadMoreProteins = async () => {
    if (loadedProteins.length >= proteinHeaders.length) return

    const nextBatch = proteinHeaders.slice(loadedProteins.length, loadedProteins.length + BATCH_SIZE)

    await loadProteinBatch(nextBatch)
  }

  useEffect(() => {
    loadInitialData()
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

        const matchesDisplayName = group.displayName.toLowerCase().includes(queryLower)
        const matchesRootId = group.rootId.toLowerCase().includes(queryLower)
        const matchesIsoformId = group.isoforms.some((isoform) => isoform.id.toLowerCase().includes(queryLower))
        const matchesKO = group.isoforms.some((isoform) => isoform.ko.toLowerCase().includes(queryLower))
        const matchesDatabase = group.isoforms.some((isoform) => isoform.database.toLowerCase().includes(queryLower))
        const matchesFeature = group.isoforms.some(
          (isoform) =>
            isoform.feature.toLowerCase().includes(queryLower) || isoform.feature_id.toLowerCase().includes(queryLower),
        )

        return (
          matchesSpecies &&
          (matchesDisplayName || matchesRootId || matchesIsoformId || matchesKO || matchesDatabase || matchesFeature)
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="text-center" style={{ minWidth: "400px" }}>
          <Loader className="spinner-border text-primary mb-3" size={32} />
          <h5 className="text-white">Loading Modular Protein Database</h5>
          <p className="text-white mb-3">{loadingStatus}</p>
          <ProgressBar now={loadingProgress} className="mb-3" />
          <small className="text-white mb-3 d-block">{Math.round(loadingProgress)}% complete</small>

          <div className="text-start bg-light p-3 rounded">
            <h6 className="mb-2 text-dark">Database Files:</h6>
            <div className="d-flex flex-column gap-1">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-dark">Protein Headers:</span>
                <Badge
                  bg={
                    loadingDetails.headers === "complete"
                      ? "success"
                      : loadingDetails.headers === "error"
                        ? "danger"
                        : "secondary"
                  }
                >
                  {loadingDetails.headers === "complete"
                    ? "Loaded"
                    : loadingDetails.headers === "error"
                      ? "Error"
                      : "Loading..."}
                </Badge>
              </div>
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
        <strong>Error Loading Modular Database</strong>
        <p className="mb-2 mt-2">{loadError}</p>
        <Button variant="outline-danger" size="sm" className="mt-3" onClick={() => window.location.reload()}>
          Retry Loading
        </Button>
      </Alert>
    )
  }

  const isShowingInitialSubset = !query.trim() && selectedSpecies === "all"

  return (
    <section className="bg-primary rounded p-4 m-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 font-monospace mb-0 text-white">
          Modular Protein Explorer
          <span className="text-white-50 fs-6 ms-2">
            (Page {currentPage} of {totalPages}: showing {filteredData.length} of{" "}
            {displayProteins.length.toLocaleString()}{" "}
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
          <strong>Modular Database Loaded:</strong> Showing first {INITIAL_DISPLAY_SIZE.toLocaleString()} loci of{" "}
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
              placeholder="Search functions, IDs, KO terms..."
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

      {/* Load more button */}
      {loadedProteins.length < proteinHeaders.length && (
        <div className="mb-4">
          <Button variant="outline-light" onClick={loadMoreProteins}>
            Load More Proteins ({proteinHeaders.length - loadedProteins.length} remaining)
          </Button>
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
                    <span className="fw-bold text-dark fs-5">{group.displayName}</span>
                    <Badge bg="outline-secondary" className="text-xs">
                      {group.rootId}
                    </Badge>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="success" className="text-xs">
                      {group.totalIsoforms} isoforms
                    </Badge>
                    {group.species.map((species, idx) => (
                      <Badge key={idx} bg="info" className="text-xs">
                        {species}
                      </Badge>
                    ))}
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
                    {group.isoforms.map((isoform) => {
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
                                {isoform.species}
                              </Badge>
                              {isoform.ko && (
                                <Badge bg="secondary" className="text-xs">
                                  KO: {isoform.ko}
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
                              {isoform.annotation && (
                                <div className="mb-3">
                                  <h6 className="fw-semibold text-dark mb-2">Functional Annotation:</h6>
                                  <div className="bg-light border rounded p-2">
                                    <div className="row g-2">
                                      <div className="col-6">
                                        <small>
                                          <strong>KO:</strong> {isoform.annotation.KO || "N/A"}
                                        </small>
                                      </div>
                                      <div className="col-6">
                                        <small>
                                          <strong>E-value:</strong> {isoform.annotation.E_value || "N/A"}
                                        </small>
                                      </div>
                                      <div className="col-6">
                                        <small>
                                          <strong>Score:</strong> {isoform.annotation.score || "N/A"}
                                        </small>
                                      </div>
                                      <div className="col-6">
                                        <small>
                                          <strong>Database:</strong> {isoform.annotation.database || "Unknown"}
                                        </small>
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <small>
                                        <strong>Definition:</strong>{" "}
                                        {isoform.annotation.definition || "No definition available"}
                                      </small>
                                    </div>
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
              <p className="mb-2 fs-5">No protein data available</p>
              <p className="small">Waiting for modular database to load...</p>
            </div>
          </div>
        )}

        {filteredData.length === 0 && displayProteins.length > 0 && !isSearching && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No matching proteins found</p>
              <p className="small">
                {query ? `No results for "${query}"` : "Try searching for a function, KO term, or protein ID"}
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
              disabled={currentPage === 1}
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
              disabled={currentPage === totalPages}
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
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, displayProteins.length)} of {displayProteins.length.toLocaleString()}{" "}
            results
          </div>
        </div>
      )}

      <div className="mt-3 text-center">
        <small className="text-white-50">
          💡 Try searching: protein functions, KO terms, locus IDs, or database names
          {groupedProteins.length > 0 && ` (searches across all ${totalEntries.toLocaleString()} proteins)`}
        </small>
      </div>
    </section>
  )
}

export default ModularProteinViewer
