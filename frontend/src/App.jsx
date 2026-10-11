import { useCallback, useEffect, useMemo, useState } from 'react';

import axios from 'axios';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API });

const statuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];

const categories = [

  'Travel',

  'Food',

  'Accommodation',

  'Office Supplies',

  'Laptop Accessories',

  'Internet',

  'Other',

];

const blank = () => ({

  voucherDate: new Date().toISOString().slice(0, 10),

  expenseDate: new Date().toISOString().slice(0, 10),

  department: '',

  title: '',

  category: 'Travel',

  description: '',

  amount: '',

});

const money = (n) =>

  new Intl.NumberFormat('en-IN', {

    style: 'currency',

    currency: 'INR',

    maximumFractionDigits: 2,

  }).format(Number(n || 0));

const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

function App() {

  const [session, setSession] = useState(() => {

    try {

      return JSON.parse(localStorage.getItem('evms-session') || 'null');

    } catch {

      return null;

    }

  });

  const [mode, setMode] = useState('login');

  const [authForm, setAuthForm] = useState({

    name: '',

    email: '',

    password: '',

    department: '',

  });

  const [notice, setNotice] = useState({ type: '', text: '' });

  const [busy, setBusy] = useState(false);

  const request = useCallback(

    (config) =>

      api({

        ...config,

        headers: {

          ...(session?.token

            ? { Authorization: `Bearer ${session.token}` }

            : {}),

          ...(config.headers || {}),

        },

      }),

    [session]

  );

  const message = (text, type = 'success') =>

    setNotice({ text, type });

  const logout = () => {

    localStorage.removeItem('evms-session');

    setSession(null);

    setNotice({ text: '', type: '' });

  };

  const authenticate = async (e) => {

    e.preventDefault();

    setBusy(true);

    setNotice({ text: '', type: '' });

    try {

      const { data } = await api.post(`/auth/${mode}`, authForm);

      const next = { token: data.token, user: data.user };

      localStorage.setItem('evms-session', JSON.stringify(next));

      setSession(next);

    } catch (err) {

      message(

        err.response?.data?.message || 'Unable to sign in',

        'error'

      );

    } finally {

      setBusy(false);

    }

  };

  useEffect(() => {

    if (!session?.token) return;

    request({ method: 'get', url: '/auth/me' })

      .then(({ data }) => {

        const next = { ...session, user: data.user };

        setSession(next);

        localStorage.setItem('evms-session', JSON.stringify(next));

      })

      .catch(logout);

    // Validate the saved session once when the app loads.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  if (!session?.token) {

    return (

      <main className="auth-page">

        <section className="auth-card">

          <div className="brand-mark">EV</div>

          <p className="eyebrow">ABC COMPANY</p>

          <h1>Expense Voucher System</h1>

          <p className="muted">

            Manage claims, approvals and reimbursement tracking in one place.

          </p>

          {notice.text && (

            <div className={`notice ${notice.type}`}>

              {notice.text}

            </div>

          )}

          <form onSubmit={authenticate} className="form-stack">

            {mode === 'register' && (

              <>

                <Field

                  label="Full name"

                  value={authForm.name}

                  onChange={(v) =>

                    setAuthForm({ ...authForm, name: v })

                  }

                  required

                />

                <Field

                  label="Department"

                  value={authForm.department}

                  onChange={(v) =>

                    setAuthForm({ ...authForm, department: v })

                  }

                  required

                />

              </>

            )}

            <Field

              label="Email address"

              type="email"

              value={authForm.email}

              onChange={(v) =>

                setAuthForm({ ...authForm, email: v })

              }

              required

            />

            <Field

              label="Password"

              type="password"

              value={authForm.password}

              onChange={(v) =>

                setAuthForm({ ...authForm, password: v })

              }

              required

              minLength={8}

            />

            <button className="primary full" disabled={busy}>

              {busy

                ? 'Please wait…'

                : mode === 'login'

                ? 'Sign in'

                : 'Create employee account'}

            </button>

          </form>

          <p className="switch-auth">

            {mode === 'login'

              ? "Don't have an employee account?"

              : 'Already registered?'}{' '}

            <button

              className="link-button"

              onClick={() => {

                setMode(mode === 'login' ? 'register' : 'login');

                setNotice({ text: '', type: '' });

              }}

            >

              {mode === 'login' ? 'Register' : 'Sign in'}

            </button>

          </p>

          <p className="tiny muted">

            Employee self-registration is enabled. Director and Accounts

            accounts are created by the administrator.

          </p>

        </section>

      </main>

    );

  }

const role = session?.user?.role;

if (!role) {
  localStorage.removeItem('evms-session');
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Session expired</h1>
        <p className="muted">Please sign in again to continue.</p>
        <button
          className="primary full"
          onClick={() => {
            localStorage.removeItem('evms-session');
            window.location.reload();
          }}
        >
          Return to sign in
        </button>
      </section>
    </main>
  );
}
  return (

    <div className="app-shell">

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark small">EV</div>

          <div>

            <strong>Expense Voucher System</strong>

            <span>ABC Company</span>

          </div>

        </div>

        <div className="user-area">

          <div className="user-meta">

            <strong>{session.user.name}</strong>

            <span>

              {roleLabel(role)}

              {session.user.department

                ? ` · ${session.user.department}`

                : ''}

            </span>

          </div>

          <button className="secondary" onClick={logout}>

            Sign out

          </button>

        </div>

      </header>

      <main className="page">

        <div className="page-heading">

          <div>

            <p className="eyebrow">WORKSPACE</p>

            <h1>

              {role === 'employee'

                ? 'My expense vouchers'

                : role === 'director'

                ? 'Approval workspace'

                : 'Accounts overview'}

            </h1>

            <p className="muted">

              {role === 'employee'

                ? 'Create claims and follow their approval progress.'

                : role === 'director'

                ? 'Review submitted claims and record approval decisions.'

                : 'Review vouchers across the organization for reimbursement processing.'}

            </p>

          </div>

          <span className="role-pill">{roleLabel(role)}</span>

        </div>

        {notice.text && (

          <div className={`notice ${notice.type}`}>

            {notice.text}

            <button

              onClick={() => setNotice({ text: '', type: '' })}

            >

              ×

            </button>

          </div>

        )}

        {role === 'employee' ? (

          <Employee request={request} message={message} />

        ) : role === 'director' ? (

          <Director request={request} message={message} />

        ) : (

          <Accounts request={request} message={message} />

        )}

      </main>

      <footer>

        Expense Voucher Management System · Internal use

      </footer>

    </div>

  );

}

function roleLabel(role) {

  return role === 'director'

    ? 'Director'

    : role === 'accounts'

    ? 'Accounts Team'

    : 'Employee';

}

function Field({

  label,

  value,

  onChange,

  type = 'text',

  required = false,

  minLength,

  placeholder,

}) {

  return (

    <label className="field">

      <span>

        {label}

        {required ? ' *' : ''}

      </span>

      <input

        type={type}

        value={value ?? ''}

        onChange={(e) => onChange(e.target.value)}

        required={required}

        minLength={minLength}

        placeholder={placeholder}

      />

    </label>

  );

}

function VoucherForm({ initial, onSave, onCancel, saving }) {

  const [form, setForm] = useState({ ...blank(), ...initial });

  const set = (key, value) =>

    setForm((previous) => ({ ...previous, [key]: value }));

  return (

    <form

      className="voucher-form"

      onSubmit={(e) => {

        e.preventDefault();

        onSave(form);

      }}

    >

      <div className="form-grid">

        <Field

          label="Voucher date"

          type="date"

          value={form.voucherDate?.slice(0, 10)}

          onChange={(v) => set('voucherDate', v)}

          required

        />

        <Field

          label="Expense date"

          type="date"

          value={form.expenseDate?.slice(0, 10)}

          onChange={(v) => set('expenseDate', v)}

          required

        />

        <Field

          label="Department"

          value={form.department}

          onChange={(v) => set('department', v)}

          required

        />

        <Field

          label="Expense title"

          value={form.title}

          onChange={(v) => set('title', v)}

          required

          placeholder="e.g. Client visit travel"

        />

        <label className="field">

          <span>Expense category *</span>

          <select

            value={form.category}

            onChange={(e) => set('category', e.target.value)}

            required

          >

            {categories.map((category) => (

              <option key={category}>{category}</option>

            ))}

          </select>

        </label>

        <Field

          label="Amount (₹)"

          type="number"

          value={form.amount}

          onChange={(v) => set('amount', v)}

          required

        />

        <label className="field full-span">

          <span>Description</span>

          <textarea

            rows="3"

            value={form.description}

            onChange={(e) => set('description', e.target.value)}

            placeholder="Add supporting details"

          />

        </label>

      </div>

      <div className="form-actions">

        <button className="primary" disabled={saving}>

          {saving ? 'Saving…' : 'Save as Draft'}

        </button>

        <button

          type="button"

          className="secondary"

          onClick={onCancel}

        >

          Cancel

        </button>

      </div>

    </form>

  );

}

function Employee({ request, message }) {

  const [items, setItems] = useState([]);

  const [editing, setEditing] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState('all');

  const load = useCallback(async () => {

    setLoading(true);

    try {

      const { data } = await request({

        method: 'get',

        url: '/vouchers/my',

      });

      setItems(data);

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not load vouchers',

        'error'

      );

    } finally {

      setLoading(false);

    }

  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {

    load();

  }, [load]);

  const stats = useMemo(

    () => ({

      total: items.length,

      draft: items.filter((v) => v.status === 'Draft').length,

      submitted: items.filter((v) => v.status === 'Submitted').length,

      approved: items.filter((v) => v.status === 'Approved').length,

      rejected: items.filter((v) => v.status === 'Rejected').length,

      claimed: items.reduce((sum, v) => sum + Number(v.amount || 0), 0),

    }),

    [items]

  );

  const visible =

    selected === 'all'

      ? items

      : items.filter((v) => v.status === selected);


const save = async (form) => {
  setSaving(true);

  try {
    const payload = {
      department: form.department?.trim(),
      expenseTitle: (
        form.expenseTitle ??
        form.title ??
        ''
      ).trim(),
      category: form.category,
      description: form.description || '',
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      voucherDate: form.voucherDate || new Date().toISOString().slice(0, 10),
    };

    if (
      !payload.department ||
      !payload.expenseTitle ||
      !payload.category ||
      !payload.expenseDate ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0
    ) {
      message('Please fill in all required fields correctly.', 'error');
      return;
    }

    if (editing) {
      await request({
        method: 'put',
        url: `/vouchers/${editing._id}`,
        data: payload,
      });
    } else {
      await request({
        method: 'post',
        url: '/vouchers',
        data: payload,
      });
    }

    message(editing ? 'Draft updated' : 'Voucher saved as Draft');
    setEditing(null);
    setShowForm(false);
    await load();
  } catch (e) {
    message(
      e.response?.data?.message || 'Could not save voucher',
      'error'
    );
  } finally {
    setSaving(false);
  }
};


  const upload = async (voucher, file) => {

    if (!file) return;

    const fd = new FormData();

    fd.append('signature', file);

    try {

      await request({

        method: 'post',

        url: `/vouchers/${voucher._id}/employee-signature`,

        data: fd,

      });

      message('Employee signature uploaded');

      await load();

    } catch (e) {

      message(

        e.response?.data?.message || 'Signature upload failed',

        'error'

      );

    }

  };

  const submit = async (voucher) => {

    try {

      await request({

        method: 'patch',

        url: `/vouchers/${voucher._id}/submit`,

      });

      message('Voucher submitted for approval');

      await load();

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not submit voucher',

        'error'

      );

    }

  };

  const remove = async (voucher) => {

if (!window.confirm(`Delete draft ${voucher.voucherNumber}?`)) return;    try {

      await request({

        method: 'delete',

        url: `/vouchers/${voucher._id}`,

      });

      message('Draft voucher deleted');

      await load();

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not delete voucher',

        'error'

      );

    }

  };

  return (

    <>

      <Stats

        cards={[

          ['Total vouchers', stats.total],

          ['Drafts', stats.draft],

          ['Pending approval', stats.submitted],

          ['Approved', stats.approved],

          ['Rejected', stats.rejected],

          ['Total amount claimed', money(stats.claimed)],

        ]}

      />

      <section className="panel">

        <div className="panel-heading">

          <div>

            <h2>

              {editing

                ? 'Edit draft voucher'

                : showForm

                ? 'Create voucher'

                : 'My vouchers'}

            </h2>

            <p className="muted">Only your vouchers are shown here.</p>

          </div>

          {!showForm && !editing && (

            <button

              className="primary"

              onClick={() => {

                setEditing(null);

                setShowForm(true);

              }}

            >

              + New voucher

            </button>

          )}

        </div>

        {showForm || editing ? (

          <VoucherForm

            key={editing ? editing._id : 'new'}

            initial={editing || blank()}

            onSave={save}

            onCancel={() => {

              setShowForm(false);

              setEditing(null);

            }}

            saving={saving}

          />

        ) : (

          <>

            <div className="toolbar">

              <label className="field compact">

                <span>Filter status</span>

                <select

                  value={selected}

                  onChange={(e) => setSelected(e.target.value)}

                >

                  <option value="all">All statuses</option>

                  {statuses.map((status) => (

                    <option key={status}>{status}</option>

                  ))}

                </select>

              </label>

              <button className="secondary" onClick={load}>

                Refresh

              </button>

            </div>

            {loading ? (

              <p className="empty">Loading vouchers…</p>

            ) : visible.length === 0 ? (

              <p className="empty">No vouchers to display.</p>

            ) : (

              <VoucherTable

                items={visible}

                request={request}

                employee

                onEdit={(v) => {

                  setEditing(v);

                  setShowForm(false);

                }}

                onDelete={remove}

                onUpload={upload}

                onSubmit={submit}

              />

            )}

          </>

        )}

      </section>

    </>

  );

}

function Director({ request, message }) {

  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({

    status: '',

    employeeName: '',

    department: '',

    category: '',

    voucherNumber: '',

    from: '',

    to: '',

    minAmount: '',

    maxAmount: '',

    sort: 'createdAt',

  });

  const [reasons, setReasons] = useState({});

  const load = useCallback(async () => {

    setLoading(true);

    try {

      const params = Object.fromEntries(

        Object.entries(filters).filter(([, value]) => value !== '')

      );

      const { data } = await request({

        method: 'get',

        url: '/vouchers/director/all',

        params,

      });

      setItems(data);

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not load vouchers',

        'error'

      );

    } finally {

      setLoading(false);

    }

  }, [request, filters, message]);

  useEffect(() => {

    load();

  }, [load]);

  const today = new Date().toDateString();

  const pending = items.filter((v) => v.status === 'Submitted');

  const approvedToday = items.filter(

    (v) =>

      v.status === 'Approved' &&

      new Date(v.approvalDate || v.updatedAt).toDateString() === today

  );

  const rejectedToday = items.filter(

    (v) =>

      v.status === 'Rejected' &&

      new Date(v.updatedAt).toDateString() === today

  );

  const upload = async (voucher, file) => {

    if (!file) return;

    const fd = new FormData();

    fd.append('signature', file);

    try {

      await request({

        method: 'post',

        url: `/vouchers/${voucher._id}/director-signature`,

        data: fd,

      });

      message('Director signature uploaded');

      await load();

    } catch (e) {

      message(

        e.response?.data?.message || 'Signature upload failed',

        'error'

      );

    }

  };

  const decide = async (voucher, decision) => {

    try {

      if (decision === 'reject' && !reasons[voucher._id]?.trim()) {

        message('Enter a rejection reason first', 'error');

        return;

      }

      await request({

        method: 'patch',

        url: `/vouchers/${voucher._id}/${decision}`,

        data:

          decision === 'reject'

            ? { rejectionReason: reasons[voucher._id] }

            : {},

      });

      message(

        decision === 'approve' ? 'Voucher approved' : 'Voucher rejected'

      );

      await load();

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not update voucher',

        'error'

      );

    }

  };

  return (

    <>

      <Stats

        cards={[

          ['Pending approval', pending.length],

          ['Approved today', approvedToday.length],

          ['Rejected today', rejectedToday.length],

          [

            'Total pending amount',

            money(pending.reduce((sum, v) => sum + Number(v.amount || 0), 0)),

          ],

        ]}

      />

      <section className="panel">

        <div className="panel-heading">

          <div>

            <h2>All vouchers</h2>

            <p className="muted">

              Review submitted claims. Employee-entered details are read-only.

            </p>

          </div>

          <button className="secondary" onClick={load}>

            Refresh

          </button>

        </div>

        <Filters filters={filters} setFilters={setFilters} />

        {loading ? (

          <p className="empty">Loading vouchers…</p>

        ) : (

          <VoucherTable

            items={items}

            request={request}

            director

            onUpload={upload}

            onDecide={decide}

            reasons={reasons}

            setReasons={setReasons}

          />

        )}

      </section>

      <section className="panel">

        <h2>Recent voucher activity</h2>

        {items.slice(0, 5).map((v) => (

          <div className="activity-row" key={v._id}>

            <div>

              <strong>{v.voucherNumber}</strong>

              <span>

                {v.title} · {v.employee?.name}

              </span>

            </div>

            <Status status={v.status} />

          </div>

        ))}

        {!items.length && <p className="muted">No activity yet.</p>}

      </section>

    </>

  );

}

function Accounts({ request, message }) {

  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({

    status: '',

    employeeName: '',

    department: '',

    category: '',

    voucherNumber: '',

    from: '',

    to: '',

    minAmount: '',

    maxAmount: '',

    sort: 'createdAt',

  });

  const load = useCallback(async () => {

    setLoading(true);

    try {

      const params = Object.fromEntries(

        Object.entries(filters).filter(([, value]) => value !== '')

      );

      const { data } = await request({

        method: 'get',

        url: '/vouchers/accounts/all',

        params,

      });

      setItems(data);

    } catch (e) {

      message(

        e.response?.data?.message || 'Could not load vouchers',

        'error'

      );

    } finally {

      setLoading(false);

    }

  }, [request, filters, message]);

  useEffect(() => {

    load();

  }, [load]);

  const stats = {

    total: items.length,

    pending: items.filter((v) => v.status === 'Submitted').length,

    approved: items.filter((v) => v.status === 'Approved').length,

    rejected: items.filter((v) => v.status === 'Rejected').length,

    approvedAmount: items

      .filter((v) => v.status === 'Approved')

      .reduce((sum, v) => sum + Number(v.amount || 0), 0),

  };

  return (

    <>

      <Stats

        cards={[

          ['Total vouchers', stats.total],

          ['Pending approval', stats.pending],

          ['Approved', stats.approved],

          ['Rejected', stats.rejected],

          ['Total approved expense', money(stats.approvedAmount)],

        ]}

      />

      <section className="panel">

        <div className="panel-heading">

          <div>

            <h2>Organization vouchers</h2>

            <p className="muted">

              View voucher status and both signatures for reimbursement

              processing.

            </p>

          </div>

          <button className="secondary" onClick={load}>

            Refresh

          </button>

        </div>

        <Filters filters={filters} setFilters={setFilters} />

        {loading ? (

          <p className="empty">Loading vouchers…</p>

        ) : (

          <VoucherTable items={items} request={request} accounts />

        )}

      </section>

      <section className="panel">

        <h2>Recent approved vouchers</h2>

        {items

          .filter((v) => v.status === 'Approved')

          .slice(0, 5)

          .map((v) => (

            <div className="activity-row" key={v._id}>

              <div>

                <strong>

                  {v.voucherNumber} · {money(v.amount)}

                </strong>

                <span>

                  {v.title} · {v.employee?.name}

                </span>

              </div>

              <span className="muted">{date(v.approvalDate)}</span>

            </div>

          ))}

        {!items.some((v) => v.status === 'Approved') && (

          <p className="muted">

            No approved vouchers in the current result set.

          </p>

        )}

      </section>

    </>

  );

}

function Stats({ cards }) {

  return (

    <div className="stats-grid">

      {cards.map(([label, value]) => (

        <div className="stat-card" key={label}>

          <span>{label}</span>

          <strong>{value}</strong>

        </div>

      ))}

    </div>

  );

}

function Filters({ filters, setFilters }) {

  const update = (key, value) =>

    setFilters((previous) => ({ ...previous, [key]: value }));

  const clearFilters = () =>

    setFilters({

      status: '',

      employeeName: '',

      department: '',

      category: '',

      voucherNumber: '',

      from: '',

      to: '',

      minAmount: '',

      maxAmount: '',

      sort: 'createdAt',

    });

  return (

    <div className="filters">

      <Field

        label="Voucher number"

        value={filters.voucherNumber}

        onChange={(v) => update('voucherNumber', v)}

        placeholder="Search number"

      />

      <Field

        label="Employee name"

        value={filters.employeeName}

        onChange={(v) => update('employeeName', v)}

        placeholder="Search employee"

      />

      <Field

        label="Department"

        value={filters.department}

        onChange={(v) => update('department', v)}

      />

      <label className="field">

        <span>Category</span>

        <select

          value={filters.category}

          onChange={(e) => update('category', e.target.value)}

        >

          <option value="">All categories</option>

          {categories.map((c) => (

            <option key={c}>{c}</option>

          ))}

        </select>

      </label>

      <label className="field">

        <span>Status</span>

        <select

          value={filters.status}

          onChange={(e) => update('status', e.target.value)}

        >

          <option value="">All statuses</option>

          {statuses.map((s) => (

            <option key={s}>{s}</option>

          ))}

        </select>

      </label>

      <Field

        label="Expense from"

        type="date"

        value={filters.from}

        onChange={(v) => update('from', v)}

      />

      <Field

        label="Expense to"

        type="date"

        value={filters.to}

        onChange={(v) => update('to', v)}

      />

      <Field

        label="Min amount ₹"

        type="number"

        value={filters.minAmount}

        onChange={(v) => update('minAmount', v)}

      />

      <Field

        label="Max amount ₹"

        type="number"

        value={filters.maxAmount}

        onChange={(v) => update('maxAmount', v)}

      />

      <label className="field">

        <span>Sort by</span>

        <select

          value={filters.sort}

          onChange={(e) => update('sort', e.target.value)}

        >

          <option value="createdAt">Newest</option>

          <option value="expenseDate">Expense date</option>

          <option value="amount">Amount</option>

          <option value="status">Status</option>

          <option value="voucherNumber">Voucher number</option>

        </select>

      </label>

      <button

        type="button"

        className="secondary filter-reset"

        onClick={clearFilters}

      >

        Clear filters

      </button>

    </div>

  );

}

function Status({ status }) {

  return (

    <span className={`status status-${String(status).toLowerCase()}`}>

      {status}

    </span>

  );

}

function Signature({ src, label }) {
  const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

  const imageUrl = src
    ? `${SERVER_URL}/${String(src).replace(/^\/+/, '')}`
    : '';

  return (
    <div className="signature">
      <span>{label}</span>

      {imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer">
          <img
            src={imageUrl}
            alt={`${label} signature`}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </a>
      ) : (
        <small>Not uploaded</small>
      )}
    </div>
  );
}

function VoucherTable({

  items,

  employee = false,

  director = false,

  accounts = false,

  onEdit,

  onDelete,

  onUpload,

  onSubmit,

  onDecide,

  reasons,

  setReasons,

  request,

}) {

  if (!items.length) {

    return <p className="empty">No vouchers match these filters.</p>;

  }

  return (

    <div className="table-wrap">

      <table>

        <thead>

          <tr>

            <th>Voucher</th>

            <th>Employee / department</th>

            <th>Expense</th>

            <th>Amount</th>

            <th>Signatures</th>

            <th>Status / details</th>

            {(employee || director) && <th>Actions</th>}

          </tr>

        </thead>

        <tbody>

          {items.map((v) => (

            <tr key={v._id}>

              <td>

                <strong>{v.voucherNumber}</strong>

                <small>Voucher date: {date(v.voucherDate)}</small>

                <small>Expense date: {date(v.expenseDate)}</small>

              </td>

              <td>

                {v.employee?.name || 'You'}

                <small>{v.employee?.email || ''}</small>

                <small>{v.department}</small>

              </td>

              <td>

                <strong>{v.title}</strong>

                <small>{v.category}</small>

                <small>{v.description || 'No description'}</small>

              </td>

              <td className="amount">{money(v.amount)}</td>

              <td>

                <div className="signature-list">

                  <Signature

                    src={v.employeeSignature}

                    label="Employee"

                  />

                  <Signature

                    src={v.directorSignature}

                    label="Director"

                  />

                </div>

                {director && v.status === 'Submitted' && (

                  <label className="upload-control">

                    Upload director signature

                    <input

                      type="file"

                      accept="image/png,image/jpeg,image/webp"

                      onChange={(e) => {

                        onUpload(v, e.target.files?.[0]);

                        e.target.value = '';

                      }}

                    />

                  </label>

                )}

              </td>

              <td>

                <Status status={v.status} />

                {v.approvalDate && (

                  <small>Approval: {date(v.approvalDate)}</small>

                )}

                {v.approvedBy?.name && (

                  <small>By {v.approvedBy.name}</small>

                )}

                {v.rejectionReason && (

                  <p className="rejection">

                    <strong>Reason:</strong> {v.rejectionReason}

                  </p>

                )}

              </td>

              {(employee || director) && (

                <td className="actions-cell">

                  {employee && v.status === 'Draft' && (

                    <>

                      <button

                        className="secondary tiny-button"

                        onClick={() => onEdit(v)}

                      >

                        Edit

                      </button>

                      <button

                        className="danger tiny-button"

                        onClick={() => onDelete(v)}

                      >

                        Delete

                      </button>

                      <label className="upload-control">

                        {v.employeeSignature

                          ? 'Replace signature'

                          : 'Upload signature'}

                        <input

                          type="file"

                          accept="image/png,image/jpeg,image/webp"

                          onChange={(e) => {

                            onUpload(v, e.target.files?.[0]);

                            e.target.value = '';

                          }}

                        />

                      </label>

                      <button

                        className="primary tiny-button"

                        disabled={!v.employeeSignature}

                        onClick={() => onSubmit(v)}

                      >

                        Submit

                      </button>

                    </>

                  )}

                  {director && v.status === 'Submitted' && (

                    <>

                      <textarea

                        rows="2"

                        placeholder="Rejection reason (required to reject)"

                        value={reasons[v._id] || ''}

                        onChange={(e) =>

                          setReasons((previous) => ({

                            ...previous,

                            [v._id]: e.target.value,

                          }))

                        }

                      />

                      <button

                        className="primary tiny-button"

                        disabled={!v.directorSignature}

                        onClick={() => onDecide(v, 'approve')}

                      >

                        Approve

                      </button>

                      <button

                        className="danger tiny-button"

                        onClick={() => onDecide(v, 'reject')}

                      >

                        Reject

                      </button>

                      {!v.directorSignature && (

                        <small>Upload signature before approving.</small>

                      )}

                    </>

                  )}

                </td>

              )}

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

export default App;