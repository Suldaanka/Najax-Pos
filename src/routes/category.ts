import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', checkAuth, getCategories);
router.post('/', checkAuth, createCategory);
router.put('/:id', checkAuth, updateCategory);
router.delete('/:id', checkAuth, deleteCategory);

export default router;
