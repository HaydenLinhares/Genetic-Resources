import React, { useState } from 'react';
import Carousel from './components/Carousel';
import SpeciesList from './SpeciesList';
import Login from './components/Login';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <>
      <Carousel />
      <SpeciesList />
    </>
  );
}

export default App;
