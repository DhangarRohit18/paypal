import { Router } from 'express';
import { searchProducts, getProductById, getCategories } from '../services/discovery.js';
import { evaluateFairPrice } from '../services/fairPriceService.js';

const router = Router();

router.get('/', (req, res) => {
  const { q, category, minPrice, maxPrice, brand, inStockOnly, sortBy, limit } = req.query;

  const filters = {
    query: q as string | undefined,
    category: category as string | undefined,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    brand: brand as string | undefined,
    inStockOnly: inStockOnly === 'true',
    sortBy: sortBy as any,
    limit: limit ? parseInt(limit as string, 10) : 50
  };

  const products = searchProducts(filters);
  res.json({
    count: products.length,
    products
  });
});

router.get('/categories', (req, res) => {
  const categories = getCategories();
  res.json({ categories });
});

router.get('/:id', (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    return;
  }

  const fairPrice = evaluateFairPrice(product);

  res.json({
    product,
    fairPriceEvaluation: fairPrice
  });
});

router.post('/search', (req, res) => {
  const products = searchProducts(req.body || {});
  res.json({
    count: products.length,
    products
  });
});

export const productsRouter = router;

