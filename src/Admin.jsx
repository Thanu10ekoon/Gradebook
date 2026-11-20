import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { tracks } from '../shared/curriculum.js';
import { api } from './api.js';
import { Message, ordinalBatch } from './Forms.jsx';

export function Admin({ viewer, onUser }) {
  const [filter, setFilter] = useState({ q: '', before: null, sequence: 0 });
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(null);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const query = { q: filter.q };
    if (filter.before) query.before = filter.before;
    setResult(null);
    setError('');
    api('admin-users', { query, signal: controller.signal }).then(setResult)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [filter]);

  async function updateRole() {
    setChanging(true);
    setError('');
    setSuccess('');
    try {
      const { user } = await api('admin-role', { method: 'PUT', body: pending });
      setResult(result => ({ ...result, users: result.users.map(existing => existing.id === user.id ? user : existing) }));
      setPending(null);
      setSuccess(user.username + ' is now ' + (user.role === 'admin' ? 'an administrator.' : 'a student.'));
      if (user.id === viewer.id) onUser(user);
    } catch (error) {
      setError(error.message);
    } finally {
      setChanging(false);
    }
  }

  return <>
    <header className="page-heading"><div><h1>Admin dashboard</h1><p>Manage account roles and view student results.</p></div></header>
    <section className="panel admin-panel">
      <div className="admin-toolbar">
        <h2><Users size={21} /> Accounts</h2>
        <form className="search" onSubmit={event => {
          event.preventDefault();
          const q = String(new FormData(event.currentTarget).get('q')).trim();
          setSuccess('');
          setPending(null);
          setFilter({ q, before: null, sequence: filter.sequence + 1 });
        }}>
          <label><span className="sr-only">Search accounts</span><Search size={17} /><input name="q" placeholder="Search by name, username, or email" maxLength={100} /></label>
          <button className="button secondary">Search</button>
        </form>
      </div>
      <Message error={error} success={success} />
      {pending && <div className="role-confirm" role="status">
        <span>Confirm change to {pending.role === 'admin' ? 'administrator' : 'student'}.</span>
        <button className="button secondary" disabled={changing} onClick={() => setPending(null)}>Cancel</button>
        <button className="button primary" disabled={changing} onClick={updateRole}>{changing ? 'Updating…' : 'Change role'}</button>
      </div>}
      {!result ? !error && <p role="status" className="load-state">Loading accounts…</p>
        : result.users.length ? <div className="table-scroll">
          <table><thead><tr><th scope="col">Account</th><th scope="col">Batch and specialization</th>
            <th scope="col">Role</th><th scope="col">Results</th></tr></thead>
            <tbody>{result.users.map(user => <tr key={user.id}>
              <td><strong>{user.name}</strong><small>{user.username} · {user.email}</small></td>
              <td>{user.batch ? ordinalBatch(user.batch) + ' batch' : '—'}<small>{tracks[user.specialization]}</small></td>
              <td><select value={pending?.id === user.id ? pending.role : user.role} disabled={changing}
                aria-label={'Role for ' + user.username} onChange={event =>
                  setPending(event.target.value === user.role ? null : { id: user.id, role: event.target.value })}>
                <option value="student">Student</option><option value="admin">Admin</option>
              </select></td>
              <td><Link to={'/admin/results/' + user.id} className="results-link">View results</Link></td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="load-state">No accounts match this search.</p>}
      {result && (filter.before || result.next) && <div className="admin-pagination">
        {filter.before && <button className="button secondary" onClick={() => setFilter({ ...filter, before: null })}>First page</button>}
        {result.next && <button className="button secondary" onClick={() => setFilter({ ...filter, before: result.next })}>Next page</button>}
      </div>}
      <p className="admin-note"><ShieldCheck size={16} /> Student result access is read-only.</p>
    </section>
  </>;
}
