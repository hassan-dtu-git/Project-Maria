import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, CalendarDays, Check, ChevronDown, Compass, Heart, MapPin, Menu, MessageCircle, Music2, ShieldCheck, Sparkles, Users, X } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const events = [
  { id: 1, title: 'Indie Night Live', category: 'Music', date: 'Fri, 30 Oct · 7:30 PM', place: 'The Courtyard, Delhi', people: 18, price: 'From ₹499', color: 'lavender', icon: Music2, description: 'An intimate live set for people who love discovering new sounds.' },
  { id: 2, title: 'Sunday Sketch Club', category: 'Art', date: 'Sun, 1 Nov · 11:00 AM', place: 'Lodhi Art District, Delhi', people: 9, price: 'Free to join', color: 'peach', icon: Sparkles, description: 'Bring a sketchbook, meet local creatives, and make something together.' },
  { id: 3, title: 'Board Games & Chai', category: 'Social', date: 'Sat, 31 Oct · 4:00 PM', place: 'Common Room, South Delhi', people: 12, price: 'Pay for your order', color: 'mint', icon: Users, description: 'Low-pressure games, conversation, and a table with room for one more.' },
  { id: 4, title: 'City Park Run', category: 'Outdoors', date: 'Sun, 1 Nov · 7:00 AM', place: 'India Gate lawns, Delhi', people: 24, price: 'Free', color: 'sky', icon: Compass, description: 'A relaxed community run. Choose your pace and meet your crew.' },
  { id: 5, title: 'Film Lovers Meetup', category: 'Culture', date: 'Thu, 5 Nov · 6:30 PM', place: 'India Habitat Centre, Delhi', people: 7, price: 'Ticket separate', color: 'rose', icon: CalendarDays, description: 'Find people to discuss the film with before and after the screening.' },
  { id: 6, title: 'Coffee & Conversation', category: 'Social', date: 'Sat, 7 Nov · 10:30 AM', place: 'Neighbourhood Cafe, Delhi', people: 11, price: 'Pay for your order', color: 'butter', icon: MessageCircle, description: 'A small-group coffee hangout designed to make meeting people easier.' }
];
const categories = ['All events', 'Music', 'Art', 'Social', 'Outdoors', 'Culture'];

function getInitialPage() {
  const hash = window.location.hash.replace('#', '');
  return ['events', 'how-it-works', 'safety', 'terms', 'privacy', 'guidelines', 'login', 'signup', 'matches', 'people', 'profile'].includes(hash) ? hash : 'home';
}

export default function App() {
  const [page, setPage] = useState(getInitialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [category, setCategory] = useState('All events');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('Inappropriate behaviour');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [eventsLoadError, setEventsLoadError] = useState('');
  const [liveEvents, setLiveEvents] = useState([]);
  const [joinedEventIds, setJoinedEventIds] = useState([]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [discoveryEventId, setDiscoveryEventId] = useState('');
  const [discoveryPeople, setDiscoveryPeople] = useState([]);
  const [peopleBusy, setPeopleBusy] = useState(false);
  const [swipeBusy, setSwipeBusy] = useState(false);
  const [swipeNotice, setSwipeNotice] = useState('');

  useEffect(() => {
    const onHash = () => { setPage(getInitialPage()); setMobileOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
      return () => { window.removeEventListener('hashchange', onHash); data.subscription.unsubscribe(); };
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    async function loadEvents() {
      const { data, error } = await supabase.from('events')
        .select('id,title,description,category,venue_name,city,starts_at,booking_url')
        .eq('published', true)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(100);
      if (cancelled) return;
      if (error) {
        setEventsLoadError('Could not load live events. Preview listings are shown instead.');
        return;
      }
      const colors = ['lavender', 'peach', 'mint', 'sky', 'rose', 'butter'];
      setEventsLoadError('');
      setLiveEvents((data || []).map(row => {
        const icon = /music|concert|gig/i.test(row.category) ? Music2
          : /art|creative|craft/i.test(row.category) ? Sparkles
          : /outdoor|sport|run|hike/i.test(row.category) ? Compass
          : /film|culture|theatre|museum/i.test(row.category) ? CalendarDays
          : /food|coffee|social|game/i.test(row.category) ? Users : MessageCircle;
        const hash = String(row.id).split('').reduce((n, c) => n + c.charCodeAt(0), 0);
        return {
          id: row.id, title: row.title, category: row.category,
          date: new Date(row.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
          place: [row.venue_name, row.city].filter(Boolean).join(', '),
          people: 0, price: row.booking_url ? 'See event details' : 'Check with organizer',
          color: colors[hash % colors.length], icon,
          description: row.description || 'Meet people interested in attending this event.',
          bookingUrl: row.booking_url, isLive: true
        };
      }));
    }
    loadEvents();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setJoinedEventIds([]); return; }
    let cancelled = false;
    supabase.from('event_participants').select('event_id').eq('user_id', user.id).neq('status', 'cancelled')
      .then(({ data, error }) => {
        if (!cancelled && !error) setJoinedEventIds((data || []).map(row => row.event_id));
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (page !== 'people' || !user) return;
    if (discoveryEventId && joinedEventIds.includes(discoveryEventId)) return;
    setDiscoveryEventId(joinedEventIds[0] || '');
  }, [page, user?.id, discoveryEventId, joinedEventIds]);

  useEffect(() => {
    if (page !== 'people' || !supabase || !user || !discoveryEventId) {
      setDiscoveryPeople([]);
      return;
    }
    let cancelled = false;
    async function loadPeople() {
      setPeopleBusy(true);
      setSwipeNotice('');
      const { data: participants, error: participantError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', discoveryEventId)
        .neq('status', 'cancelled')
        .neq('user_id', user.id);
      if (cancelled) return;
      if (participantError) {
        setSwipeNotice(participantError.message || 'Could not load event participants.');
        setDiscoveryPeople([]);
        setPeopleBusy(false);
        return;
      }
      const ids = [...new Set((participants || []).map(row => row.user_id))];
      if (!ids.length) {
        setDiscoveryPeople([]);
        setSwipeNotice('No other visible participants for this event yet.');
        setPeopleBusy(false);
        return;
      }
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,display_name,bio,city,avatar_url')
        .in('id', ids);
      if (cancelled) return;
      if (profileError) {
        setSwipeNotice(profileError.message || 'Could not load participant profiles.');
        setDiscoveryPeople([]);
      } else {
        setDiscoveryPeople(profiles || []);
        if (!profiles?.length) setSwipeNotice('No other visible participants for this event yet.');
      }
      setPeopleBusy(false);
    }
    loadPeople();
    return () => { cancelled = true; };
  }, [page, user?.id, discoveryEventId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const displayedEvents = liveEvents.length > 0 ? liveEvents : events;
  const filteredEvents = useMemo(() => displayedEvents.filter(event =>
    (category === 'All events' || event.category === category) &&
    (event.title + ' ' + event.place + ' ' + event.category).toLowerCase().includes(search.toLowerCase())
  ), [displayedEvents, category, search]);

  function navigate(next) { window.location.hash = next === 'home' ? '' : next; setPage(next); setMobileOpen(false); setSelectedEvent(null); window.scrollTo(0, 0); }
  function toggleSave(id) { setSaved(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); setToast(saved.includes(id) ? 'Removed from your list.' : 'Saved to your list.'); }
  async function joinEvent(eventItem) {
    if (!eventItem?.isLive) {
      setJoinMessage('This is a sample listing. Live participation is available only on published events.');
      return;
    }
    if (!user) {
      setSelectedEvent(null);
      navigate('login');
      setToast('Log in to mark interest in an event.');
      return;
    }
    if (!supabase || joinBusy) return;
    setJoinBusy(true);
    setJoinMessage('');
    try {
      const { error } = await supabase.from('event_participants').upsert(
        { event_id: eventItem.id, user_id: user.id, status: 'interested' },
        { onConflict: 'event_id,user_id' }
      );
      if (error) throw error;
      setJoinedEventIds(previous => previous.includes(eventItem.id) ? previous : [...previous, eventItem.id]);
      setJoinMessage('Your interest is saved. People discovery and matching are still being built.');
    } catch (error) {
      setJoinMessage(error.message || 'Could not save event interest. Please try again.');
    } finally {
      setJoinBusy(false);
    }
  }
  async function handleSwipe(person, action) {
    if (!user) { navigate('login'); return; }
    if (!supabase || !discoveryEventId || swipeBusy) return;
    setSwipeBusy(true);
    setSwipeNotice('');
    try {
      const { data, error } = await supabase.rpc('record_event_swipe', {
        p_event_id: discoveryEventId,
        p_target_user_id: person.id,
        p_action: action
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setDiscoveryPeople(previous => previous.filter(item => item.id !== person.id));
      setSwipeNotice(result?.matched ? 'It is a mutual match. Messaging is not connected in this preview yet.' : action === 'like' ? 'Interest recorded for this event.' : 'Profile skipped.');
    } catch (error) {
      setSwipeNotice(error.message || 'Could not record your choice. Please try again.');
    } finally {
      setSwipeBusy(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault(); setAuthMessage('');
    if (!email.trim() || !password) { setAuthMessage('Enter your email and password.'); return; }
    if (password.length < 8) { setAuthMessage('Use a password with at least 8 characters.'); return; }
    if (!supabase) { setAuthMessage('Authentication is not connected yet. Add the Supabase URL and anon key in your deployment environment to enable real accounts.'); return; }
    setAuthBusy(true);
    try {
      if (page === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
        if (error) throw error;
        if (data.session) { setUser(data.user); navigate('profile'); }
        else setAuthMessage('Check your email to confirm your account before signing in.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setUser(data.user); navigate('events');
      }
    } catch (error) { setAuthMessage(error.message || 'Authentication failed. Please try again.'); }
    finally { setAuthBusy(false); }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setUser(null); navigate('home'); setToast('You have signed out.'); }
  function reportUser() {
    if (!user) { navigate('login'); setToast('Sign in to submit a report.'); return; }
    setReportSubmitted(true);
    // Demo UI only: persist reports to a secured backend before public launch.
  }

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('home'); }} aria-label="Maria home"><span className="brand-mark">m.</span><span>maria</span></a>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      <nav className={mobileOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        <a href="#events" className={page === 'events' ? 'active' : ''}>Explore events</a>
        <a href="#people" className={page === 'people' ? 'active' : ''}>Meet people</a>
        <a href="#how-it-works" className={page === 'how-it-works' ? 'active' : ''}>How it works</a>
        <a href="#safety" className={page === 'safety' ? 'active' : ''}>Safety</a>
        {user ? <><a href="#matches">My list <span className="count">{saved.length}</span></a><button className="nav-login" onClick={signOut}>Sign out</button></> : <><a href="#login" className="nav-login">Log in</a><a href="#signup" className="button button-small">Get started <ArrowRight size={15}/></a></>}
      </nav>
    </header>

    <main>
      {page === 'home' && <><section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR PLANS, YOUR PEOPLE</div><h1>Good things<br/>are better <em>together.</em></h1><p className="hero-text">Find your people for the things you want to do. Discover events, meet people who are going too, and make a plan together.</p><div className="hero-actions"><button className="button" onClick={() => navigate('events')}>Find your next plan <ArrowRight size={17}/></button><button className="text-button" onClick={() => navigate('how-it-works')}>How Maria works <span>↗</span></button></div><div className="hero-note"><span className="avatar-stack"><i>A</i><i>R</i><i>M</i><i>+</i></span><span>Less scrolling. More doing.</span></div></div>
        <div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="photo-card card-back"><div className="photo-sun"/><div className="photo-hills"/><span>FIND YOUR SCENE</span></div><div className="photo-card card-front"><div className="concert-lights"><i/><i/><i/><i/></div><div className="concert-crowd"><i/><i/><i/><i/><i/><i/></div><div className="photo-caption"><span>FRIDAY NIGHT</span><strong>Live music, new friends.</strong></div></div><div className="floating-tag tag-top"><span className="tag-icon"><Users size={16}/></span><span><strong>Your kind of people</strong><small>Going to the same event</small></span></div><div className="floating-tag tag-bottom"><span className="match-heart"><Heart size={16} fill="currentColor"/></span><span><strong>It's a mutual!</strong><small>Your plan starts here</small></span></div><div className="sparkle sparkle-one">✳</div><div className="sparkle sparkle-two">✦</div></div>
      </section><section className="trust-strip"><div><ShieldCheck size={18}/><span>Safety comes first</span></div><span className="strip-divider"/><div><Users size={18}/><span>Friendship-first by design</span></div><span className="strip-divider"/><div><MapPin size={18}/><span>Plans that happen in real life</span></div></section><section className="section featured"><div className="section-heading"><div><div className="eyebrow">MAKE A PLAN</div><h2>Something good is happening.</h2><p>Find an event. Find your people. Go together.</p></div><button className="text-button" onClick={() => navigate('events')}>Explore all events <ArrowRight size={16}/></button></div><EventGrid items={displayedEvents.slice(0,3)} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/></section><section className="how-band"><div className="eyebrow">NO AWKWARD GUESSWORK</div><h2>From “I want to go”<br/>to “see you there.”</h2><div className="steps"><Step number="01" title="Find your thing" text="Explore local events that you'd genuinely enjoy."/><Step number="02" title="Meet your people" text="See who's interested and connect around a shared plan."/><Step number="03" title="Make it happen" text="Chat, coordinate, and head out with your new crew."/></div><button className="button button-light" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></section></>}

      {page === 'events' && <section className="page-section"><div className="eyebrow">YOUR CITY, YOUR SCENE</div><h1 className="page-title">Find something<br/><em>worth going to.</em></h1><p className="page-intro">Discover plans and meet people who want to be there too.</p><div className="event-tools"><label className="search-box"><Compass size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events or places" aria-label="Search events or places"/><span>⌘ K</span></label><div className="filter-row">{categories.map(item => <button key={item} className={category === item ? 'filter-chip selected' : 'filter-chip'} onClick={() => setCategory(item)}>{item}</button>)}</div></div>{filteredEvents.length ? <EventGrid items={filteredEvents} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/> : <div className="empty-state"><Compass size={28}/><h3>No events found</h3><p>Try a different search or category.</p><button className="text-button" onClick={() => {setSearch('');setCategory('All events');}}>Clear filters</button></div>}{eventsLoadError && <p className="demo-notice" role="status">{eventsLoadError}</p>}<p className="demo-notice">{liveEvents.length ? 'Showing published event listings. Confirm details with the organizer before making plans.' : 'Preview events are sample content for the prototype, not verified live listings.'}</p></section>}

      {page === 'how-it-works' && <section className="page-section narrow"><div className="eyebrow">SIMPLE BY DESIGN</div><h1 className="page-title">A plan is better<br/><em>with your people.</em></h1><p className="page-intro">Maria connects people through a shared interest in doing something offline—not endless swiping.</p><div className="feature-list"><Step number="01" title="Pick an event" text="Browse activities, culture, music, food, and local experiences. Choose something you actually want to do."/><Step number="02" title="Find people going too" text="Discover other interested attendees. Matching is tied to the event so the reason to connect is clear."/><Step number="03" title="Connect by choice" text="Send interest and connect when it is mutual. You control what you share and who can contact you."/><Step number="04" title="Coordinate safely" text="Use the conversation to agree on a public meeting point and practical details. You can block or report concerning behaviour."/></div><button className="button" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></section>}

      {page === 'safety' && <PolicyPage eyebrow="SAFETY IS A SHARED RESPONSIBILITY" title={<>Meet people.<br/><em>Keep your boundaries.</em></>} intro="Maria is designed to help people make real-world plans without giving up control over their privacy." sections={[['Before meeting','Meet in a public, staffed place. Tell someone you trust where you are going, arrange your own transport, and leave if a situation feels uncomfortable.'],['Your information','Do not share your home address, financial information, passwords, or live location with people you have just met. Only share details needed to coordinate the event.'],['Blocking and reporting','If someone makes you uncomfortable, stop responding and seek help if needed. The report and block controls in this preview are not yet connected to a live moderation system; do not rely on this prototype for active incident response.'],['Respect and consent','Respect boundaries, follow venue rules, and do not pressure anyone to share contact details or continue a conversation.']]}/>}
      {page === 'terms' && <PolicyPage eyebrow="LEGAL · DRAFT FOR REVIEW" title={<>Terms of<br/><em>Service.</em></>} intro="Last updated: 24 October 2026. This draft is a starting point, not legal advice or a final contract." sections={[['1. Service description','Maria is intended to help people discover events and connect with others interested in attending. Features, listings, and availability may change. The current website is a prototype and may display sample event data.'],['2. Eligibility and accounts','You must meet the minimum age and legal eligibility requirements applicable to the service in your location. Provide accurate account information, protect your credentials, and notify the service if you suspect unauthorized access. Age and identity verification are not implemented in this prototype.'],['3. Conduct','Do not harass, threaten, impersonate, defraud, stalk, or discriminate against other users. Do not publish unlawful content or misuse the service. We may restrict access when a lawful and appropriately implemented moderation process supports that action.'],['4. Events and third parties','Event details, ticket availability, venue rules, and external booking links must be checked with the organizer. Unless explicitly stated, Maria does not organize, operate, or guarantee third-party events.'],['5. Safety and disclaimers','Online profiles and interactions cannot guarantee another person’s identity or conduct. Use reasonable precautions when meeting people. The service is provided subject to applicable law; any limitations of liability must be reviewed by qualified counsel.'],['6. Changes and contact','Terms may be updated with appropriate notice where required by law. Add a monitored support contact and the operator’s legal identity before public launch.']]}/>}
      {page === 'privacy' && <PolicyPage eyebrow="LEGAL · DRAFT FOR REVIEW" title={<>Your privacy,<br/><em>your choice.</em></>} intro="This draft explains the intended approach. The actual data practices must be updated to match the production implementation." sections={[['Information collected','A production service may process account identifiers, profile information, event interests, matches, messages, safety reports, and basic security logs. Collect only what is needed for stated purposes.'],['How information is used','Data should be used to operate accounts, display events, enable user-requested connections, prevent abuse, and meet legal obligations. Do not claim that this prototype has production storage or retention controls.'],['Sharing and visibility','Do not expose private email addresses, precise location, messages, or safety reports publicly. Restrict internal access by role and document any service providers that process data.'],['Retention and deletion','Set and disclose retention periods for accounts, messages, security logs, and reports. Provide a usable account deletion and data-request process before launch.'],['Security and children','Use secure authentication, server-side authorization, least-privilege access, and protected secrets. Establish an age policy and safeguards appropriate to the intended audience and applicable law.'],['Operator and contact','Before launch, identify the legal operator, applicable jurisdiction, privacy contact, data processors, and a process for privacy requests. Obtain jurisdiction-specific legal review.']]}/>}
      {page === 'guidelines' && <PolicyPage eyebrow="COMMUNITY GUIDELINES" title={<>Make room<br/><em>for everyone.</em></>} intro="The community should make it easier to enjoy shared interests—not harder to feel safe." sections={[['Be respectful','Respect people’s boundaries, identity, time, and decision to decline a match or invitation.'],['Keep it genuine','Do not impersonate others, misrepresent event plans, spam users, or use the service to scam people.'],['No harassment','Threats, unwanted sexual attention, stalking, discriminatory abuse, and intimidation are not acceptable.'],['Protect privacy','Do not publish another person’s private details, screenshots, or location without permission.'],['Report concerns','Provide a clear reporting channel and a trained moderation process. In this prototype, reporting is only a UI demonstration and is not delivered to a moderation team.']]}/>}
      {(page === 'login' || page === 'signup') && <section className="auth-layout"><div className="auth-side"><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{page === 'signup' ? <>Meet your people.<br/><em>Make a memory.</em></> : <>Good to see<br/><em>you again.</em></>}</h1><p>Shared plans are a good place to start.</p><div className="auth-decoration"><Users size={26}/><span>Real interests. Real plans.</span></div></div><div className="auth-card"><div className="eyebrow">{page === 'signup' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div><h2>{page === 'signup' ? 'Join Maria' : 'Log in'}</h2><p className="muted">{page === 'signup' ? 'Start finding people for the things you love.' : 'Pick up where your plans left off.'}</p><form onSubmit={handleAuth}>{page === 'signup' && <label className="field-label">Your name<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" placeholder="How should we call you?" required maxLength={80}/></label>}<label className="field-label">Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label><label className="field-label">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={page === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required minLength={8} maxLength={128}/></label>{page === 'signup' && <p className="consent-note">By creating an account, you agree to the <a href="#terms">Terms of Service</a> and acknowledge the <a href="#privacy">Privacy Policy</a>.</p>}{authMessage && <p className="form-message" role="alert">{authMessage}</p>}<button className="button auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : page === 'signup' ? 'Create account' : 'Log in'} <ArrowRight size={16}/></button></form><p className="auth-switch">{page === 'signup' ? 'Already have an account?' : 'New to Maria?'} <a href={page === 'signup' ? '#login' : '#signup'}>{page === 'signup' ? 'Log in' : 'Create an account'}</a></p>{!supabase && <p className="demo-notice">Preview mode: real authentication requires Supabase environment configuration.</p>}</div></section>}

      {page === 'matches' && <section className="page-section narrow"><div className="eyebrow">YOUR MARIA LIST</div><h1 className="page-title">Plans you’ve<br/><em>kept close.</em></h1><p className="page-intro">Saved events live here on this preview. Sign-in, cross-device syncing, and real matches need the connected backend.</p>{saved.length ? <EventGrid items={displayedEvents.filter(e => saved.includes(e.id))} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/> : <div className="empty-state"><Heart size={27}/><h3>Your list is waiting</h3><p>Save an event to keep it here.</p><button className="button" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></div>}</section>}
      {page === 'profile' && <section className="page-section narrow"><div className="eyebrow">YOUR ACCOUNT</div><h1 className="page-title">Make it <em>you.</em></h1>{user ? <div className="profile-panel"><div className="profile-avatar">{(user.user_metadata?.full_name || user.email || 'M').slice(0,1).toUpperCase()}</div><h2>{user.user_metadata?.full_name || 'Maria member'}</h2><p>{user.email}</p><p className="muted">Profile editing, discovery preferences, account deletion, and production privacy controls need backend implementation before launch.</p><button className="button button-outline" onClick={signOut}>Sign out</button></div> : <div className="empty-state"><Users size={27}/><h3>Sign in to continue</h3><button className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div>}<div className="safety-callout"><ShieldCheck size={20}/><span>Review our <a href="#safety">safety guidance</a> before meeting anyone from an online service.</span></div></section>}
    </main>

    <footer className="site-footer"><div className="footer-top"><a className="brand footer-brand" href="#" onClick={e => {e.preventDefault();navigate('home')}}><span className="brand-mark">m.</span><span>maria</span></a><p>Make plans. Find your people.<br/>Go together.</p><button className="button button-light" onClick={() => navigate('events')}>Find a plan <ArrowRight size={15}/></button></div><div className="footer-bottom"><span>© 2026 Maria. Built around doing things together.</span><div><a href="#safety">Safety</a><a href="#guidelines">Guidelines</a><a href="#terms">Terms</a><a href="#privacy">Privacy</a></div><span className="preview-label">EARLY PREVIEW</span></div></footer>

    {selectedEvent && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) setSelectedEvent(null)}}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title"><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close event details"><X size={20}/></button><div className={'event-art modal-art ' + selectedEvent.color}><selectedEvent.icon size={42}/><span>{selectedEvent.category}</span></div><div className="modal-content"><div className="eyebrow">EVENT DETAILS</div><h2 id="event-modal-title">{selectedEvent.title}</h2><p>{selectedEvent.description}</p><div className="modal-meta"><span><CalendarDays size={17}/>{selectedEvent.date}</span><span><MapPin size={17}/>{selectedEvent.place}</span><span><Users size={17}/>{selectedEvent.people} interested</span></div><div className="modal-price">{selectedEvent.price}</div><div className="modal-actions"><button className="button" onClick={() => {toggleSave(selectedEvent.id);}}>{saved.includes(selectedEvent.id) ? <><Check size={16}/> Saved</> : <><Heart size={16}/> Save this event</>}</button>{selectedEvent.isLive ? <button className="button button-outline" disabled={joinBusy || joinedEventIds.includes(selectedEvent.id)} onClick={() => joinEvent(selectedEvent)}>{joinedEventIds.includes(selectedEvent.id) ? <><Check size={16}/> Interested</> : joinBusy ? 'Saving…' : <>Mark interest <ArrowRight size={16}/></>}</button> : <button className="button button-outline" onClick={() => {setSelectedEvent(null);navigate(user ? 'matches' : 'signup')}}>Find people <ArrowRight size={16}/></>}</div>{joinMessage && <p className="form-message" role="status">{joinMessage}</p>}{selectedEvent.bookingUrl && <p><a href={selectedEvent.bookingUrl} target="_blank" rel="noreferrer">Visit event details ↗</a></p>}<p className="demo-notice">{selectedEvent.isLive ? 'Published listing. Check the organizer’s details before attending.' : 'Sample listing only. Confirm event details with the organizer before making plans.'}</p></div></section></div>}
    {reporting && <div className="modal-backdrop"><section className="small-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" onClick={() => {setReporting(null);setReportSubmitted(false)}} aria-label="Close report"><X size={20}/></button><h2 id="report-title">Report a concern</h2>{reportSubmitted ? <><p>Your report preview was recorded only in this page state. No moderation team has been notified.</p><button className="button" onClick={() => {setReporting(null);setReportSubmitted(false)}}>Close</button></> : <><p>Choose the closest reason. Please do not include unnecessary sensitive details.</p><label className="field-label">Reason<select value={reportReason} onChange={e => setReportReason(e.target.value)}><option>Inappropriate behaviour</option><option>Harassment or threats</option><option>Fake profile or scam</option><option>Privacy concern</option><option>Other safety concern</option></select></label><button className="button" onClick={reportUser}>Submit report</button></>}</section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
    <button className="report-shortcut" onClick={() => {setReporting('community');setReportSubmitted(false)}} title="Report a safety concern"><ShieldCheck size={17}/><span>Safety</span></button>
  </div>;
}

function EventGrid({ items, onSelect, saved, onSave }) {
  return <div className="event-grid">{items.map(event => { const Icon = event.icon; return <article className="event-card" key={event.id}><button className={'event-art ' + event.color} onClick={() => onSelect(event)} aria-label={'View ' + event.title}><Icon size={35}/><span>{event.category}</span><span className="art-shape shape-one"/><span className="art-shape shape-two"/></button><div className="event-card-body"><div className="event-date">{event.date}</div><h3><button className="event-title-button" onClick={() => onSelect(event)}>{event.title}</button></h3><div className="event-place"><MapPin size={14}/>{event.place}</div><p className="event-desc">{event.description}</p><div className="event-card-bottom"><span className="event-price">{event.price}</span><button className={saved.includes(event.id) ? 'save-button saved' : 'save-button'} onClick={() => onSave(event.id)} aria-label={saved.includes(event.id) ? 'Remove saved event' : 'Save event'}><Heart size={17} fill={saved.includes(event.id) ? 'currentColor' : 'none'}/></button><button className="card-arrow" onClick={() => onSelect(event)} aria-label={'Details for ' + event.title}><ArrowRight size={17}/></button></div></div></article>;})}</div>;
}
function Step({ number, title, text }) { return <article className="step"><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>; }
function PolicyPage({ eyebrow, title, intro, sections }) { return <section className="page-section narrow policy-page"><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-intro">{intro}</p><div className="policy-sections">{sections.map(([heading, text]) => <article key={heading}><h3>{heading}</h3><p>{text}</p></article>)}</div><div className="safety-callout"><ShieldCheck size={20}/><span>This content is a starting point. Confirm that the final policy matches the live product and applicable law.</span></div></section>; }
