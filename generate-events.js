const fs = require('fs');
const db = require('./db.json');

const cities = [
  'Mumbai', 'Ahmedabad', 'Delhi-NCR', 'Bengaluru', 'Pune', 
  'Hyderabad', 'Chennai', 'Kolkata', 'Chandigarh', 'Jaipur'
];

const categoryTemplates = [
  {
    category: 'Concerts',
    titles: ['Acoustic Sunset Live', 'Electric Symphony Tour', 'Bollywood Unplugged Live', 'Rock & Indie Revival'],
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Festivals',
    titles: ['Neon Horizon Music Fest', 'Sunwave EDM Carnival', 'Grand Folk Fiesta', 'Monsoon Lantern Festival'],
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Sports',
    titles: ['Premier Football Super Cup', 'City Night Marathon 10K', 'Pro Badminton Open Arena', 'Esports Champions Trophy'],
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Shows & Entertainment',
    titles: ['Laugh Out Loud Comedy Gala', 'Broadway Magic & Illusions', 'Standup Arena Showcase', 'Midnight Improv Theater'],
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Conferences',
    titles: ['AI & Future Tech Summit', 'Global Founders Conclave', 'Cloud Innovation Conference', 'Fintech Disrupt Summit'],
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Workshops',
    titles: ['Master Coffee Brewing Lab', 'Ceramic Pottery & Clay Studio', 'UI/UX Masterclass & Design Jam', 'Artisanal Sourdough Baking'],
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Food & Lifestyle',
    titles: ['Gourmet Street Food Fest', 'Craft Beer & Food Trucks', 'Wine Tasting & Jazz Soiree', 'Artisanal Dessert Fair'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Arts & Culture',
    titles: ['Contemporary Sculpture Expo', 'Heritage Classical Dance', 'Sufi Poetry & Acoustic Strings', 'Modern Photography Showcase'],
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Activities',
    titles: ['Stargazing & Camping Night', 'Weekend Kayaking Adventure', 'Urban Escape Challenge', 'Sunrise Yoga & Wellness Circle'],
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
  },
  {
    category: 'Technology',
    titles: ['NextGen Robotics & Drone Expo', 'Web3 & Blockchain Pioneer Day', 'Cybersecurity Hackathon', 'Autonomous AI Builders Meetup'],
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
  }
];

let eventIdCounter = 100;
const mockEvents = [];

cities.forEach((city, cityIndex) => {
  for (let i = 0; i < 10; i++) {
    const tmpl = categoryTemplates[i % categoryTemplates.length];
    const isPopular = i <= 3;
    const isFeatured = i <= 4;
    const titleVariant = tmpl.titles[cityIndex % tmpl.titles.length];
    const day = (i + 1).toString().padStart(2, '0');
    
    mockEvents.push({
      id: `evt-${eventIdCounter++}`,
      title: `${city} ${titleVariant}`,
      description: `Experience ${titleVariant} live in ${city}. An exhilarating ${tmpl.category.toLowerCase()} event featuring top artists, interactive sessions, and an unforgettable crowd vibe!`,
      category: tmpl.category,
      subcategory: 'General',
      format: 'In-Person',
      status: 'published',
      isFeatured: isFeatured,
      isPopular: isPopular,
      thumbnailUrl: tmpl.image,
      imageUrl: tmpl.image,
      date: `2026-11-${day}`,
      time: i % 2 === 0 ? '18:00' : '19:30',
      location: {
        venue: `${city} Premier Arena`,
        city: city,
        state: 'State',
        country: 'India'
      },
      capacity: 1200,
      ticketTypes: [
        {
          id: `tt-${eventIdCounter}-1`,
          name: 'General',
          price: 499 + (i * 150),
          capacity: 900,
          available: 650
        },
        {
          id: `tt-${eventIdCounter}-2`,
          name: 'VIP Front Row',
          price: 1499 + (i * 300),
          capacity: 300,
          available: 180
        }
      ],
      maxTicketsPerBooking: 4,
      hostId: "user-003",
      createdAt: new Date().toISOString()
    });
  }
});

// Update events in db.json
db.events = mockEvents;

fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
console.log(`Successfully generated ${mockEvents.length} events (10 rich events per city)`);
