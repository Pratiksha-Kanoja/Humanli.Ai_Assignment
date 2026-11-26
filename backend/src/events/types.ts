import type { TicketPriority, TicketStatus } from '../models/Ticket';

export type DomainEventMap = {
  'ticket.created': { ticketId: string; actorId: string };
  'ticket.updated': { ticketId: string; actorId: string; changes: Record<string, unknown> };
  'ticket.status_changed': { ticketId: string; actorId: string; from: TicketStatus; to: TicketStatus };
  'ticket.priority_changed': { ticketId: string; actorId: string; from: TicketPriority; to: TicketPriority };
  'comment.added': { ticketId: string; actorId: string; commentId: string };
  'ticket.resolved': { ticketId: string; actorId: string };
};

export type DomainEventName = keyof DomainEventMap;

