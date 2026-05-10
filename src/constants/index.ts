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
  calm: ['chill', 'ambient', 'jazz'],
  relaxed: ['chill', 'ambient', 'jazz'],
  anxious: ['acoustic', 'ambient', 'folk'],
  lonely: ['indie', 'acoustic', 'singer-songwriter'],
  focused: ['study', 'classical', 'electronic'],
  romantic: ['r-n-b', 'soul', 'pop'],
  neutral: ['pop', 'indie', 'alternative'],
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
      { id: 303, title: 'Mad Max: Fury Road', artist: 'Action', duration: '2h 0m', cover: 'https://tse2.mm.bing.net/th?q=Mad+Max+Fury+Road+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland.', trailer: 'https://www.youtube.com/watch?v=hEJnMQG9ev8' },
      { id: 306, title: 'Spider-Man: Into the Spider-Verse', artist: 'Animation/Action', duration: '1h 57m', cover: 'https://tse2.mm.bing.net/th?q=Spider-Man+Into+the+Spider-Verse+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'Teen Miles Morales becomes the Spider-Man of his universe.', trailer: 'https://www.youtube.com/watch?v=g4Hbz2jLxvQ' }
    ]
  },
  Angry: {
    Music: [
      { id: 401, title: 'In the End', artist: 'Linkin Park', duration: '3:36', cover: 'https://tse2.mm.bing.net/th?q=In+the+End+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'eVTXPUF4Oz4', videoUrl: 'https://www.youtube.com/watch?v=eVTXPUF4Oz4' },
      { id: 402, title: 'Numb', artist: 'Linkin Park', duration: '3:07', cover: 'https://tse2.mm.bing.net/th?q=Numb+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'kXYiU_JCYtU', videoUrl: 'https://www.youtube.com/watch?v=kXYiU_JCYtU' },
      { id: 403, title: 'Killing in the Name', artist: 'Rage Against the Machine', duration: '5:13', cover: 'https://tse2.mm.bing.net/th?q=Killing+in+the+Name+RATM+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'bWXazVhlyxQ', videoUrl: 'https://www.youtube.com/watch?v=bWXazVhlyxQ' },
      { id: 404, title: 'Break Stuff', artist: 'Limp Bizkit', duration: '2:46', cover: 'https://tse2.mm.bing.net/th?q=Break+Stuff+Limp+Bizkit+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ZpUYjpKg9KY', videoUrl: 'https://www.youtube.com/watch?v=ZpUYjpKg9KY' },
      { id: 405, title: 'Given Up', artist: 'Linkin Park', duration: '3:09', cover: 'https://tse2.mm.bing.net/th?q=Given+Up+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '0xyxtzD54rM', videoUrl: 'https://www.youtube.com/watch?v=0xyxtzD54rM' }
    ],
    Video: [
      { id: 401, title: 'In the End', artist: 'Linkin Park', duration: '3:36', cover: 'https://tse2.mm.bing.net/th?q=In+the+End+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'eVTXPUF4Oz4', videoUrl: 'https://www.youtube.com/watch?v=eVTXPUF4Oz4' },
      { id: 402, title: 'Numb', artist: 'Linkin Park', duration: '3:07', cover: 'https://tse2.mm.bing.net/th?q=Numb+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'kXYiU_JCYtU', videoUrl: 'https://www.youtube.com/watch?v=kXYiU_JCYtU' },
      { id: 403, title: 'Killing in the Name', artist: 'Rage Against the Machine', duration: '5:13', cover: 'https://tse2.mm.bing.net/th?q=Killing+in+the+Name+RATM+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'bWXazVhlyxQ', videoUrl: 'https://www.youtube.com/watch?v=bWXazVhlyxQ' },
      { id: 404, title: 'Break Stuff', artist: 'Limp Bizkit', duration: '2:46', cover: 'https://tse2.mm.bing.net/th?q=Break+Stuff+Limp+Bizkit+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ZpUYjpKg9KY', videoUrl: 'https://www.youtube.com/watch?v=ZpUYjpKg9KY' },
      { id: 405, title: 'Given Up', artist: 'Linkin Park', duration: '3:09', cover: 'https://tse2.mm.bing.net/th?q=Given+Up+Linkin+Park+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '0xyxtzD54rM', videoUrl: 'https://www.youtube.com/watch?v=0xyxtzD54rM' }
    ],
    Movie: [
      { id: 401, title: 'John Wick', artist: 'Action/Thriller', duration: '1h 41m', cover: 'https://tse2.mm.bing.net/th?q=John+Wick+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'An ex-hitman comes out of retirement to track down the gangsters that killed his dog.', trailer: 'https://www.youtube.com/watch?v=C0BMx-qxsP4' },
      { id: 402, title: 'Fight Club', artist: 'Drama/Thriller', duration: '2h 19m', cover: 'https://tse2.mm.bing.net/th?q=Fight+Club+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'An insomniac office worker and a soap salesman build a global anarchist organization.', trailer: 'https://www.youtube.com/watch?v=SUXWAEX2jlg' }
    ]
  },
  Calm: {
    Music: [
      { id: 501, title: 'Weightless', artist: 'Marconi Union', duration: '8:09', cover: 'https://tse2.mm.bing.net/th?q=Weightless+Marconi+Union+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'UfcAVejslrU', videoUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU' },
      { id: 502, title: 'Clair de Lune', artist: 'Debussy', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=Clair+de+Lune+Debussy+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'CvFH_6DNRCY', videoUrl: 'https://www.youtube.com/watch?v=CvFH_6DNRCY' },
      { id: 503, title: 'Sunset Lover', artist: 'Petit Biscuit', duration: '3:41', cover: 'https://tse2.mm.bing.net/th?q=Sunset+Lover+Petit+Biscuit+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'wuCK-oiE3rM', videoUrl: 'https://www.youtube.com/watch?v=wuCK-oiE3rM' },
      { id: 504, title: 'Breathe Me', artist: 'Sia', duration: '4:35', cover: 'https://tse2.mm.bing.net/th?q=Breathe+Me+Sia+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ghPcYqn0p4Y', videoUrl: 'https://www.youtube.com/watch?v=ghPcYqn0p4Y' },
      { id: 505, title: 'Gymnopédie No.1', artist: 'Erik Satie', duration: '3:05', cover: 'https://tse2.mm.bing.net/th?q=Gymnopedie+No+1+Erik+Satie+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'S-Xm7s9eGxU', videoUrl: 'https://www.youtube.com/watch?v=S-Xm7s9eGxU' }
    ],
    Video: [
      { id: 501, title: 'Weightless', artist: 'Marconi Union', duration: '8:09', cover: 'https://tse2.mm.bing.net/th?q=Weightless+Marconi+Union+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'UfcAVejslrU', videoUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU' },
      { id: 502, title: 'Clair de Lune', artist: 'Debussy', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=Clair+de+Lune+Debussy+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'CvFH_6DNRCY', videoUrl: 'https://www.youtube.com/watch?v=CvFH_6DNRCY' },
      { id: 503, title: 'Sunset Lover', artist: 'Petit Biscuit', duration: '3:41', cover: 'https://tse2.mm.bing.net/th?q=Sunset+Lover+Petit+Biscuit+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'wuCK-oiE3rM', videoUrl: 'https://www.youtube.com/watch?v=wuCK-oiE3rM' },
      { id: 504, title: 'Breathe Me', artist: 'Sia', duration: '4:35', cover: 'https://tse2.mm.bing.net/th?q=Breathe+Me+Sia+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ghPcYqn0p4Y', videoUrl: 'https://www.youtube.com/watch?v=ghPcYqn0p4Y' },
      { id: 505, title: 'Gymnopédie No.1', artist: 'Erik Satie', duration: '3:05', cover: 'https://tse2.mm.bing.net/th?q=Gymnopedie+No+1+Erik+Satie+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'S-Xm7s9eGxU', videoUrl: 'https://www.youtube.com/watch?v=S-Xm7s9eGxU' }
    ],
    Movie: [
      { id: 501, title: 'The Grand Budapest Hotel', artist: 'Comedy/Drama', duration: '1h 39m', cover: 'https://tse2.mm.bing.net/th?q=The+Grand+Budapest+Hotel+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'A writer encounters the owner of an aging high-class hotel, who tells of his early years.', trailer: 'https://www.youtube.com/watch?v=1Fg5iWmQjwk' },
      { id: 502, title: 'My Neighbor Totoro', artist: 'Animation/Family', duration: '1h 26m', cover: 'https://tse2.mm.bing.net/th?q=My+Neighbor+Totoro+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'Two sisters move to the countryside and discover friendly forest spirits.', trailer: 'https://www.youtube.com/watch?v=92a7Hj0ijLs' }
    ]
  },
  Anxious: {
    Music: [
      { id: 601, title: 'Breathe', artist: 'Télépopmusik', duration: '4:20', cover: 'https://tse2.mm.bing.net/th?q=Breathe+Telepopmusik+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'vyut3GyQtn0', videoUrl: 'https://www.youtube.com/watch?v=vyut3GyQtn0' },
      { id: 602, title: 'Lean on Me', artist: 'Bill Withers', duration: '4:22', cover: 'https://tse2.mm.bing.net/th?q=Lean+on+Me+Bill+Withers+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'fOZ-MySzAQo', videoUrl: 'https://www.youtube.com/watch?v=fOZ-MySzAQo' },
      { id: 603, title: 'Here Comes the Sun', artist: 'The Beatles', duration: '3:05', cover: 'https://tse2.mm.bing.net/th?q=Here+Comes+the+Sun+Beatles+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'KQetemT1sWc', videoUrl: 'https://www.youtube.com/watch?v=KQetemT1sWc' },
      { id: 604, title: 'Three Little Birds', artist: 'Bob Marley', duration: '3:00', cover: 'https://tse2.mm.bing.net/th?q=Three+Little+Birds+Bob+Marley+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'zaGUr6wDTO0', videoUrl: 'https://www.youtube.com/watch?v=zaGUr6wDTO0' },
      { id: 605, title: 'Lovely', artist: 'Billie Eilish ft. Khalid', duration: '3:20', cover: 'https://tse2.mm.bing.net/th?q=Lovely+Billie+Eilish+Khalid+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'V1Pl8CzNzCw', videoUrl: 'https://www.youtube.com/watch?v=V1Pl8CzNzCw' }
    ],
    Video: [
      { id: 601, title: 'Breathe', artist: 'Télépopmusik', duration: '4:20', cover: 'https://tse2.mm.bing.net/th?q=Breathe+Telepopmusik+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'vyut3GyQtn0', videoUrl: 'https://www.youtube.com/watch?v=vyut3GyQtn0' },
      { id: 602, title: 'Lean on Me', artist: 'Bill Withers', duration: '4:22', cover: 'https://tse2.mm.bing.net/th?q=Lean+on+Me+Bill+Withers+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'fOZ-MySzAQo', videoUrl: 'https://www.youtube.com/watch?v=fOZ-MySzAQo' },
      { id: 603, title: 'Here Comes the Sun', artist: 'The Beatles', duration: '3:05', cover: 'https://tse2.mm.bing.net/th?q=Here+Comes+the+Sun+Beatles+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'KQetemT1sWc', videoUrl: 'https://www.youtube.com/watch?v=KQetemT1sWc' },
      { id: 604, title: 'Three Little Birds', artist: 'Bob Marley', duration: '3:00', cover: 'https://tse2.mm.bing.net/th?q=Three+Little+Birds+Bob+Marley+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'zaGUr6wDTO0', videoUrl: 'https://www.youtube.com/watch?v=zaGUr6wDTO0' },
      { id: 605, title: 'Lovely', artist: 'Billie Eilish ft. Khalid', duration: '3:20', cover: 'https://tse2.mm.bing.net/th?q=Lovely+Billie+Eilish+Khalid+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'V1Pl8CzNzCw', videoUrl: 'https://www.youtube.com/watch?v=V1Pl8CzNzCw' }
    ],
    Movie: [
      { id: 601, title: 'Inside Out', artist: 'Animation/Comedy', duration: '1h 35m', cover: 'https://tse2.mm.bing.net/th?q=Inside+Out+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'After young Riley is uprooted from her life, her emotions conflict on how to navigate a new city.', trailer: 'https://www.youtube.com/watch?v=yRUAzGQ3nSY' },
      { id: 602, title: 'Soul', artist: 'Animation/Fantasy', duration: '1h 40m', cover: 'https://tse2.mm.bing.net/th?q=Soul+Pixar+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'A musician who has lost his passion for music is transported out of his body.', trailer: 'https://www.youtube.com/watch?v=xOsLIiBStEs' }
    ]
  },
  Lonely: {
    Music: [
      { id: 701, title: 'Lonely', artist: 'Akon', duration: '4:25', cover: 'https://tse2.mm.bing.net/th?q=Lonely+Akon+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '6EEW-9NDM5k', videoUrl: 'https://www.youtube.com/watch?v=6EEW-9NDM5k' },
      { id: 702, title: 'Mad World', artist: 'Gary Jules', duration: '3:08', cover: 'https://tse2.mm.bing.net/th?q=Mad+World+Gary+Jules+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '4N3N1MlvVhw', videoUrl: 'https://www.youtube.com/watch?v=4N3N1MlvVhw' },
      { id: 703, title: 'The Night We Met', artist: 'Lord Huron', duration: '3:28', cover: 'https://tse2.mm.bing.net/th?q=The+Night+We+Met+Lord+Huron+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'KtlgYxa6BMU', videoUrl: 'https://www.youtube.com/watch?v=KtlgYxa6BMU' },
      { id: 704, title: 'Skinny Love', artist: 'Bon Iver', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Skinny+Love+Bon+Iver+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ssdgFoHLwnk', videoUrl: 'https://www.youtube.com/watch?v=ssdgFoHLwnk' },
      { id: 705, title: 'Creep', artist: 'Radiohead', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Creep+Radiohead+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'XFkzRNyygfk', videoUrl: 'https://www.youtube.com/watch?v=XFkzRNyygfk' }
    ],
    Video: [
      { id: 701, title: 'Lonely', artist: 'Akon', duration: '4:25', cover: 'https://tse2.mm.bing.net/th?q=Lonely+Akon+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '6EEW-9NDM5k', videoUrl: 'https://www.youtube.com/watch?v=6EEW-9NDM5k' },
      { id: 702, title: 'Mad World', artist: 'Gary Jules', duration: '3:08', cover: 'https://tse2.mm.bing.net/th?q=Mad+World+Gary+Jules+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '4N3N1MlvVhw', videoUrl: 'https://www.youtube.com/watch?v=4N3N1MlvVhw' },
      { id: 703, title: 'The Night We Met', artist: 'Lord Huron', duration: '3:28', cover: 'https://tse2.mm.bing.net/th?q=The+Night+We+Met+Lord+Huron+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'KtlgYxa6BMU', videoUrl: 'https://www.youtube.com/watch?v=KtlgYxa6BMU' },
      { id: 704, title: 'Skinny Love', artist: 'Bon Iver', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Skinny+Love+Bon+Iver+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'ssdgFoHLwnk', videoUrl: 'https://www.youtube.com/watch?v=ssdgFoHLwnk' },
      { id: 705, title: 'Creep', artist: 'Radiohead', duration: '3:58', cover: 'https://tse2.mm.bing.net/th?q=Creep+Radiohead+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'XFkzRNyygfk', videoUrl: 'https://www.youtube.com/watch?v=XFkzRNyygfk' }
    ],
    Movie: [
      { id: 701, title: 'Into the Wild', artist: 'Drama/Adventure', duration: '2h 28m', cover: 'https://tse2.mm.bing.net/th?q=Into+the+Wild+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'After graduating from university, a young man abandons everything to travel across America.', trailer: 'https://www.youtube.com/watch?v=g7ArZ7VD-QQ' },
      { id: 702, title: 'Lost in Translation', artist: 'Drama/Romance', duration: '1h 42m', cover: 'https://tse2.mm.bing.net/th?q=Lost+in+Translation+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'A faded movie star and a neglected young woman form an unlikely bond in Tokyo.', trailer: 'https://www.youtube.com/watch?v=W6iVPCRflQM' }
    ]
  },
  Focused: {
    Music: [
      { id: 801, title: 'Experience', artist: 'Ludovico Einaudi', duration: '5:15', cover: 'https://tse2.mm.bing.net/th?q=Experience+Ludovico+Einaudi+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'hN_q-_nGv4U', videoUrl: 'https://www.youtube.com/watch?v=hN_q-_nGv4U' },
      { id: 802, title: 'Time', artist: 'Hans Zimmer', duration: '4:35', cover: 'https://tse2.mm.bing.net/th?q=Time+Hans+Zimmer+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'RxabLA7UQ9k', videoUrl: 'https://www.youtube.com/watch?v=RxabLA7UQ9k' },
      { id: 803, title: 'Intro', artist: 'The xx', duration: '2:07', cover: 'https://tse2.mm.bing.net/th?q=Intro+The+xx+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'xMV6l2y67rk', videoUrl: 'https://www.youtube.com/watch?v=xMV6l2y67rk' },
      { id: 804, title: 'Strobe', artist: 'Deadmau5', duration: '10:37', cover: 'https://tse2.mm.bing.net/th?q=Strobe+Deadmau5+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'tKi9Z-f6qX4', videoUrl: 'https://www.youtube.com/watch?v=tKi9Z-f6qX4' },
      { id: 805, title: 'River Flows in You', artist: 'Yiruma', duration: '3:45', cover: 'https://tse2.mm.bing.net/th?q=River+Flows+in+You+Yiruma+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '7maJOI3QMu0', videoUrl: 'https://www.youtube.com/watch?v=7maJOI3QMu0' }
    ],
    Video: [
      { id: 801, title: 'Experience', artist: 'Ludovico Einaudi', duration: '5:15', cover: 'https://tse2.mm.bing.net/th?q=Experience+Ludovico+Einaudi+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'hN_q-_nGv4U', videoUrl: 'https://www.youtube.com/watch?v=hN_q-_nGv4U' },
      { id: 802, title: 'Time', artist: 'Hans Zimmer', duration: '4:35', cover: 'https://tse2.mm.bing.net/th?q=Time+Hans+Zimmer+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'RxabLA7UQ9k', videoUrl: 'https://www.youtube.com/watch?v=RxabLA7UQ9k' },
      { id: 803, title: 'Intro', artist: 'The xx', duration: '2:07', cover: 'https://tse2.mm.bing.net/th?q=Intro+The+xx+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'xMV6l2y67rk', videoUrl: 'https://www.youtube.com/watch?v=xMV6l2y67rk' },
      { id: 804, title: 'Strobe', artist: 'Deadmau5', duration: '10:37', cover: 'https://tse2.mm.bing.net/th?q=Strobe+Deadmau5+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'tKi9Z-f6qX4', videoUrl: 'https://www.youtube.com/watch?v=tKi9Z-f6qX4' },
      { id: 805, title: 'River Flows in You', artist: 'Yiruma', duration: '3:45', cover: 'https://tse2.mm.bing.net/th?q=River+Flows+in+You+Yiruma+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '7maJOI3QMu0', videoUrl: 'https://www.youtube.com/watch?v=7maJOI3QMu0' }
    ],
    Movie: [
      { id: 801, title: 'The Social Network', artist: 'Drama/Biography', duration: '2h 0m', cover: 'https://tse2.mm.bing.net/th?q=The+Social+Network+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'The founding of Facebook and the lawsuits that followed.', trailer: 'https://www.youtube.com/watch?v=lB95KLmpLR4' },
      { id: 802, title: 'A Beautiful Mind', artist: 'Drama/Biography', duration: '2h 15m', cover: 'https://tse2.mm.bing.net/th?q=A+Beautiful+Mind+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'The story of John Nash, a brilliant mathematician who struggles with schizophrenia.', trailer: 'https://www.youtube.com/watch?v=WFJgUm7iOKw' }
    ]
  },
  Romantic: {
    Music: [
      { id: 901, title: 'Perfect', artist: 'Ed Sheeran', duration: '4:23', cover: 'https://tse2.mm.bing.net/th?q=Perfect+Ed+Sheeran+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '2Vv-BfVoq4g', videoUrl: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g' },
      { id: 902, title: 'All of Me', artist: 'John Legend', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=All+of+Me+John+Legend+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '450p7goxZqg', videoUrl: 'https://www.youtube.com/watch?v=450p7goxZqg' },
      { id: 903, title: 'Thinking Out Loud', artist: 'Ed Sheeran', duration: '4:41', cover: 'https://tse2.mm.bing.net/th?q=Thinking+Out+Loud+Ed+Sheeran+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'lp-EO5I60KA', videoUrl: 'https://www.youtube.com/watch?v=lp-EO5I60KA' },
      { id: 904, title: 'At Last', artist: 'Etta James', duration: '3:02', cover: 'https://tse2.mm.bing.net/th?q=At+Last+Etta+James+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'S-cbOl96RFM', videoUrl: 'https://www.youtube.com/watch?v=S-cbOl96RFM' },
      { id: 905, title: "Can't Help Falling in Love", artist: 'Elvis Presley', duration: '3:00', cover: 'https://tse2.mm.bing.net/th?q=Can%27t+Help+Falling+in+Love+Elvis+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'vGJTaP6anOU', videoUrl: 'https://www.youtube.com/watch?v=vGJTaP6anOU' }
    ],
    Video: [
      { id: 901, title: 'Perfect', artist: 'Ed Sheeran', duration: '4:23', cover: 'https://tse2.mm.bing.net/th?q=Perfect+Ed+Sheeran+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '2Vv-BfVoq4g', videoUrl: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g' },
      { id: 902, title: 'All of Me', artist: 'John Legend', duration: '5:00', cover: 'https://tse2.mm.bing.net/th?q=All+of+Me+John+Legend+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '450p7goxZqg', videoUrl: 'https://www.youtube.com/watch?v=450p7goxZqg' },
      { id: 903, title: 'Thinking Out Loud', artist: 'Ed Sheeran', duration: '4:41', cover: 'https://tse2.mm.bing.net/th?q=Thinking+Out+Loud+Ed+Sheeran+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'lp-EO5I60KA', videoUrl: 'https://www.youtube.com/watch?v=lp-EO5I60KA' },
      { id: 904, title: 'At Last', artist: 'Etta James', duration: '3:02', cover: 'https://tse2.mm.bing.net/th?q=At+Last+Etta+James+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'S-cbOl96RFM', videoUrl: 'https://www.youtube.com/watch?v=S-cbOl96RFM' },
      { id: 905, title: "Can't Help Falling in Love", artist: 'Elvis Presley', duration: '3:00', cover: 'https://tse2.mm.bing.net/th?q=Can%27t+Help+Falling+in+Love+Elvis+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'vGJTaP6anOU', videoUrl: 'https://www.youtube.com/watch?v=vGJTaP6anOU' }
    ],
    Movie: [
      { id: 901, title: 'The Notebook', artist: 'Romance/Drama', duration: '2h 3m', cover: 'https://tse2.mm.bing.net/th?q=The+Notebook+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'A poor yet passionate young man falls in love with a rich young woman.', trailer: 'https://www.youtube.com/watch?v=yDJIcYE0RA0' },
      { id: 902, title: 'La La Land', artist: 'Musical/Romance', duration: '2h 8m', cover: 'https://tse2.mm.bing.net/th?q=La+La+Land+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'A jazz pianist and an aspiring actress fall in love while pursuing their dreams in Los Angeles.', trailer: 'https://www.youtube.com/watch?v=0pdqf4P9MB8' }
    ]
  },
  Neutral: {
    Music: [
      { id: 1001, title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', cover: 'https://tse2.mm.bing.net/th?q=Blinding+Lights+The+Weeknd+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '4NRXx6U8ABQ', videoUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ' },
      { id: 1002, title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:55', cover: 'https://tse2.mm.bing.net/th?q=Bohemian+Rhapsody+Queen+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'fJ9rUzIMcZQ', videoUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ' },
      { id: 1003, title: 'Somebody That I Used to Know', artist: 'Gotye ft. Kimbra', duration: '4:04', cover: 'https://tse2.mm.bing.net/th?q=Somebody+That+I+Used+to+Know+Gotye+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '8UVNT4wvIGY', videoUrl: 'https://www.youtube.com/watch?v=8UVNT4wvIGY' },
      { id: 1004, title: 'Clocks', artist: 'Coldplay', duration: '5:07', cover: 'https://tse2.mm.bing.net/th?q=Clocks+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'd020hcWA_Wg', videoUrl: 'https://www.youtube.com/watch?v=d020hcWA_Wg' },
      { id: 1005, title: 'Viva la Vida', artist: 'Coldplay', duration: '4:01', cover: 'https://tse2.mm.bing.net/th?q=Viva+la+Vida+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'dvgZkm1xWPE', videoUrl: 'https://www.youtube.com/watch?v=dvgZkm1xWPE' }
    ],
    Video: [
      { id: 1001, title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', cover: 'https://tse2.mm.bing.net/th?q=Blinding+Lights+The+Weeknd+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '4NRXx6U8ABQ', videoUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ' },
      { id: 1002, title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:55', cover: 'https://tse2.mm.bing.net/th?q=Bohemian+Rhapsody+Queen+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'fJ9rUzIMcZQ', videoUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ' },
      { id: 1003, title: 'Somebody That I Used to Know', artist: 'Gotye ft. Kimbra', duration: '4:04', cover: 'https://tse2.mm.bing.net/th?q=Somebody+That+I+Used+to+Know+Gotye+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: '8UVNT4wvIGY', videoUrl: 'https://www.youtube.com/watch?v=8UVNT4wvIGY' },
      { id: 1004, title: 'Clocks', artist: 'Coldplay', duration: '5:07', cover: 'https://tse2.mm.bing.net/th?q=Clocks+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'd020hcWA_Wg', videoUrl: 'https://www.youtube.com/watch?v=d020hcWA_Wg' },
      { id: 1005, title: 'Viva la Vida', artist: 'Coldplay', duration: '4:01', cover: 'https://tse2.mm.bing.net/th?q=Viva+la+Vida+Coldplay+Cover&w=500&h=500&c=7&rs=1&p=0', videoId: 'dvgZkm1xWPE', videoUrl: 'https://www.youtube.com/watch?v=dvgZkm1xWPE' }
    ],
    Movie: [
      { id: 1001, title: 'Forrest Gump', artist: 'Drama/Romance', duration: '2h 22m', cover: 'https://tse2.mm.bing.net/th?q=Forrest+Gump+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'The presidencies of Kennedy and Johnson through the eyes of an Alabama man with a low IQ.', trailer: 'https://www.youtube.com/watch?v=bLvqoHBptjg' },
      { id: 1002, title: 'The Shawshank Redemption', artist: 'Drama', duration: '2h 22m', cover: 'https://tse2.mm.bing.net/th?q=The+Shawshank+Redemption+Movie+Poster&w=500&h=750&c=7&rs=1&p=0', description: 'Two imprisoned men bond over a number of years, finding solace and redemption through decency.', trailer: 'https://www.youtube.com/watch?v=6hB3S9bIaco' }
    ]
  }
};

// Keep backward compatibility - alias for old code that uses RECOMMENDATIONS
export const RECOMMENDATIONS = FALLBACK_RECOMMENDATIONS;
