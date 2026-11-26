import path from 'node:path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { registerEventListeners } from '../src/events/registerListeners';
import { ActivityLog } from '../src/models/ActivityLog';
import { User } from '../src/models/User';
import { signAccessToken } from '../src/utils/jwt';

const app = createApp();
const PASSWORD = 'StrongPass123';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    binary: { downloadDir: path.join(process.cwd(), '.cache', 'mongodb-binaries') },
  });
  await mongoose.connect(mongod.getUri());
  registerEventListeners();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

async function registerUser(name: string, email: string) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: PASSWORD });
  expect(res.status).toBe(201);
  return { id: res.body.user.id as string, token: res.body.token as string };
}

async function createAdmin(email: string) {
  const user = await User.create({
    name: 'Admin',
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role: 'admin',
  });
  const id = String(user._id);
  return { id, token: signAccessToken(id, 'admin') };
}

async function createTicket(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Cannot login',
      description: 'Seeing an error on the login page',
      category: 'Auth',
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body.ticket as { _id: string; status: string; priority: string };
}

// Activity logs are written by async event listeners, so poll briefly for them.
async function waitForActivity(ticketId: string, eventType: string) {
  for (let i = 0; i < 100; i++) {
    const found = await ActivityLog.findOne({ ticket: ticketId, eventType });
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Activity "${eventType}" was not recorded`);
}

describe('auth', () => {
  it('registers a user with the default user role and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com', role: 'user' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser('Alice', 'alice@example.com');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice 2', email: 'alice@example.com', password: PASSWORD });

    expect(res.status).toBe(409);
  });

  it('rejects a wrong password with 401', async () => {
    await registerUser('Alice', 'alice@example.com');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'WrongPass123' });

    expect(res.status).toBe(401);
  });

  it('requires a valid token for /me', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');

    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const withToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.user.id).toBe(alice.id);
  });
});

describe('tickets (user access rules)', () => {
  it('creates a ticket with default priority medium and status open', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const ticket = await createTicket(alice.token);

    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('medium');
  });

  it('rejects an invalid ticket body with 400', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'x' });

    expect(res.status).toBe(400);
  });

  it("lists only the current user's tickets", async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    await createTicket(alice.token, { title: 'Alice issue' });
    await createTicket(bob.token, { title: 'Bob issue' });

    const res = await request(app).get('/api/tickets').set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0].title).toBe('Alice issue');
  });

  it("forbids reading another user's ticket with 403", async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(403);
  });

  it('returns 400 for a malformed ticket id', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const res = await request(app)
      .get('/api/tickets/not-an-id')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(400);
  });

  it('lets the owner edit an open ticket and records ticket.updated', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ description: 'Updated description with more detail' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.description).toBe('Updated description with more detail');
    await waitForActivity(ticket._id, 'ticket.updated');
  });

  it('blocks the owner from editing once an admin moved the ticket out of open', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    await request(app)
      .patch(`/api/admin/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'in_progress' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Trying to change title' });

    expect(res.status).toBe(409);
  });

  it('lets the owner delete an open ticket along with its comments and activity', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const ticket = await createTicket(alice.token);

    await request(app)
      .post(`/api/tickets/${ticket._id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ body: 'Some comment' })
      .expect(201);
    await waitForActivity(ticket._id, 'comment.added');

    await request(app)
      .delete(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(204);

    const after = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(after.status).toBe(404);
    expect(await ActivityLog.countDocuments({ ticket: ticket._id })).toBe(0);
  });
});

describe('comments', () => {
  it('lets the owner comment and records comment.added', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .post(`/api/tickets/${ticket._id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ body: 'Any update on this?' });

    expect(res.status).toBe(201);
    expect(res.body.comment.author).toBe(alice.id);
    await waitForActivity(ticket._id, 'comment.added');
  });

  it("forbids commenting on another user's ticket with 403", async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .post(`/api/tickets/${ticket._id}/comments`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ body: 'Not my ticket' });

    expect(res.status).toBe(403);
  });

  it('lets an admin comment on any ticket', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .post(`/api/tickets/${ticket._id}/comments`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ body: 'Looking into it' });

    expect(res.status).toBe(201);
    expect(res.body.comment.author).toBe(admin.id);
  });
});

describe('admin', () => {
  it('forbids non-admin users from admin endpoints with 403', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const res = await request(app).get('/api/admin/tickets').set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(403);
  });

  it('lists all tickets and filters by status and priority', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const admin = await createAdmin('admin@example.com');
    const t1 = await createTicket(alice.token, { title: 'First issue', priority: 'high' });
    await createTicket(bob.token, { title: 'Second issue', priority: 'low' });

    await request(app)
      .patch(`/api/admin/tickets/${t1._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' })
      .expect(200);

    const all = await request(app).get('/api/admin/tickets').set('Authorization', `Bearer ${admin.token}`);
    expect(all.body.total).toBe(2);

    const resolved = await request(app)
      .get('/api/admin/tickets?status=resolved')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(resolved.body.total).toBe(1);
    expect(resolved.body.tickets[0].title).toBe('First issue');

    const lowPriority = await request(app)
      .get('/api/admin/tickets?priority=low')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(lowPriority.body.total).toBe(1);
    expect(lowPriority.body.tickets[0].title).toBe('Second issue');
  });

  it('updates priority and records priority_changed', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .patch(`/api/admin/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ priority: 'urgent' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.priority).toBe('urgent');
    const activity = await waitForActivity(ticket._id, 'ticket.priority_changed');
    expect(activity.metadata).toMatchObject({ from: 'medium', to: 'urgent' });
  });

  it('records status_changed and ticket.resolved when an admin resolves a ticket', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    await request(app)
      .patch(`/api/admin/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' })
      .expect(200);

    const changed = await waitForActivity(ticket._id, 'ticket.status_changed');
    expect(changed.metadata).toMatchObject({ from: 'open', to: 'resolved' });
    await waitForActivity(ticket._id, 'ticket.resolved');
  });

  it('rejects an invalid status value with 400', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    const res = await request(app)
      .patch(`/api/admin/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
  });

  it('returns ticket details with comments and activity', async () => {
    const alice = await registerUser('Alice', 'alice@example.com');
    const admin = await createAdmin('admin@example.com');
    const ticket = await createTicket(alice.token);

    await request(app)
      .post(`/api/tickets/${ticket._id}/comments`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ body: 'Please help' })
      .expect(201);
    await waitForActivity(ticket._id, 'comment.added');

    const res = await request(app)
      .get(`/api/admin/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket._id).toBe(ticket._id);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.activity.length).toBeGreaterThanOrEqual(2);
  });
});
