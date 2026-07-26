import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import logoUrl from './logo.svg';

const AUTH_KEY = 'olympic-hotel-editor-auth';
const DEFAULT_PASSWORD = 'olympic2026';
const CUSTOM_LOGO_URL = import.meta.env.VITE_LOGO_URL || logoUrl;

function LogoHeader() {
  return (
    <header className="app-header">
      <img src={CUSTOM_LOGO_URL} alt="Olympic Hotel logo" className="app-logo" />
    </header>
  );
}

/* ---- Category icon map ---- */
const CATEGORY_ICONS = {
  starter:   '🥗',
  starters:  '🥗',
  appetizer: '🥗',
  soup:      '🍜',
  salad:     '🥙',
  main:      '🍽️',
  mains:     '🍽️',
  entree:    '🍽️',
  pasta:     '🍝',
  pizza:     '🍕',
  grill:     '🥩',
  seafood:   '🦞',
  fish:      '🐟',
  dessert:   '🍮',
  desserts:  '🍮',
  drink:     '🍷',
  drinks:    '🍷',
  beverage:  '🥂',
  cocktail:  '🍸',
  wine:      '🍾',
  coffee:    '☕',
  breakfast: '🥐',
  lunch:     '🥪',
  brunch:    '🍳',
};

const getCategoryIcon = (name = '') => {
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return '✦';
};

/* Group drinks into logical sub-categories for the public menu */
const groupDrinks = (items = []) => {
  const groups = {
    Wine: [],
    Beer: [],
    Cocktail: [],
    Smoothie: [],
    Milkshake: [],
    Coffee: [],
    Tea: [],
    Juice: [],
    Liqueur: [],
    Spirits: [],
    Others: [],
  };

  const kw = (s = '') => (s || '').toLowerCase();

  for (const it of items) {
    const name = kw(it.name);
    const desc = kw(it.description);

    if (name.includes('wine') || name.includes('red') || name.includes('white') || desc.includes('wine')) {
      groups.Wine.push(it); continue;
    }
    if (name.includes('mutzig') || name.includes('heineken') || name.includes('beer') || desc.includes('beer')) {
      groups.Beer.push(it); continue;
    }
    if (name.includes('mojito') || name.includes('margarita') || name.includes('cocktail') || desc.includes('cocktail')) {
      groups.Cocktail.push(it); continue;
    }
    if (name.includes('smoothie')) { groups.Smoothie.push(it); continue; }
    if (name.includes('milkshake') || name.includes('milk shake')) { groups.Milkshake.push(it); continue; }
    if (name.includes('latte') || name.includes('coffee') || name.includes('americano')) { groups.Coffee.push(it); continue; }
    if (name.includes('tea')) { groups.Tea.push(it); continue; }
    if (name.includes('juice') || name.includes('inyange')) { groups.Juice.push(it); continue; }
    if (name.includes('amarula') || name.includes('baileys') || name.includes('liqueur') || desc.includes('liqueur')) { groups.Liqueur.push(it); continue; }
    if (name.includes('vodka') || name.includes('rum') || name.includes('tequila') || name.includes('gin') || name.includes('whisky') || name.includes('whiskey') || name.includes('cognac') || name.includes('brandy')) { groups.Spirits.push(it); continue; }

    groups.Others.push(it);
  }

  // Only return groups that have items, in a sensible order
  const order = ['Cocktail', 'Wine', 'Beer', 'Spirits', 'Liqueur', 'Smoothie', 'Milkshake', 'Coffee', 'Tea', 'Juice', 'Others'];
  return order.map((k) => ({ name: k, items: groups[k] })).filter((g) => g.items && g.items.length > 0);
};

/* ---- Data helpers ---- */
const createDefaultMenu = () => ({
  title: 'Olympic Hotel',
  subtitle: 'Fine dining menu',
  categories: [
    {
      id: crypto.randomUUID(),
      name: 'Starters',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Crispy Calamari',
          description: 'Golden-fried rings, lemon aioli, chili flakes, fresh parsley',
          price: '8,500',
        },
        {
          id: crypto.randomUUID(),
          name: 'Burrata & Heirloom Tomatoes',
          description: 'Creamy burrata, rainbow tomatoes, aged balsamic, micro basil',
          price: '7,500',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'Mains',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Herb Roast Chicken',
          description: 'Free-range chicken, truffle jus, roasted baby vegetables, pomme purée',
          price: '15,000',
        },
        {
          id: crypto.randomUUID(),
          name: 'Wagyu Sirloin 250g',
          description: 'A4 wagyu, bone marrow butter, charred shallot, red wine reduction',
          price: '28,000',
        },
        {
          id: crypto.randomUUID(),
          name: 'Lobster Linguine',
          description: 'Fresh pasta, Atlantic lobster, tomato bisque, basil oil',
          price: '20,000',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'Desserts',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Crème Brûlée',
          description: 'Classic vanilla custard, caramelised sugar crust, seasonal berry compote',
          price: '5,500',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'Drinks',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Signature Spritz',
          description: 'Citrus, elderflower liqueur, prosecco, dehydrated orange',
          price: '6,500',
        },
        {
          id: crypto.randomUUID(),
          name: 'House Red — Malbec',
          description: 'Full-bodied Argentine Malbec, dark fruit, tobacco, smooth finish',
          price: '4,500',
        },
      ],
    },
  ],
});

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://olympic-production.up.railway.app' : '');
const DEFAULT_ROUTE = import.meta.env.VITE_DEFAULT_ROUTE || '/menu';
// Admin editor is always enabled so staff can access it at /editor.
const INCLUDE_EDITOR = true;
const PUBLIC_HOST = import.meta.env.VITE_PUBLIC_URL || '';
const PUBLIC_DEFAULT_ROUTE = import.meta.env.VITE_PUBLIC_DEFAULT_ROUTE || '/menu';
const buildApiUrl = (path) => {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

const getPublicMenuUrl = () => {
  const route = PUBLIC_HOST ? PUBLIC_DEFAULT_ROUTE : DEFAULT_ROUTE;
  if (typeof window === 'undefined') return route;

  if (PUBLIC_HOST) {
    const host = PUBLIC_HOST.replace(/\/$/, '');
    return `${host}${route.startsWith('/') ? route : `/${route}`}`;
  }

  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(DEFAULT_ROUTE.replace(/^[\/]+/, ''), `${window.location.origin}${normalizedBase}`).toString();
};

const loadMenu = async () => {
  if (typeof window === 'undefined') return createDefaultMenu();
  try {
    const response = await fetch(buildApiUrl('/api/menu'));
    if (!response.ok) {
      console.error('Failed to load menu:', response.statusText);
      return createDefaultMenu();
    }
    const data = await response.json();
    return data && Array.isArray(data.categories) && data.categories.length > 0
      ? data
      : createDefaultMenu();
  } catch (error) {
    console.error('Error loading menu:', error);
    return createDefaultMenu();
  }
};

const saveMenu = async (menu) => {
  if (typeof window === 'undefined') return menu;
  const response = await fetch(buildApiUrl('/api/menu'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menu),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to save menu: ${response.status} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return menu;
  }
};

/* ============================================================
   EDITOR PAGE
   ============================================================ */
function EditorPage({ menuData, setMenuData }) {
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveIsError, setSaveIsError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AUTH_KEY) === 'true';
  });

  const handleLogin = (event) => {
    event.preventDefault();
    if (password === DEFAULT_PASSWORD) {
      setIsAuthenticated(true);
      window.localStorage.setItem(AUTH_KEY, 'true');
    } else {
      window.alert('Incorrect password. Hint: olympic2026');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    window.localStorage.removeItem(AUTH_KEY);
  };

  const saveCurrentMenu = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setSaveIsError(false);
    try {
      const savedMenu = await saveMenu(menuData);
      setMenuData(savedMenu);
      setSaveMessage('✓ Menu saved and published.');
    } catch (error) {
      const message = error?.message || 'Saving failed. Please try again.';
      console.error('Save failed:', error);
      setSaveMessage(`Save failed: ${message}`);
      setSaveIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = () => {
    const next = {
      ...menuData,
      categories: [
        ...menuData.categories,
        { id: crypto.randomUUID(), name: 'New Category', items: [] },
      ],
    };
    setMenuData(next);
  };

  const updateCategory = (categoryId, value) => {
    const next = {
      ...menuData,
      categories: menuData.categories.map((c) =>
        c.id === categoryId ? { ...c, name: value } : c,
      ),
    };
    setMenuData(next);
  };

  const deleteCategory = (categoryId) => {
    const next = {
      ...menuData,
      categories: menuData.categories.filter((c) => c.id !== categoryId),
    };
    setMenuData(next);
  };

  const moveCategory = (categoryId, direction) => {
    const index = menuData.categories.findIndex((c) => c.id === categoryId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuData.categories.length) return;
    const updated = [...menuData.categories];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    setMenuData({ ...menuData, categories: updated });
  };

  const addItem = (categoryId) => {
    const next = {
      ...menuData,
      categories: menuData.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: crypto.randomUUID(), name: 'New Item', description: 'Add a description', price: '0' },
              ],
            }
          : c,
      ),
    };
    setMenuData(next);
  };

  const updateItem = (categoryId, itemId, field, value) => {
    const next = {
      ...menuData,
      categories: menuData.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: c.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item,
              ),
            }
          : c,
      ),
    };
    setMenuData(next);
  };

  const deleteItem = (categoryId, itemId) => {
    const next = {
      ...menuData,
      categories: menuData.categories.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.filter((item) => item.id !== itemId) }
          : c,
      ),
    };
    setMenuData(next);
  };

  const moveItem = (categoryId, itemId, direction) => {
    const category = menuData.categories.find((c) => c.id === categoryId);
    if (!category) return;
    const index = category.items.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= category.items.length) return;
    const updatedItems = [...category.items];
    const [item] = updatedItems.splice(index, 1);
    updatedItems.splice(targetIndex, 0, item);
    const next = {
      ...menuData,
      categories: menuData.categories.map((c) =>
        c.id === categoryId ? { ...c, items: updatedItems } : c,
      ),
    };
    setMenuData(next);
  };

  /* ---- Auth Screen ---- */
  if (!isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <img src={CUSTOM_LOGO_URL} alt="Olympic Hotel logo" className="auth-logo" />
          <p className="eyebrow">Olympic Hotel</p>
          <h1>Menu Editor</h1>
          <p className="auth-description">Enter your password to unlock the menu editor.</p>
          <form onSubmit={handleLogin} className="auth-form">
            <input
              type="password"
              id="editor-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              autoFocus
            />
            <button type="submit" className="primary-button">
              Unlock Editor
            </button>
          </form>
          <p className="auth-hint">
            Password: <code>olympic2026</code>
          </p>
        </div>
      </div>
    );
  }

  /* ---- Editor Layout ---- */
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Olympic Hotel</p>
          <h1>Menu Editor</h1>
        </div>
        <div className="topbar-actions">
          <Link to="/menu" className="secondary-button" target="_blank" rel="noopener noreferrer">
            ↗ View Live Menu
          </Link>
          <button onClick={handleLogout} className="ghost-button">
            Lock Editor
          </button>
        </div>
      </header>

      <section className="editor-grid">
        {/* Left — Editor panel */}
        <div className="editor-panel">
          <div className="panel-header">
            <div>
              <h2>Build your menu</h2>
              <p>Edit categories and items, then save to publish.</p>
            </div>
            <div className="topbar-actions">
              <button
                id="save-menu-btn"
                onClick={saveCurrentMenu}
                className="primary-button"
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : '💾 Save Menu'}
              </button>
              <button
                id="add-category-btn"
                onClick={addCategory}
                className="secondary-button"
              >
                + Category
              </button>
            </div>
          </div>

          {saveMessage && (
            <p className={`save-message${saveIsError ? ' error' : ''}`}>{saveMessage}</p>
          )}

          <div className="form-block">
            <label htmlFor="hotel-name">Hotel name</label>
            <input
              id="hotel-name"
              className="form-input"
              value={menuData.title}
              onChange={(e) => setMenuData({ ...menuData, title: e.target.value })}
            />
          </div>

          <div className="form-block">
            <label htmlFor="hotel-subtitle">Subtitle</label>
            <input
              id="hotel-subtitle"
              className="form-input"
              value={menuData.subtitle}
              onChange={(e) => setMenuData({ ...menuData, subtitle: e.target.value })}
            />
          </div>

          {menuData.categories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-row">
                <input
                  value={category.name}
                  onChange={(e) => updateCategory(category.id, e.target.value)}
                  className="category-name-input"
                  placeholder="Category name"
                />
                <div className="category-actions">
                  <button onClick={() => moveCategory(category.id, 'up')} className="icon-button" title="Move up">↑</button>
                  <button onClick={() => moveCategory(category.id, 'down')} className="icon-button" title="Move down">↓</button>
                  <button onClick={() => addItem(category.id)} className="icon-button" title="Add item">+</button>
                  <button onClick={() => deleteCategory(category.id)} className="icon-button danger" title="Delete category">×</button>
                </div>
              </div>

              <div className="items-list">
                {category.items.map((item, index) => (
                  <div key={item.id} className="menu-item-card">
                    <div className="item-row">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(category.id, item.id, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                      <input
                        value={item.price}
                        onChange={(e) => updateItem(category.id, item.id, 'price', e.target.value)}
                        placeholder="Price (RWF)"
                      />
                      <div className="item-actions">
                        <button onClick={() => moveItem(category.id, item.id, 'up')} className="icon-button" title="Move up">↑</button>
                        <button onClick={() => moveItem(category.id, item.id, 'down')} className="icon-button" title="Move down">↓</button>
                        <button onClick={() => deleteItem(category.id, item.id)} className="icon-button danger" title="Delete item">×</button>
                      </div>
                    </div>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(category.id, item.id, 'description', e.target.value)}
                      placeholder="Description"
                    />
                    <div className="item-meta">Position {index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right — Preview + QR */}
        <aside className="preview-panel">
          <div className="panel-header compact">
            <div>
              <h2>Live preview</h2>
              <p>Exactly how guests will see the menu.</p>
            </div>
          </div>
          <MenuPreview menuData={menuData} />
          <QrPanel />
        </aside>
      </section>
    </div>
  );
}

/* ============================================================
   MENU PREVIEW (Editor sidebar)
   ============================================================ */
function MenuPreview({ menuData }) {
  return (
    <div className="preview-card">
      <div className="preview-header">
        <p className="eyebrow">Guest view</p>
        <h3>{menuData.title}</h3>
        <p>{menuData.subtitle}</p>
      </div>
      <div className="preview-body">
        {menuData.categories.map((category) => (
          <section key={category.id} className="preview-category">
            <h4>
              <span style={{ marginRight: 5 }}>{getCategoryIcon(category.name)}</span>
              {category.name}
            </h4>
            {category.items.map((item) => (
              <div key={item.id} className="preview-item">
                <div className="preview-item-top">
                  <strong>{item.name}</strong>
                  <span>RWF {item.price}</span>
                </div>
                <p>{item.description}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   QR CODE PANEL
   ============================================================ */
function QrPanel() {
  const [menuUrl, setMenuUrl] = useState('');
  const [pngUrl, setPngUrl] = useState('');
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMenuUrl(getPublicMenuUrl());
  }, []);

  useEffect(() => {
    if (!menuUrl) return;
    QRCode.toDataURL(menuUrl, { width: 220, margin: 2, color: { dark: '#0d1220', light: '#ffffff' } })
      .then(setPngUrl)
      .catch(() => setPngUrl(''));
    QRCode.toString(menuUrl, { type: 'svg', width: 220, margin: 2 })
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(''));
  }, [menuUrl]);

  const downloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'olympic-hotel-menu.svg';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadPng = () => {
    if (!pngUrl) return;
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = 'olympic-hotel-menu.png';
    link.click();
  };

  return (
    <div className="qr-card">
      <div className="panel-header compact" style={{ justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
        <h3>QR Code</h3>
        <p>Scan to open the live public menu.</p>
      </div>
      {pngUrl && (
        <div className="qr-image-wrapper">
          <img src={pngUrl} alt="QR code for the public menu" className="qr-image" />
        </div>
      )}
      <div className="qr-actions">
        <button id="download-svg-btn" onClick={downloadSvg} className="secondary-button">Download SVG</button>
        <button id="download-png-btn" onClick={downloadPng} className="primary-button">Download PNG</button>
      </div>
      <code className="qr-link">{menuUrl}</code>
    </div>
  );
}

/* ============================================================
   PUBLIC MENU PAGE — Cinematic guest-facing menu
   ============================================================ */
function PublicMenuPage({ menuData: initialData }) {
  const [localMenuData, setLocalMenuData] = useState(initialData);
  const [activeCategory, setActiveCategory] = useState(null);
  const sectionRefs = useRef({});

  /* Sync from parent */
  useEffect(() => { setLocalMenuData(initialData); }, [initialData]);

  /* Live polling every 3s */
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/menu'));
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (JSON.stringify(localMenuData) !== JSON.stringify(data)) {
          setLocalMenuData(data);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [localMenuData]);

  /* Set initial active category */
  useEffect(() => {
    if (localMenuData.categories.length > 0 && !activeCategory) {
      setActiveCategory(localMenuData.categories[0].id);
    }
  }, [localMenuData, activeCategory]);

  /* Scroll to category */
  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const el = sectionRefs.current[categoryId];
    if (el) {
      const offset = 72;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  /* Scroll spy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveCategory(entry.target.dataset.categoryId);
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [localMenuData]);

  /* Particles */
  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 90 + 5}%`,
    top:  `${Math.random() * 80 + 10}%`,
    duration: `${4 + Math.random() * 6}s`,
    delay:    `${Math.random() * 4}s`,
  }));

  const totalDishes = localMenuData.categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="public-page">

      {/* ---- Hero ---- */}
      <div className="public-hero">
        <div className="hero-particles">
          {particles.map((p) => (
            <span key={p.id} className="particle"
              style={{ left: p.left, top: p.top, '--duration': p.duration, '--delay': p.delay }}
            />
          ))}
        </div>
        <img src={CUSTOM_LOGO_URL} alt="Olympic Hotel logo" className="hero-logo" />
        <p className="eyebrow">Welcome to</p>
        <h1>
          {localMenuData.title.includes(' ') ? (
            <>
              {localMenuData.title.split(' ').slice(0, -1).join(' ')}{' '}
              <em>{localMenuData.title.split(' ').slice(-1)}</em>
            </>
          ) : (
            <em>{localMenuData.title}</em>
          )}
        </h1>
        <div className="hero-divider" />
        <p className="hero-subtitle">{localMenuData.subtitle}</p>
        <div className="hero-badges">
          <span className="hero-badge">
            <span className="badge-dot" />
            Menu live now
          </span>
          <span className="hero-badge">📋 {localMenuData.categories.length} categories</span>
          <span className="hero-badge">🍽️ {totalDishes} dishes</span>
        </div>
      </div>

      {/* ---- Sticky Category Nav ---- */}
      {localMenuData.categories.length > 0 && (
        <div className="category-nav-wrapper">
          <div className="category-nav-inner">
            <nav className="category-nav" role="navigation" aria-label="Menu categories">
              {localMenuData.categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-nav-btn${activeCategory === category.id ? ' active' : ''}`}
                  onClick={() => scrollToCategory(category.id)}
                  aria-label={`Jump to ${category.name}`}
                >
                  <span style={{ marginRight: 5 }}>{getCategoryIcon(category.name)}</span>
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ---- Menu Body ---- */}
      <main className="public-menu-body">
        {localMenuData.categories.map((category, catIndex) => (
          <section
            key={category.id}
            className="public-category"
            data-category-id={category.id}
            ref={(el) => { sectionRefs.current[category.id] = el; }}
            style={{ animationDelay: `${catIndex * 0.1}s` }}
            aria-labelledby={`cat-heading-${category.id}`}
          >
            <div className="category-heading-row">
              <div className="category-heading-line left" />
              <h2 id={`cat-heading-${category.id}`}>
                <span className="category-icon">{getCategoryIcon(category.name)}</span>
                {category.name}
              </h2>
              <div className="category-heading-line" />
            </div>

            {(/drink|boisson|boissons|boissons/i).test(category.name) ? (
              // Render grouped drinks
              (() => {
                const groups = groupDrinks(category.items);
                return (
                  <div className="drink-groups">
                    {groups.map((g, gi) => (
                      <div key={g.name} className="drink-group" style={{ marginBottom: 18 }}>
                        <h3 className="drink-group-title">{g.name}</h3>
                        <div className="items-grid">
                          {g.items.map((item, itemIndex) => (
                            <article
                              key={item.id}
                              className="public-item"
                              style={{ '--item-delay': `${itemIndex * 0.07 + catIndex * 0.05 + gi * 0.02}s` }}
                            >
                              <div className="item-accent-line" />
                              <div className="public-item-top">
                                <h3>{item.name}</h3>
                                <span className="item-price-badge">RWF {item.price}</span>
                              </div>
                              {item.description && (
                                <p className="item-desc">{item.description}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <div className="items-grid">
                {category.items.map((item, itemIndex) => (
                  <article
                    key={item.id}
                    className="public-item"
                    style={{ '--item-delay': `${itemIndex * 0.07 + catIndex * 0.05}s` }}
                  >
                    <div className="item-accent-line" />
                    <div className="public-item-top">
                      <h3>{item.name}</h3>
                      <span className="item-price-badge">RWF {item.price}</span>
                    </div>
                    {item.description && (
                      <p className="item-desc">{item.description}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>

      {/* ---- Footer ---- */}
      <footer className="public-footer">
        <p><strong>{localMenuData.title}</strong> &nbsp;·&nbsp; Scan. Savor. Enjoy.</p>
        <p style={{ marginTop: 6 }}>All prices in Rwandan Franc (RWF) · Menu updated live</p>
      </footer>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */
function App() {
  const [menuData, setMenuData] = useState(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const navigate = useNavigate();

  /* ---- Theme state ---- */
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
  }, []);

  /* Load menu data */
  useEffect(() => {
    const initialize = async () => {
      const data = await loadMenu();
      setMenuData(data);
      setIsLoadingMenu(false);
    };
    initialize();
  }, []);

  if (isLoadingMenu) {
    return (
      <>
        <LogoHeader />
        <div className="loading-screen">
          <div className="loading-card">
            <img src={CUSTOM_LOGO_URL} alt="Olympic Hotel logo" className="app-logo" />
            <p className="loading-message">Loading menu…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LogoHeader />
      <Routes>
        <Route
          path="/"
          element={<Navigate to={DEFAULT_ROUTE} replace />}
        />
        {INCLUDE_EDITOR && (
          <Route
            path="/editor"
            element={
              <EditorPage
                menuData={menuData}
                setMenuData={setMenuData}
              />
            }
          />
        )}
        <Route
          path="/menu"
          element={
            <PublicMenuPage
              menuData={menuData}
            />
          }
        />
        <Route
          path="*"
          element={<Navigate to={DEFAULT_ROUTE} replace />}
        />
      </Routes>
    </>
  );
}

export default App;
