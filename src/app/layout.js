'use client'

import { Inter } from 'next/font/google'
import { ClerkProvider, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { dark } from '@clerk/themes'
import dynamic from 'next/dynamic'
import './globals.css'

// Dynamically import components to catch any import errors
const Header = dynamic(() => import('@/components/layout/Header'), {
  loading: () => <div>Loading header...</div>,
  ssr: false
})

const Footer = dynamic(() => import('@/components/layout/Footer'), {
  loading: () => <div>Loading footer...</div>,
  ssr: false
})

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      // Mark as client-side rendered
      setIsClient(true)

      // Remove problematic browser extension attributes
      const cleanupAttributes = () => {
        const htmlElement = document.documentElement
        const attributesToRemove = [
          'data-lt-extension-installed',
          'data-qb-installed',
          'data-grammarly-extension-installed'
        ]

        attributesToRemove.forEach(attr => {
          htmlElement.removeAttribute(attr)
        })
      }

      // Cleanup attributes
      cleanupAttributes()
    } catch (err) {
      console.error('Layout initialization error:', err)
      setError(err)
    }
  }, [])

  // Handle any initialization errors
  if (error) {
    return (
      <html>
        <body>
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Error Initializing Layout
              </h1>
              <p className="text-red-500">{error.toString()}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Prevent server-side rendering content mismatch
  if (!isClient) {
    return (
      <html>
        <body>
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className={`${inter.className} h-full scroll-smooth antialiased`}>
        <body
          className="
            bg-white
            text-black
            antialiased
            min-h-screen
            flex
            flex-col
            overflow-x-hidden
            overflow-y-auto
            selection:bg-blue-200
            selection:text-blue-900
          "
        >
          <ClerkLoading>
            <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
              <div className="text-2xl font-semibold text-gray-600">
                Loading...
              </div>
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <div
              id="app-root"
              className="
                flex
                flex-col
                min-h-screen
                w-full
                max-w-full
              "
            >
              {/* Replace the custom header with the imported Header component */}
              <Header />

              <main
                className="
                  flex-grow
                  w-full
                  max-w-full
                  px-4
                  md:px-6
                  lg:px-8
                "
              >
                {children}
              </main>
              <Footer />
            </div>
          </ClerkLoaded>

          {/* Hydration debug script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const attributesToRemove = [
                    'data-lt-extension-installed',
                    'data-qb-installed',
                    'data-grammarly-extension-installed'
                  ]

                  attributesToRemove.forEach(attr => {
                    document.documentElement.removeAttribute(attr)
                  })

                  window.__REACT_HYDRATION_TIMESTAMP = Date.now()
                })()
              `
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}