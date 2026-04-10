const articles = [
  {
    id: 1,
    category: "world",
    title: "World Leaders Reach Historic Climate Agreement at Geneva Summit",
    excerpt: "After three days of intense negotiations, delegates from 140 nations signed a sweeping accord committing to net-zero emissions by 2045, with binding enforcement mechanisms for the first time.",
    author: "Elena Marchetti",
    time: "2 hours ago",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    featured: true,
  },
  {
    id: 2,
    category: "tech",
    title: "Quantum Computing Breakthrough Promises to Reshape Cryptography",
    excerpt: "Researchers at MIT have demonstrated a 1,024-qubit processor that can factor large primes in seconds, raising urgent questions about the future of digital security.",
    author: "James Okafor",
    time: "4 hours ago",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
  },
  {
    id: 3,
    category: "business",
    title: "Global Markets Surge as Central Banks Signal Rate Cuts",
    excerpt: "Stocks rallied worldwide after the Federal Reserve, ECB, and Bank of Japan hinted at synchronized policy easing in the second half of 2026, citing cooling inflation.",
    author: "Sofia Reyes",
    time: "5 hours ago",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  },
  {
    id: 4,
    category: "science",
    title: "NASA's Europa Clipper Detects Organic Molecules Beneath the Ice",
    excerpt: "In a discovery that electrifies the search for extraterrestrial life, the spacecraft's mass spectrometer identified complex carbon-based compounds in Europa's subsurface ocean.",
    author: "Dr. Lin Wei",
    time: "6 hours ago",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80",
  },
  {
    id: 5,
    category: "sports",
    title: "France Claims Fifth World Cup Title in Stunning Final",
    excerpt: "A last-minute penalty from Kylian Mbappé sealed a 3–2 victory over Brazil in what commentators are calling the greatest World Cup final in tournament history.",
    author: "Marco Alves",
    time: "8 hours ago",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80",
  },
  {
    id: 6,
    category: "health",
    title: "New mRNA Vaccine Shows 94% Efficacy Against Multiple Cancer Types",
    excerpt: "Phase III trial results published in The Lancet reveal that a personalized mRNA immunotherapy dramatically reduced tumor recurrence across breast, lung, and colon cancers.",
    author: "Dr. Asha Patel",
    time: "10 hours ago",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  },
  {
    id: 7,
    category: "tech",
    title: "Apple Unveils Neural Interface Chip Aimed at Accessibility",
    excerpt: "The company's new BioLink chip, announced at its spring keynote, allows users with motor disabilities to control iPhones and Macs using thought alone.",
    author: "Priya Singh",
    time: "12 hours ago",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80",
  },
  {
    id: 8,
    category: "world",
    title: "UN Peacekeepers Deploy to Eastern Region Amid Escalating Unrest",
    excerpt: "The Security Council voted 12–1 to authorize a 5,000-strong multinational force following weeks of civil disturbances that displaced over 200,000 people.",
    author: "Fatima Al-Hassan",
    time: "14 hours ago",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80",
  },
  {
    id: 9,
    category: "business",
    title: "Electric Vehicle Sales Overtake Combustion Cars in Europe for First Time",
    excerpt: "March data from the European Automobile Manufacturers Association shows EVs accounting for 51.3% of new registrations, a milestone once thought a decade away.",
    author: "Gregor Schmidt",
    time: "16 hours ago",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80",
  },
  {
    id: 10,
    category: "science",
    title: "Archaeologists Unearth 3,200-Year-Old Bronze Age City in Turkey",
    excerpt: "An international team excavating near Antalya has discovered a remarkably preserved urban settlement with temples, workshops, and thousands of cuneiform tablets.",
    author: "Dr. Ivan Petrov",
    time: "18 hours ago",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1552083375-1447ce886485?w=800&q=80",
  },
  {
    id: 11,
    category: "health",
    title: "WHO Declares End to Mpox Public Health Emergency",
    excerpt: "Officials credited the rollout of next-generation vaccines across 60 countries, with global case counts dropping 97% from the 2025 peak to near-zero today.",
    author: "Dr. Amara Diallo",
    time: "20 hours ago",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
  },
  {
    id: 12,
    category: "sports",
    title: "Serena Williams Jr. Wins First Grand Slam at Roland Garros",
    excerpt: "The 19-year-old American sensation dominated the French Open final in straight sets, fueling comparisons to her legendary mother's early career dominance.",
    author: "Chloe Dubois",
    time: "22 hours ago",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  },
];

const trending = [
  { title: "Wildfires Force Evacuations Across Three States", time: "1 hr ago", category: "world" },
  { title: "Bitcoin Crosses $200K for the First Time", time: "3 hrs ago", category: "business" },
  { title: "AI Model Passes Bar Exam with Perfect Score", time: "5 hrs ago", category: "tech" },
  { title: "Drought Crisis Deepens in Sub-Saharan Africa", time: "7 hrs ago", category: "world" },
  { title: "New Gene Therapy Reverses Hearing Loss in Adults", time: "9 hrs ago", category: "health" },
];

const editorsPick = {
  title: "The Loneliness Epidemic: How Modern Life Is Disconnecting Us",
  excerpt: "A deep investigation into the rising tide of social isolation and what communities around the world are doing to reconnect.",
  author: "Sarah Connelly",
  time: "Yesterday",
  image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&q=80",
  category: "health",
};

// ── State ──────────────────────────────────────────────
let activeCategory = "all";
let searchQuery = "";

// ── Helpers ───────────────────────────────────────────
function tagClass(cat) { return `tag tag-${cat}`; }

function tagLabel(cat) {
  return { world: "World", tech: "Technology", business: "Business", science: "Science", sports: "Sports", health: "Health" }[cat] || cat;
}

function filteredArticles() {
  return articles.filter(a => {
    const matchCat = activeCategory === "all" || a.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

// ── Render Hero ────────────────────────────────────────
function renderHero() {
  const heroArticle = articles.find(a => a.featured) || articles[0];
  const section = document.getElementById("heroSection");
  section.innerHTML = `
    <div class="hero-card" onclick="openArticle(${heroArticle.id})">
      <div class="hero-image">
        <img src="${heroArticle.image}" alt="${heroArticle.title}" loading="lazy" />
      </div>
      <div class="hero-body">
        <span class="${tagClass(heroArticle.category)}">${tagLabel(heroArticle.category)}</span>
        <h2>${heroArticle.title}</h2>
        <p>${heroArticle.excerpt}</p>
        <div class="hero-meta">
          <span class="author">${heroArticle.author}</span>
          <span>${heroArticle.time}</span>
          <span>${heroArticle.readTime}</span>
        </div>
      </div>
    </div>
  `;
}

// ── Render Articles ────────────────────────────────────
function renderArticles() {
  const grid = document.getElementById("articlesGrid");
  const noResults = document.getElementById("noResults");
  const list = filteredArticles().filter(a => !a.featured || activeCategory !== "all" || searchQuery);

  if (list.length === 0) {
    grid.innerHTML = "";
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");
  grid.innerHTML = list.map(a => `
    <article class="article-card" onclick="openArticle(${a.id})">
      <div class="card-image">
        <img src="${a.image}" alt="${a.title}" loading="lazy" />
      </div>
      <div class="card-body">
        <span class="${tagClass(a.category)}">${tagLabel(a.category)}</span>
        <h3>${a.title}</h3>
        <p>${a.excerpt}</p>
        <div class="card-meta">
          <span class="author">${a.author}</span>
          <span>${a.time} &middot; ${a.readTime}</span>
        </div>
      </div>
    </article>
  `).join("");
}

// ── Render Sidebar ─────────────────────────────────────
function renderSidebar() {
  // Trending
  document.getElementById("trendingList").innerHTML = trending.map(t => `
    <li>
      <div class="trending-item-text">
        <h4>${t.title}</h4>
        <span>${tagLabel(t.category)} &middot; ${t.time}</span>
      </div>
    </li>
  `).join("");

  // Editor's Pick
  document.getElementById("editorsPick").innerHTML = `
    <img src="${editorsPick.image}" alt="${editorsPick.title}" loading="lazy" />
    <span class="${tagClass(editorsPick.category)}">${tagLabel(editorsPick.category)}</span>
    <h4 style="margin-top:8px">${editorsPick.title}</h4>
    <p>${editorsPick.excerpt}</p>
    <div style="font-size:11px;color:var(--text-light);margin-top:8px">${editorsPick.author} &middot; ${editorsPick.time}</div>
  `;
}

// ── Interactions ───────────────────────────────────────
function openArticle(id) {
  const a = articles.find(x => x.id === id);
  if (!a) return;
  alert(`"${a.title}"\n\nBy ${a.author} — ${a.time}\n\nIn a full implementation, this would open the article page.`);
}

// Category buttons
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderArticles();
  });
});

// Search
document.getElementById("searchInput").addEventListener("input", e => {
  searchQuery = e.target.value.trim();
  renderArticles();
});

// ── Init ───────────────────────────────────────────────
renderHero();
renderArticles();
renderSidebar();
