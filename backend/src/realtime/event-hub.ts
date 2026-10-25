import { Response } from 'express';
import { Role } from '../constants/domain';

/**
 * A ticket-change notification. It deliberately carries ids only, never content:
 * clients refetch through the normal, authorised REST endpoints, so the stream cannot leak data.
 */
export interface TicketEvent {
  type: 'ticket.created' | 'ticket.updated' | 'ticket.message';
  ticketId: string;
  authorId: string;
  /** Set for events that only staff should hear about (e.g. internal notes). */
  adminOnly?: boolean;
}

interface Subscriber {
  userId: string;
  role: Role;
  res: Response;
}

const HEARTBEAT_MS = 25_000;

/**
 * In-process Server-Sent Events hub. Admins receive every ticket event; authors only receive
 * events for their own tickets. Scaling beyond one instance means swapping the fan-out for
 * Redis pub/sub; callers only use `publish`, so nothing else would change.
 */
class EventHub {
  private readonly subscribers = new Set<Subscriber>();

  subscribe(userId: string, role: Role, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // stop reverse proxies from buffering the stream
    });
    res.write('retry: 3000\n\n');

    const subscriber: Subscriber = { userId, role, res };
    this.subscribers.add(subscriber);

    // Comment frames keep idle connections alive through proxies and load balancers.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    res.on('close', () => {
      clearInterval(heartbeat);
      this.subscribers.delete(subscriber);
    });
  }

  publish(event: TicketEvent): void {
    const frame = `event: ticket\ndata: ${JSON.stringify(event)}\n\n`;
    for (const subscriber of this.subscribers) {
      const isOwner = !event.adminOnly && subscriber.userId === event.authorId;
      if (subscriber.role === 'admin' || isOwner) {
        subscriber.res.write(frame);
      }
    }
  }

  get connectionCount(): number {
    return this.subscribers.size;
  }
}

export const eventHub = new EventHub();
