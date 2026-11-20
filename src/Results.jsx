import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, ChevronLeft, CircleCheck, Clock3, GraduationCap, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { curriculumFor, templateModule, tracks } from '../shared/curriculum.js';
import { gpaGrades, gradePoints, nonGpaGrades, summarize } from '../shared/grades.js';
import { api } from './api.js';
import { Message, ordinalBatch, TemplateNote } from './Forms.jsx';

const emptyModule = { code: '', name: '', credits: 1, grade: null, kind: 'Core', scale: 'gpa' };
const kinds = { Core: 'Core', TE: 'Technical elective', GE: 'General elective', Training: 'Training' };
const gradeLabels = { E: 'E · Failed', F: 'F · Failed', H: 'H · Excellent', M: 'M · Good', S: 'S · Satisfactory', MC: 'MC · Medical concession', AC: 'AC · Academic concession', WH: 'WH · Withheld' };

function GradeSelect({ module, onChange }) {
  const grades = module.scale === 'gpa' ? gpaGrades : nonGpaGrades;
  return <select className={module.grade ? 'grade chosen' : 'grade'} aria-label={'Grade for ' + module.name}
    value={module.grade ?? ''} onChange={event => onChange(event.target.value || null)}>
    <option value="">Pending</option>
    {grades.map(grade => <option key={grade} value={grade}>{gradeLabels[grade] ?? grade}</option>)}
  </select>;
}

function EditModule({ module, options, onComplete, onDelete, onClose }) {
  const dialog = useRef(null);
  const editing = Boolean(module.id);
  const [draft, setDraft] = useState(module);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { dialog.current.showModal(); }, []);

  function update(field, value) {
    setDraft(previous => {
      const next = { ...previous, [field]: value };
      if (field === 'kind' && value === 'Training') next.scale = 'non-gpa';
      const allowed = next.scale === 'gpa' ? gpaGrades : nonGpaGrades;
      if (!allowed.includes(next.grade)) next.grade = null;
      return next;
    });
  }

  function useOption(event) {
    if (event.target.value === '') {
      setDraft(emptyModule);
    } else {
      const { id, ...template } = templateModule(options[Number(event.target.value)]);
      setDraft(template);
    }
  }

  function submit(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    onComplete({ ...draft, name, code: draft.code.trim(), credits: Number(draft.credits), id: draft.id ?? crypto.randomUUID() });
  }

  return <dialog ref={dialog} className="module-dialog" onCancel={onClose}>
    <header className="dialog-heading"><h2>{editing ? 'Edit module' : 'Add module'}</h2>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={21} /></button></header>
    <form className="form" onSubmit={submit}>
      {!editing && options.length > 0 && <label>Module from the handbook<select onChange={useOption} defaultValue="">
        <option value="">Enter a custom module</option>
        {options.map((option, index) => <option key={option.code + index} value={index}>{option.code} · {option.name}</option>)}
      </select></label>}
      <label>Module name<input value={draft.name} onChange={event => update('name', event.target.value)} maxLength={180} required /></label>
      <div className="form-row">
        <label>Module code <span className="optional">Optional</span><input value={draft.code} onChange={event => update('code', event.target.value)} maxLength={20} /></label>
        <label>Credits<input type="number" min={0} max={30} step={1} value={draft.credits} onChange={event => update('credits', event.target.value)} required /></label>
      </div>
      <div className="form-row">
        <label>Module type<select value={draft.kind} onChange={event => update('kind', event.target.value)}>
          {Object.entries(kinds).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select></label>
        <label>Grading scale<select value={draft.scale} onChange={event => update('scale', event.target.value)} disabled={draft.kind === 'Training'}>
          <option value="gpa">GPA</option><option value="non-gpa">Non-GPA</option>
        </select></label>
      </div>
      <div className="dialog-actions">
        {editing && <button className="button danger" type="button"
          onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}>
          <Trash2 size={16} /> {confirmDelete ? 'Confirm removal' : 'Remove'}
        </button>}
        <button className="button primary">{editing ? 'Apply changes' : 'Add module'}</button>
      </div>
    </form>
  </dialog>;
}

function Overview({ summary, selected, setSelected }) {
  return <div className="overview">
    <section className="stat stat-feature">
      <div className="stat-label"><GraduationCap size={19} /> Overall GPA <span>CGPA</span></div>
      <div className="stat-value">{summary.cgpa ?? '—'} <small>/ 4.00</small></div>
      <p>{summary.withheld ? 'Result withheld or under concession' : 'Weighted average of entered grades'}</p>
    </section>
    <section className="stat panel">
      <div className="stat-label"><BookOpen size={18} /> Graded GPA credits</div>
      <div className="stat-value">{summary.gradedCredits}</div>
      <p>Credits included in the calculation</p>
    </section>
    <section className="stat chart panel">
      <div className="stat-label"><BarChart3 size={18} /> Semester GPA</div>
      <div className="mini-chart">
        {summary.terms.map((term, index) => <button key={index} type="button" aria-pressed={index === selected}
          aria-label={'Semester ' + (index + 1) + ' GPA ' + (term.sgpa ?? 'unavailable')}
          title={'Semester ' + (index + 1) + ' · ' + (term.sgpa ?? '—')} onClick={() => setSelected(index)}>
          <span className={term.sgpa === null ? 'chart-bar empty' : 'chart-bar'}
            style={{ height: term.sgpa === null ? '3px' : Math.max(3, Number(term.sgpa) * 10) + 'px' }} />
          <small>{index + 1}</small>
        </button>)}
      </div>
    </section>
  </div>;
}

function Modules({ modules, readonly, onGrade, onEdit }) {
  return <div className="table-scroll"><table className="modules-table">
    <thead><tr><th scope="col">Module</th><th scope="col">Credits</th><th scope="col">Grade</th>
      <th scope="col">Grade points</th>{!readonly && <th scope="col"><span className="sr-only">Edit</span></th>}</tr></thead>
    <tbody>{modules.map((module, index) => <tr key={module.id}>
      <td><strong>{module.name}</strong><small>{[module.code, module.kind === 'Core' ? '' : kinds[module.kind], module.scale === 'non-gpa' ? 'Non-GPA' : ''].filter(Boolean).join(' · ')}</small></td>
      <td className="number">{module.credits}</td>
      <td>{readonly ? <span className={module.grade ? 'grade-text chosen' : 'grade-text'}>{module.grade ?? 'Pending'}</span>
        : <GradeSelect module={module} onChange={grade => onGrade(index, grade)} />}</td>
      <td className="number">{module.scale === 'gpa' && Object.hasOwn(gradePoints, module.grade) ? (gradePoints[module.grade] / 10).toFixed(1) : '—'}</td>
      {!readonly && <td className="edit-cell"><button className="icon-button" aria-label={'Edit ' + module.name} onClick={() => onEdit(index)}><Pencil size={16} /></button></td>}
    </tr>)}</tbody>
  </table></div>;
}

export function Results({ user, accountId }) {
  const readonly = Boolean(accountId);
  const [data, setData] = useState(null);
  const [savedRevision, setSavedRevision] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState(0);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api(readonly ? 'admin-results' : 'results', { query: readonly ? { id: accountId } : undefined, signal: controller.signal })
      .then(result => { setData(result); setSavedRevision(result.revision); setDirty(false); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [readonly, accountId, loadAttempt]);

  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = event => { event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function editTerm(update) {
    setData(data => ({ ...data, semesters: data.semesters.map((term, index) => selected === index ? update(term) : term) }));
    setDirty(true);
    setSuccess('');
  }

  async function save() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api('results', { method: 'PUT', body: { semesters: data.semesters, revision: savedRevision } });
      setData(result);
      setSavedRevision(result.revision);
      setDirty(false);
      setSuccess('Results saved.');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!data) return error ? <div className="load-state"><Message error={error} />
    <button className="button secondary" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Try again</button></div>
    : <p role="status" className="load-state">Loading results…</p>;

  const owner = readonly ? data.user : user;
  const modules = data.semesters[selected];
  const summary = summarize(data.semesters);
  const term = summary.terms[selected];
  const curriculum = curriculumFor(owner.batch, owner.specialization);
  const options = [...curriculum.core, ...curriculum.electives].filter(entry => entry.semester === selected + 1 &&
    !modules.some(module => module.code === entry.code));
  const defaultModules = curriculum.core.filter(entry => entry.semester === selected + 1);
  const profile = [owner.batch ? ordinalBatch(owner.batch) + ' batch' : '', tracks[owner.specialization]].filter(Boolean).join(' · ');

  return <>
    {readonly && <Link className="back-link" to="/admin"><ChevronLeft size={17} /> All accounts</Link>}
    <header className="page-heading">
      <div>
        {profile && <p className="profile-line">{profile}</p>}
        <h1>{readonly ? owner.name + '’s results' : 'My results'}</h1>
        <p>{readonly ? owner.username + ' · Read-only view' : 'Track your grades across all eight semesters.'}</p>
      </div>
      {!readonly && <div className="save-area">
        <button className="button primary" disabled={!dirty || saving} onClick={save}><Save size={17} />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <small aria-live="polite">{saving ? '' : dirty ? 'Unsaved changes' : success ? 'Results saved' : 'All changes saved'}</small>
      </div>}
    </header>
    <Message error={error} />
    <Overview summary={summary} selected={selected} setSelected={setSelected} />
    <section className="semester-panel panel" aria-label="Semester results">
      <div className="semester-nav" aria-label="Select semester">
        {data.semesters.map((_, index) => <button type="button" key={index} aria-pressed={selected === index}
          onClick={() => setSelected(index)}><span>Semester </span>{index + 1}</button>)}
      </div>
      <div className="semester-title">
        <div className="term-heading"><span className="term-icon"><CalendarDays size={21} /></span>
          <div><h2>Semester {selected + 1}</h2><p>{modules.length} {modules.length === 1 ? 'module' : 'modules'} · {term.totalCredits} credits</p></div>
        </div>
        <div className="term-actions">
          <div className="sgpa"><div>{term.sgpa ?? '—'}</div><small>SGPA</small></div>
          {!readonly && <button type="button" className="button secondary" disabled={saving} onClick={() => setEditor({ index: null, module: emptyModule })}><Plus size={18} /> Add module</button>}
        </div>
      </div>
      {modules.length > 0 ? <fieldset disabled={saving} className="table-fieldset">
        <Modules modules={modules} readonly={readonly}
          onGrade={(index, grade) => editTerm(sem => sem.map((item, position) => position === index ? { ...item, grade } : item))}
          onEdit={index => setEditor({ index, module: modules[index] })} />
      </fieldset> : <div className="empty-term"><BookOpen size={24} /><h3>No modules entered</h3>
        {!readonly && defaultModules.length > 0 && <button className="button secondary" disabled={saving}
          onClick={() => editTerm(() => defaultModules.map(templateModule))}>Load compulsory modules</button>}
        {!readonly && <TemplateNote batch={owner.batch} specialization={owner.specialization} />}
      </div>}
      <div className="term-footer">
        <span><CircleCheck size={16} /> {term.gradedCredits} graded GPA credits</span>
        <span><Clock3 size={16} /> {term.withheld ? 'SGPA unavailable' : term.pending ? term.pending + ' pending' : 'No pending grades'}</span>
      </div>
    </section>
    {!readonly && <div className="results-note">
      <p>Pending and non-GPA modules are excluded. A recorded E counts as 0.0. CGPA weights are 0.05 for Semesters 1–2 and 0.15 for Semesters 3–8, applied to each module’s credits.</p>
      {owner.batch !== 0 && <TemplateNote batch={owner.batch} specialization={owner.specialization} />}
    </div>}
    {editor && <EditModule module={editor.module} options={options} onClose={() => setEditor(null)} onComplete={module => {
      editTerm(sem => editor.index === null ? [...sem, module] : sem.map((item, index) => index === editor.index ? module : item));
      setEditor(null);
    }} onDelete={() => {
      editTerm(sem => sem.filter((_, index) => index !== editor.index));
      setEditor(null);
    }} />}
  </>;
}
