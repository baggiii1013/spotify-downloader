import { useState } from 'react'
import './App.css'
import DownloadForm from './components/DownloadForm'
import Footer from './components/Footer'
import Header from './components/Header'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <DownloadForm />
      </main>
      <Footer />
    </div>
  )
}

export default App
