import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { recommendEvents } from './recommendations.js';
import { ArrowRight, CalendarDays, Check, ChevronDown, Compass, Heart, MapPin, Menu, MessageCircle, Music2, ShieldCheck, Sparkles, Users, X } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const events = [
  { id: 1, title: 'Indie Night Live', category: 'Music', date: 'Fri, 30 Oct · 7:30 PM', startsAt: '2026-10-30T19:30:00+05:30', place: 'The Courtyard, Delhi', people: 18, price: 'From ₹499', color: 'lavender', icon: Music2, description: 'An intimate live set for people who love discovering new sounds.' },
  { id: 2, title: 'Sunday Sketch Club', category: 'Art', date: 'Sun, 1 Nov · 11:00 AM', startsAt: '2026-11-01T11:00:00+05:30', place: 'Lodhi Art District, Delhi', people: 9, price: 'Free to join', color: 'peach', icon: Sparkles, description: 'Bring a sketchbook, meet local creatives, and make something together.' },
  { id: 3, title: 'Board Games & Chai', category: 'Social', date: 'Sat, 31 Oct · 4:00 PM', startsAt: '2026-10-31T16:00:00+05:30', place: 'Common Room, South Delhi', people: 12, price: 'Pay for your order', color: 'mint', icon: Users, description: 'Low-pressure games, conversation, and a table with room for one more.' },
  { id: 4, title: 'City Park Run', category: 'Outdoors', date: 'Sun, 1 Nov · 7:00 AM', startsAt: '2026-11-01T07:00:00+05:30', place: 'India Gate lawns, Delhi', people: 24, price: 'Free', color: 'sky', icon: Compass, description: 'A relaxed community run. Choose your pace and meet your crew.' },
  { id: 5, title: 'Film Lovers Meetup', category: 'Culture', date: 'Thu, 5 Nov · 6:30 PM', startsAt: '2026-11-05T18:30:00+05:30', place: 'India Habitat Centre, Delhi', people: 7, price: 'Ticket separate', color: 'rose', icon: CalendarDays, description: 'Find people to discuss the film with before and after the screening.' },
  { id: 6, title: 'Coffee & Conversation', category: 'Social', date: 'Sat, 7 Nov · 10:30 AM', startsAt: '2026-11-07T10:30:00+05:30', place: 'Neighbourhood Cafe, Delhi', people: 11, price: 'Pay for your order', color: 'butter', icon: MessageCircle, description: 'A small-group coffee hangout designed to make meeting people easier.' }
];
const categories = ['All events', 'Music', 'Art', 'Social', 'Outdoors', 'Culture'];
const interestOptions = ['Live music', 'Art & making', 'Comedy', 'Food & coffee', 'Board games', 'Films & culture', 'Walking & outdoors', 'Fitness & sports', 'Technology', 'Books & learning', 'Photography', 'Volunteering'];
const timeOptions = ['Weekday mornings', 'Weekday evenings', 'Weekend mornings', 'Weekend evenings'];

function getInitialPage() {
  const hash = window.location.hash.replace('#', '');
  return ['events', 'how-it-works', 'safety', 'terms', 'privacy', 'guidelines', 'login', 'signup', 'forgot-password', 'reset-password', 'matches', 'people', 'profile', 'quiz', 'submit-event', 'moderation'].includes(hash) ? hash : 'home';
}

export default function App() {
  const [page, setPage] = useState(getInitialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [category, setCategory] = useState('All events');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('any');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saved, setSaved] = useState([]);
  const [savedEventsLoaded, setSavedEventsLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [adultVerificationChecked, setAdultVerificationChecked] = useState(false);
  const [adultVerified, setAdultVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileData, setProfileData] = useState({ display_name: '', bio: '', city: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [accountDeletionOpen, setAccountDeletionOpen] = useState(false);
  const [accountDeletionPassword, setAccountDeletionPassword] = useState('');
  const [accountDeletionConfirmation, setAccountDeletionConfirmation] = useState('');
  const [accountDeletionBusy, setAccountDeletionBusy] = useState(false);
  const [accountDeletionError, setAccountDeletionError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('inappropriate_content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEventId, setReportEventId] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
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
  const [quizInterests, setQuizInterests] = useState([]);
  const [quizSocialStyle, setQuizSocialStyle] = useState('small_groups');
  const [quizGroupSize, setQuizGroupSize] = useState('small');
  const [quizTimes, setQuizTimes] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizMessage, setQuizMessage] = useState('');
  const [submissionForm, setSubmissionForm] = useState({title:'',description:'',category:'Music',venue_name:'',city:'Delhi NCR',starts_at:'',ends_at:'',booking_url:''});
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [mySubmissions, setMySubmissions] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [moderationBusyId, setModerationBusyId] = useState('');
  const [moderationMessage, setModerationMessage] = useState('');
  const [safetyReports, setSafetyReports] = useState([]);
  const [reportModerationMessage, setReportModerationMessage] = useState('');
  const [reportModerationBusyId, setReportModerationBusyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAdminState() {
      if (!supabase || !user) {
        setIsAdmin(false);
        setModerationQueue([]);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const admin = !profileError && profile?.is_admin === true;
      setIsAdmin(admin);
      if (!admin) {
        setModerationQueue([]);
        return;
      }
      const { data: submissions, error: submissionsError } = await supabase
        .from('event_submissions')
        .select('id,title,description,category,venue_name,city,starts_at,ends_at,booking_url,created_at,status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100);
      if (cancelled) return;
      if (submissionsError) {
        setModerationMessage('Could not load the event review queue. Check admin access and try again.');
        setModerationQueue([]);
        return;
      }
      setModerationQueue(submissions || []);
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('id,reporter_id,reported_user_id,event_id,message_id,reason,details,status,created_at')
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: true })
        .limit(100);
      if (cancelled) return;
      if (reportsError) {
        setSafetyReports([]);
        setReportModerationMessage('Could not load safety reports. Check admin access and try again.');
      } else {
        setSafetyReports(reports || []);
        setReportModerationMessage('');
      }
      setModerationMessage('');
    }
    loadAdminState();
    return () => { cancelled = true; };
  }, [user?.id, page]);

  useEffect(() => {
    const onHash = () => { setPage(getInitialPage()); setMobileOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#reset-password`);
          setPage('reset-password');
        }
      });
      return () => { window.removeEventListener('hashchange', onHash); data.subscription.unsubscribe(); };
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAdultEligibility() {
      if (!supabase || !user) {
        setAdultVerified(false);
        setAdultVerificationChecked(true);
        return;
      }
      setAdultVerificationChecked(false);
      setAdultVerified(false);
      try {
        const { data, error } = await supabase.from('profiles')
          .select('is_adult_verified')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled) setAdultVerified(!error && data?.is_adult_verified === true);
      } catch {
        if (!cancelled) setAdultVerified(false);
      } finally {
        if (!cancelled) setAdultVerificationChecked(true);
      }
    }
    loadAdultEligibility();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!supabase || !user) {
        setProfileData({ display_name: '', bio: '', city: '' });
        setProfileLoading(false);
        setProfileMessage('');
        return;
      }
      setProfileLoading(true);
      setProfileMessage('');
      try {
        const { data, error } = await supabase.from('profiles')
          .select('display_name,bio,city')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data) throw new Error('Your profile is not available yet. Sign out and back in, then try again.');
        setProfileData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          city: data.city || ''
        });
      } catch (error) {
        if (!cancelled) setProfileMessage(error.message || 'Could not load your profile.');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [user?.id]);


  useEffect(() => {
    let cancelled = false;
    async function loadUserPreferences() {
      if (!supabase || !user) {
        setQuizInterests([]); setQuizSocialStyle('small_groups'); setQuizGroupSize('small'); setQuizTimes([]); setQuizLoading(false); setMySubmissions([]);
        return;
      }
      setQuizLoading(true);
      const [preferences, submissions] = await Promise.all([
        supabase.from('user_match_preferences').select('interests,social_style,group_size,preferred_times').eq('user_id', user.id).maybeSingle(),
        supabase.from('event_submissions').select('id,title,city,starts_at,status,created_at').eq('submitted_by', user.id).order('created_at', {ascending:false}).limit(20)
      ]);
      if (cancelled) return;
      if (preferences.data) {
        setQuizInterests(preferences.data.interests || []);
        setQuizSocialStyle(preferences.data.social_style || 'small_groups');
        setQuizGroupSize(preferences.data.group_size || 'small');
        setQuizTimes(preferences.data.preferred_times || []);
      }
      if (submissions.data) setMySubmissions(submissions.data);
      setQuizLoading(false);
    }
    loadUserPreferences();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadSavedEvents() {
      if (!supabase || !user) {
        setSaved([]);
        setSavedEventsLoaded(true);
        return;
      }
      setSavedEventsLoaded(false);
      const { data, error } = await supabase.from('saved_events')
        .select('event_id')
        .eq('user_id', user.id);
      if (cancelled) return;
      if (error) {
        setSaved([]);
        setToast('Your saved list could not be loaded. Please refresh and try again.');
      } else {
        setSaved((data || []).map(row => row.event_id));
      }
      setSavedEventsLoaded(true);
    }
    loadSavedEvents();
    return () => { cancelled = true; };
  }, [user?.id]);

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
          startsAt: row.starts_at,
          place: [row.venue_name, row.city].filter(Boolean).join(', '),
          people: 0, price: row.booking_url ? 'See event details' : 'Check with organizer',
          color: colors[hash % colors.length], icon,
          description: row.description || 'Meet people interested in attending this event.',
          bookingUrl: row.booking_url, isLive: true
        };
      }));
    }
    loadEvents();
    const channel = supabase.channel('published-events-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (!cancelled) loadEvents();
      })
      .subscribe();
    const refreshInterval = window.setInterval(() => {
      if (!cancelled) loadEvents();
    }, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user || !adultVerificationChecked || !adultVerified) { setJoinedEventIds([]); return; }
    let cancelled = false;
    supabase.from('event_participants').select('event_id').eq('user_id', user.id).neq('status', 'cancelled')
      .then(({ data, error }) => {
        if (!cancelled && !error) setJoinedEventIds((data || []).map(row => row.event_id));
      });
    return () => { cancelled = true; };
  }, [user?.id, adultVerificationChecked, adultVerified]);

  useEffect(() => {
    if (page !== 'people' || !user || !adultVerificationChecked || !adultVerified) return;
    const eligibleEventIds = liveEvents
      .filter(item => joinedEventIds.includes(item.id))
      .map(item => item.id);
    if (discoveryEventId && eligibleEventIds.includes(discoveryEventId)) return;
    setDiscoveryEventId(eligibleEventIds[0] || '');
  }, [page, user?.id, discoveryEventId, joinedEventIds, liveEvents]);

  useEffect(() => {
    if (page !== 'people' || !supabase || !user || !adultVerificationChecked || !adultVerified || !discoveryEventId) {
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
  }, [page, user?.id, discoveryEventId, adultVerificationChecked, adultVerified]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const displayedEvents = liveEvents.length > 0 ? liveEvents : events;
  const joinedLiveEvents = liveEvents.filter(event => joinedEventIds.includes(event.id));
  const filteredEvents = useMemo(() => displayedEvents.filter(event =>
    (category === 'All events' || event.category === category) &&
    (event.title + ' ' + event.place + ' ' + event.category).toLowerCase().includes(search.toLowerCase()) &&
    (dateRange === 'any' || (event.startsAt && new Date(event.startsAt) >= new Date() && new Date(event.startsAt) <= new Date(Date.now() + (dateRange === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000)))
  ), [displayedEvents, category, search, dateRange]);

  function navigate(next) { window.location.hash = next === 'home' ? '' : next; setPage(next); setMobileOpen(false); setSelectedEvent(null); window.scrollTo(0, 0); }
  async function toggleSave(id) {
    const wasSaved = saved.includes(id);
    const eventItem = displayedEvents.find(item => item.id === id);
    if (eventItem?.isLive && supabase && user) {
      const result = wasSaved
        ? await supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', id)
        : await supabase.from('saved_events').insert({ user_id: user.id, event_id: id });
      if (result.error) {
        setToast('Could not update your saved list. Please try again.');
        return;
      }
    }
    setSaved(previous => wasSaved ? previous.filter(item => item !== id) : [...previous, id]);
    setToast(eventItem?.isLive && !user
      ? (wasSaved ? 'Removed from this preview.' : 'Saved in this preview. Log in to sync published events.')
      : (wasSaved ? 'Removed from your list.' : 'Saved to your list.'));
  }
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
    if (!adultVerificationChecked) {
      setJoinMessage('Checking account eligibility. Please try again shortly.');
      return;
    }
    if (!adultVerified) {
      setJoinMessage('Event participation is unavailable until a trusted adult-eligibility verification workflow is live. No self-declared age or profile setting can enable access.');
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

  async function saveMatchPreferences(event) {
    event.preventDefault(); setQuizMessage('');
    if (!user || !supabase) { setQuizMessage('Log in to save your preferences to your account.'); return; }
    if (quizInterests.length < 2) { setQuizMessage('Choose at least two interests.'); return; }
    setQuizSaving(true);
    try {
      const { error } = await supabase.from('user_match_preferences').upsert({user_id:user.id,interests:quizInterests,social_style:quizSocialStyle,group_size:quizGroupSize,preferred_times:quizTimes},{onConflict:'user_id'});
      if (error) throw error;
      setQuizMessage('Preferences saved. These currently personalize event suggestions; person-to-person ranking is not enabled.');
    } catch (error) { setQuizMessage(error.message || 'Could not save preferences.'); }
    finally { setQuizSaving(false); }
  }

  async function submitEvent(event) {
    event.preventDefault(); setSubmissionMessage('');
    if (!user || !supabase) { setSubmissionMessage('Log in to submit an event.'); return; }
    const start = new Date(submissionForm.starts_at);
    const end = submissionForm.ends_at ? new Date(submissionForm.ends_at) : null;
    if (Number.isNaN(start.getTime()) || start <= new Date()) { setSubmissionMessage('Choose a valid future start date and time.'); return; }
    if (end && (Number.isNaN(end.getTime()) || end <= start)) { setSubmissionMessage('End time must be later than the start time.'); return; }
    if (submissionForm.booking_url && !submissionForm.booking_url.toLowerCase().startsWith('https://')) { setSubmissionMessage('Booking links must start with https://'); return; }
    setSubmissionBusy(true);
    try {
      const payload = {submitted_by:user.id,title:submissionForm.title.trim(),description:submissionForm.description.trim(),category:submissionForm.category,venue_name:submissionForm.venue_name.trim(),city:submissionForm.city.trim(),starts_at:start.toISOString(),ends_at:end ? end.toISOString() : null,booking_url:submissionForm.booking_url.trim() || null};
      const {data,error}=await supabase.from('event_submissions').insert(payload).select('id,title,city,starts_at,status,created_at').single();
      if(error) throw error;
      setMySubmissions(previous=>[data,...previous].slice(0,20));
      setSubmissionForm({title:'',description:'',category:'Music',venue_name:'',city:'Delhi NCR',starts_at:'',ends_at:'',booking_url:''});
      setSubmissionMessage('Submitted for review. Your event will not appear publicly until an authorized moderator approves it.');
    } catch(error) { setSubmissionMessage(error.message || 'Could not submit this event. Please try again.'); }
    finally { setSubmissionBusy(false); }
  }


  async function updateSafetyReport(report, status) {
    if (!supabase || !user || !isAdmin || reportModerationBusyId) return;
    setReportModerationBusyId(report.id);
    setReportModerationMessage('');
    try {
      const update = { status, resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null };
      const { error } = await supabase.from('reports').update(update).eq('id', report.id);
      if (error) throw error;
      setSafetyReports(current => status === 'reviewing'
        ? current.map(item => item.id === report.id ? { ...item, ...update } : item)
        : current.filter(item => item.id !== report.id));
      setReportModerationMessage(status === 'reviewing' ? 'Report marked as under review.' : 'Report closed.');
    } catch (error) {
      setReportModerationMessage(error.message || 'Could not update this report.');
    } finally {
      setReportModerationBusyId('');
    }
  }

  async function reviewSubmission(item, status) {
    if (!supabase || !user || !isAdmin) return;
    const note = window.prompt(status === 'approved' ? 'Optional moderator note for approval:' : 'Reason for rejecting this submission:');
    if (note === null) return;
    if (status === 'rejected' && !note.trim()) { setModerationMessage('Add a short reason before rejecting.'); return; }
    setModerationBusyId(item.id); setModerationMessage('');
    try {
      const { error } = await supabase.from('event_submissions').update({
        status, moderator_notes: note.trim() || null, reviewed_by: user.id, reviewed_at: new Date().toISOString()
      }).eq('id', item.id).eq('status','pending');
      if (error) throw error;
      setModerationQueue(current => current.filter(entry => entry.id !== item.id));
      setModerationMessage(status === 'approved'
        ? 'Submission approved and published to the public event feed.'
        : 'Submission rejected and removed from the pending queue.');
    } catch (error) { setModerationMessage(error.message || 'Could not update this submission.'); }
    finally { setModerationBusyId(''); }
  }

  async function handleSwipe(person, action) {
    if (!user) { navigate('login'); return; }
    if (!adultVerificationChecked || !adultVerified) {
      setSwipeNotice('Attendee discovery is paused until a trusted adult-eligibility verification workflow is live.');
      return;
    }
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
  async function requestPasswordReset(event) {
    event.preventDefault();
    setAuthMessage('');
    if (!email.trim()) {
      setAuthMessage('Enter the email address associated with your account.');
      return;
    }
    if (!supabase) {
      setAuthMessage('Password recovery requires a connected Supabase project.');
      return;
    }
    setAuthBusy(true);
    try {
      // Return to the app origin without a hash; Supabase puts recovery tokens
      // in the callback URL and emits PASSWORD_RECOVERY once the session is established.
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setAuthMessage('If an account exists for that address, a password-reset link will arrive by email. Open it to choose a new password.');
    } catch (error) {
      setAuthMessage(error.message || 'Could not request a password reset. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateRecoveredPassword(event) {
    event.preventDefault();
    setAuthMessage('');
    if (password.length < 8) {
      setAuthMessage('Use a password with at least 8 characters.');
      return;
    }
    if (password !== recoveryPasswordConfirm) {
      setAuthMessage('The passwords do not match.');
      return;
    }
    if (!supabase) {
      setAuthMessage('Password recovery requires a connected Supabase project.');
      return;
    }
    setAuthBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error('Open this page from the password-reset link sent to your email first.');
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setRecoveryPasswordConfirm('');
      navigate('profile');
      setToast('Your password has been updated.');
    } catch (error) {
      setAuthMessage(error.message || 'Could not update your password. Request a fresh reset link and try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); setUser(null); navigate('home'); setToast('You have signed out.'); }
  async function deleteAccount(event) {
    event.preventDefault();
    setAccountDeletionError('');
    if (!user?.email || !supabase) {
      setAccountDeletionError('Sign in to a connected account before deleting it.');
      return;
    }
    if (accountDeletionConfirmation !== 'DELETE') {
      setAccountDeletionError('Type DELETE exactly to confirm permanent deletion.');
      return;
    }
    if (!accountDeletionPassword) {
      setAccountDeletionError('Enter your current password to verify it is you.');
      return;
    }

    setAccountDeletionBusy(true);
    try {
      const { data: reauthData, error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: accountDeletionPassword
      });
      if (reauthError || reauthData.user?.id !== user.id) {
        throw new Error('Password verification failed. Check your current password and try again.');
      }

      const { data: deletionData, error: deletionError } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: accountDeletionConfirmation }
      });
      if (deletionError) {
        let message = deletionError.message || 'The account could not be deleted.';
        try {
          const context = deletionError.context;
          if (context && typeof context.clone === 'function') {
            const payload = await context.clone().json();
            if (typeof payload?.error === 'string') message = payload.error;
          }
        } catch {
          // Keep the non-sensitive fallback message.
        }
        throw new Error(message);
      }
      if (deletionData?.deleted !== true) {
        throw new Error('Maria did not confirm the account deletion. Please try again or contact support.');
      }

      await supabase.auth.signOut({ scope: 'local' });
      setAccountDeletionOpen(false);
      setAccountDeletionPassword('');
      setAccountDeletionConfirmation('');
      setUser(null);
      setSaved([]);
      setJoinedEventIds([]);
      setDiscoveryPeople([]);
      setProfileData({ display_name: '', bio: '', city: '' });
      navigate('home');
      setToast('Your Maria account has been deleted.');
    } catch (error) {
      setAccountDeletionError(error.message || 'Account deletion failed. Please try again.');
    } finally {
      setAccountDeletionBusy(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMessage('');
    if (!user || !supabase) {
      setProfileMessage('Sign in with a connected account to update your profile.');
      return;
    }
    const displayName = profileData.display_name.trim();
    const bio = profileData.bio.trim();
    const city = profileData.city.trim();
    if (!displayName) {
      setProfileMessage('Enter a display name.');
      return;
    }
    if (displayName.length > 60 || bio.length > 500 || city.length > 100) {
      setProfileMessage('Check the field length limits and try again.');
      return;
    }
    setProfileSaving(true);
    try {
      const { data, error } = await supabase.from('profiles')
        .update({
          display_name: displayName,
          bio,
          city: city || null
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No profile row was updated. Try signing out and back in.');
      setProfileData({ display_name: displayName, bio, city });
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error.message || 'Could not save your profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  function openReport(context = { type: 'event' }) {
    setReporting(context);
    setReportReason('inappropriate_content');
    setReportDetails('');
    setReportEventId('');
    setReportError('');
    setReportSubmitted(false);
  }
  function closeReport() {
    setReporting(null);
    setReportError('');
    setReportDetails('');
    setReportSubmitted(false);
  }
  async function reportUser() {
    if (!user) { navigate('login'); setToast('Sign in to submit a report.'); return; }
    if (!supabase) {
      setReportError('Report submission requires a connected, signed-in account. No report was sent.');
      return;
    }
    const target = reporting?.type === 'user' && reporting.id
      ? { reported_user_id: reporting.id }
      : { event_id: reporting?.id || reportEventId };
    if (!target.reported_user_id && !target.event_id) {
      setReportError('Choose a published event to attach this report to.');
      return;
    }
    const selectedEvent = target.event_id
      ? liveEvents.find(item => item.id === target.event_id)
      : null;
    if (target.event_id && reporting?.id == null && !selectedEvent) {
      setReportError('Choose a published event, not a sample preview listing.');
      return;
    }
    setReportBusy(true);
    setReportError('');
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        ...target,
        reason: reportReason,
        details: reportDetails.trim()
      });
      if (error) throw error;
      setReportSubmitted(true);
    } catch (error) {
      setReportError(error.message || 'Could not submit the report. Please try again.');
    } finally {
      setReportBusy(false);
    }
  }

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('home'); }} aria-label="Maria home"><span className="brand-mark">m.</span><span>maria</span></a>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      <nav className={mobileOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        <a href="#events" className={page === 'events' ? 'active' : ''}>Explore events</a>
        <a href="#people" className={page === 'people' ? 'active' : ''}>Meet people</a>
        <a href="#quiz" className={page === 'quiz' ? 'active' : ''}>Match quiz</a>
        <a href="#submit-event" className={page === 'submit-event' ? 'active' : ''}>Submit an event</a>\n        {isAdmin && <a href="#moderation" className={page === 'moderation' ? 'active' : ''}>Review events</a>}
        <a href="#how-it-works" className={page === 'how-it-works' ? 'active' : ''}>How it works</a>
        <a href="#safety" className={page === 'safety' ? 'active' : ''}>Safety</a>
        {user ? <><a href="#matches">My list <span className="count">{saved.length}</span></a><button className="nav-login" onClick={signOut}>Sign out</button></> : <><a href="#login" className="nav-login">Log in</a><a href="#signup" className="button button-small">Get started <ArrowRight size={15}/></a></>}
      </nav>
    </header>

    <main>
      {page === 'home' && <><section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR PLANS, YOUR PEOPLE</div><h1>Good things<br/>are better <em>together.</em></h1><p className="hero-text">Find your people for the things you want to do. Discover events, meet people who are going too, and make a plan together.</p><div className="hero-actions"><button className="button" onClick={() => navigate('events')}>Find your next plan <ArrowRight size={17}/></button><button className="text-button" onClick={() => navigate('how-it-works')}>How Maria works <span>↗</span></button></div><div className="hero-note"><span className="avatar-stack"><i>A</i><i>R</i><i>M</i><i>+</i></span><span>Less scrolling. More doing.</span></div></div>
        <div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="photo-card card-back"><div className="photo-sun"/><div className="photo-hills"/><span>FIND YOUR SCENE</span></div><div className="photo-card card-front"><div className="concert-lights"><i/><i/><i/><i/></div><div className="concert-crowd"><i/><i/><i/><i/><i/><i/></div><div className="photo-caption"><span>FRIDAY NIGHT</span><strong>Live music, new friends.</strong></div></div><div className="floating-tag tag-top"><span className="tag-icon"><Users size={16}/></span><span><strong>Your kind of people</strong><small>Going to the same event</small></span></div><div className="floating-tag tag-bottom"><span className="match-heart"><Heart size={16} fill="currentColor"/></span><span><strong>It's a mutual!</strong><small>Your plan starts here</small></span></div><div className="sparkle sparkle-one">✳</div><div className="sparkle sparkle-two">✦</div></div>
      </section><section className="trust-strip"><div><ShieldCheck size={18}/><span>Adults-only social features</span></div><span className="strip-divider"/><div><Users size={18}/><span>Friendship-first by design</span></div><span className="strip-divider"/><div><MapPin size={18}/><span>Plans that happen in real life</span></div></section><section className="section featured"><div className="section-heading"><div><div className="eyebrow">MAKE A PLAN</div><h2>Something good is happening.</h2><p>Find an event. Find your people. Go together.</p></div><button className="text-button" onClick={() => navigate('events')}>Explore all events <ArrowRight size={16}/></button></div><EventGrid items={displayedEvents.slice(0,3)} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/></section><section className="how-band"><div className="eyebrow">NO AWKWARD GUESSWORK</div><h2>From “I want to go”<br/>to “see you there.”</h2><div className="steps"><Step number="01" title="Find your thing" text="Explore local events that you'd genuinely enjoy."/><Step number="02" title="Meet your people" text="See who's interested and connect around a shared plan."/><Step number="03" title="Make it happen" text="Chat, coordinate, and head out with your new crew."/></div><button className="button button-light" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></section></>}



      {page === 'moderation' && <section className="page-section narrow">
        <div className="eyebrow">ADMINISTRATION</div><h1 className="page-title">Event <em>review queue.</em></h1>
        {!user ? <div className="empty-state"><h3>Sign in with an authorized admin account</h3><button className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div> : !isAdmin ? <div className="empty-state"><ShieldCheck size={27}/><h3>Administrator access required</h3><p>Only accounts explicitly marked as administrators can access this queue.</p></div> : <>
          <p className="page-intro">Review community-submitted events before publication. Approved submissions are published automatically after the review decision is saved.</p>
          {moderationMessage && <p className="form-message" role="status">{moderationMessage}</p>}
          {moderationQueue.length ? <div className="submission-list">{moderationQueue.map(item=><article className="moderation-card" key={item.id}>
            <div className="eyebrow">{item.category} · Submitted {new Date(item.created_at).toLocaleDateString()}</div><h2>{item.title}</h2><p>{item.description}</p><p className="muted">{item.venue_name}, {item.city} · {new Date(item.starts_at).toLocaleString()}</p>{item.ends_at && <p className="muted">Ends {new Date(item.ends_at).toLocaleString()}</p>}{item.booking_url && <p><a href={item.booking_url} target="_blank" rel="noreferrer">Open event source ↗</a></p>}
            <div className="moderation-actions"><button className="button" disabled={!!moderationBusyId} onClick={()=>reviewSubmission(item,'approved')}>Approve</button><button className="button button-outline" disabled={!!moderationBusyId} onClick={()=>reviewSubmission(item,'rejected')}>Reject</button></div>
          </article>)}</div> : <div className="empty-state"><Check size={27}/><h3>Queue is clear</h3><p>No pending event submissions.</p></div>}
          <div className="section-heading" style={{marginTop:'3rem'}}><div><div className="eyebrow">SAFETY</div><h2>Safety reports</h2><p>Reports are visible to authorized administrators only. Handle details confidentially.</p></div></div>
          {reportModerationMessage && <p className="form-message" role="status">{reportModerationMessage}</p>}
          {safetyReports.length ? <div className="submission-list">{safetyReports.map(report=><article className="moderation-card" key={report.id}>
            <div className="eyebrow">{report.reason.replaceAll('_',' ')} · {report.status} · {new Date(report.created_at).toLocaleString()}</div>
            <p>{report.details || 'No additional details supplied.'}</p>
            <p className="muted">Report ID: {report.id} · Target: {report.reported_user_id ? 'profile' : report.event_id ? 'event' : 'message'}</p>
            <div className="moderation-actions"><button className="button button-outline" disabled={!!reportModerationBusyId} onClick={()=>updateSafetyReport(report,'reviewing')}>Mark reviewing</button><button className="button" disabled={!!reportModerationBusyId} onClick={()=>updateSafetyReport(report,'resolved')}>Resolve</button><button className="button button-outline" disabled={!!reportModerationBusyId} onClick={()=>updateSafetyReport(report,'dismissed')}>Dismiss</button></div>
          </article>)}</div> : <div className="empty-state"><ShieldCheck size={27}/><h3>No open safety reports</h3><p>New reports will appear here when submitted.</p></div>}
        </>}
      </section>}
\n      {page === 'submit-event' && <section className="page-section narrow">
        <div className="eyebrow">COMMUNITY EVENT SUBMISSIONS</div><h1 className="page-title">Know something <em>happening?</em></h1>
        <p className="page-intro">Submit a public event for review. Submissions stay private until an authorized moderator approves them.</p>
        {!user ? <div className="empty-state"><h3>Log in to submit an event</h3><button className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div> : <form className="quiz-panel" onSubmit={submitEvent}>
          <label className="field-label">Event title<input required minLength={5} maxLength={160} value={submissionForm.title} onChange={e=>setSubmissionForm({...submissionForm,title:e.target.value})} /></label>
          <label className="field-label">Description<textarea required minLength={10} maxLength={3000} rows={4} value={submissionForm.description} onChange={e=>setSubmissionForm({...submissionForm,description:e.target.value})} /></label>
          <label className="field-label">Category<select required value={submissionForm.category} onChange={e=>setSubmissionForm({...submissionForm,category:e.target.value})}>{['Music','Art','Social','Outdoors','Culture','Food','Comedy','Workshops','Other'].map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="field-label">Venue<input required minLength={2} maxLength={160} value={submissionForm.venue_name} onChange={e=>setSubmissionForm({...submissionForm,venue_name:e.target.value})} /></label>
          <label className="field-label">City<input required minLength={2} maxLength={100} value={submissionForm.city} onChange={e=>setSubmissionForm({...submissionForm,city:e.target.value})} /></label>
          <label className="field-label">Starts at<input type="datetime-local" required value={submissionForm.starts_at} onChange={e=>setSubmissionForm({...submissionForm,starts_at:e.target.value})}/></label>
          <label className="field-label">Ends at (optional)<input type="datetime-local" value={submissionForm.ends_at} onChange={e=>setSubmissionForm({...submissionForm,ends_at:e.target.value})}/></label>
          <label className="field-label">Official event link (optional)<input type="url" placeholder="https://…" value={submissionForm.booking_url} onChange={e=>setSubmissionForm({...submissionForm,booking_url:e.target.value})}/></label>
          {submissionMessage && <p className="form-message" role="status">{submissionMessage}</p>}
          <button className="button" disabled={submissionBusy}>{submissionBusy?'Submitting…':'Submit for review'} <ArrowRight size={16}/></button>
        </form>}
        {user && <div className="quiz-results"><h2>Your submissions</h2>{mySubmissions.length ? <div className="submission-list">{mySubmissions.map(item=><article className="submission-row" key={item.id}><div><strong>{item.title}</strong><p>{item.city} · {new Date(item.starts_at).toLocaleString()}</p></div><span className={'submission-status '+item.status}>{item.status}</span></article>)}</div> : <p className="muted">You have not submitted any events yet.</p>}</div>}
      </section>}

      {page === 'events' && <section className="page-section"><div className="eyebrow">YOUR CITY, YOUR SCENE</div><h1 className="page-title">Find something<br/><em>worth going to.</em></h1><p className="page-intro">Discover and save real events. Attendee participation is reserved for adults after trusted eligibility verification is available.</p><div className="event-tools"><label className="search-box"><Compass size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events or places" aria-label="Search events or places"/><span>⌘ K</span></label><div className="discovery-controls"><label className="date-filter">When<select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Filter events by date"><option value="any">Any time</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option></select></label><div className="filter-row">{categories.map(item => <button key={item} className={category === item ? 'filter-chip selected' : 'filter-chip'} onClick={() => setCategory(item)}>{item}</button>)}</div></div></div>{!liveEvents.length && <div className="demo-notice" role="status">{eventsLoadError ? 'Live event data could not be loaded. The listings below are sample previews.' : 'No verified live event listings are available yet. The listings below are sample previews, not real event announcements.'}</div>}{filteredEvents.length ? <EventGrid items={filteredEvents} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/> : <div className="empty-state"><Compass size={28}/><h3>No events found</h3><p>Try a different search or category.</p><button className="text-button" onClick={() => {setSearch('');setCategory('All events');setDateRange('any');}}>Clear filters</button></div>}{eventsLoadError && <p className="demo-notice" role="status">{eventsLoadError}</p>}<p className="demo-notice">{liveEvents.length ? 'Showing published event listings. Confirm details with the organizer before making plans.' : 'Preview events are sample content for the prototype, not verified live listings.'}</p></section>}

      {page === 'how-it-works' && <section className="page-section narrow"><div className="eyebrow">SIMPLE BY DESIGN</div><h1 className="page-title">A plan is better<br/><em>with your people.</em></h1><p className="page-intro">Maria connects people through a shared interest in doing something offline—not endless swiping.</p><div className="feature-list"><Step number="01" title="Pick an event" text="Browse activities, culture, music, food, and local experiences. Choose something you actually want to do."/><Step number="02" title="Find people going too" text="Discover other interested attendees. Matching is tied to the event so the reason to connect is clear."/><Step number="03" title="Connect by choice" text="Send interest and connect when it is mutual. You control what you share and who can contact you."/><Step number="04" title="Coordinate safely" text="Use the conversation to agree on a public meeting point and practical details. You can block or report concerning behaviour."/></div><button className="button" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></section>}

      {page === 'safety' && <PolicyPage eyebrow="SAFETY IS A SHARED RESPONSIBILITY" title={<>Meet people.<br/><em>Keep your boundaries.</em></>} intro="Maria is designed to help people make real-world plans without giving up control over their privacy." sections={[['Before meeting','Meet in a public, staffed place. Tell someone you trust where you are going, arrange your own transport, and leave if a situation feels uncomfortable.'],['Your information','Do not share your home address, financial information, passwords, or live location with people you have just met. Only share details needed to coordinate the event.'],['Blocking and reporting','If someone makes you uncomfortable, stop responding and seek help if needed. The report and block controls in this preview are not yet connected to a live moderation system; do not rely on this prototype for active incident response.'],['Respect and consent','Respect boundaries, follow venue rules, and do not pressure anyone to share contact details or continue a conversation.']]}/>}
      {page === 'terms' && <PolicyPage eyebrow="LEGAL · DRAFT FOR REVIEW" title={<>Terms of<br/><em>Service.</em></>} intro="Last updated: 24 October 2026. This draft is a starting point, not legal advice or a final contract." sections={[['1. Service description','Maria is intended to help people discover events and connect with others interested in attending. Features, listings, and availability may change. The current website is a prototype and may display sample event data.'],['2. Eligibility and accounts','You must meet the minimum age and legal eligibility requirements applicable to the service in your location. Provide accurate account information, protect your credentials, and notify the service if you suspect unauthorized access. Age and identity verification are not implemented in this prototype.'],['3. Conduct','Do not harass, threaten, impersonate, defraud, stalk, or discriminate against other users. Do not publish unlawful content or misuse the service. We may restrict access when a lawful and appropriately implemented moderation process supports that action.'],['4. Events and third parties','Event details, ticket availability, venue rules, and external booking links must be checked with the organizer. Unless explicitly stated, Maria does not organize, operate, or guarantee third-party events.'],['5. Safety and disclaimers','Online profiles and interactions cannot guarantee another person’s identity or conduct. Use reasonable precautions when meeting people. The service is provided subject to applicable law; any limitations of liability must be reviewed by qualified counsel.'],['6. Changes and contact','Terms may be updated with appropriate notice where required by law. Add a monitored support contact and the operator’s legal identity before public launch.']]}/>}
      {page === 'privacy' && <PolicyPage eyebrow="LEGAL · DRAFT FOR REVIEW" title={<>Your privacy,<br/><em>your choice.</em></>} intro="This draft explains the intended approach. The actual data practices must be updated to match the production implementation." sections={[['Information collected','A production service may process account identifiers, profile information, event interests, matches, messages, safety reports, and basic security logs. Collect only what is needed for stated purposes.'],['How information is used','Data should be used to operate accounts, display events, enable user-requested connections, prevent abuse, and meet legal obligations. Do not claim that this prototype has production storage or retention controls.'],['Sharing and visibility','Do not expose private email addresses, precise location, messages, or safety reports publicly. Restrict internal access by role and document any service providers that process data.'],['Retention and deletion','Set and disclose retention periods for accounts, messages, security logs, and reports. Provide a usable account deletion and data-request process before launch.'],['Security and children','Use secure authentication, server-side authorization, least-privilege access, and protected secrets. Establish an age policy and safeguards appropriate to the intended audience and applicable law.'],['Operator and contact','Before launch, identify the legal operator, applicable jurisdiction, privacy contact, data processors, and a process for privacy requests. Obtain jurisdiction-specific legal review.']]}/>}
      {page === 'guidelines' && <PolicyPage eyebrow="COMMUNITY GUIDELINES" title={<>Make room<br/><em>for everyone.</em></>} intro="The community should make it easier to enjoy shared interests—not harder to feel safe." sections={[['Be respectful','Respect people’s boundaries, identity, time, and decision to decline a match or invitation.'],['Keep it genuine','Do not impersonate others, misrepresent event plans, spam users, or use the service to scam people.'],['No harassment','Threats, unwanted sexual attention, stalking, discriminatory abuse, and intimidation are not acceptable.'],['Protect privacy','Do not publish another person’s private details, screenshots, or location without permission.'],['Report concerns','Provide a clear reporting channel and a trained moderation process. In this prototype, reporting is only a UI demonstration and is not delivered to a moderation team.']]}/>}
      {['login', 'signup', 'forgot-password', 'reset-password'].includes(page) && <section className="auth-layout"><div className="auth-side"><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{page === 'signup' ? <>Meet your people.<br/><em>Make a memory.</em></> : page === 'forgot-password' ? <>Get back<br/><em>to your plans.</em></> : page === 'reset-password' ? <>A fresh start.<br/><em>New password.</em></> : <>Good to see<br/><em>you again.</em></>}</h1><p>{page === 'signup' ? 'Start with things you love doing.' : page === 'forgot-password' ? 'We will send a secure reset link if an account matches that email.' : page === 'reset-password' ? 'Choose a strong new password for your account.' : 'Shared plans are a good place to start.'}</p><div className="auth-decoration"><Users size={26}/><span>Real interests. Real plans.</span></div></div><div className="auth-card"><div className="eyebrow">{page === 'signup' ? 'CREATE YOUR ACCOUNT' : page === 'forgot-password' ? 'PASSWORD RECOVERY' : page === 'reset-password' ? 'CHOOSE A NEW PASSWORD' : 'WELCOME BACK'}</div><h2>{page === 'signup' ? 'Join Maria' : page === 'forgot-password' ? 'Reset your password' : page === 'reset-password' ? 'Set a new password' : 'Log in'}</h2><p className="muted">{page === 'signup' ? 'Explore events now; social participation is reserved for adults whose eligibility can be verified.' : page === 'forgot-password' ? 'Enter your account email and we will send a recovery link if an account matches.' : page === 'reset-password' ? 'Use at least 8 characters. Open this page from your email recovery link before setting a new password.' : 'Pick up where your plans left off.'}</p><form onSubmit={page === 'forgot-password' ? requestPasswordReset : page === 'reset-password' ? updateRecoveredPassword : handleAuth}>{page === 'signup' && <label className="field-label">Your name<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" placeholder="How should we call you?" required maxLength={80}/></label>}{page !== 'reset-password' && <label className="field-label">Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label>}{page !== 'forgot-password' && <label className="field-label">{page === 'reset-password' ? 'New password' : 'Password'}<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={page === 'signup' || page === 'reset-password' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required minLength={8} maxLength={128}/></label>}{page === 'reset-password' && <label className="field-label">Confirm new password<input type="password" value={recoveryPasswordConfirm} onChange={e => setRecoveryPasswordConfirm(e.target.value)} autoComplete="new-password" placeholder="Enter the new password again" required minLength={8} maxLength={128}/></label>}{page === 'signup' && <><p className="consent-note">Maria is intended for adults aged 18 and over. A trusted adult-eligibility verification workflow is not available in this preview, so event participation, attendee discovery, matching, groups, and messaging remain disabled until that workflow is implemented and reviewed.</p><p className="consent-note">By creating an account, you agree to the <a href="#terms">Terms of Service</a> and acknowledge the <a href="#privacy">Privacy Policy</a>.</p></>}{authMessage && <p className="form-message" role="alert">{authMessage}</p>}{page === 'login' && <p className="auth-switch"><a href="#forgot-password">Forgot your password?</a></p>}<button className="button auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : page === 'signup' ? 'Create account' : page === 'forgot-password' ? 'Send reset link' : page === 'reset-password' ? 'Update password' : 'Log in'} <ArrowRight size={16}/></button></form><p className="auth-switch">{page === 'signup' ? 'Already have an account?' : page === 'forgot-password' ? 'Remembered your password?' : page === 'reset-password' ? 'Return to sign in?' : 'New to Maria?'} <a href={page === 'signup' ? '#login' : page === 'login' ? '#signup' : '#login'}>{page === 'signup' ? 'Log in' : page === 'login' ? 'Create an account' : 'Back to log in'}</a></p>{!supabase && <p className="demo-notice">Preview mode: real authentication requires Supabase environment configuration.</p>}</div></section>}

      {page === 'matches' && <section className="page-section narrow"><div className="eyebrow">YOUR MARIA LIST</div><h1 className="page-title">Plans you’ve<br/><em>kept close.</em></h1><p className="page-intro">Your saved events appear here. Published event saves sync to your signed-in account; sample preview saves are temporary. A real match inbox is not connected yet.</p>{user && supabase && !savedEventsLoaded ? <div className="empty-state"><p>Loading your saved events…</p></div> : saved.length ? <EventGrid items={displayedEvents.filter(e => saved.includes(e.id))} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/> : <div className="empty-state"><Heart size={27}/><h3>Your list is waiting</h3><p>Save an event to keep it here. Published events can sync across sessions when you are logged in.</p><button className="button" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></div>}</section>}
      {page === 'quiz' && <section className="page-section narrow">
        <div className="eyebrow">YOUR INTERESTS, YOUR CHOICE</div>
        <h1 className="page-title">Find your <em>kind of plan.</em></h1>
        <p className="page-intro">Answer a few optional questions so Maria can tailor event recommendations. Your answers are saved privately to your account; they are not a personality diagnosis.</p>
        {!user && <div className="empty-state"><h3>Log in to save your preferences</h3><p>You can explore the questionnaire, but answers are saved only when signed in.</p><button type="button" className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div>}
        <form className="quiz-panel" onSubmit={saveMatchPreferences}>
          <fieldset className="quiz-fieldset"><legend>1. What do you enjoy? <span>Select at least two</span></legend><div className="quiz-options">{interestOptions.map(item => <label className="quiz-option" key={item}><input type="checkbox" checked={quizInterests.includes(item)} onChange={e => setQuizInterests(current => e.target.checked ? (current.length < 10 ? [...current, item] : current) : current.filter(value => value !== item))}/><span>{item}</span></label>)}</div><p className="muted">{quizInterests.length}/10 interests selected</p></fieldset>
          <fieldset className="quiz-fieldset"><legend>2. What kind of social setting feels right?</legend><div className="quiz-options quiz-options-single">{[['one_to_one','One-to-one'],['small_groups','Small groups'],['large_groups','Large groups'],['depends','Depends on the event']].map(([value,label]) => <label className="quiz-option" key={value}><input type="radio" name="social-style" checked={quizSocialStyle === value} onChange={() => setQuizSocialStyle(value)}/><span>{label}</span></label>)}</div></fieldset>
          <fieldset className="quiz-fieldset"><legend>3. Preferred group size</legend><div className="quiz-options quiz-options-single">{[['one_to_one','Just one other person'],['small','2–4 people'],['medium','5–8 people'],['large','9+ people'],['depends','No preference']].map(([value,label]) => <label className="quiz-option" key={value}><input type="radio" name="group-size" checked={quizGroupSize === value} onChange={() => setQuizGroupSize(value)}/><span>{label}</span></label>)}</div></fieldset>
          <fieldset className="quiz-fieldset"><legend>4. When are you usually free? <span>Optional</span></legend><div className="quiz-options">{timeOptions.map(item => <label className="quiz-option" key={item}><input type="checkbox" checked={quizTimes.includes(item)} onChange={e => setQuizTimes(current => e.target.checked ? [...current, item] : current.filter(value => value !== item))}/><span>{item}</span></label>)}</div></fieldset>
          {quizMessage && <p className="form-message" role="status">{quizMessage}</p>}
          <button className="button" disabled={quizSaving || quizLoading || !user}>{quizSaving ? 'Saving…' : quizLoading ? 'Loading preferences…' : 'Save my preferences'} <Check size={16}/></button>
          <p className="demo-notice">These answers personalize recommendations, not eligibility. They cannot unlock attendee discovery or matching. You can update your choices at any time.</p>
        </form>
        {quizInterests.length > 0 && <div className="quiz-results"><div className="eyebrow">YOUR CURRENT INTEREST SNAPSHOT</div><h2>Events that may fit your interests</h2><p className="muted">This is an explainable preview based on event categories and titles, not an AI-generated personality score.</p><EventGrid items={recommendEvents(displayedEvents, quizInterests, 3)} onSelect={setSelectedEvent} saved={saved} onSave={toggleSave}/></div>}
      </section>}

      {page === 'people' && <section className="page-section narrow">
        <div className="eyebrow">SHARED PLANS, SHARED INTERESTS</div>
        <h1 className="page-title">Meet people<br/><em>going too.</em></h1>
        <p className="page-intro">Discovery is limited to people who share an event with you. You choose whether to like or pass; a match is created only when interest is mutual.</p>
        {!user ? <div className="empty-state"><Users size={27}/><h3>Log in to meet people</h3><button className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div>
          : !adultVerificationChecked ? <div className="empty-state"><ShieldCheck size={27}/><h3>Checking account eligibility…</h3><p>Attendee discovery stays locked while the account status is checked.</p></div>
          : !adultVerified ? <div className="empty-state"><ShieldCheck size={27}/><h3>Attendee discovery is not enabled</h3><p>Maria is reserved for adults aged 18 and over. The trusted verification workflow is not live yet, so this feature remains disabled. Changing a profile setting cannot enable it.</p><button className="button button-outline" onClick={() => navigate('safety')}>Review safety guidance</button></div>
          : !joinedLiveEvents.length ? <div className="empty-state"><CalendarDays size={27}/><h3>Join a current event first</h3><p>People discovery only works for published upcoming events loaded from Supabase. Mark interest in a live event, and it will appear here.</p><button className="button" onClick={() => navigate('events')}>Explore events <ArrowRight size={16}/></button></div>
          : <><label className="field-label">Choose an event<select value={discoveryEventId} onChange={e => setDiscoveryEventId(e.target.value)}>{joinedLiveEvents.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            {peopleBusy ? <div className="empty-state"><p>Loading participants…</p></div>
              : discoveryPeople.length ? <div className="feature-list">{discoveryPeople.map(person => <article className="step" key={person.id}><div className="profile-avatar">{(person.display_name || 'M').slice(0,1).toUpperCase()}</div><h3>{person.display_name || 'Maria member'}</h3><p>{person.bio || 'Interested in attending the same event.'}</p>{person.city && <p className="muted">{person.city}</p>}<div className="modal-actions"><button className="button button-outline" disabled={swipeBusy} onClick={() => handleSwipe(person, 'pass')}>Pass</button><button className="button" disabled={swipeBusy} onClick={() => handleSwipe(person, 'like')}>Interested <Heart size={15}/></button></div><button className="text-button" onClick={() => openReport({ type: 'user', id: person.id, label: person.display_name || 'Maria member' })}><ShieldCheck size={15}/> Report profile</button></article>)}</div>
              : <div className="empty-state"><Users size={27}/><h3>No more profiles right now</h3><p>Check back when more people join this event.</p></div>}
            {swipeNotice && <p className="form-message" role="status">{swipeNotice}</p>}
          </>}
        <div className="safety-callout"><ShieldCheck size={20}/><span>Keep conversations respectful and meet in public places. <a href="#safety">Review safety guidance</a>. Messaging is not connected yet.</span></div>
      </section>}

      {page === 'profile' && <section className="page-section narrow"><div className="eyebrow">YOUR ACCOUNT</div><h1 className="page-title">Make it <em>you.</em></h1>{user ? <div className="profile-panel"><div className="profile-avatar">{(profileData.display_name || user.email || 'M').slice(0,1).toUpperCase()}</div><h2>{profileData.display_name || 'Maria member'}</h2><p>{user.email}</p>{profileLoading ? <p className="muted">Loading your profile…</p> : <form onSubmit={saveProfile}><label className="field-label">Display name<input value={profileData.display_name} onChange={e => setProfileData(current => ({ ...current, display_name: e.target.value }))} autoComplete="name" maxLength={60} required /></label><label className="field-label">Bio<textarea value={profileData.bio} onChange={e => setProfileData(current => ({ ...current, bio: e.target.value }))} maxLength={500} rows={4} placeholder="A little about your interests (optional)." /></label><label className="field-label">City<input value={profileData.city} onChange={e => setProfileData(current => ({ ...current, city: e.target.value }))} autoComplete="address-level2" maxLength={100} placeholder="City (optional)" /></label>{profileMessage && <p className="form-message" role="status">{profileMessage}</p>}<button className="button" disabled={profileSaving || profileLoading}>{profileSaving ? 'Saving…' : 'Save profile'} <Check size={16}/></button></form>}<p className="muted">Adult eligibility, account privileges, and safety status cannot be changed from this page.</p><button className="button button-outline" onClick={signOut}>Sign out</button><div className="danger-zone"><h3>Delete account</h3><p>This permanently removes your Maria account and linked profile data. This action cannot be undone.</p><button className="button button-danger" onClick={() => {setAccountDeletionError('');setAccountDeletionPassword('');setAccountDeletionConfirmation('');setAccountDeletionOpen(true);}}>Delete my account</button></div></div> : <div className="empty-state"><Users size={27}/><h3>Sign in to continue</h3><button className="button" onClick={() => navigate('login')}>Log in <ArrowRight size={16}/></button></div>}<div className="safety-callout"><ShieldCheck size={20}/><span>Review our <a href="#safety">safety guidance</a> before meeting anyone from an online service.</span></div></section>}
    </main>

    <footer className="site-footer"><div className="footer-top"><a className="brand footer-brand" href="#" onClick={e => {e.preventDefault();navigate('home')}}><span className="brand-mark">m.</span><span>maria</span></a><p>Make plans. Find your people.<br/>Go together.</p><button className="button button-light" onClick={() => navigate('events')}>Find a plan <ArrowRight size={15}/></button></div><div className="footer-bottom"><span>© 2026 Maria. Built around doing things together.</span><div><a href="#safety">Safety</a><a href="#guidelines">Guidelines</a><a href="#terms">Terms</a><a href="#privacy">Privacy</a></div><span className="preview-label">EARLY PREVIEW</span></div></footer>

    {selectedEvent && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) setSelectedEvent(null)}}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title"><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close event details"><X size={20}/></button><div className={'event-art modal-art ' + selectedEvent.color}><selectedEvent.icon size={42}/><span>{selectedEvent.category}</span></div><div className="modal-content"><div className="eyebrow">EVENT DETAILS</div><h2 id="event-modal-title">{selectedEvent.title}</h2><p>{selectedEvent.description}</p><div className="modal-meta"><span><CalendarDays size={17}/>{selectedEvent.date}</span><span><MapPin size={17}/>{selectedEvent.place}</span><span><Users size={17}/>{selectedEvent.people} interested</span></div><div className="modal-price">{selectedEvent.price}</div><div className="modal-actions"><button className="button" onClick={() => {toggleSave(selectedEvent.id);}}>{saved.includes(selectedEvent.id) ? <span><Check size={16}/> Saved</span> : <span><Heart size={16}/> Save this event</span>}</button>{selectedEvent.isLive ? <button className="button button-outline" disabled={joinBusy || joinedEventIds.includes(selectedEvent.id) || (!!user && (!adultVerificationChecked || !adultVerified))} onClick={() => joinEvent(selectedEvent)}>{joinedEventIds.includes(selectedEvent.id) ? <span><Check size={16}/> Interested</span> : joinBusy ? 'Saving…' : !user ? <span>Log in to mark interest <ArrowRight size={16}/></span> : !adultVerificationChecked ? 'Checking eligibility…' : !adultVerified ? 'Participation unavailable' : <span>Mark interest <ArrowRight size={16}/></span>}</button> : <button className="button button-outline" onClick={() => {setSelectedEvent(null);navigate(user ? 'people' : 'signup')}}>Find people <ArrowRight size={16}/></button>}</div>{joinMessage && <p className="form-message" role="status">{joinMessage}</p>}{selectedEvent.isLive && <button className="text-button" onClick={() => openReport({ type: 'event', id: selectedEvent.id, label: selectedEvent.title })}><ShieldCheck size={15}/> Report this event</button>}{selectedEvent.bookingUrl && <p><a href={selectedEvent.bookingUrl} target="_blank" rel="noreferrer">Visit event details ↗</a></p>}<p className="demo-notice">{selectedEvent.isLive ? 'Published listing. Check the organizer’s details before attending.' : 'Sample listing only. Confirm event details with the organizer before making plans.'}</p></div></section></div>}
    {accountDeletionOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if (e.target === e.currentTarget && !accountDeletionBusy) setAccountDeletionOpen(false);}}><section className="small-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><button className="modal-close" onClick={() => setAccountDeletionOpen(false)} disabled={accountDeletionBusy} aria-label="Close account deletion"><X size={20}/></button><div className="eyebrow">PERMANENT ACTION</div><h2 id="delete-account-title">Delete your account?</h2><p>This permanently deletes your Maria login and linked profile. Linked account data may be removed according to database relationships; some reports may also be deleted with the account. This action cannot be undone.</p><form onSubmit={deleteAccount}><label className="field-label">Current password<input type="password" value={accountDeletionPassword} onChange={e => setAccountDeletionPassword(e.target.value)} autoComplete="current-password" required maxLength={128}/></label><label className="field-label">Type DELETE to confirm<input value={accountDeletionConfirmation} onChange={e => setAccountDeletionConfirmation(e.target.value)} autoComplete="off" required maxLength={20} spellCheck="false" /></label>{accountDeletionError && <p className="form-message" role="alert">{accountDeletionError}</p>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setAccountDeletionOpen(false)} disabled={accountDeletionBusy}>Cancel</button><button type="submit" className="button button-danger" disabled={accountDeletionBusy}>{accountDeletionBusy ? 'Deleting account…' : 'Permanently delete'}</button></div></form></section></div>}
    {reporting && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !reportBusy) closeReport(); }}><section className="small-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" onClick={closeReport} disabled={reportBusy} aria-label="Close report"><X size={20}/></button><h2 id="report-title">Report a concern</h2>{reportSubmitted ? <><p>Your report was saved to Maria’s reports table. The moderation queue and moderator notifications are not connected yet, so this prototype cannot confirm that anyone has reviewed it.</p><button className="button" onClick={closeReport}>Close</button></> : <><p>Choose the reason that best fits. Only include details relevant to this event or profile; avoid unnecessary personal information.</p>{reporting.type === 'user' ? <p className="demo-notice">Reporting profile: <strong>{reporting.label || 'Maria member'}</strong></p> : reporting.id ? <p className="demo-notice">Reporting published event: <strong>{reporting.label || 'Event'}</strong></p> : <label className="field-label">Published event<select value={reportEventId} onChange={e => setReportEventId(e.target.value)} required><option value="">Choose an event…</option>{liveEvents.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}{!user && <p className="form-message" role="status">Sign in before submitting a report.</p>}<label className="field-label">Reason<select value={reportReason} onChange={e => setReportReason(e.target.value)}><option value="harassment">Harassment or threats</option><option value="spam">Spam or unsolicited promotion</option><option value="fake_profile">Fake profile or scam</option><option value="unsafe_behavior">Unsafe behavior</option><option value="inappropriate_content">Inappropriate content or behavior</option><option value="other">Other / privacy concern</option></select></label><label className="field-label">Details (optional)<textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Add only relevant context (up to 2,000 characters)." /></label>{reportError && <p className="form-message" role="alert">{reportError}</p>}{user ? <button className="button" disabled={reportBusy} onClick={reportUser}>{reportBusy ? 'Submitting…' : 'Submit report'} <ArrowRight size={16}/></button> : <button className="button" onClick={() => {closeReport();navigate('login')}}>Log in to submit report <ArrowRight size={16}/></button>}</>}</section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
    <button className="report-shortcut" onClick={() => openReport({ type: 'event' })} title="Report a safety concern"><ShieldCheck size={17}/><span>Safety</span></button>
  </div>;
}

function EventGrid({ items, onSelect, saved, onSave }) {
  return <div className="event-grid">{items.map(event => { const Icon = event.icon; return <article className="event-card" key={event.id}><button className={'event-art ' + event.color} onClick={() => onSelect(event)} aria-label={'View ' + event.title}><Icon size={35}/><span>{event.category}</span><span className="art-shape shape-one"/><span className="art-shape shape-two"/></button><div className="event-card-body"><div className="event-date">{event.date}</div><h3><button className="event-title-button" onClick={() => onSelect(event)}>{event.title}</button></h3><div className="event-place"><MapPin size={14}/>{event.place}</div><p className="event-desc">{event.description}</p><div className="event-card-bottom"><span className="event-price">{event.price}</span><button className={saved.includes(event.id) ? 'save-button saved' : 'save-button'} onClick={() => onSave(event.id)} aria-label={saved.includes(event.id) ? 'Remove saved event' : 'Save event'}><Heart size={17} fill={saved.includes(event.id) ? 'currentColor' : 'none'}/></button><button className="card-arrow" onClick={() => onSelect(event)} aria-label={'Details for ' + event.title}><ArrowRight size={17}/></button></div></div></article>;})}</div>;
}
function Step({ number, title, text }) { return <article className="step"><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>; }
function PolicyPage({ eyebrow, title, intro, sections }) { return <section className="page-section narrow policy-page"><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-intro">{intro}</p><div className="policy-sections">{sections.map(([heading, text]) => <article key={heading}><h3>{heading}</h3><p>{text}</p></article>)}</div><div className="safety-callout"><ShieldCheck size={20}/><span>This content is a starting point. Confirm that the final policy matches the live product and applicable law.</span></div></section>; }
