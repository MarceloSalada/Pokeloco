import { useState, useEffect } from 'react'

type Card = {
  id: string
  name: string
  images: { small: string }
  set: { name: string }
  rarity?: string
}

export default function App() {
  const [query, setQuery] = useState('pikachu')
  const [cards, setCards] = useState<Card[]>([])

  async function search() {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${query}`)
    const data = await res.json()
    setCards(data.data || [])
  }

  useEffect(() => {
    search()
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h1>Pokeloco</h1>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} />
        <button onClick={search}>Buscar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 16 }}>
        {cards.map(card => (
          <div key={card.id} style={{ background: '#eee', padding: 10 }}>
            <img src={card.images.small} style={{ width: '100%' }} />
            <p>{card.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
