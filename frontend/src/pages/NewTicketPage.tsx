import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { Ticket, TicketPriority } from '../types';

export function NewTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api<{ ticket: Ticket }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description, category, priority }),
      });
      navigate(`/tickets/${data.ticket._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack narrow">
      <div>
        <h1>New ticket</h1>
        <p className="muted">Describe the issue clearly so support can help faster.</p>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="form-panel" onSubmit={onSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} required />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={3}
            rows={6}
          />
        </label>
        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </section>
  );
}
