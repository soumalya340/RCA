export type Persona = {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  interests: string[];
  hello: string;
  topics: Record<string, string[]>;
  fallback: string[];
};

export const PERSONAS: Persona[] = [
  {
    id: "mira",
    name: "Mira",
    city: "Lisbon",
    region: "Lisbon",
    country: "Portugal",
    interests: ["Music", "Food", "Night walks"],
    hello: "Hey. I'm Mira, up on a hill in Lisbon. The trams stopped being romantic about an hour ago.",
    topics: {
      Music: [
        "What are you listening to this week? I keep replaying one sad guitar loop.",
        "Lisbon at night is mostly someone practicing in a window. Do you play anything?",
      ],
      Food: [
        "I ate grilled sardines standing up. What's the late-night food where you are?",
        "If you had one stall in {city}, what would it sell?",
      ],
      "Night walks": [
        "I walk when I can't sleep. Is {city} good for that, or do the streets go quiet too early?",
      ],
    },
    fallback: [
      "Tell me one true thing about {city} tonight.",
      "I'm bad at small talk and good at snacks. Which do you need?",
      "What's taking up your head right now?",
    ],
  },
  {
    id: "jonah",
    name: "Jonah",
    city: "Chicago",
    region: "Illinois",
    country: "United States",
    interests: ["Film", "Books", "Late hours"],
    hello: "Jonah in Chicago. The lake is a black rectangle and I just left a movie I haven't decided about.",
    topics: {
      Film: [
        "Last thing you watched that stayed with you? Mine was too long and I liked it anyway.",
        "Do you watch films alone, or do you need someone to complain with after?",
      ],
      Books: [
        "I'm halfway through a novel I keep putting down to look out the window. Reading anything?",
        "Recommend me something short. My attention is a weeknight.",
      ],
      "Late hours": [
        "It's late here. Is it late in {city} too, or are you living in another clock?",
      ],
    },
    fallback: [
      "Ask me something. I'll answer, then I get one back.",
      "What's {city} doing while we're talking?",
      "I can do weather, films, or the thing you're avoiding. Your pick.",
    ],
  },
  {
    id: "aiko",
    name: "Aiko",
    city: "Osaka",
    region: "Osaka",
    country: "Japan",
    interests: ["Games", "Languages", "Art"],
    hello: "Aiko here, Osaka. I lost three rounds at the arcade and I'm calling it research.",
    topics: {
      Games: [
        "What do you play when you want to vanish for an hour?",
        "I like games that are a little unfair. You?",
      ],
      Languages: [
        "I'm collecting small phrases. Teach me how to say hello in the way people actually say it in {city}.",
        "Do you switch languages in your head, or is one of them home?",
      ],
      Art: [
        "Saw a tiny drawing on a vending machine today. What's the last thing you looked at on purpose?",
      ],
    },
    fallback: [
      "Say the first thing in your head. I'll match the energy.",
      "What's open late in {city}?",
      "I have time. Don't polish it.",
    ],
  },
  {
    id: "sable",
    name: "Sable",
    city: "Accra",
    region: "Greater Accra",
    country: "Ghana",
    interests: ["Startups", "Music", "Food"],
    hello: "Sable, Accra. Generator hummed on, neighbors are louder, which is the better soundtrack.",
    topics: {
      Startups: [
        "What are you making, even if it's only an idea you're not ready to say out loud?",
        "I like projects that start as a favor for a friend. Is yours like that?",
      ],
      Music: [
        "Highlife from a passing car just now. What should be playing under this conversation?",
      ],
      Food: [
        "Have you eaten? I judge cities by what you can get after midnight.",
      ],
    },
    fallback: [
      "Give me the short version of your day in {city}.",
      "I'm in a good mood. Use it.",
      "What's a small thing you want this month?",
    ],
  },
  {
    id: "leif",
    name: "Leif",
    city: "Malmö",
    region: "Skåne",
    country: "Sweden",
    interests: ["Sports", "Travel", "Night walks"],
    hello: "Leif in Malmö. I swam, I regretted it, I had coffee, I forgave myself.",
    topics: {
      Sports: [
        "Do you move your body for joy or for guilt? I'm trying to switch teams.",
        "Any sport you actually watch, or only ones you play?",
      ],
      Travel: [
        "If you left {city} tomorrow with one bag, where would you point it?",
        "What's a place that felt nothing like the photos?",
      ],
      "Night walks": [
        "The path by the water is empty. Would you walk it, or are you a stay-inside person?",
      ],
    },
    fallback: [
      "How's the air in {city} right now? Literally or otherwise.",
      "Tell me something ordinary. Ordinary travels well.",
      "I can talk routes, food, or why you're still awake.",
    ],
  },
  {
    id: "noor",
    name: "Noor",
    city: "Cairo",
    region: "Cairo",
    country: "Egypt",
    interests: ["Books", "Languages", "Art"],
    hello: "Noor, Cairo. The street is still arguing downstairs and I'm letting it.",
    topics: {
      Books: [
        "Which book do you lend and then quietly hope not to get back?",
        "I'm reading poetry so short it feels like eavesdropping. You?",
      ],
      Languages: [
        "Cairo talks over itself. How many languages do you hear in a day in {city}?",
      ],
      Art: [
        "I like art that doesn't explain itself. Seen anything like that lately?",
      ],
    },
    fallback: [
      "What should I know about {city} that a guide would skip?",
      "Start wherever you are. I'll keep up.",
      "Ask me about the street, a book, or nothing in particular.",
    ],
  },
];

function pick(lines: string[], salt: string): string {
  if (lines.length === 0) return "I'm here.";
  let h = 0;
  for (let i = 0; i < salt.length; i += 1) h = (h + salt.charCodeAt(i) * (i + 1)) % 997;
  return lines[h % lines.length] ?? lines[0];
}

export function pickPersona(interests: string[], avoidId?: string): Persona {
  const wanted = new Set(interests.map((tag) => tag.toLowerCase()));
  const pool = PERSONAS.filter((persona) => persona.id !== avoidId);
  const ranked = (pool.length > 0 ? pool : PERSONAS).map((persona) => ({
    persona,
    score: persona.interests.reduce((sum, tag) => sum + (wanted.has(tag.toLowerCase()) ? 1 : 0), 0),
  }));
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.filter((item) => item.score === ranked[0].score);
  const index = Math.floor(Math.random() * top.length);
  return top[index]?.persona ?? PERSONAS[0];
}

export function hostedReply(persona: Persona, text: string, userCity: string): string {
  const city = userCity.trim() || "your city";
  const q = text.toLowerCase();
  const fill = (line: string) => line.replaceAll("{city}", city);

  if (/\b(where|from|city|live|based|country)\b/.test(q)) {
    return `I'm in ${persona.city}, ${persona.country}. You're showing up as ${city}. What's the night like there?`;
  }
  if (/\b(name|who are you)\b/.test(q)) {
    return `I'm ${persona.name}. Hosted, so I'm a stand-in when the queue is empty — still happy to talk.`;
  }
  for (const interest of persona.interests) {
    if (q.includes(interest.toLowerCase())) {
      const line = pick(persona.topics[interest] ?? [], text);
      return fill(line);
    }
  }
  if (q.includes("?")) {
    return fill(pick(persona.fallback, `${text}?`));
  }
  return fill(pick(persona.fallback, text));
}
