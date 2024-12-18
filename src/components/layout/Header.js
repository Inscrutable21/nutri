'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, ShoppingCart } from 'lucide-react'
import { UserButton, useUser } from '@clerk/nextjs'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isSignedIn, user } = useUser()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/bestsellers', label: 'Bestsellers' },
    { href: '/new-launches', label: 'New Launches' },
  ]

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-600">
          YourStore
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {/* Main Navigation Links */}
          <div className="flex space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link href="/cart" className="text-gray-700 hover:text-blue-600">
              <ShoppingCart size={24} />
            </Link>

            {/* Authentication */}
            {isSignedIn ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/profile" 
                  className="text-gray-700 hover:text-blue-600"
                >
                  Profile
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/sign-in" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-1 border border-gray-300 rounded-md"
                >
                  Login
                </Link>
                <Link 
                  href="/sign-up" 
                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center space-x-4">
          <Link href="/cart" className="text-gray-700">
            <ShoppingCart size={24} />
          </Link>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-700"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg md:hidden">
            <div className="container mx-auto px-4 py-4">
              <nav className="space-y-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className="block text-gray-700 hover:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {isSignedIn ? (
                  <div className="space-y-4">
                    <Link 
                      href="/profile" 
                      className="block text-gray-700 hover:text-blue-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <div className="flex justify-center">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    <Link 
                      href="/sign-in" 
                      className="text-center text-gray-700 hover:text-blue-600 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/sign-up" 
                      className="text-center text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}