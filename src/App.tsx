import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { Activity, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, ClipboardList, HeartPulse, Home, LogOut, MapPin, Menu, ShieldCheck, Stethoscope, UserRound, Users, Wrench } from "lucide-react";

type Role = "patient" | "provider" | "admin";
type Service = "Nursing / Home Nursing" | "Physiotherapy" | "Post-operative Care" | "Medical Equipment";
type Profile = { id: string; full_name: string; phone: string | null; role: Role };
type Booking = { id: string; service: Service; locality: string; preferred_date: string; preferred_time: string; patient_name: string; phone: string; notes: string | null; status: string; created_at: string; provider_id: string | null };
type Provider = { id: string; business_name: string; service: Service; locality: string; contact_phone: string; description: string | null; verification_status: string };

const localities = ["Jayanagar", "JP Nagar", "Banashankari", "BTM Layout", "Arekere", "Hulimavu", "Bannerghatta Road", "Electronic City"];
const services: { name: Service; description: string; icon: typeof HeartPulse }[] = [
  { name: "Nursing / Home Nursing", description: "At-home nursing support and assistance.", icon: HeartPulse },
  { name: "Physiotherapy", description: "Recovery exercises and mobility support.", icon: Activity },
  { name: "Post-operative Care", description: "Non-emergency support after discharge.", icon: Stethoscope },
  { name: "Medical Equipment", description: "Enquire about rental or purchase of equipment.", icon: Wrench }
];

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState<"home" | "login" | "provider" | "bookings" | "admin">("home");
  const [selectedService, setSelectedService] = useState<Service>("Nursing / Home Nursing");
  const [selectedLocality, setSelectedLocality] = useState("Jayanagar");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    loadProfile();
  }, [session]);

  useEffect(() => {
    if (page === "home") loadProviders();
    if (page === "bookings" || page === "admin") loadBookings();
  }, [page, profile]);

  async function loadProfile() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase.from("profiles").select("id,full_name,phone,role").eq("id", session.user.id).maybeSingle();
    setProfile(data as Profile | null);
  }
  async function loadProviders() {
    if (!supabase) return;
    const { data } = await supabase.from("provider_profiles").select("*").eq("verification_status", "approved").order("business_name");
    setProviders((data || []) as Provider[]);
  }
  async function loadBookings() {
    if (!supabase || !session?.user) return;
    let q = supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (profile?.role !== "admin") q = q.eq(profile?.role === "provider" ? "provider_id" : "patient_id", session.user.id);
    const { data } = await q;
    setBookings((data || []) as Booking[]);
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return setNotice("Add your Supabase URL and anon key to .env.local first.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setNotice(error ? error.message : "Signed in.");
    if (!error) setPage("home");
  }
  async function signUp(email: string, password: string, name: string, phone: string, role: "patient" | "provider") {
    if (!supabase) return setNotice("Connect Supabase before creating accounts.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, phone, role } } });
    if (!error && data.user) {
      setNotice("Account created. Check your email if confirmation is enabled, then sign in.");
    } else setNotice(error?.message || "Could not create account.");
    setBusy(false);
  }
  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null); setSession(null); setPage("home"); setNotice("You have signed out.");
  }
  async function createBooking(form: FormData) {
    if (!supabase || !session?.user || profile?.role !== "patient") {
      setNotice("Please sign in with a patient account to submit a booking request."); setPage("login"); return;
    }
    setBusy(true);
    const payload = {
      patient_id: session.user.id, service: String(form.get("service")), locality: String(form.get("locality")),
      preferred_date: String(form.get("date")), preferred_time: String(form.get("time")),
      patient_name: String(form.get("name")), phone: String(form.get("phone")),
      notes: String(form.get("notes") || ""), status: "pending"
    };
    const { error } = await supabase.from("bookings").insert(payload);
    setBusy(false);
    setNotice(error ? error.message : "Request submitted. RECOCARE will review it manually and contact you.");
    if (!error) setPage("bookings");
  }
  async function submitProvider(form: FormData) {
    if (!supabase || !session?.user || profile?.role !== "provider") {
      setNotice("Please sign in with a provider account first."); setPage("login"); return;
    }
    setBusy(true);
    const { error } = await supabase.from("provider_profiles").insert({
      user_id: session.user.id, business_name: String(form.get("business")), service: String(form.get("service")),
      locality: String(form.get("locality")), contact_phone: String(form.get("phone")),
      description: String(form.get("description") || ""), verification_status: "pending"
    });
    setBusy(false);
    setNotice(error ? error.message : "Provider application submitted for manual verification.");
  }
  async function adminUpdate(id: string, status: string) {
    if (!supabase) return;
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    setNotice(error ? error.message : `Booking marked ${status}.`);
    loadBookings();
  }
  async function adminVerify(id: string, status: string) {
    if (!supabase) return;
    const { error } = await supabase.from("provider_profiles").update({ verification_status: status }).eq("id", id);
    setNotice(error ? error.message : `Provider marked ${status}.`);
    loadProviders();
  }

  const filteredProviders = useMemo(() => providers.filter(p => p.service === selectedService && p.locality === selectedLocality), [providers, selectedService, selectedLocality]);

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setPage("home")}><span className="brand-mark">+</span><span>RECOCARE<small>Recovery care, closer to home</small></span></button>
      <nav>
        <button onClick={() => setPage("home")}><Home size={17}/> Find care</button>
        <button onClick={() => setPage("provider")}><Users size={17}/> For providers</button>
        {session && <button onClick={() => setPage("bookings")}><ClipboardList size={17}/> My requests</button>}
        {profile?.role === "admin" && <button onClick={() => setPage("admin")}><ShieldCheck size={17}/> Admin</button>}
        {session ? <button onClick={signOut}><LogOut size={17}/> Sign out</button> : <button className="nav-primary" onClick={() => setPage("login")}>Sign in</button>}
      </nav>
    </header>

    {!isSupabaseConfigured && <div className="setup-alert"><strong>Demo setup:</strong> the interface is ready, but live accounts and bookings activate only after you connect a Supabase project. See README.</div>}
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}

    {page === "home" && <>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">SOUTH BANGALORE HEALTHCARE MARKETPLACE</span><h1>Recovery feels better<br/><em>closer to home.</em></h1><p>Find home nursing, physiotherapy, post-operative support and medical equipment from local providers.</p><div className="hero-actions"><button className="primary" onClick={() => document.getElementById("find-care")?.scrollIntoView({behavior:"smooth"})}>Find a service <ArrowRight size={17}/></button><button className="secondary" onClick={() => setPage("provider")}>List your service</button></div><div className="trust-line"><BadgeCheck size={16}/> Provider profiles are reviewed before listing</div></div>
        <div className="hero-art"><div className="art-circle"><HeartPulse size={86}/></div><div className="art-chip chip-one"><CheckCircle2 size={17}/> Local care options</div><div className="art-chip chip-two"><MapPin size={17}/> South Bangalore</div></div>
      </section>
      <main id="find-care" className="content">
        <div className="section-heading"><div><span className="eyebrow">EXPLORE SERVICES</span><h2>What support do you need?</h2></div><p>Choose a service and locality to view approved providers.</p></div>
        <div className="service-grid">{services.map(s => { const Icon=s.icon; return <button key={s.name} className={`service-card ${selectedService===s.name?"selected":""}`} onClick={() => setSelectedService(s.name)}><span className="service-icon"><Icon size={24}/></span><strong>{s.name}</strong><small>{s.description}</small><span className="card-arrow"><ArrowRight size={17}/></span></button>})}</div>
        <div className="provider-search"><div><span className="eyebrow">LOCAL PROVIDERS</span><h2>Find care near you</h2></div><label>Area<select value={selectedLocality} onChange={e=>setSelectedLocality(e.target.value)}>{localities.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <div className="provider-list">
          {filteredProviders.length ? filteredProviders.map(p=><article className="provider-card" key={p.id}><div className="provider-avatar"><Stethoscope/></div><div className="provider-info"><strong>{p.business_name}</strong><span>{p.service}</span><small><MapPin size={13}/> {p.locality}</small>{p.description && <p>{p.description}</p>}</div><button className="primary small" onClick={()=>{setSelectedService(p.service);document.getElementById("booking-form")?.scrollIntoView({behavior:"smooth"});}}>Request booking</button></article>) : <div className="empty-state"><div className="empty-icon"><MapPin/></div><strong>No approved providers listed here yet</strong><p>Submit a request and RECOCARE can help coordinate after reviewing provider availability.</p></div>}
        </div>
        <section className="booking-panel" id="booking-form"><div><span className="eyebrow">BOOKING REQUEST</span><h2>Request a service</h2><p>All requests are reviewed manually. A request is not a confirmed appointment.</p></div><form action={undefined} onSubmit={e=>{e.preventDefault();createBooking(new FormData(e.currentTarget));}} className="booking-form">
          <label>Service<select name="service" value={selectedService} onChange={e=>setSelectedService(e.target.value as Service)}>{services.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
          <label>Preferred area<select name="locality" defaultValue={selectedLocality}>{localities.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Your name<input name="name" required placeholder="Full name"/></label><label>Phone number<input name="phone" required inputMode="tel" placeholder="10-digit mobile number"/></label>
          <label>Preferred date<input name="date" type="date" required min={new Date().toISOString().slice(0,10)}/></label><label>Preferred time<select name="time"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
          <label className="wide">Additional details (optional)<textarea name="notes" rows={3} placeholder="Share only basic service requirements. Do not enter diagnoses, reports or sensitive medical details."/></label>
          <button className="primary wide" disabled={busy}>{busy?"Submitting…":"Submit request"} <ArrowRight size={17}/></button>
        </form></section>
      </main>
    </>}

    {page === "login" && <main className="narrow-page"><div className="page-intro"><span className="eyebrow">WELCOME TO RECOCARE</span><h1>Sign in or create an account</h1><p>Patients and service providers use the same application with separate account roles.</p></div><AuthPanel onSignIn={signIn} onSignUp={signUp} busy={busy}/></main>}
    {page === "provider" && <main className="narrow-page"><div className="page-intro"><span className="eyebrow">PARTNER WITH US</span><h1>Bring your care service to more families.</h1><p>Apply to list your service in South Bangalore. Every provider is reviewed before appearing publicly.</p></div><div className="form-card"><h2>Provider application</h2><form onSubmit={e=>{e.preventDefault();submitProvider(new FormData(e.currentTarget));}} className="stack-form"><label>Business / provider name<input name="business" required placeholder="Registered name or professional name"/></label><label>Service<select name="service">{services.map(s=><option key={s.name}>{s.name}</option>)}</select></label><label>Service area<select name="locality">{localities.map(x=><option key={x}>{x}</option>)}</select></label><label>Contact phone<input name="phone" required inputMode="tel"/></label><label>Brief description<textarea name="description" rows={3} placeholder="Services offered and coverage area"/></label><button className="primary" disabled={busy}>Submit for verification</button></form><p className="fine-print">You must sign in using a provider account before submitting. Do not upload patient records here.</p></div></main>}
    {page === "bookings" && <main className="content dashboard"><div className="page-intro"><span className="eyebrow">YOUR RECOCARE</span><h1>My requests</h1><p>{profile?.full_name || session?.user?.email} · {profile?.role || "Account"}</p></div><BookingTable bookings={bookings}/></main>}
    {page === "admin" && profile?.role === "admin" && <main className="content dashboard"><div className="page-intro"><span className="eyebrow">OPERATIONS</span><h1>Admin review</h1><p>Manually review provider applications and patient booking requests.</p></div><AdminPanel bookings={bookings} onBooking={adminUpdate} onVerify={adminVerify}/></main>}

    <footer><div className="footer-brand"><span className="brand-mark">+</span> RECOCARE</div><p>RECOCARE is a service-discovery and booking-request platform, not an emergency or medical advice service.</p><div>© {new Date().getFullYear()} RECOCARE · South Bangalore pilot</div></footer>
  </div>;
}

function AuthPanel({onSignIn,onSignUp,busy}:{onSignIn:(e:string,p:string)=>void;onSignUp:(e:string,p:string,n:string,ph:string,r:"patient"|"provider")=>void;busy:boolean}) {
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [role,setRole]=useState<"patient"|"provider">("patient");
  return <div className="form-card"><div className="tabs"><button className={mode==="signin"?"active":""} onClick={()=>setMode("signin")}>Sign in</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div>
    <form className="stack-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);mode==="signin"?onSignIn(String(f.get("email")),String(f.get("password"))):onSignUp(String(f.get("email")),String(f.get("password")),String(f.get("name")),String(f.get("phone")),role);}}>
      {mode==="signup" && <><label>Account type<select value={role} onChange={e=>setRole(e.target.value as "patient"|"provider")}><option value="patient">Patient / family</option><option value="provider">Service provider</option></select></label><label>Full name<input name="name" required/></label><label>Phone<input name="phone" required inputMode="tel"/></label></>}
      <label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={mode==="signin"?"current-password":"new-password"}/></label><button className="primary" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button>
    </form><p className="fine-print">Use a valid email. If email confirmation is enabled in Supabase, verify your email before signing in.</p>
  </div>;
}
function BookingTable({bookings}:{bookings:Booking[]}) {
  if(!bookings.length)return <div className="empty-state"><ClipboardList/><strong>No requests yet</strong><p>Your booking requests will appear here.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Service</th><th>Area</th><th>Date / time</th><th>Status</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td>{b.service}</td><td>{b.locality}</td><td>{b.preferred_date} · {b.preferred_time}</td><td><span className={`status ${b.status}`}>{b.status}</span></td></tr>)}</tbody></table></div>;
}
function AdminPanel({bookings,onBooking,onVerify}:{bookings:Booking[];onBooking:(id:string,s:string)=>void;onVerify:(id:string,s:string)=>void}) {
  const [providers,setProviders]=useState<Provider[]>([]);
  useEffect(()=>{supabase?.from("provider_profiles").select("*").order("created_at",{ascending:false}).then(({data})=>setProviders((data||[]) as Provider[]));},[]);
  return <div className="admin-sections"><section><h2><Users/> Provider applications</h2>{providers.length?providers.map(p=><div className="admin-row" key={p.id}><div><strong>{p.business_name}</strong><small>{p.service} · {p.locality} · {p.contact_phone}</small><span className={`status ${p.verification_status}`}>{p.verification_status}</span></div><div className="row-actions"><button onClick={()=>onVerify(p.id,"approved")}>Approve</button><button className="danger" onClick={()=>onVerify(p.id,"rejected")}>Reject</button></div></div>):<p className="muted">No provider applications.</p>}</section><section><h2><CalendarDays/> Booking requests</h2>{bookings.length?bookings.map(b=><div className="admin-row" key={b.id}><div><strong>{b.patient_name} · {b.service}</strong><small>{b.locality} · {b.preferred_date} · {b.preferred_time} · {b.phone}</small><span className={`status ${b.status}`}>{b.status}</span></div><div className="row-actions"><button onClick={()=>onBooking(b.id,"approved")}>Approve</button><button onClick={()=>onBooking(b.id,"completed")}>Complete</button><button className="danger" onClick={()=>onBooking(b.id,"cancelled")}>Cancel</button></div></div>):<p className="muted">No booking requests.</p>}</section></div>;
}
export default App;
