export interface Quote {
  id: string
  text: string
  author: string
  active: boolean
  sort_order: number
}

export const DEFAULT_QUOTES: Quote[] = [
  { id: '1', text: 'The best way to find yourself is to lose yourself in the service of others.', author: 'Mahatma Gandhi', active: true, sort_order: 0 },
  { id: '2', text: 'Alone we can do so little; together we can do so much.', author: 'Helen Keller', active: true, sort_order: 1 },
  { id: '3', text: 'No one has ever become poor by giving.', author: 'Anne Frank', active: true, sort_order: 2 },
  { id: '4', text: 'Service to others is the rent you pay for your room here on earth.', author: 'Muhammad Ali', active: true, sort_order: 3 },
  { id: '5', text: 'We make a living by what we get, but we make a life by what we give.', author: 'Winston Churchill', active: true, sort_order: 4 },
  { id: '6', text: 'Never doubt that a small group of thoughtful, committed citizens can change the world.', author: 'Margaret Mead', active: true, sort_order: 5 },
  { id: '7', text: 'The meaning of life is to find your gift. The purpose of life is to give it away.', author: 'Pablo Picasso', active: true, sort_order: 6 },
  { id: '8', text: 'What you do makes a difference, and you have to decide what kind of difference you want to make.', author: 'Jane Goodall', active: true, sort_order: 7 },
  { id: '9', text: 'Volunteers do not necessarily have the time; they just have the heart.', author: 'Elizabeth Andrew', active: true, sort_order: 8 },
  { id: '10', text: 'Act as if what you do makes a difference. It does.', author: 'William James', active: true, sort_order: 9 },
]
