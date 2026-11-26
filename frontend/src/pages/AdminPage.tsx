import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import type { Ticket, TicketPriority, TicketStatus } from '../types';

export function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '50');

      const data = await api<{ tickets: Ticket[]; total: number }>(
        `/api/admin/tickets?${params.toString()}`,
      );
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [status, priority, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateTicket(
    id: string,
    patch: { status?: TicketStatus; priority?: TicketPriority },
  ) {
    setUpdatingId(id);
    setError('');
    try {
      await api(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  }

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1>Admin desk</h1>
          <p className="muted">Filter, prioritize, and resolve tickets across all users.</p>
        </div>
        <span className="pill">{total} tickets</span>
      </div>

      <form className="filters" onSubmit={onFilter}>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
        <label className="grow">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="title, description, category"
          />
        </label>
        <button className="btn secondary" type="submit">
          Apply
        </button>
      </form>

      {error && <div className="alert">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      <div className="admin-table">
        {tickets.map((t) => {
          const createdBy =
            typeof t.createdBy === 'string' ? t.createdBy : t.createdBy?.email || 'user';
          return (
            <div key={t._id} className="admin-row">
              <div>
                <Link to={`/tickets/${t._id}`}>
                  <strong>{t.title}</strong>
                </Link>
                <p className="muted">
                  {t.category} · {createdBy}
                </p>
              </div>
              <div className="ticket-meta">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
              <div className="admin-actions">
                <select
                  value={t.status}
                  disabled={updatingId === t._id}
                  onChange={(e) =>
                    void updateTicket(t._id, { status: e.target.value as TicketStatus })
                  }
                >
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
                <select
                  value={t.priority}
                  disabled={updatingId === t._id}
                  onChange={(e) =>
                    void updateTicket(t._id, { priority: e.target.value as TicketPriority })
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
