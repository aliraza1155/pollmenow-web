import { Users, Star, TrendingUp } from 'lucide-react'

export default function SocialProof() {
  return (
    <div className="bg-white py-12 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="text-gray-600 font-semibold ml-2">4.9/5</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <p className="text-gray-700 font-medium">Trusted by <span className="font-bold text-primary">5,000+ creators</span></p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <p className="text-gray-700">Over 1M votes cast</p>
          </div>
        </div>
      </div>
    </div>
  )
}
