const fs = require('fs');

const db = require('./db.json');

const cities = [
  'Mumbai', 'Ahmedabad', 'Delhi-NCR', 'Bengaluru', 'Pune', 
  'Hyderabad', 'Chennai', 'Kolkata', 'Chandigarh', 'Jaipur'
];

const categories = [
  'Concerts', 'Festivals', 'Sports', 'Shows & Entertainment', 
  'Activities', 'Conferences', 'Workshops', 'Technology', 'Arts & Culture', 'Food & Lifestyle'
];

let eventIdCounter = 100;

const mockEvents = [];

cities.forEach(city => {
  for (let i = 1; i <= 6; i++) {
    const isPopular = i <= 2; // Make top 2 trending/promotional
    const isFeatured = i <= 3; // Make top 3 featured
    
    mockEvents.push({
      id: `evt-${eventIdCounter++}`,
      title: `${city} ${categories[i % categories.length]} Showcase ${i}`,
      description: `A fantastic ${categories[i % categories.length]} event happening live in ${city}. Join us for an unforgettable experience!`,
      category: categories[i % categories.length],
      subcategory: 'General',
      format: 'In-Person',
      status: 'published',
      isFeatured: isFeatured,
      isPopular: isPopular,
      testingNote: isPopular ? "Currently making it trending/promoted for testing purpose" : undefined,
      thumbnailUrl: `https://picsum.photos/seed/${city}${i}/600/400`,
      date: `2026-11-0${i}`,
      time: '18:00',
      location: {
        venue: `${city} Grand Center`,
        city: city,
        state: 'State',
        country: 'India'
      },
      capacity: 1000,
      ticketTypes: [
        {
          id: `tt-${eventIdCounter}-1`,
          name: 'General',
          price: 500 * i,
          capacity: 800,
          available: 500
        },
        {
          id: `tt-${eventIdCounter}-2`,
          name: 'VIP',
          price: 1500 * i,
          capacity: 200,
          available: 100
        }
      ],
      maxTicketsPerBooking: 4,
      hostId: "user-003",
      createdAt: new Date().toISOString()
    });
  }
});

// Replace old events with new mocked events to have a clean 6 per city
db.events = mockEvents;

fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
console.log(`Successfully generated ${mockEvents.length} events (6 for each of the 10 cities)`);
