import { Star, Quote } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    { 
      name: "Alex Rivera", 
      role: "Content Creator, 2M+ followers", 
      text: "PollMeNow helped me double my engagement. My audience loves voting and the AI insights are pure gold. I now know exactly what content to create.", 
      avatar: "AR",
      rating: 5
    },
    { 
      name: "Sarah Chen", 
      role: "Marketing Director, TechStart", 
      text: "We used PollMeNow for product feedback – got 5,000 responses in 24 hours. The real-time dashboard helped us pivot our strategy instantly.", 
      avatar: "SC",
      rating: 5
    },
    { 
      name: "Marcus Thompson", 
      role: "Tech Influencer & Podcaster", 
      text: "The AI insights feature is a game changer. I understand my audience better than ever. PollMeNow is now part of my weekly content workflow.", 
      avatar: "MT",
      rating: 5
    }
  ]

  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Loved by creators & brands</h2>
          <p className="text-gray-600 mt-2 text-lg">Join thousands who've found their voice</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 relative">
              <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
              <p className="text-gray-700 italic leading-relaxed">"{t.text}"</p>
              <div className="flex gap-1 mt-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm">Join 5,000+ happy users</p>
        </div>
      </div>
    </section>
  )
}
