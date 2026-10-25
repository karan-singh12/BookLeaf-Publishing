import { Router } from 'express';
import { bookController } from '../controllers/book.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { bookParams, listBooksQuery } from '../validators/book.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listBooksQuery }), bookController.list);
router.get('/:bookId', validate({ params: bookParams }), bookController.get);

export const bookRouter = router;
