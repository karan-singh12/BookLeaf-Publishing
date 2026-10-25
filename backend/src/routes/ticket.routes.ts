import { Router } from 'express';
import { ticketAiController } from '../controllers/ticket-ai.controller';
import { ticketConversationController } from '../controllers/ticket-conversation.controller';
import { ticketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTicketBody,
  draftBody,
  listTicketsQuery,
  messageBody,
  noteBody,
  ticketParams,
  updateTicketBody,
} from '../validators/ticket.validator';

const router = Router();

router.use(authenticate);

// Collection
router.post('/', authorize('author'), validate({ body: createTicketBody }), ticketController.create);
router.get('/', validate({ query: listTicketsQuery }), ticketController.list);
router.get('/stats', authorize('admin'), ticketController.stats); // before '/:ticketId'

// Single ticket
router.get('/:ticketId', validate({ params: ticketParams }), ticketController.get);
router.patch('/:ticketId', authorize('admin'), validate({ params: ticketParams, body: updateTicketBody }), ticketController.update);

// Conversation
router.post('/:ticketId/messages', validate({ params: ticketParams, body: messageBody }), ticketConversationController.addMessage);
router.post('/:ticketId/notes', authorize('admin'), validate({ params: ticketParams, body: noteBody }), ticketConversationController.addNote);

// AI assistance
router.post('/:ticketId/draft', authorize('admin'), aiLimiter, validate({ params: ticketParams, body: draftBody }), ticketAiController.getDraft);

export const ticketRouter = router;
