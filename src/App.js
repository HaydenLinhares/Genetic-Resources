"use client"

import { useState, useEffect } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import Carousel from "./components/Carousel"
import TranscriptomeCards from "./components/TranscriptomeCards"
import SpeciesList from "./SpeciesList"
import Login from "./components/Login"

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [proteins, setProteins] = useState([])

  useEffect(() => {
    // Load protein data from public/protein_data.json
    fetch("/protein_data.json")
      .then((res) => res.json())
      .then((data) => setProteins(data))
      .catch((err) => console.error("Failed to load protein data:", err))
  }, [])

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-white">
      <Carousel />
      <TranscriptomeCards proteins={proteins} />
      <SpeciesList />
    </div>
  )
}

export default App
