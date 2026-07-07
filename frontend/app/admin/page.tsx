"use client";

import { useState, useCallback, useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "sw_admin_token";

// ── Token helpers ─────────────────────────────────────────────────────────

function saveToken(t: string) {
  try { sessionStorage.setItem(TOKEN_KEY, t); } catch {}
}
function loadToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function clearToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
}

async function apiFetch(path: string, opts?: RequestInit, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

// ── Login flow ────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [step, setStep] = useState<"password" | "2fa">("password");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [preToken, setPreToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await apiFetch("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setPreToken(res.access_token);
      setStep("2fa");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function submit2FA(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(
        "/admin/auth/verify-2fa",
        { method: "POST", body: JSON.stringify({ totp_code: totp }) },
        preToken,
      );
      saveToken(res.access_token);
      onLogin(res.access_token);
    } catch (err: any) {
      setError(err.message);
      setTotp("");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🔐</div>
        <h1 className="login-title">SkillWeave Admin</h1>
        <p className="login-sub">Secure admin access · NCO-2015 database management</p>

        {step === "password" && (
          <form className="login-form" onSubmit={submitPassword}>
            <label className="admin-label">Username</label>
            <input
              className="admin-input" value={username} autoComplete="username"
              onChange={(e) => setUsername(e.target.value)} required
            />
            <label className="admin-label" style={{ marginTop: 12 }}>Password</label>
            <input
              className="admin-input" type="password" placeholder="Strong admin password"
              value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} required
            />
            {error && <div className="admin-status admin-err">{error}</div>}
            <button className="admin-btn primary login-btn" type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Continue →"}
            </button>
          </form>
        )}

        {step === "2fa" && (
          <form className="login-form" onSubmit={submit2FA}>
            <div className="totp-info">
              <span className="totp-icon">📱</span>
              <div>
                <strong>Two-Factor Authentication</strong>
                <p>Enter the 6-digit code from your Authenticator app (Google Authenticator / Authy).</p>
              </div>
            </div>
            <input
              className="admin-input totp-input"
              type="text" inputMode="numeric" pattern="\d{6}"
              maxLength={6} placeholder="000000" value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              autoFocus required
            />
            {error && <div className="admin-status admin-err">{error}</div>}
            <button className="admin-btn primary login-btn" type="submit"
              disabled={loading || totp.length !== 6}>
              {loading ? "Verifying…" : "Verify & Enter →"}
            </button>
            <button type="button" className="back-link"
              style={{ marginTop: 10, display: "block", textAlign: "center" }}
              onClick={() => { setStep("password"); setError(null); setTotp(""); }}>
              ← Back
            </button>
          </form>
        )}

        <p className="login-setup-hint">
          First time? Call <code>GET /admin/auth/setup?plain_password=YourPassword</code> to generate credentials.
        </p>
      </div>
    </div>
  );
}

// ── Occupation panels (same as before, now token-aware) ───────────────────

interface Occupation {
  nco_code_2015: string; title: string; description: string;
  division_name?: string; group_name?: string; family_name?: string; hierarchy_path?: string;
}
interface EditHistory {
  id: number; nco_code: string; field: string; old_value: string | null;
  new_value: string | null; admin_note: string | null; reembedded: boolean; time: string;
}

function StatusMsg({ msg, error }: { msg: string | null; error: boolean }) {
  if (!msg) return null;
  return <div className={`admin-status ${error ? "admin-err" : "admin-ok"}`}>{msg}</div>;
}

function BrowsePanel({ token }: { token: string }) {
  const [q, setQ] = useState(""); const [results, setResults] = useState<Occupation[]>([]);
  const [total, setTotal] = useState<number | null>(null); const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function search() {
    setLoading(true); setErr(null);
    try {
      const data = await apiFetch(`/admin/occupations?query=${encodeURIComponent(q)}&limit=20`, {}, token);
      setResults(data.occupations || []); setTotal(data.total);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="admin-panel">
      <h2>Browse Occupations</h2>
      <p className="admin-hint">Total indexed: {total ?? "—"} records.</p>
      <div className="admin-search-row">
        <input className="admin-input" placeholder="NCO code or title keyword"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <button className="admin-btn primary" onClick={search} disabled={loading}>{loading ? "…" : "Search"}</button>
        <button className="admin-btn secondary" onClick={() => { setQ(""); search(); }}>Show all</button>
      </div>
      <StatusMsg msg={err} error />
      {results.length > 0 && (
        <div className="admin-table">
          <div className="admin-thead"><span>Code</span><span>Title</span><span>Hierarchy</span></div>
          {results.map((r) => (
            <div className="admin-trow" key={r.nco_code_2015}>
              <span className="admin-code">{r.nco_code_2015}</span>
              <span className="admin-title">{r.title}</span>
              <span className="admin-hier">{r.hierarchy_path || r.division_name || "—"}</span>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && !loading && <div className="admin-empty">Search for an occupation above.</div>}
    </div>
  );
}

function EditPanel({ token }: { token: string }) {
  const [code, setCode] = useState(""); const [occ, setOcc] = useState<Occupation | null>(null);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [note, setNote] = useState(""); const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null); const [isErr, setIsErr] = useState(false);
  async function fetchOcc() {
    if (!code.trim()) return;
    setLoading(true); setMsg(null); setOcc(null);
    try {
      const data = await apiFetch(`/admin/occupations/${encodeURIComponent(code.trim())}`, {}, token);
      setOcc(data); setTitle(data.title || ""); setDesc(data.description || "");
    } catch (e: any) { setMsg(e.message); setIsErr(true); } finally { setLoading(false); }
  }
  async function save() {
    if (!occ) return; setLoading(true); setMsg(null);
    try {
      const res = await apiFetch(`/admin/occupations/${encodeURIComponent(code.trim())}`, {
        method: "PATCH", body: JSON.stringify({ title, description: desc, admin_note: note, reembed: true }),
      }, token);
      setMsg(res.status === "no_change" ? "No changes detected." : `✓ Updated: ${res.changed_fields.join(", ")} | Re-embedded: ${res.reembedded}`);
      setIsErr(false);
    } catch (e: any) { setMsg(e.message); setIsErr(true); } finally { setLoading(false); }
  }
  return (
    <div className="admin-panel">
      <h2>Edit Occupation</h2>
      <p className="admin-hint">Fetch by NCO code, edit, and save. Changes re-embed automatically.</p>
      <div className="admin-search-row">
        <input className="admin-input" placeholder="NCO code e.g. 6111.02" value={code}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchOcc()} />
        <button className="admin-btn primary" onClick={fetchOcc} disabled={loading}>{loading ? "…" : "Fetch"}</button>
      </div>
      {occ && (
        <div className="admin-form">
          <label className="admin-label">NCO Code (read-only)</label>
          <input className="admin-input readonly" value={occ.nco_code_2015} readOnly />
          <label className="admin-label">Title</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="admin-label">Description</label>
          <textarea className="admin-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} />
          <label className="admin-label">Reason for change</label>
          <input className="admin-input" placeholder="e.g. corrected truncated title" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="admin-actions">
            <button className="admin-btn primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "✔ Save & Re-embed"}</button>
            <button className="admin-btn secondary" onClick={() => setOcc(null)}>Cancel</button>
          </div>
        </div>
      )}
      <StatusMsg msg={msg} error={isErr} />
    </div>
  );
}

function AddPanel({ token }: { token: string }) {
  const [form, setForm] = useState({ nco_code_2015:"",title:"",description:"",division_code:"",division_name:"",group_code:"",group_name:"",family_code:"",family_name:"" });
  const [loading, setLoading] = useState(false); const [msg, setMsg] = useState<string|null>(null); const [isErr, setIsErr] = useState(false);
  function set(field: string, value: string) { setForm((f) => ({...f,[field]:value})); }
  async function submit() {
    if (!form.nco_code_2015||!form.title) { setMsg("NCO code and title are required."); setIsErr(true); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await apiFetch("/admin/occupations",{method:"POST",body:JSON.stringify(form)},token);
      setMsg(`✓ Created ${res.nco_code}. Total: ${res.total}.`); setIsErr(false);
      setForm({nco_code_2015:"",title:"",description:"",division_code:"",division_name:"",group_code:"",group_name:"",family_code:"",family_name:""});
    } catch(e:any){setMsg(e.message);setIsErr(true);} finally{setLoading(false);}
  }
  return (
    <div className="admin-panel">
      <h2>Add New Occupation</h2>
      <p className="admin-hint">New occupations are embedded and searchable immediately.</p>
      <div className="admin-form">
        {([["nco_code_2015","NCO Code *","e.g. 2512.9901"],["title","Title *","e.g. AI/ML Engineer"],["division_code","Division Code","e.g. 2"],["division_name","Division Name","e.g. Professionals"],["group_code","Group Code","e.g. 251"],["group_name","Group Name","e.g. Software Developers"],["family_code","Family Code","e.g. 2512"],["family_name","Family Name","e.g. Software Developers"]] as [string,string,string][]).map(([k,l,p])=>(
          <div key={k}><label className="admin-label">{l}</label><input className="admin-input" placeholder={p} value={(form as any)[k]} onChange={(e)=>set(k,e.target.value)}/></div>
        ))}
        <label className="admin-label">Description</label>
        <textarea className="admin-textarea" placeholder="Full occupation description…" value={form.description} onChange={(e)=>set("description",e.target.value)} rows={5}/>
        <div className="admin-actions">
          <button className="admin-btn primary" onClick={submit} disabled={loading}>{loading?"Adding…":"✔ Add & Embed"}</button>
        </div>
      </div>
      <StatusMsg msg={msg} error={isErr}/>
    </div>
  );
}

function HistoryPanel({ token }: { token: string }) {
  const [edits,setEdits]=useState<EditHistory[]>([]); const [loading,setLoading]=useState(false); const [err,setErr]=useState<string|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);setErr(null);
    try{const data=await apiFetch("/admin/edits?limit=50",{},token);setEdits(data.edits||[]);}
    catch(e:any){setErr(e.message);}finally{setLoading(false);}
  },[token]);
  return (
    <div className="admin-panel">
      <h2>Edit History</h2>
      <p className="admin-hint">Every create, update, and delete is audit-logged here.</p>
      <button className="admin-btn secondary" onClick={load} disabled={loading}>{loading?"Loading…":"Load history"}</button>
      <StatusMsg msg={err} error/>
      {edits.length>0&&(
        <div className="admin-table" style={{marginTop:16}}>
          <div className="admin-thead edit-head"><span>Code</span><span>Field</span><span>Old</span><span>New</span><span>Note</span><span>Re-emb.</span><span>When</span></div>
          {edits.map((e)=>(
            <div className="admin-trow edit-row" key={e.id}>
              <span className="admin-code">{e.nco_code}</span>
              <span><span className="edit-field-tag">{e.field}</span></span>
              <span className="old-val">{e.old_value??"—"}</span>
              <span className="new-val">{e.new_value??"—"}</span>
              <span className="edit-note">{e.admin_note??"—"}</span>
              <span>{e.reembedded?"✓":"—"}</span>
              <span className="edit-time">{new Date(e.time).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {edits.length===0&&!loading&&<div className="admin-empty">Click "Load history" to view edits.</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type Tab = "browse"|"edit"|"add"|"history";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("browse");

  useEffect(() => {
    const saved = loadToken();
    if (saved) setToken(saved);
  }, []);

  function handleLogin(t: string) { setToken(t); }
  function logout() { clearToken(); setToken(null); }

  if (!token) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <a href="/" className="back-link">← Back to Search</a>
        <div>
          <h1>Admin Panel</h1>
          <p>Manage the NCO-2015 occupation database. All changes are re-embedded and audit-logged.</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="badge" style={{alignSelf:"center"}}>Admin 🔐</span>
          <button className="admin-btn secondary" onClick={logout} style={{fontSize:13,padding:"6px 14px"}}>
            Sign out
          </button>
        </div>
      </div>

      <div className="dash-tabs">
        {(["browse","edit","add","history"] as Tab[]).map((t) => (
          <button key={t} className={`dash-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t==="browse"?"🔍 Browse":t==="edit"?"✏️ Edit":t==="add"?"➕ Add":"📜 Edit History"}
          </button>
        ))}
      </div>

      {tab==="browse"&&<BrowsePanel token={token}/>}
      {tab==="edit"&&<EditPanel token={token}/>}
      {tab==="add"&&<AddPanel token={token}/>}
      {tab==="history"&&<HistoryPanel token={token}/>}
    </div>
  );
}