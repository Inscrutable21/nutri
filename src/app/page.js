'use client'

import Link from 'next/link'
import { 
  ShoppingCart, 
  Rocket, 
  Shield, 
  Star, 
  ArrowRight, 
  CheckCircle 
} from 'lucide-react'

export default function Home() {
  const features = [
    {
      icon: <ShoppingCart size={40} className="text-indigo-600" />,
      title: 'Curated Selection',
      description: 'Meticulously chosen products that meet the highest standards of quality and innovation.'
    }, 
    {
      icon: <Rocket size={40} className="text-green-600" />,
      title: 'Rapid Delivery',
      description: 'Lightning-fast shipping that brings your favorite products to your doorstep in record time.'
    },
    {
      icon: <Shield size={40} className="text-purple-600" />,
      title: 'Guaranteed Satisfaction',
      description: 'Uncompromising quality and customer support that goes above and beyond your expectations.'
    }
  ]

  const testimonials = [
    {
      name: 'Emily Rodriguez',
      quote: 'Absolutely love the product range and seamless shopping experience!',
      rating: 5
    },
    {
      name: 'Michael Chen',
      quote: 'Exceptional quality and lightning-fast shipping. Couldn\'t be happier!',
      rating: 5
    }
  ]

  return (
    <div className="bg-gray-50">
      {/* Enhanced Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              Elevate Your Shopping Experience
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-3xl mx-auto">
              Discover a world of premium products, unmatched convenience, and exceptional quality.
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href="/products" 
                className="bg-white text-indigo-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center group"
              >
                Shop Now <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
              <Link 
                href="/bestsellers" 
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-colors"
              >
                Browse Bestsellers
              </Link>
            </div>
          </div>
        </div>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Why Choose Our Store</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to providing an unparalleled shopping experience that exceeds your expectations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group"
              >
                <div className="mb-6 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-center text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-800">Featured Products</h2>
              <p className="text-gray-600 mt-2">Discover our top-rated and most popular items</p>
            </div>
            <Link 
              href="/products" 
              className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              View All Products <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[1,2,3,4].map((product) => (
              <div 
                key={product} 
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={`/api/placeholder/400/400?${product}`} 
                    alt={`Product ${product}`} 
                    className="w-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-white/80 px-3 py-1 rounded-full flex items-center">
                    <Star size={16} className="text-yellow-500 mr-1" />
                    <span className="font-semibold">4.5</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-2 text-gray-800">Premium Product {product}</h3>
                  <div className="flex justify-between items-center">
                    <p className="text-indigo-600 font-bold text-2xl">$99.99</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Hear from our satisfied customers who have experienced our exceptional service.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gray-50 p-8 rounded-2xl shadow-lg relative"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={20} className="text-yellow-500 mr-1" />
                  ))}
                </div>
                <p className="text-xl text-gray-700 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-indigo-600 font-bold">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                    <p className="text-gray-600">Verified Customer</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to Elevate Your Shopping?</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Join thousands of satisfied customers and transform your shopping experience today.
          </p>
          <div className="flex justify-center items-center space-x-4">
            <Link 
              href="/products" 
              className="bg-white text-indigo-700 px-10 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center group"
            >
              Start Shopping <CheckCircle className="ml-2 group-hover:rotate-6 transition-transform" size={22} />
            </Link>
            <Link 
              href="/contact" 
              className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-full font-bold hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}