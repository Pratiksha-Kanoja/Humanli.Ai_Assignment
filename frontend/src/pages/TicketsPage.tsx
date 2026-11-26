import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import type { Ticket } from '../types';

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ tickets: Ticket[] }>('/api/tickets');
        if (!cancelled) setTickets(data.tickets);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load tickets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1>My tickets</h1>
          <p className="muted">Track status and follow up on your support requests.</p>
        </div>
        <Link className="btn primary" to="/tickets/new">
          New ticket
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && tickets.length === 0 && (
        <div className="empty">
          <p>No tickets yet.</p>
          <Link to="/tickets/new">Create your first ticket</Link>
        </div>
      )}

      <div className="ticket-list">
        {tickets.map((t) => (
          <Link key={t._id} to={`/tickets/${t._id}`} className="ticket-row">
            <div>
              <strong>{t.title}</strong>
              <p className="muted">{t.category}</p>
            </div>
            <div className="ticket-meta">
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
