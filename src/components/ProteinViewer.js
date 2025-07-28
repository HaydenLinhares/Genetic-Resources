"use client"

import React, { useState, useMemo } from "react"
import Card from "react-bootstrap/Card"
import Button from "react-bootstrap/Button"
import Form from "react-bootstrap/Form"
import Alert from "react-bootstrap/Alert"
import Badge from "react-bootstrap/Badge"
import { Copy, ChevronDown, ChevronRight, Search } from "lucide-react"

// Sample data for testing
const sampleData = [
  {
    id: "AF_TRINITY_DN47274_c0_g1_i1.p1",
    species: "fourcroydes",
    protein: "",
    nucleotide:
      "ATGGAACAATTGAGGAGGCGGTCACATGCATTCACCGGAGAAGTAAATTTTGTACAAGAGGAGGACACACAATTGGAAACCACAAGAGCAAGATTGTCCAATGTTCTTAGAAGGCATGAAGAATTGAAGGAACGACTTTCAAGGGACTCAGATAAAATGATTTTTCTGCGTTTGCAAAAAGAATTCGAAGCTGCAAGAGCTGCTCAAACTGAAGAAATATCTTTGGAAGGCGAGCAGTGGAATGATGGGCTTCTAGCCACAATCCGGGAGAAGGTACACATGGAAGCTGATAGAATGACGATGTCCAACCAAGCAAGCATACCAGTGGATCCTATTCTTCAGGCAAAAGTTACTTATAGAATTGGGAACAAGATAATTTGTTGTCTTGATGGTCCAAGGTTTGGCATACAATATGAAACTTATTTTGCTGGAGAACCATGTGAAATTTATCATTGTGTTATTGAAAGCAAGTCATTCCTTCACAAGATATGTGTACTTGAACATACTATTCCTTTCTTTCTCCCAATACGAGAAGCAGAAAATGATCTACTCTCTTCTGATGCAAAGAAATTCATAGACTATGTTGGAGAAATTTTGCAGTCTTACGTGGACAGGAGAGAGCAGGTCCGGCTGATTAAAGAGCTCTATGGAAACCAAATTGGAGACCTGTACCATAGCCTTGCTTACAATTTAGTTGAATTTGTACTGGATGACTTTGATTGCAAGGTGACCGTCAGTCTTAGATACGCTGATCTTATTTCTGTACTGCCAAGTCGAATCAGGGTGCTGGCGTGGCCTGTTCATCCTTCAAAGAAGATATCCATGCTTGACAGGAAAGGAATTGGCCTGGTGATATCTCAATCTGTACCATCTCGTCTTTCTTATGCTGAGGATGCACTGAGGACCATGAGCTTGCCAGAAGCATATGCAGAGATTGTGCTGAATTTGCCCCGAGTGCTGCAACAAATATTTCCTCATCTGGGGGGAACATAA",
    annotations: [],
  },
  {
    id: "AF_TRINITY_DN751_c0_g1_i1.p1_1",
    species: "fourcroydes",
    protein: "YAPAYAPQYSQSPHFPPGLTLAPGRPKLVKFLEHALQRAVALSHAHGRQERAKSEGRPSGMVVGVCGPVGLADDVAAAVGALDSVRRDQVGGVEICEEVFGW*",
    nucleotide: "",
    annotations: [
      {
        KO: "K00521",
        threshold: 251.07,
        score: 20.3,
        evalue: "0.00021",
        definition: "ferric-chelate reductase [EC:1.16.1.7]",
      },
    ],
  },
  {
    id: "AF_TRINITY_DN52963_c2_g1_i1.p1_1",
    species: "fourcroydes",
    protein:
      "QILPGKICSQIGLCLFDGSHYSGFGIETVVDEQNKEKTSVSNDLFCTACEMAVVWIENQLRRNETKEQILTYANELCERLPSPLGESAVDCNQLAGMPNVSFTIGDKIFSLTPEEYVLKVEEQGTAICLSGFMAFDIPPPRGPLWILGDVFMGVYHTVFDFGDKRIGFAKAA*",
    nucleotide: "",
    annotations: [
      {
        KO: "K08245",
        threshold: 449.6,
        score: 265.9,
        evalue: "9.6e-79",
        definition: "phytepsin [EC:3.4.23.40]",
      },
      {
        KO: "K01379",
        threshold: 542.13,
        score: 123.2,
        evalue: "1.9e-35",
        definition: "cathepsin D [EC:3.4.23.5]",
      },
    ],
  },
]

function ProteinViewer({ proteins = [] }) {
  const [query, setQuery] = useState("")
  const [selectedSpecies, setSelectedSpecies] = useState("all")
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [sequenceType, setSequenceType] = useState("protein")

  // Use sample data if no proteins provided (for testing)
  const dataToUse = proteins.length > 0 ? proteins : sampleData

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

  // Get unique species for filter
  const species = useMemo(() => {
    return Array.from(new Set(dataToUse.map((entry) => entry.species)))
  }, [dataToUse])

  // Filter and search logic with real-time updates
  const filteredData = useMemo(() => {
    const filtered = dataToUse.filter((entry) => {
      const matchesSpecies = selectedSpecies === "all" || entry.species === selectedSpecies

      if (!query.trim()) return matchesSpecies

      const queryLower = query.toLowerCase().trim()
      const matchesId = entry.id.toLowerCase().includes(queryLower)
      const matchesKO =
        entry.annotations &&
        entry.annotations.length > 0 &&
        entry.annotations.some((ann) => ann.KO && ann.KO.toLowerCase().includes(queryLower))
      const matchesDefinition =
        entry.annotations &&
        entry.annotations.length > 0 &&
        entry.annotations.some((ann) => ann.definition && ann.definition.toLowerCase().includes(queryLower))

      return matchesSpecies && (matchesId || matchesKO || matchesDefinition)
    })

    // Always return exactly 6 results (or less if not enough data)
    return filtered.slice(0, 6)
  }, [dataToUse, query, selectedSpecies])

  // Reset expanded index when search results change
  React.useEffect(() => {
    setExpandedIndex(null)
  }, [query, selectedSpecies])

  // Debug logging
  console.log("ProteinViewer - proteins length:", proteins.length)
  console.log("ProteinViewer - dataToUse length:", dataToUse.length)
  console.log("ProteinViewer - filteredData length:", filteredData.length)

  return (
    <section className="bg-primary rounded p-4 m-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 font-monospace mb-0 text-white">
          Sequence Explorer
          <span className="text-white-50 fs-6 ms-2">
            (Showing {filteredData.length} of 6 results from {dataToUse.length} total)
            {proteins.length === 0 && <span className="text-warning"> - Using sample data</span>}
          </span>
        </h2>
        <Button variant="link" className="text-white p-2">
          <span className="visually-hidden">View all sequences</span>→
        </Button>
      </div>

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
              placeholder="Search by ID, KO, or function..."
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

      {/* Results - Fixed height container for 6 results */}
      <div
        className="d-flex flex-column gap-3"
        style={{
          height: "480px",
          overflowY: "auto",
        }}
      >
        {filteredData.map((entry, index) => (
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
                      <h5 className="fw-semibold text-dark mb-2">Functional Annotations:</h5>
                      <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {entry.annotations.map((ann, idx) => (
                          <div key={idx} className="bg-light border rounded p-2">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <code className="text-primary fw-bold">{ann.KO}</code>
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
                      <div className="bg-light border rounded p-3 text-center text-muted">
                        <p className="mb-0">No functional annotations available</p>
                        <small>This sequence has not been annotated yet</small>
                      </div>
                    </div>
                  )}

                  {/* Sequence */}
                  <div className="mb-3">
                    <h5 className="fw-semibold text-dark mb-2">
                      {sequenceType === "protein" ? "Protein" : "Nucleotide"} Sequence:
                      {((sequenceType === "protein" ? entry.protein : entry.nucleotide) || "").length > 0 && (
                        <small className="text-muted ms-2">
                          ({(sequenceType === "protein" ? entry.protein : entry.nucleotide).length} chars)
                        </small>
                      )}
                    </h5>
                    {((sequenceType === "protein" ? entry.protein : entry.nucleotide) || "").length > 0 ? (
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
                          {sequenceType === "protein" ? entry.protein : entry.nucleotide}
                        </pre>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleCopy(sequenceType === "protein" ? entry.protein : entry.nucleotide)}
                          className="mt-2 d-flex align-items-center gap-2"
                        >
                          <Copy size={14} />
                          Copy {sequenceType === "protein" ? "Protein" : "Nucleotide"} Sequence
                        </Button>
                      </>
                    ) : (
                      <div className="bg-light border rounded p-3 text-center text-muted">
                        <p className="mb-0">
                          No {sequenceType === "protein" ? "protein" : "nucleotide"} sequence available
                        </p>
                        <small>Try switching to {sequenceType === "protein" ? "nucleotide" : "protein"} sequence</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}

        {/* Empty state when no results */}
        {filteredData.length === 0 && (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-white-50">
              <p className="mb-2 fs-5">No matching entries found</p>
              <p className="small">
                {dataToUse.length === 0
                  ? "No protein data available"
                  : query
                    ? `No results for "${query}"`
                    : "Try searching for a protein ID, KO term, or function"}
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

      {/* Search tips */}
      <div className="mt-3 text-center">
        <small className="text-white-50">💡 Try searching: "AF_TRINITY", "K00521", "ferric", or "phytepsin"</small>
      </div>
    </section>
  )
}

export default ProteinViewer
