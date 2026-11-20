import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, LockKeyhole } from 'lucide-react';
import { batches, sourceBatch, tracks } from '../shared/curriculum.js';
import { api } from './api.js';

export const ordinalBatch = batch => batch === 23 ? '23rd' : String(batch) + 'th';

export function Brand() {
  return <div className="brand"><span className="brand-icon"><BookOpenCheck size={22} /></span>
    <div><strong>Gradebook</strong><small>RUHUNA ENGINEERING</small></div></div>;
}

export function Message({ error, success }) {
  if (error) return <p role="alert" className="message error">{error}</p>;
  if (success) return <p role="status" className="message success">{success}</p>;
  return null;
}

function BatchField({ value, allowEmpty }) {
  return <label>Batch<select name="batch" defaultValue={value ?? ''} required={!allowEmpty}>
    <option value="">Select batch</option>
    {batches.map(batch => <option key={batch} value={batch}>{ordinalBatch(batch)} batch</option>)}
  </select></label>;
}

function TrackField({ value }) {
  return <label>Specialization <span className="optional">Optional</span>
    <select name="specialization" defaultValue={value ?? ''}>
      <option value="">Choose later</option>
      {Object.entries(tracks).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select>
  </label>;
}

export function TemplateNote({ batch, specialization }) {
  if (!batch) return null;
  if (batch !== sourceBatch(batch)) {
    return <p className="muted">The {ordinalBatch(sourceBatch(batch))}-batch handbook is used as an editable starting point for the {ordinalBatch(batch)} batch.</p>;
  }
  if (!specialization) return <p className="muted">Select a specialization to fill empty upper-semester templates.</p>;
  return null;
}

export function AuthForm({ register, onUser }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (register) {
      body.batch = Number(body.batch);
      body.specialization ||= null;
    }
    try {
      const result = await api(register ? 'register' : 'login', { method: 'POST', body });
      onUser(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-layout">
    <section className="auth-side">
      <Brand />
      <div className="auth-copy">
        <p className="eyebrow">FACULTY OF ENGINEERING</p>
        <h1>Your results,<br />semester by semester.</h1>
        <p>Record your modules, follow your GPA, and keep all eight semesters in one place.</p>
      </div>
      <span className="auth-foot">University of Ruhuna</span>
    </section>
    <section className="auth-main">
      <div className="auth-form">
        <h2>{register ? 'Create your account' : 'Sign in to Gradebook'}</h2>
        <p className="muted">{register ? 'Set up your student profile to get started.' : 'Enter your username and password to view your results.'}</p>
        <form className="form" onSubmit={submit}>
          <label>Username<input name="username" placeholder="EG20XXYYYY" autoComplete="username"
            pattern={register ? '[Ee][Gg]20[0-9]{6}' : undefined} maxLength={16} required /></label>
          {register && <>
            <label>Full name<input name="name" autoComplete="name" maxLength={100} required /></label>
            <label>Email<input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
            <BatchField />
            <TrackField />
          </>}
          <label>Password<input type="password" name="password" autoComplete={register ? 'new-password' : 'current-password'}
            minLength={register ? 12 : undefined} maxLength={72} required />
            {register && <small className="muted">Use at least 12 characters.</small>}</label>
          <Message error={error} />
          <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{register ? <>Already have an account? <Link to="/login">Sign in</Link></>
          : <>New to Gradebook? <Link to="/register">Create an account</Link></>}</p>
      </div>
    </section>
  </main>;
}

export function PasswordForm({ onUser, forced = false }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const { current, next, confirm } = Object.fromEntries(new FormData(form));
      if (next !== confirm) throw new Error('The new passwords do not match.');
      const result = await api('password', { method: 'PUT', body: { current, next } });
      form.reset();
      onUser(result.user);
      setSuccess('Password updated.');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel form-panel">
    <h2><LockKeyhole size={19} /> {forced ? 'Choose a new password' : 'Change password'}</h2>
    {forced && <p className="muted">Replace the temporary password to open your account.</p>}
    <form className="form" onSubmit={submit}>
      <label>{forced ? 'Temporary password' : 'Current password'}<input name="current" type="password" autoComplete="current-password" maxLength={72} required /></label>
      <label>New password<input name="next" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
      <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
      <Message error={error} success={success} />
      <button className="button primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  </section>;
}

export function Profile({ user, onUser }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.batch = body.batch ? Number(body.batch) : null;
    body.specialization ||= null;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api('profile', { method: 'PUT', body });
      onUser(result.user);
      setSuccess('Profile saved.');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <header className="page-heading"><div><h1>Profile</h1><p>Update your details and curriculum preferences.</p></div></header>
    <div className="profile-grid">
      <section className="panel form-panel">
        <h2>Account details</h2>
        <form className="form" onSubmit={submit}>
          <label>Username<input value={user.username} readOnly /></label>
          <label>Full name<input name="name" defaultValue={user.name} autoComplete="name" maxLength={100} required /></label>
          <label>Email<input type="email" name="email" defaultValue={user.email} autoComplete="email" maxLength={254} required /></label>
          <BatchField value={user.batch} allowEmpty={user.username === 'ADMIN'} />
          <TrackField value={user.specialization} />
          <TemplateNote batch={user.batch} specialization={user.specialization} />
          <Message error={error} success={success} />
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </section>
      <PasswordForm onUser={onUser} />
    </div>
  </>;
}
