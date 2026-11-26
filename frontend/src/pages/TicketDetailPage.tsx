import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import type { Activity, Comment, Ticket } from '../types';

function authorName(author: Comment['author'] | Activity['actor']) {
  if (typeof author === 'string') return author;
  return author?.name || 'Unknown';
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const [ticketRes, commentsRes, activityRes] = await Promise.all([
        api<{ ticket: Ticket }>(`/api/tickets/${id}`),
        api<{ comments: Comment[] }>(`/api/tickets/${id}/comments`),
        api<{ activity: Activity[] }>(`/api/tickets/${id}/activity`),
      ]);
      setTicket(ticketRes.ticket);
      setComments(commentsRes.comments);
      setActivity(activityRes.activity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onComment(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      await api(`/api/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!id || !ticket) return;
    if (!window.confirm('Delete this ticket?')) return;
    try {
      await api(`/api/tickets/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete ticket');
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!ticket) return <div className="alert">{error || 'Ticket not found'}</div>;

  const isOwner = typeof ticket.createdBy === 'string'
    ? ticket.createdBy === user?.id
    : ticket.createdBy?._id === user?.id;
  const canDelete = isOwner && ticket.status === 'open';

  return (
    <section className="stack">
      <Link to="/" className="back-link">
        ← Back to tickets
      </Link>

      {error && <div className="alert">{error}</div>}

      <div className="section-head">
        <div>
          <h1>{ticket.title}</h1>
          <p className="muted">{ticket.category}</p>
        </div>
        <div className="ticket-meta">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {canDelete && (
            <button type="button" className="btn danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <article className="panel">
          <h2>Description</h2>
          <p className="body-text">{ticket.description}</p>

          <h2>Comments</h2>
          <div className="comment-list">
            {comments.length === 0 && <p className="muted">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c._id} className="comment">
                <div className="comment-head">
                  <strong>{authorName(c.author)}</strong>
                  <span className="muted">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p>{c.body}</p>
              </div>
            ))}
          </div>

          <form className="form-panel compact" onSubmit={onComment}>
            <label>
              Add comment
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={3}
                minLength={1}
              />
            </label>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        </article>

        <aside className="panel">
          <h2>Activity</h2>
          <ul className="activity-list">
            {activity.map((a) => (
              <li key={a._id}>
                <strong>{a.eventType}</strong>
                <span className="muted">
                  {authorName(a.actor)} · {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
