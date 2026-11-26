export type UserRole = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type Ticket = {
  _id: string;
  createdBy: string | { _id: string; name: string; email: string; role: UserRole };
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  _id: string;
  ticket: string;
  author: string | { _id: string; name: string; email: string; role: UserRole };
  body: string;
  createdAt: string;
};

export type Activity = {
  _id: string;
  eventType: string;
  actor: string | { _id: string; name: string; email: string; role: UserRole };
  ticket: string | { _id: string; title: string; status: TicketStatus; priority: TicketPriority };
  metadata?: Record<string, unknown>;
  createdAt: string;
};
