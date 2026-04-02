import { useEffect, useMemo, useState } from 'react'

type Attack = {
  name: string
  damage?: string
  text?: string
}

type CardPrices = {
  low?: number
  mid?: number
  high?: number
  market?: number
  directLow?: number
}

type CollectionEntry = {
  quantity: number
}

type PokemonCard = {
  id: string
  name: string
  hp?: string
  rarity?: string
  images: {
    small: string
    large: string
  }
  set: {
    name: string
    series?: string
  }
  types?: string[]
  attacks?: Attack[]
  tcgplayer?: {
    updatedAt?: string
    prices?: Record<string, CardPrices>
  }
  cardmarket?: {
    updatedAt?: string
    prices?: {
      averageSellPrice?: number
      lowPrice?: number
      trendPrice?: number
      reverseHoloSell?: number
      reverseHoloLow?: number
      reverseHoloTrend?: number
    }
  }
}

type ViewMode = 'browse' | 'favorites' | 'collection'

const FAVORITES_KEY = 'pokeloco:favorites'
const COLLECTION_KEY = 'pokeloco:collection'
const LOGO_PATH = '/file_000000006e34720ebef0397bd36c8c5f.png'

function formatUsd(value?: number) {
  if (typeof value !== 'number') return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function getPriceInfo(card: PokemonCard) {
  const tcgPrices = card.tcgplayer?.prices

  if (tcgPrices) {
    const entries = Object.entries(tcgPrices)
    if (entries.length > 0) {
      const [variant, prices] = entries[0]
      return {
        source: 'TCGplayer',
        variant,
        market: prices.market,
        low: prices.low,
        mid: prices.mid,
        high: prices.high,
      }
    }
  }

  const cm = card.cardmarket?.prices
  if (cm) {
    return {
      source: 'Cardmarket',
      variant: 'standard',
      market: cm.averageSellPrice,
      low: cm.lowPrice,
      mid: cm.trendPrice,
      high: undefined,
    }
  }

  return null
}

export default function App() {
  const [query, setQuery] = useState('pikachu')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  const [favorites, setFavorites] = useState<string[]>([])
  const [collection, setCollection] = useState<Record<string, CollectionEntry>>({})
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY)
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites))

    const savedCollection = localStorage.getItem(COLLECTION_KEY)
    if (savedCollection) setCollection(JSON.parse(savedCollection))
  }, [])

  useEffect(() => {
    runSearch('pikachu')
  }, [])

  function persistFavorites(next: string[]) {
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  function persistCollection(next: Record<string, CollectionEntry>) {
    setCollection(next)
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(next))
  }

  function toggleFavorite(cardId: string) {
    const exists = favorites.includes(cardId)
    const next = exists
      ? favorites.filter((id) => id !== cardId)
      : [...favorites, cardId]

    persistFavorites(next)
  }

  function addToCollection(cardId: string) {
    const current = collection[cardId]?.quantity ?? 0
    persistCollection({
      ...collection,
      [cardId]: { quantity: current + 1 },
    })
  }

  function decreaseFromCollection(cardId: string) {
    const current = collection[cardId]?.quantity ?? 0

    if (current <= 1) {
      const next = { ...collection }
      delete next[cardId]
      persistCollection(next)
      return
    }

    persistCollection({
      ...collection,
      [cardId]: { quantity: current - 1 },
    })
  }

  async function runSearch(term?: string) {
    const value = (term ?? query).trim()
    if (!value) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(value)}*&pageSize=20`
      )
      const data = await response.json()
      const nextCards = data?.data ?? []

      setCards(nextCards)
      setSelectedCard(nextCards[0] ?? null)
      setMobileDetailOpen(false)
    } catch {
      setError('Não foi possível carregar as cartas agora.')
    } finally {
      setLoading(false)
    }
  }

  const collectionCards = useMemo(() => {
    return cards.filter((card) => collection[card.id])
  }, [cards, collection])

  const visibleCards = useMemo(() => {
    if (viewMode === 'favorites') {
      return cards.filter((card) => favorites.includes(card.id))
    }

    if (viewMode === 'collection') {
      return collectionCards
    }

    return cards
  }, [cards, favorites, collectionCards, viewMode])

  const collectionTotal = useMemo(() => {
    return collectionCards.reduce((sum, card) => {
      const quantity = collection[card.id]?.quantity ?? 0
      const priceInfo = getPriceInfo(card)
      const unit = priceInfo?.market ?? priceInfo?.mid ?? priceInfo?.low ?? 0
      return sum + unit * quantity
    }, 0)
  }, [collectionCards, collection])

  function openCard(card: PokemonCard) {
    setSelectedCard(card)
    setMobileDetailOpen(true)
  }

  function renderDetail(card: PokemonCard) {
    const priceInfo = getPriceInfo(card)
    const quantity = collection[card.id]?.quantity ?? 0

    return (
      <>
        <div className="detail-hero">
          <img className="detail-card-image" src={card.images.large} alt={card.name} />

          <div className="detail-info">
            <div className="title-row">
              <div>
                <p className="section-kicker">Carta</p>
                <h2>{card.name}</h2>
              </div>

              <button
                className={
                  favorites.includes(card.id)
                    ? 'favorite-button active'
                    : 'favorite-button'
                }
                onClick={() => toggleFavorite(card.id)}
              >
                {favorites.includes(card.id) ? 'Favorita' : 'Favoritar'}
              </button>
            </div>

            <div className="collection-box">
              <div>
                <span className="meta-label">Minha coleção</span>
                <strong>{quantity > 0 ? `${quantity} unidade(s)` : 'Ainda não adicionada'}</strong>
              </div>

              <div className="collection-actions">
                <button className="qty-button" onClick={() => decreaseFromCollection(card.id)}>
                  −
                </button>
                <button className="qty-button primary" onClick={() => addToCollection(card.id)}>
                  +
                </button>
              </div>
            </div>

            <div className="price-box price-box-priority">
              <span className="meta-label">Preço de referência</span>

              {priceInfo ? (
                <>
                  <strong className="hero-price">
                    {formatUsd(priceInfo.market ?? priceInfo.mid ?? priceInfo.low)}
                  </strong>

                  <div className="price-grid">
                    <div className="price-mini">
                      <span>Fonte</span>
                      <strong>{priceInfo.source}</strong>
                    </div>
                    <div className="price-mini">
                      <span>Variação</span>
                      <strong>{priceInfo.variant}</strong>
                    </div>
                    <div className="price-mini">
                      <span>Low</span>
                      <strong>{formatUsd(priceInfo.low)}</strong>
                    </div>
                    <div className="price-mini">
                      <span>Mid</span>
                      <strong>{formatUsd(priceInfo.mid)}</strong>
                    </div>
                    <div className="price-mini">
                      <span>High</span>
                      <strong>{formatUsd(priceInfo.high)}</strong>
                    </div>
                    <div className="price-mini">
                      <span>Market</span>
                      <strong>{formatUsd(priceInfo.market)}</strong>
                    </div>
                  </div>

                  <p className="price-note">
                    Preço de referência de mercado. O valor real pode variar conforme condição, edição e versão da carta.
                  </p>
                </>
              ) : (
                <>
                  <strong className="hero-price">Sem preço disponível</strong>
                  <p className="price-note">
                    Esta carta não trouxe referência de preço na fonte atual.
                  </p>
                </>
              )}
            </div>

            <div className="meta-grid">
              <div className="meta-box">
                <span className="meta-label">Set</span>
                <strong>{card.set.name}</strong>
              </div>

              <div className="meta-box">
                <span className="meta-label">Raridade</span>
                <strong>{card.rarity || 'Não informada'}</strong>
              </div>

              <div className="meta-box">
                <span className="meta-label">HP</span>
                <strong>{card.hp || '—'}</strong>
              </div>

              <div className="meta-box">
                <span className="meta-label">Tipo</span>
                <strong>{card.types?.join(', ') || '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="attacks-panel">
          <h3>Ataques</h3>

          {card.attacks?.length ? (
            <div className="attack-list">
              {card.attacks.map((attack) => (
                <div key={attack.name} className="attack-card">
                  <div className="attack-top">
                    <strong>{attack.name}</strong>
                    <span>{attack.damage || '—'}</span>
                  </div>
                  <p>{attack.text || 'Sem descrição.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-text">Sem ataques informados.</p>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="app-shell premium-theme">
      <div className="cosmic-bg" />

      <header className="premium-header">
        <div className="header-inner">
          <img className="brand-logo" src={LOGO_PATH} alt="Pokeloco" />
          <div className="brand-copy">
            <h1>Pokeloco</h1>
            <p>Catálogo premium de cartas, favoritos e coleção</p>
          </div>
        </div>
      </header>

      <main className="layout premium-layout">
        <section className="sidebar">
          <div className="panel premium-panel search-panel">
            <div className="search-row premium-search-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar carta..."
              />
              <button onClick={() => runSearch()}>{loading ? 'Buscando...' : 'Buscar'}</button>
            </div>

            <div className="tab-row premium-tabs">
              <button
                className={viewMode === 'browse' ? 'tab active' : 'tab'}
                onClick={() => setViewMode('browse')}
              >
                Catálogo
              </button>

              <button
                className={viewMode === 'favorites' ? 'tab active' : 'tab'}
                onClick={() => setViewMode('favorites')}
              >
                Favoritas
              </button>

              <button
                className={viewMode === 'collection' ? 'tab active' : 'tab'}
                onClick={() => setViewMode('collection')}
              >
                Coleção
              </button>
            </div>
          </div>

          {viewMode === 'collection' && (
            <div className="panel premium-panel collection-summary">
              <span className="meta-label">Valor estimado da coleção</span>
              <strong>{formatUsd(collectionTotal)}</strong>
            </div>
          )}

          <div className="panel premium-panel list-panel">
            {loading && <p className="status-text">Carregando cartas...</p>}
            {error && <p className="status-text error">{error}</p>}

            {!loading && !error && visibleCards.length === 0 && (
              <p className="status-text">
                {viewMode === 'collection'
                  ? 'Sua coleção está vazia.'
                  : 'Nenhuma carta encontrada.'}
              </p>
            )}

            <div className="card-grid">
              {visibleCards.map((card) => {
                const isFavorite = favorites.includes(card.id)
                const isSelected = selectedCard?.id === card.id
                const quantity = collection[card.id]?.quantity ?? 0
                const priceInfo = getPriceInfo(card)
                const subtotal =
                  (priceInfo?.market ?? priceInfo?.mid ?? priceInfo?.low ?? 0) * quantity

                return (
                  <button
                    key={card.id}
                    className={isSelected ? 'catalog-card premium-card selected' : 'catalog-card premium-card'}
                    onClick={() => openCard(card)}
                  >
                    <img src={card.images.small} alt={card.name} />

                    <div className="catalog-card-body">
                      <strong>{card.name}</strong>
                      <span>{card.set.name}</span>
                      <span>{card.rarity || 'Raridade não informada'}</span>

                      {quantity > 0 && (
                        <>
                          <span className="quantity-badge">Na coleção: {quantity}</span>
                          <span className="subtotal-badge">Subtotal: {formatUsd(subtotal)}</span>

                          {viewMode === 'collection' && (
                            <div
                              className="inline-qty-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="mini-qty-button"
                                onClick={() => decreaseFromCollection(card.id)}
                              >
                                −
                              </button>
                              <button
                                className="mini-qty-button primary"
                                onClick={() => addToCollection(card.id)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <span
                      className={isFavorite ? 'fav active' : 'fav'}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(card.id)
                      }}
                    >
                      ★
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="detail desktop-detail">
          <div className="panel premium-panel detail-panel">
            {!selectedCard ? (
              <div className="empty-detail">
                <p>Selecione uma carta para ver os detalhes.</p>
              </div>
            ) : (
              renderDetail(selectedCard)
            )}
          </div>
        </section>
      </main>

      {mobileDetailOpen && selectedCard && (
        <div
          className="mobile-detail-overlay"
          onClick={() => setMobileDetailOpen(false)}
        >
          <div
            className="mobile-detail-sheet premium-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-detail-top">
              <button
                className="mobile-back"
                onClick={() => setMobileDetailOpen(false)}
              >
                ← Voltar
              </button>
            </div>

            {renderDetail(selectedCard)}
          </div>
        </div>
      )}
    </div>
  )
                                                }
