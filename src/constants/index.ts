// --- Configuration & Constants ---
export const THEME = {
  primary: '#2563EB', // Royal Blue
  secondary: '#38BDF8', // Sky Blue Accent
  spotify: '#1DB954', // Spotify Green
  text: '#FFFFFF',
  textDim: '#94A3B8', // Slate-400
  background: '#020617',
  cardBg: 'rgba(15, 23, 42, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
};

// Icon style for proper centering in containers
export const ICON_STYLE = {
  textAlign: 'center' as const,
  textAlignVertical: 'center' as const,
};

// API Configuration
export const API_CONFIG = {
  // For Android emulator, 10.0.2.2 maps to host localhost
  // For physical device, replace with your machine's local IP
  BASE_URL: 'http://10.0.2.2:3001/api',
  TIMEOUT: 15000,
  CACHE_TTL: 3600, // 1 hour in seconds
};

// Mood to genre mapping (reference — backend has the canonical version)
export const MOOD_GENRE_MAP: Record<string, string[]> = {
  happy: ['pop', 'dance', 'happy'],
  sad: ['sad', 'acoustic', 'piano'],
  excited: ['edm', 'hip-hop', 'rock'],
  angry: ['metal', 'rock', 'punk'],
  relaxed: ['chill', 'ambient', 'jazz'],
  romantic: ['r-n-b', 'soul', 'pop'],
};

export const MOCK_HISTORY = [
  { id: 1, date: '2023-10-24', mood: 'Happy', media: 'Song: Happy - Pharrell' },
  { id: 2, date: '2023-10-23', mood: 'Sad', media: 'Movie: The Pursuit of Happyness' },
];

/**
 * FALLBACK_RECOMMENDATIONS — Hardcoded data used when the backend is unreachable.
 * This ensures the app remains usable offline.
 */
export const FALLBACK_RECOMMENDATIONS: Record<string, {
  Music: Array<{ id: number; title: string; artist: string; duration: string; cover: string; description?: string; trailer?: string; videoUrl?: string; videoId?: string }>;
  Video: Array<{ id: number; title: string; artist: string; duration: string; cover: string; description?: string; trailer?: string; videoUrl?: string; videoId?: string }>;
  Movie: Array<{ id: number; title: string; artist: string; duration: string; cover: string; description?: string; trailer?: string; videoUrl?: string; videoId?: string }>;
}> = {
  Happy: {
    Music: [
      { id: 201, title: 'Happy', artist: 'Pharrell Williams', duration: '4:00', cover: 'https://tse2.mm.bing.net/th?q=Happy+Pharrell+Williams+Single+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ZbZSe6N_BXs', videoUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
      { id: 202, title: "Can't Stop the Feeling!", artist: 'Justin Timberlake', duration: '4:02', cover: 'https://tse2.mm.bing.net/th?q=Can%27t+Stop+the+Feeling+Justin+Timberlake+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ru0K8uYEZWw', videoUrl: 'https://www.youtube.com/watch?v=ru0K8uYEZWw' },
      { id: 203, title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: '4:31', cover: 'https://tse2.mm.bing.net/th?q=Uptown+Funk+Mark+Ronson+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'OPf0YbXqDm0', videoUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0' },
      { id: 204, title: 'Shake It Off', artist: 'Taylor Swift', duration: '3:39', cover: 'https://tse2.mm.bing.net/th?q=Shake+It+Off+Taylor+Swift+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'nfWlot6h_JM', videoUrl: 'https://www.youtube.com/watch?v=nfWlot6h_JM' },
      { id: 205, title: 'Walking on Sunshine', artist: 'Katrina & The Waves', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Walking+on+Sunshine+Katrina+and+the+Waves+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'iPUmE-tne5U', videoUrl: 'https://www.youtube.com/watch?v=iPUmE-tne5U' },
      { id: 206, title: 'Good Feeling', artist: 'Flo Rida', duration: '4:08', cover: 'https://tse2.mm.bing.net/th?q=Good+Feeling+Flo+Rida+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '3OnnDqH6Wj8', videoUrl: 'https://www.youtube.com/watch?v=3OnnDqH6Wj8' }
    ],
    Video: [
      { id: 201, title: 'Happy', artist: 'Pharrell Williams', duration: '4:00', cover: 'https://tse2.mm.bing.net/th?q=Happy+Pharrell+Williams+Single+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ZbZSe6N_BXs', videoUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
      { id: 202, title: "Can't Stop the Feeling!", artist: 'Justin Timberlake', duration: '4:02', cover: 'https://tse2.mm.bing.net/th?q=Can%27t+Stop+the+Feeling+Justin+Timberlake+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ru0K8uYEZWw', videoUrl: 'https://www.youtube.com/watch?v=ru0K8uYEZWw' },
      { id: 203, title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: '4:31', cover: 'https://tse2.mm.bing.net/th?q=Uptown+Funk+Mark+Ronson+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'OPf0YbXqDm0', videoUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0' },
      { id: 204, title: 'Shake It Off', artist: 'Taylor Swift', duration: '3:39', cover: 'https://tse2.mm.bing.net/th?q=Shake+It+Off+Taylor+Swift+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'nfWlot6h_JM', videoUrl: 'https://www.youtube.com/watch?v=nfWlot6h_JM' },
      { id: 205, title: 'Walking on Sunshine', artist: 'Katrina & The Waves', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Walking+on+Sunshine+Katrina+and+the+Waves+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'iPUmE-tne5U', videoUrl: 'https://www.youtube.com/watch?v=iPUmE-tne5U' },
      { id: 206, title: 'Good Feeling', artist: 'Flo Rida', duration: '4:08', cover: 'https://tse2.mm.bing.net/th?q=Good+Feeling+Flo+Rida+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '3OnnDqH6Wj8', videoUrl: 'https://www.youtube.com/watch?v=3OnnDqH6Wj8' }
    ],
    Movie: [
      {
        id: 301,
        title: 'The Secret Life of Walter Mitty',
        artist: 'Adventure/Comedy',
        duration: '1h 54m',
        cover: 'https://tse2.mm.bing.net/th?q=The+Secret+Life+of+Walter+Mitty+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: 'A daydreamer escapes his anonymous life by disappearing into a world of fantasies filled with heroism, romance and action.',
        trailer: 'https://www.youtube.com/watch?v=HddkucqSz48'
      },
      {
        id: 304,
        title: "Ferris Bueller's Day Off",
        artist: 'Comedy',
        duration: '1h 43m',
        cover: 'https://tse2.mm.bing.net/th?q=Ferris+Bueller%27s+Day+Off+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: 'A high school wise guy is determined to have a day off from school, despite what the Principal thinks of that.',
        trailer: 'https://www.youtube.com/watch?v=K-X2XzKqBiE'
      }
    ]
  },
  Sad: {
    Music: [
      { id: 211, title: 'Someone Like You', artist: 'Adele', duration: '4:45', cover: 'https://tse2.mm.bing.net/th?q=Someone+Like+You+Adele+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'hLQl3WQQoQ0', videoUrl: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0' },
      { id: 212, title: 'Fix You', artist: 'Coldplay', duration: '4:55', cover: 'https://tse2.mm.bing.net/th?q=Fix+You+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'k4V3Mo61fJM', videoUrl: 'https://www.youtube.com/watch?v=k4V3Mo61fJM' },
      { id: 213, title: 'All of Me', artist: 'John Legend', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=All+of+Me+John+Legend+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '450p7goxZqg', videoUrl: 'https://www.youtube.com/watch?v=450p7goxZqg' },
      { id: 214, title: 'Say Something', artist: 'A Great Big World ft. Christina Aguilera', duration: '3:50', cover: 'https://tse2.mm.bing.net/th?q=Say+Something+A+Great+Big+World+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '-2U0Ivkn2Ds', videoUrl: 'https://www.youtube.com/watch?v=-2U0Ivkn2Ds' }
    ],
    Video: [
      { id: 211, title: 'Someone Like You', artist: 'Adele', duration: '4:45', cover: 'https://tse2.mm.bing.net/th?q=Someone+Like+You+Adele+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'hLQl3WQQoQ0', videoUrl: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0' },
      { id: 212, title: 'Fix You', artist: 'Coldplay', duration: '4:55', cover: 'https://tse2.mm.bing.net/th?q=Fix+You+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'k4V3Mo61fJM', videoUrl: 'https://www.youtube.com/watch?v=k4V3Mo61fJM' },
      { id: 213, title: 'All of Me', artist: 'John Legend', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=All+of+Me+John+Legend+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '450p7goxZqg', videoUrl: 'https://www.youtube.com/watch?v=450p7goxZqg' },
      { id: 214, title: 'Say Something', artist: 'A Great Big World ft. Christina Aguilera', duration: '3:50', cover: 'https://tse2.mm.bing.net/th?q=Say+Something+A+Great+Big+World+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '-2U0Ivkn2Ds', videoUrl: 'https://www.youtube.com/watch?v=-2U0Ivkn2Ds' }
    ],
    Movie: [
      {
        id: 302,
        title: 'The Pursuit of Happyness',
        artist: 'Drama',
        duration: '1h 57m',
        cover: 'https://tse2.mm.bing.net/th?q=The+Pursuit+of+Happyness+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: "A struggling salesman takes custody of his son as he's poised to begin a life-changing professional career.",
        trailer: 'https://www.youtube.com/watch?v=89Kq8SDyvjc'
      },
      {
        id: 305,
        title: 'Eternal Sunshine of the Spotless Mind',
        artist: 'Romance/Sci-Fi',
        duration: '1h 48m',
        cover: 'https://tse2.mm.bing.net/th?q=Eternal+Sunshine+of+the+Spotless+Mind+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: 'When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories.',
        trailer: 'https://www.youtube.com/watch?v=07-QBnEkgXU'
      }
    ]
  },
  Excited: {
    Music: [
      { id: 301, title: 'Eye of the Tiger', artist: 'Survivor', duration: '4:05', cover: 'https://tse2.mm.bing.net/th?q=Eye+of+the+Tiger+Survivor+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'btPJPFnesV4', videoUrl: 'https://www.youtube.com/watch?v=btPJPFnesV4' },
      { id: 302, title: "Don't Stop Me Now", artist: 'Queen', duration: '3:30', cover: 'https://tse2.mm.bing.net/th?q=Don%27t+Stop+Me+Now+Queen+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'HgzGwKwLmgM', videoUrl: 'https://www.youtube.com/watch?v=HgzGwKwLmgM' },
      { id: 303, title: 'Lose Yourself', artist: 'Eminem', duration: '5:30', cover: 'https://tse2.mm.bing.net/th?q=Lose+Yourself+Eminem+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '_Yhyp-_hX2s', videoUrl: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s' },
      { id: 304, title: 'Stronger', artist: 'Kanye West', duration: '5:12', cover: 'https://tse2.mm.bing.net/th?q=Stronger+Kanye+West+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'PsO6ZnUZI0g', videoUrl: 'https://www.youtube.com/watch?v=PsO6ZnUZI0g' },
      { id: 305, title: 'Till I Collapse', artist: 'Eminem ft. Nate Dogg', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=Till+I+Collapse+Eminem+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ytQ5CYE1VZw', videoUrl: 'https://www.youtube.com/watch?v=ytQ5CYE1VZw' }
    ],
    Video: [
      { id: 301, title: 'Eye of the Tiger', artist: 'Survivor', duration: '4:05', cover: 'https://tse2.mm.bing.net/th?q=Eye+of+the+Tiger+Survivor+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'btPJPFnesV4', videoUrl: 'https://www.youtube.com/watch?v=btPJPFnesV4' },
      { id: 302, title: "Don't Stop Me Now", artist: 'Queen', duration: '3:30', cover: 'https://tse2.mm.bing.net/th?q=Don%27t+Stop+Me+Now+Queen+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'HgzGwKwLmgM', videoUrl: 'https://www.youtube.com/watch?v=HgzGwKwLmgM' },
      { id: 303, title: 'Lose Yourself', artist: 'Eminem', duration: '5:30', cover: 'https://tse2.mm.bing.net/th?q=Lose+Yourself+Eminem+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '_Yhyp-_hX2s', videoUrl: 'https://www.youtube.com/watch?v=_Yhyp-_hX2s' },
      { id: 304, title: 'Stronger', artist: 'Kanye West', duration: '5:12', cover: 'https://tse2.mm.bing.net/th?q=Stronger+Kanye+West+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'PsO6ZnUZI0g', videoUrl: 'https://www.youtube.com/watch?v=PsO6ZnUZI0g' },
      { id: 305, title: 'Till I Collapse', artist: 'Eminem ft. Nate Dogg', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=Till+I+Collapse+Eminem+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ytQ5CYE1VZw', videoUrl: 'https://www.youtube.com/watch?v=ytQ5CYE1VZw' }
    ],
    Movie: [
      {
        id: 303,
        title: 'Mad Max: Fury Road',
        artist: 'Action',
        duration: '2h 0m',
        cover: 'https://tse2.mm.bing.net/th?q=Mad+Max+Fury+Road+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshiper, and a drifter named Max.',
        trailer: 'https://www.youtube.com/watch?v=hEJnMQG9ev8'
      },
      {
        id: 306,
        title: 'Spider-Man: Into the Spider-Verse',
        artist: 'Animation/Action',
        duration: '1h 57m',
        cover: 'https://tse2.mm.bing.net/th?q=Spider-Man+Into+the+Spider-Verse+Movie+Poster&w=500&h=750&c=7&rs=1&p=0',
        description: 'Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.',
        trailer: 'https://www.youtube.com/watch?v=g4Hbz2jLxvQ'
      }
    ]
  }
};

// Keep backward compatibility - alias for old code that uses RECOMMENDATIONS
export const RECOMMENDATIONS = FALLBACK_RECOMMENDATIONS;
