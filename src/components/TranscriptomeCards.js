"use client"

import { useState } from "react"
import Card from "react-bootstrap/Card"
import ListGroup from "react-bootstrap/ListGroup"
import Button from "react-bootstrap/Button"
import { Info, ExternalLink, ChevronDown, ChevronUp, Menu, X } from "lucide-react"
import ProteinViewer from "./ProteinViewer"

function TranscriptomeCards({ proteins = [] }) {
  const [showAll, setShowAll] = useState(false)
  const [expandedCards, setExpandedCards] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sample data for 15 cards with new structure
  const transcriptomeData = [
    {
      id: 1,
      name: "Agave sisalana (LGE02)",
      description: "Plant grown in EMBRAPA's germplasm in Paraíba.",
      image: "/images/LGE02.jpg",
      tissues: ["leaves", "stem", "roots"],
      conditions: ".",
      assemblyType: ["de novo", "genome guided"],
      genome: "draft",
      reference: "Raya et al., 2021 | 10.1016/j.indcrop.2021.114043",
    },
    {
      id: 2,
      name: "Agave H11648 (LGE03)",
      description: "Plant grown in EMBRAPA's germplasm in Paraíba.",
      image: "/images/LGE03.jpg",
      tissues: ["leaves", "stem", "roots"],
      conditions: ".",
      assemblyType: ["de novo", "genome guided"],
      genome: "draft",
      reference: "Raya et al., 2021 | 10.1016/j.indcrop.2021.114043",
    },
    {
      id: 3,
      name: "Agave fourcroydes (AFR)",
      description: "Plant grown in EMBRAPA's germplasm in Paraíba.",
      image: "/images/AFR.jpg",
      tissues: ["leaves", "stem", "roots"],
      conditions: ".",
      assemblyType: ["de novo", "genome guided"],
      genome: "draft",
      reference: "Raya et al., 2021 | 10.1016/j.indcrop.2021.114043",
    },
    {
      id: 4,
      name: "Agave tequilana",
      description: "Study of Agave tequilana bolting from June Simpson",
      image: "/images/Tequilana_MX.jpg",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "not available",
      reference: "Hernández-Soriano et al., 2024 | 10.1007/s00497-023-00489-0",
    },
    {
      id: 5,
      name: "Agave tequilana var. Weber's azul (JGI791)",
      description:
        "The genome sequence is included in the project, Engineering CAM Photosynthetic Machinery into Bioenergy Crops for Biofuels Production in Marginal Environments, which seeks to understand Crassulacean Acid Metabolism in plants in order to engineer the mechanism in non-CAM plants.",
      image: "/images/Tequilana_JGI791.jpg",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "haplotype level",
      reference: "To be published soon",
    },
    {
      id: 6,
      name: "Agave deserti",
      description:
        "Extremely resilient Agave. As far as we know, there was just one individual in Brazil, we found it dying and we were able to store its tissue and extract genomic DNA.",
      image: "/images/Agave_deserti.jpg",
      tissues: ["leaves", "roots", "ramets"],
      conditions:
        "A. deserti juveniles were obtained from a local commercial provider (Berkeley, CA) and verified using morphological keys. A. deserti tissues were collected from well-watered plants near mid-day.",
      assemblyType: ["genome guided", "de novo"],
      genome: "not available",
      reference: ".",
    },
    {
      id: 7,
      name: "Agave americana marginata",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Wheat",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["de novo"],
      genome: "draft",
      reference: ".",
    },
    {
      id: 8,
      name: "Agave sisalana (?)",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Soybean",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["de novo", "genome guided"],
      genome: "draft",
      reference: ".",
    },
    {
      id: 9,
      name: "Agave bracteosa",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Sunflower",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["de novo"],
      genome: ".",
      reference: ".",
    },
    {
      id: 10,
      name: "Agave filifera var. schidigera",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Rapeseed",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "scaffold",
      reference: ".",
    },
    {
      id: 11,
      name: "Yucca filamentosa",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Medicago",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "haplotype level",
      reference: ".",
    },
    {
      id: 12,
      name: "Yucca aiofolia",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Populus",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["de novo", "genome guided"],
      genome: "haplotype level",
      reference: ".",
    },
    {
      id: 13,
      name: "Asparagus officinalis",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Grapevine",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "scaffold",
      reference: ".",
    },
    {
      id: 14,
      name: "Asparagus kisianus",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Tomato",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["genome guided"],
      genome: "haplotype level",
      reference: ".",
    },
    {
      id: 15,
      name: "Arabidopsis thaliana TAIR10",
      description: ".",
      image: "https://via.placeholder.com/288x200/555/fff?text=Bean",
      tissues: ["."],
      conditions: ".",
      assemblyType: ["de novo"],
      genome: "draft",
      reference: ".",
    },
  ]

  // Helper function to render assembly type badges
  const renderAssemblyTypeBadges = (assemblyTypes) => {
    return assemblyTypes.map((type, index) => (
      <span key={index} className={`me-1 badge ${type === "genome guided" ? "bg-info" : "bg-secondary"}`}>
        {type}
      </span>
    ))
  }

  // Helper function to truncate text and handle expand/collapse
  const truncateText = (text, maxLength = 100, cardId, field) => {
    if (text.length <= maxLength) return text
    const isExpanded = expandedCards[`${cardId}-${field}`]
    const truncated = text.substring(0, maxLength) + "..."
    return (
      <div>
        {isExpanded ? text : truncated}
        <Button
          variant="link"
          size="sm"
          className="text-info p-0 ms-1 text-decoration-none"
          style={{ fontSize: "0.75rem" }}
          onClick={() =>
            setExpandedCards((prev) => ({
              ...prev,
              [`${cardId}-${field}`]: !prev[`${cardId}-${field}`],
            }))
          }
        >
          {isExpanded ? "Show less" : "Show more"}
        </Button>
      </div>
    )
  }

  // Determine which cards to show
  const cardsToShow = showAll ? transcriptomeData : transcriptomeData.slice(0, 6)
  const hasMoreCards = transcriptomeData.length > 6

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Mobile Header with Menu Toggle */}
      <div className="d-lg-none bg-dark border-bottom border-secondary p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <img
              src="https://via.placeholder.com/40x40/333/fff?text=TB"
              alt=""
              className="rounded-circle"
              width="40"
              height="40"
            />
            <div>
              <h1 className="h5 font-monospace mb-0">GENETIC RESOURCES</h1>
              <p className="small text-muted mb-0">HUB OF INFORMATION</p>
            </div>
          </div>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="d-flex align-items-center"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      <div className="row g-0">
        {/* Left Sidebar - Desktop always visible, Mobile collapsible */}
        <div className={`col-lg-4 ${sidebarOpen ? "d-block" : "d-none d-lg-block"}`}>
          <div className="bg-dark h-100 p-3 border-end border-secondary">
            {/* Desktop Header (hidden on mobile) */}
            <div className="d-none d-lg-flex align-items-center gap-3 mb-4">
              <img
                src="https://via.placeholder.com/60x60/333/fff?text=TB"
                alt=""
                className="rounded-circle"
                width="60"
                height="60"
              />
              <div>
                <h1 className="h4 font-monospace mb-0">GENETIC RESOURCES</h1>
                <h2 className="h5 font-monospace mb-0">HUB OF INFORMATION</h2>
                <p className="text-muted mb-0 small">Text</p>
              </div>
            </div>

            {/* Bio Section */}
            <div className="d-flex flex-column gap-3">
              <p className="text-light lh-base" style={{ fontSize: "0.95rem" }}>
                Germplasm and its associated -omics (transcriptomes, genomes, metabolomes) are valuable genetic
                resources for climate adaptation and resilience. This website is under development (suggestions should
                be forwarded to j291230@dac.unicamp.br or haydenlinhars@gmail.com), here you can find:
              </p>

              <div className="d-flex flex-column gap-2">
                <Button variant="outline-light" size="sm" className="rounded-pill text-start">
                  Datasets currently available
                </Button>
                <Button variant="outline-light" size="sm" className="rounded-pill text-start">
                  Genes explorer
                </Button>
                <Button variant="outline-light" size="sm" className="rounded-pill text-start">
                  Germplasm Bank for Climate Change
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="col-lg-8">
          <div className="p-3">
            {/* Transcriptome Cards Section */}
            <section className="mb-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-2">
                <h2 className="h3 h-lg-2 font-monospace mb-0">
                  Datasets available
                  <span className="text-muted fs-6 ms-2 d-block d-sm-inline">
                    ({showAll ? transcriptomeData.length : cardsToShow.length} of {transcriptomeData.length})
                  </span>
                </h2>
                <Button variant="link" className="text-white p-2 d-none d-sm-block">
                  <span className="visually-hidden">View all transcriptomes</span>→
                </Button>
              </div>

              {/* Cards Grid - Responsive: 1 col on mobile, 2 on tablet, 3 on desktop */}
              <div className="row g-3">
                {cardsToShow.map((species) => (
                  <div key={species.id} className="col-12 col-md-6 col-lg-4">
                    <Card
                      className="bg-secondary border-0 text-white h-100"
                      style={{
                        transition: "transform 0.2s ease-in-out",
                        minHeight: "650px", // Back to original height
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <Card.Img
                        variant="top"
                        src={species.image}
                        style={{ height: "200px", objectFit: "cover" }}
                        className="d-block"
                      />

                      {/* Card Body with flexible height */}
                      <Card.Body className="d-flex flex-column p-3">
                        <Card.Title className="d-flex align-items-start h6 mb-2">
                          <em className="flex-grow-1" style={{ fontSize: "0.9rem", lineHeight: "1.3" }}>
                            {species.name}
                          </em>
                          <Info size={12} className="ms-2 text-muted flex-shrink-0 mt-1" />
                        </Card.Title>
                        <Card.Text className="text-light small mb-3 flex-grow-1">
                          {truncateText(species.description, 80, species.id, "description")}
                        </Card.Text>
                      </Card.Body>

                      <ListGroup className="list-group-flush">
                        {/* Tissues */}
                        <ListGroup.Item className="bg-dark text-light border-secondary small py-2">
                          <div className="mb-1">
                            <strong>Tissues:</strong>
                          </div>
                          <ul className="mb-0 ps-3">
                            {species.tissues.map((tissue, index) => (
                              <li key={index} className="small">
                                {tissue}
                              </li>
                            ))}
                          </ul>
                        </ListGroup.Item>

                        {/* Conditions */}
                        <ListGroup.Item className="bg-dark text-light border-secondary small py-2">
                          <div className="mb-1">
                            <strong>Conditions:</strong>
                          </div>
                          <div className="small">{truncateText(species.conditions, 50, species.id, "conditions")}</div>
                        </ListGroup.Item>

                        {/* Transcriptome */}
                        <ListGroup.Item className="bg-dark text-light border-secondary small py-2">
                          <div className="mb-1">
                            <strong>Transcriptome:</strong>
                          </div>
                          <div className="d-flex flex-wrap gap-1">{renderAssemblyTypeBadges(species.assemblyType)}</div>
                        </ListGroup.Item>

                        {/* Genome */}
                        <ListGroup.Item className="bg-dark text-light border-secondary small py-2">
                          <strong>Genome:</strong>
                          <span
                            className={`ms-2 badge ${
                              species.genome === "haplotype level"
                                ? "bg-success"
                                : species.genome === "scaffold"
                                  ? "bg-warning text-dark"
                                  : species.genome === "not available"
                                    ? "bg-danger"
                                    : "bg-secondary"
                            }`}
                          >
                            {species.genome}
                          </span>
                        </ListGroup.Item>

                        {/* Reference */}
                        <ListGroup.Item className="bg-dark text-light border-secondary small py-2">
                          <div className="mb-1">
                            <strong>Reference:</strong>
                          </div>
                          <div className="small text-muted">
                            {truncateText(species.reference, 40, species.id, "reference")}
                          </div>
                        </ListGroup.Item>
                      </ListGroup>

                      <Card.Body className="p-3 mt-auto">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="d-flex align-items-center text-light border-light w-100 justify-content-center"
                        >
                          Learn More
                          <ExternalLink size={12} className="ms-2" />
                        </Button>
                      </Card.Body>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Show More/Show Less Button */}
              {hasMoreCards && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline-light"
                    onClick={() => setShowAll(!showAll)}
                    className="d-flex align-items-center justify-content-center mx-auto px-3 py-2"
                    size="sm"
                  >
                    {showAll ? (
                      <>
                        Show Less
                        <ChevronUp size={16} className="ms-2" />
                      </>
                    ) : (
                      <>
                        Show More ({transcriptomeData.length - 6} more)
                        <ChevronDown size={16} className="ms-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </section>

            {/* Protein Viewer Section */}
            <ProteinViewer proteins={proteins} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranscriptomeCards
