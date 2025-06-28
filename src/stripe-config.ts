export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription' | 'payment';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SVPo0B4ZnlgT0U',
    priceId: 'price_1RaOyjFZEiAUOo3FYIhi7LWH',
    name: 'MVP Library Basic',
    description: 'basic subscription package for MVP library',
    mode: 'subscription',
  },
  {
    id: 'prod_SVPoxyR2FEe7XJ',
    priceId: 'price_1RaOzLFZEiAUOo3FXQ6N5KpK',
    name: 'MVP Library Pro',
    description: 'pro package',
    mode: 'subscription',
  },
  {
    id: 'prod_SVPpR0WQgDH0l7',
    priceId: 'price_1RaP06FZEiAUOo3F4ifxXaj0',
    name: 'MVP Library Premium/Enterprise',
    description: 'enterprise package',
    mode: 'subscription',
  },
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}