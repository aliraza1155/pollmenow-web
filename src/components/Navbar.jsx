import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { label: 'Home', href: '/', isRoute: true },
    { label: 'Features', href: '#features', isRoute: false },
    { label: 'Pricing', href: '#pricing', isRoute: false },
    { label: 'Contact', href: '/contact', isRoute: true },
  ]

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-white/70 backdrop-blur-md'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md group-hover:shadow-primary/30 transition-shadow">
            <BarChart3 className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            PollMeNow
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map(link =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="relative text-sm text-gray-600 hover:text-primary transition-colors font-medium group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="relative text-sm text-gray-600 hover:text-primary transition-colors font-medium group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            )
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-r from-primary to-secondary text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:shadow-primary/25 hover:shadow-lg transition-shadow"
          >
            Get started
          </motion.button>
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4"
        >
          {links.map(link =>
            link.isRoute ? (
              <Link key={link.label} to={link.href} className="text-sm text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="text-sm text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            )
          )}
          <button className="bg-gradient-to-r from-primary to-secondary text-white px-5 py-2.5 rounded-full text-sm font-semibold w-full">
            Get started
          </button>
        </motion.div>
      )}
    </motion.nav>
  )
}
