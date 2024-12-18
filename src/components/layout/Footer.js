import Link from 'next/link'
import { Facebook, Twitter, Instagram } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    Shop: [
      { href: '/products', label: 'All Products' },
      { href: '/bestsellers', label: 'Bestsellers' },
      { href: '/new-launches', label: 'New Launches' },
    ],
    Company: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/careers', label: 'Careers' },
    ],
    Support: [
      { href: '/faq', label: 'FAQ' },
      { href: '/shipping', label: 'Shipping' },
      { href: '/returns', label: 'Returns' },
    ]
  }

  return (
    <footer className="bg-gray-100 text-gray-800">
      <div className="container mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <h3 className="text-2xl font-bold text-blue-600 mb-4">YourStore</h3>
          <p className="text-gray-600">
            Delivering quality products right to your doorstep.
          </p>
          <div className="flex space-x-4 mt-4">
            <a href="#" className="text-gray-600 hover:text-blue-600">
              <Facebook size={24} />
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600">
              <Twitter size={24} />
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600">
              <Instagram size={24} />
            </a>
          </div>
        </div>

        {/* Footer Links */}
        {Object.entries(footerLinks).map(([section, links]) => (
          <div key={section}>
            <h4 className="font-semibold mb-4">{section}</h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Newsletter Signup */}
        <div>
          <h4 className="font-semibold mb-4">Stay Updated</h4>
          <form className="space-y-2">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-gray-200 text-center py-4">
        <p className="text-gray-600">
          © {currentYear} YourStore. All rights reserved.
        </p>
      </div>
    </footer>
  )
}