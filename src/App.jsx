import { useEffect, useState } from 'react'
import Features from './components/Features.jsx'
import Footer from './components/Footer.jsx'
import Hero from './components/Hero.jsx'
import InfoDialog from './components/InfoDialog.jsx'
import { Audience, Faq, Newsletter, Personas } from './components/LandingSections.jsx'
import Navbar from './components/Navbar.jsx'
import StorySection from './components/trade-visuals/StorySection.jsx'
import DemoWorkspace from './components/demo/DemoWorkspace.jsx'

/*
  No router: the app switches between the landing page and the demo workspace.
  The URL hash "#demo" is pushed so the browser Back button returns to the site.
*/
export default function App() {
  const initialDemo = typeof window !== 'undefined' && window.location.hash === '#demo'
  const [view, setView] = useState(initialDemo ? 'demo' : 'landing')
  const [demoMode, setDemoMode] = useState('blank')
  const [demoKey, setDemoKey] = useState(0) // remounts the demo for a fresh session
  const [dialogKey, setDialogKey] = useState(null)

  useEffect(() => {
    const onPop = () => setView(window.location.hash === '#demo' ? 'demo' : 'landing')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openDemo = (mode) => {
    setDemoMode(mode)
    setDemoKey((k) => k + 1)
    setView('demo')
    if (window.location.hash !== '#demo') window.history.pushState(null, '', '#demo')
    window.scrollTo({ top: 0 })
  }

  const exitDemo = () => {
    setView('landing')
    window.history.pushState(null, '', window.location.pathname + window.location.search)
    window.scrollTo({ top: 0 })
  }

  if (view === 'demo') {
    return <DemoWorkspace key={demoKey} initialMode={demoMode} onExit={exitDemo} />
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-brand-800 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Navbar onOpenDialog={setDialogKey} />
      <main id="main">
        <Hero onOpenDemo={openDemo} />
        <StorySection onOpenDemo={openDemo} />
        <Features onOpenDemo={openDemo} />
        <Audience />
        <Personas />
        <Faq />
        <Newsletter />
      </main>
      <Footer onOpenDialog={setDialogKey} onOpenDemo={openDemo} />
      <InfoDialog dialogKey={dialogKey} onClose={() => setDialogKey(null)} onOpenDemo={openDemo} />
    </>
  )
}
